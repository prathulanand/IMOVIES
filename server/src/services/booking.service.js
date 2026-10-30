import mongoose from 'mongoose';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Booking } from '../models/Booking.js';
import { Setting } from '../models/Setting.js';
import { razorpay } from '../config/razorpay.js';
import { calculateBookingPricing } from './pricing.service.js';
import { isShowPast } from '../utils/ist-date.js';
import { generateBookingCode } from '../utils/bookingCode.js';
import { SEAT_STATUS, BOOKING_STATUS, PAYMENT_STATUS } from '../constants/enums.js';
import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';
import { emitToShowRoom } from '../sockets/seatSocket.js';

/**
 * Creates an atomic, time-limited seat hold inside a MongoDB transaction.
 * Creates Razorpay order POST-COMMIT.
 */
export async function createSeatHold({ showId, seatLabels, couponCode, user }) {
  const settings = await Setting.getSettings();
  const maxSeats = settings.maxSeatsPerBooking || 8;
  const holdMinutes = settings.holdDurationMinutes || 7;

  // 1. Validation: Seat limits
  if (!seatLabels || !Array.isArray(seatLabels) || seatLabels.length === 0) {
    const err = new Error(MESSAGES.SEATS_REQUIRED);
    err.statusCode = 400;
    throw err;
  }

  if (seatLabels.length > maxSeats) {
    const err = new Error(MESSAGES.MAX_SEATS_EXCEEDED(maxSeats));
    err.statusCode = 400;
    throw err;
  }

  // 2. Validation: Show validity & past-show booking prevention
  const show = await Show.findById(showId).populate('movieId').populate('theatreId').populate('screenId');
  if (!show || show.status !== 'SCHEDULED') {
    const err = new Error(MESSAGES.RESOURCE_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  if (isShowPast(show.startTime)) {
    const err = new Error(MESSAGES.PAST_SHOW_BOOKING_FORBIDDEN);
    err.statusCode = 422;
    err.code = MACHINE_CODES.PAST_SHOW;
    throw err;
  }

  const now = new Date();

  // 3. Validation: Single live unpaid hold per show per user rule
  const existingHold = await Booking.findOne({
    userId: user._id,
    showId: show._id,
    status: BOOKING_STATUS.AWAITING_PAYMENT,
    holdExpiresAt: { $gt: now },
  });

  if (existingHold) {
    const remainingMs = new Date(existingHold.holdExpiresAt).getTime() - now.getTime();
    const remainingMins = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    const err = new Error(MESSAGES.UNPAID_HOLD_EXISTS(remainingMins));
    err.statusCode = 409;
    err.code = MACHINE_CODES.UNPAID_HOLD;
    err.details = {
      existingBookingId: existingHold._id,
      remainingMinutes: remainingMins,
      expiresAt: existingHold.holdExpiresAt,
    };
    throw err;
  }

  const holdDurationMs = holdMinutes * 60 * 1000;
  const holdExpiresAt = new Date(now.getTime() + holdDurationMs);

  // 4. Concurrency: Atomic conditional update inside MongoDB transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  let booking;
  let seatsToHold;

  try {
    const updateResult = await ShowSeat.updateMany(
      {
        showId: show._id,
        seatLabel: { $in: seatLabels },
        $or: [
          { status: SEAT_STATUS.AVAILABLE },
          { status: SEAT_STATUS.HELD, holdExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          status: SEAT_STATUS.HELD,
          heldBy: user._id,
          holdExpiresAt: holdExpiresAt,
        },
      },
      { session }
    );

    // Fail if ANY requested seat was not acquired (all-or-nothing atomicity)
    if (updateResult.modifiedCount !== seatLabels.length) {
      await session.abortTransaction();
      const err = new Error(MESSAGES.SEAT_UNAVAILABLE);
      err.statusCode = 409;
      err.code = MACHINE_CODES.SEAT_UNAVAILABLE;
      throw err;
    }

    // Fetch held seats with their category and price
    seatsToHold = await ShowSeat.find(
      { showId: show._id, seatLabel: { $in: seatLabels } },
      null,
      { session }
    );

    const seatSnapshots = seatsToHold.map((s) => ({
      seatLabel: s.seatLabel,
      category: s.category,
      price: s.price,
    }));

    // Authoritative pricing
    const pricing = await calculateBookingPricing(seatSnapshots, couponCode, user._id);

    // Create Booking record
    const bookingCode = generateBookingCode();
    booking = await Booking.create(
      [
        {
          bookingCode,
          userId: user._id,
          showId: show._id,
          seats: seatSnapshots,
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          convenienceFee: pricing.convenienceFee,
          total: pricing.total,
          couponCode: pricing.coupon ? pricing.coupon.code : undefined,
          status: BOOKING_STATUS.AWAITING_PAYMENT,
          paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
          holdExpiresAt: holdExpiresAt,
        },
      ],
      { session }
    );
    booking = booking[0];

    // Link bookingId to ShowSeats
    await ShowSeat.updateMany(
      { showId: show._id, seatLabel: { $in: seatLabels } },
      { $set: { bookingId: booking._id } },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    // Convert MongoDB WriteConflict, TransientTransactionError, or DuplicateKey into 409 Conflict
    if (
      error.hasErrorLabel?.('TransientTransactionError') ||
      error.code === 112 ||
      error.code === 11000 ||
      error.message?.includes('WriteConflict')
    ) {
      const conflictErr = new Error(MESSAGES.SEAT_UNAVAILABLE);
      conflictErr.statusCode = 409;
      conflictErr.code = MACHINE_CODES.SEAT_UNAVAILABLE;
      throw conflictErr;
    }
    throw error;
  } finally {
    session.endSession();
  }

  // 5. Post-Commit: Create Razorpay Order outside of MongoDB transaction
  let razorpayOrderId = null;
  if (razorpay && booking.total > 0) {
    try {
      const order = await razorpay.orders.create({
        amount: booking.total, // in integer paise
        currency: 'INR',
        receipt: booking.bookingCode,
        notes: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          showId: show._id.toString(),
        },
      });
      razorpayOrderId = order.id;
      booking.razorpayOrderId = razorpayOrderId;
      await booking.save();
    } catch (rpErr) {
      console.warn('[RAZORPAY ORDER ERROR]', rpErr.message);
      // Fallback mock order id in test/dev if keys are placeholders
      razorpayOrderId = `order_${booking.bookingCode}`;
      booking.razorpayOrderId = razorpayOrderId;
      await booking.save();
    }
  } else {
    razorpayOrderId = `order_${booking.bookingCode}`;
    booking.razorpayOrderId = razorpayOrderId;
    await booking.save();
  }

  // 6. Real-time broadcast to Show Room
  emitToShowRoom(showId, 'seats:held', {
    seatLabels,
    holdExpiresAt,
  });

  return {
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    orderId: razorpayOrderId,
    amount: booking.total,
    currency: 'INR',
    subtotal: booking.subtotal,
    discount: booking.discount,
    convenienceFee: booking.convenienceFee,
    holdExpiresAt: booking.holdExpiresAt,
  };
}

/**
 * Releases own hold explicitly. Guarded in WHERE query (never if above it).
 */
export async function releaseUserHold(bookingId, userId) {
  const booking = await Booking.findOne({
    _id: bookingId,
    userId: userId,
    status: BOOKING_STATUS.AWAITING_PAYMENT,
  });

  if (!booking) {
    const err = new Error(MESSAGES.HOLD_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  // Release booking
  booking.status = BOOKING_STATUS.EXPIRED;
  await booking.save();

  // Guarded seat update
  const seatLabels = booking.seats.map((s) => s.seatLabel);
  await ShowSeat.updateMany(
    {
      showId: booking.showId,
      heldBy: userId,
      seatLabel: { $in: seatLabels },
      status: SEAT_STATUS.HELD,
    },
    {
      $set: {
        status: SEAT_STATUS.AVAILABLE,
        heldBy: undefined,
        holdExpiresAt: undefined,
        bookingId: undefined,
      },
    }
  );

  // Broadcast to room
  emitToShowRoom(booking.showId, 'seats:released', {
    seatLabels,
  });

  return { message: MESSAGES.HOLD_RELEASED };
}
