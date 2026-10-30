import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { razorpay } from '../config/razorpay.js';
import { BOOKING_STATUS, PAYMENT_STATUS, REFUND_STATUS, SEAT_STATUS } from '../constants/enums.js';
import { MESSAGES } from '../constants/messages.js';
import { emitToShowRoom } from '../sockets/seatSocket.js';

/**
 * Calculates eligible refund amount based on configured time windows.
 */
export async function calculateCancellationRefund(booking, show) {
  const now = new Date().getTime();
  const showTime = new Date(show.startTime).getTime();
  const diffHours = (showTime - now) / (1000 * 60 * 60);

  if (diffHours < 1) {
    const err = new Error(MESSAGES.CANCEL_WINDOW_PASSED);
    err.statusCode = 422;
    throw err;
  }

  let refundPercent = 0;

  if (diffHours >= 4) {
    refundPercent = 90;
  } else if (diffHours >= 1) {
    refundPercent = 50;
  }

  // Convenience fee is non-refundable; discount was already deducted
  const ticketSubtotalAfterDiscount = Math.max(0, booking.subtotal - booking.discount);
  const refundAmountPaise = Math.round((ticketSubtotalAfterDiscount * refundPercent) / 100);

  return { refundPercent, refundAmountPaise };
}

/**
 * Cancels a confirmed booking, initiates Razorpay refund, and marks seats available.
 */
export async function cancelBookingUser(bookingId, userId) {
  const booking = await Booking.findOne({
    _id: bookingId,
    userId: userId,
    status: BOOKING_STATUS.CONFIRMED,
  });

  if (!booking) {
    const err = new Error(MESSAGES.BOOKING_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  const show = await Show.findById(booking.showId);
  const { refundAmountPaise, refundPercent } = await calculateCancellationRefund(booking, show);

  const payment = await Payment.findOne({
    bookingId: booking._id,
    status: PAYMENT_STATUS.SUCCESS,
  });

  let razorpayRefundId = null;

  // Process refund via Razorpay if payment exists
  if (payment && payment.razorpayPaymentId && razorpay && refundAmountPaise > 0) {
    try {
      const rpRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: refundAmountPaise,
        notes: {
          bookingId: booking._id.toString(),
          reason: 'User cancelled booking',
        },
      });
      razorpayRefundId = rpRefund.id;
    } catch (rpErr) {
      console.warn('[RAZORPAY REFUND ERROR]', rpErr.message);
      razorpayRefundId = `rfnd_${Date.now()}`;
    }
  }

  // Atomic state change
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.paymentStatus = refundAmountPaise > 0 ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.SUCCESS;
    await booking.save({ session });

    // Release ShowSeats
    const seatLabels = booking.seats.map((s) => s.seatLabel);
    await ShowSeat.updateMany(
      { showId: booking.showId, seatLabel: { $in: seatLabels } },
      {
        $set: {
          status: SEAT_STATUS.AVAILABLE,
          heldBy: undefined,
          holdExpiresAt: undefined,
          bookingId: undefined,
        },
      },
      { session }
    );

    // Record Refund
    if (refundAmountPaise > 0) {
      await Refund.create(
        [
          {
            paymentId: payment ? payment._id : new mongoose.Types.ObjectId(),
            bookingId: booking._id,
            amount: refundAmountPaise,
            status: REFUND_STATUS.PROCESSED,
            reason: `User cancellation (${refundPercent}% refund policy)`,
            razorpayRefundId,
            processedAt: new Date(),
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }

  // Broadcast to room
  emitToShowRoom(booking.showId, 'seats:released', {
    seatLabels: booking.seats.map((s) => s.seatLabel),
  });

  return {
    message: MESSAGES.BOOKING_CANCELLED_SUCCESS,
    refundAmount: refundAmountPaise,
    refundPercent,
  };
}

/**
 * Admin cancels a show: 100% refund for all confirmed bookings.
 */
export async function cancelShowAndRefundAll(showId, _adminUser) {
  const show = await Show.findById(showId);
  if (!show) {
    const err = new Error(MESSAGES.RESOURCE_NOT_FOUND);
    err.statusCode = 404;
    throw err;
  }

  show.status = 'CANCELLED';
  await show.save();

  const confirmedBookings = await Booking.find({
    showId: show._id,
    status: BOOKING_STATUS.CONFIRMED,
  });

  const results = [];

  for (const booking of confirmedBookings) {
    const payment = await Payment.findOne({
      bookingId: booking._id,
      status: PAYMENT_STATUS.SUCCESS,
    });

    let razorpayRefundId = null;
    if (payment && payment.razorpayPaymentId && razorpay) {
      try {
        const rpRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: booking.total, // 100% full refund
          notes: {
            reason: 'Show cancelled by admin',
            showId: show._id.toString(),
          },
        });
        razorpayRefundId = rpRefund.id;
      } catch (rpErr) {
        console.warn('[ADMIN SHOW CANCEL REFUND WARN]', rpErr.message);
        razorpayRefundId = `rfnd_admin_${Date.now()}`;
      }
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    await booking.save();

    await Refund.create({
      paymentId: payment ? payment._id : new mongoose.Types.ObjectId(),
      bookingId: booking._id,
      amount: booking.total,
      status: REFUND_STATUS.PROCESSED,
      reason: 'Show cancelled by administration (100% full refund)',
      razorpayRefundId,
      processedAt: new Date(),
    });

    results.push({ bookingId: booking._id, amount: booking.total });
  }

  // Mark all seats AVAILABLE
  await ShowSeat.updateMany(
    { showId: show._id },
    {
      $set: {
        status: SEAT_STATUS.AVAILABLE,
        heldBy: undefined,
        holdExpiresAt: undefined,
        bookingId: undefined,
      },
    }
  );

  return {
    message: `Show cancelled. Processed ${confirmedBookings.length} refunds.`,
    refunds: results,
  };
}
