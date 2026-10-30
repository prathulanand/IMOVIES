import crypto from 'crypto';
import { z } from 'zod';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Payment } from '../models/Payment.js';
import { Coupon } from '../models/Coupon.js';
import { Favorite } from '../models/Favorite.js';
import { Show } from '../models/Show.js';
import { createSeatHold, releaseUserHold } from '../services/booking.service.js';
import { cancelBookingUser } from '../services/refund.service.js';
import { calculateBookingPricing } from '../services/pricing.service.js';
import { BOOKING_STATUS, PAYMENT_STATUS, SEAT_STATUS } from '../constants/enums.js';
import { MESSAGES } from '../constants/messages.js';
import { razorpay } from '../config/razorpay.js';
import { emitToShowRoom } from '../sockets/seatSocket.js';
import { sendBookingConfirmationEmail } from '../utils/mailer.js';
import { sendBookingConfirmationSMS } from '../utils/sms.js';
import { cleanupExpiredHolds } from '../jobs/expireHolds.js';
import { apiCache } from '../utils/cache.js';

export const holdSeatsSchema = z.object({
  showId: z.string().min(1, 'Show ID is required'),
  seatLabels: z.array(z.string()).min(1, 'At least one seat must be selected'),
  couponCode: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const postReviewSchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Review must be at least 5 characters').max(1000),
});

export async function holdSeats(req, res, next) {
  try {
    const { showId, seatLabels, couponCode } = req.body;
    const result = await createSeatHold({
      showId,
      seatLabels,
      couponCode,
      user: req.user,
    });
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function releaseHold(req, res, next) {
  try {
    const result = await releaseUserHold(req.params.id, req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resumePayment(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
    });

    if (!booking) {
      return res.status(404).json({
        error: MESSAGES.BOOKING_NOT_FOUND,
      });
    }

    if (new Date(booking.holdExpiresAt) < new Date()) {
      return res.status(409).json({
        error: MESSAGES.HOLD_EXPIRED,
        code: 'HOLD_EXPIRED',
      });
    }

    // Create or reuse Razorpay order
    let orderId = booking.razorpayOrderId;
    if (razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: booking.total,
          currency: 'INR',
          receipt: booking.bookingCode,
        });
        orderId = order.id;
        booking.razorpayOrderId = orderId;
        await booking.save();
      } catch (rzpErr) {
        console.error('\x1b[31m[RAZORPAY ERROR]\x1b[0m Failed to create order:', rzpErr.message || rzpErr);
      }
    }

    return res.status(200).json({
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      orderId: orderId || `order_${booking.bookingCode}`,
      amount: booking.total,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_TpVOoKBVyu9znp',
      holdExpiresAt: booking.holdExpiresAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function testPayBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
    });

    if (!booking) {
      return res.status(404).json({
        error: MESSAGES.BOOKING_NOT_FOUND,
      });
    }

    if (new Date(booking.holdExpiresAt) < new Date()) {
      return res.status(409).json({
        error: MESSAGES.HOLD_EXPIRED,
        code: 'HOLD_EXPIRED',
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const seatLabels = booking.seats.map((s) => s.seatLabel);

      booking.status = BOOKING_STATUS.CONFIRMED;
      booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
      await booking.save({ session });

      await ShowSeat.updateMany(
        { showId: booking.showId, seatLabel: { $in: seatLabels } },
        {
          $set: {
            status: SEAT_STATUS.BOOKED,
            bookingId: booking._id,
            heldBy: booking.userId,
            holdExpiresAt: undefined,
          },
        },
        { session }
      );

      const paymentId = `pay_sim_${Date.now()}`;
      await Payment.create(
        [
          {
            bookingId: booking._id,
            userId: booking.userId,
            razorpayOrderId: booking.razorpayOrderId || `order_${booking.bookingCode}`,
            razorpayPaymentId: paymentId,
            amount: booking.total,
            method: 'upi_test_simulation',
            status: PAYMENT_STATUS.SUCCESS,
            paidAt: now,
          },
        ],
        { session }
      );

      if (booking.couponCode) {
        await Coupon.updateOne(
          { code: booking.couponCode },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }

      await session.commitTransaction();

      emitToShowRoom(booking.showId, 'seats:booked', { seatLabels });

      // Trigger confirmation email & SMS asynchronously
      Booking.findById(booking._id)
        .populate('userId', 'name email phone')
        .populate({
          path: 'showId',
          populate: [{ path: 'movieId', select: 'title' }, { path: 'theatreId', select: 'name' }],
        })
        .then((b) => {
          if (b && b.userId?.email) {
            sendBookingConfirmationEmail({
              to: b.userId.email,
              name: b.userId.name,
              bookingCode: b.bookingCode,
              movieTitle: b.showId?.movieId?.title || 'Movie',
              theatreName: b.showId?.theatreId?.name || 'Cinema',
              showDate: b.showDateSnapshot || 'Confirmed',
              showTime: b.showTimeSnapshot || '',
              seats: b.seats.map((s) => s.seatLabel),
              totalFormatted: `₹${(b.total / 100).toFixed(2)}`,
            }).catch(() => {});
          }
          if (b && b.userId?.phone) {
            sendBookingConfirmationSMS({
              phone: b.userId.phone,
              bookingCode: b.bookingCode,
              movieTitle: b.showId?.movieId?.title || 'Movie',
              showTime: `${b.showDateSnapshot || ''} ${b.showTimeSnapshot || ''}`.trim(),
              seats: b.seats.map((s) => s.seatLabel),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      return res.status(200).json({
        message: 'Payment verified and booking confirmed successfully.',
        bookingCode: booking.bookingCode,
        bookingId: booking._id,
      });
    } catch (txErr) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw txErr;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

export async function getUserBookings(req, res, next) {
  try {
    await cleanupExpiredHolds();
    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };

    if (status) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate({
          path: 'showId',
          populate: [
            { path: 'movieId', select: 'title posterUrl durationMinutes certificate' },
            { path: 'theatreId', select: 'name city address' },
            { path: 'screenId', select: 'name' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(query),
    ]);

    return res.status(200).json({
      bookings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate({
        path: 'showId',
        populate: [
          { path: 'movieId', select: 'title posterUrl bannerUrl durationMinutes certificate languages' },
          { path: 'theatreId', select: 'name city address contact' },
          { path: 'screenId', select: 'name' },
        ],
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        error: MESSAGES.BOOKING_NOT_FOUND,
      });
    }

    return res.status(200).json({
      booking,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const result = await cancelBookingUser(req.params.id, req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function rescheduleBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: BOOKING_STATUS.CONFIRMED,
    }).populate('showId');

    if (!booking) {
      return res.status(404).json({ error: 'Active confirmed booking not found for rescheduling.' });
    }

    const { newShowId, seatLabels } = req.body;
    if (!newShowId) {
      return res.status(400).json({ error: 'New show ID is required for rescheduling.' });
    }

    // Verify current show has not already started
    const now = new Date();
    if (booking.showId && new Date(booking.showId.startTime) <= now) {
      return res.status(400).json({ error: 'Cannot reschedule a show that has already started.' });
    }

    const newShow = await Show.findById(newShowId)
      .populate('movieId', 'title')
      .populate('theatreId', 'name')
      .populate('screenId', 'name');

    if (!newShow || !newShow.isActive) {
      return res.status(404).json({ error: 'Selected new show is not active or available.' });
    }

    if (new Date(newShow.startTime) <= now) {
      return res.status(400).json({ error: 'Cannot reschedule to a past show.' });
    }

    const targetSeatLabels = Array.isArray(seatLabels) && seatLabels.length > 0
      ? seatLabels
      : booking.seats.map((s) => s.seatLabel);

    if (targetSeatLabels.length !== booking.seats.length) {
      return res.status(400).json({
        error: `Rescheduling requires selecting exactly ${booking.seats.length} seats.`,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const oldShowId = booking.showId._id || booking.showId;
      const oldSeatLabels = booking.seats.map((s) => s.seatLabel);

      // 1. Release old seats
      await ShowSeat.updateMany(
        {
          showId: oldShowId,
          seatLabel: { $in: oldSeatLabels },
          status: SEAT_STATUS.BOOKED,
        },
        {
          $set: {
            status: SEAT_STATUS.AVAILABLE,
            heldBy: null,
            holdExpiresAt: null,
            bookingId: null,
          },
        },
        { session }
      );

      // 2. Fetch new seats and verify availability
      const availableNewSeats = await ShowSeat.find({
        showId: newShowId,
        seatLabel: { $in: targetSeatLabels },
        $or: [
          { status: SEAT_STATUS.AVAILABLE },
          { status: SEAT_STATUS.HELD, holdExpiresAt: { $lt: now } },
        ],
      }).session(session);

      if (availableNewSeats.length !== targetSeatLabels.length) {
        throw new Error('Some of the selected seats in the new show are not available.');
      }

      // 3. Mark new seats as BOOKED
      await ShowSeat.updateMany(
        {
          showId: newShowId,
          seatLabel: { $in: targetSeatLabels },
        },
        {
          $set: {
            status: SEAT_STATUS.BOOKED,
            heldBy: req.user._id,
            bookingId: booking._id,
          },
        },
        { session }
      );

      // 4. Update booking snapshots and seats
      const newSeatsSnapshot = availableNewSeats.map((s) => ({
        seatLabel: s.seatLabel,
        category: s.category,
        price: s.price,
      }));

      const { formatIST } = await import('../utils/ist-date.js');
      booking.showId = newShowId;
      booking.seats = newSeatsSnapshot;
      booking.showDateSnapshot = formatIST(newShow.startTime, 'DD MMM YYYY');
      booking.showTimeSnapshot = formatIST(newShow.startTime, 'hh:mm a');
      await booking.save({ session });

      await session.commitTransaction();

      // Emit socket events to both rooms
      emitToShowRoom(oldShowId, 'seats:released', { seatLabels: oldSeatLabels });
      emitToShowRoom(newShowId, 'seats:booked', { seatLabels: targetSeatLabels });

      // Send updated confirmation email & SMS
      User.findById(req.user._id).then((u) => {
        if (u?.email) {
          sendBookingConfirmationEmail({
            to: u.email,
            name: u.name,
            bookingCode: booking.bookingCode,
            movieTitle: newShow.movieId?.title || 'Movie',
            theatreName: newShow.theatreId?.name || 'Cinema',
            showDate: booking.showDateSnapshot,
            showTime: booking.showTimeSnapshot,
            seats: targetSeatLabels,
            totalFormatted: `₹${(booking.total / 100).toFixed(2)}`,
          }).catch(() => {});
        }
        if (u?.phone) {
          sendBookingConfirmationSMS({
            phone: u.phone,
            bookingCode: booking.bookingCode,
            movieTitle: newShow.movieId?.title || 'Movie',
            showTime: `${booking.showDateSnapshot} ${booking.showTimeSnapshot}`,
            seats: targetSeatLabels,
          }).catch(() => {});
        }
      }).catch(() => {});

      return res.status(200).json({
        message: 'Booking rescheduled successfully! Updated ticket details sent to email and SMS.',
        booking,
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(409).json({ error: err.message || 'Failed to reschedule booking.' });
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

export async function resendBookingNotifications(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate('userId', 'name email phone')
      .populate({
        path: 'showId',
        populate: [{ path: 'movieId', select: 'title' }, { path: 'theatreId', select: 'name' }],
      });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.userId?.email) {
      sendBookingConfirmationEmail({
        to: booking.userId.email,
        name: booking.userId.name,
        bookingCode: booking.bookingCode,
        movieTitle: booking.showId?.movieId?.title || 'Movie',
        theatreName: booking.showId?.theatreId?.name || 'Cinema',
        showDate: booking.showDateSnapshot || 'Confirmed',
        showTime: booking.showTimeSnapshot || '',
        seats: booking.seats.map((s) => s.seatLabel),
        totalFormatted: `₹${(booking.total / 100).toFixed(2)}`,
      }).catch(() => {});
    }

    if (booking.userId?.phone) {
      sendBookingConfirmationSMS({
        phone: booking.userId.phone,
        bookingCode: booking.bookingCode,
        movieTitle: booking.showId?.movieId?.title || 'Movie',
        showTime: `${booking.showDateSnapshot || ''} ${booking.showTimeSnapshot || ''}`.trim(),
        seats: booking.seats.map((s) => s.seatLabel),
      }).catch(() => {});
    }

    return res.status(200).json({
      message: 'Confirmation email and SMS re-sent successfully.',
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res) {
  return res.status(200).json({
    user: req.user.toJSON(),
  });
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const user = req.user;

    user.name = name.trim();
    if (phone !== undefined) {
      user.phone = phone.trim() === '' ? undefined : phone.trim();
    }
    await user.save();

    return res.status(200).json({
      message: MESSAGES.PROFILE_UPDATE_SUCCESS,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        error: MESSAGES.CURRENT_PASSWORD_INCORRECT,
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    return res.status(200).json({
      message: MESSAGES.PASSWORD_UPDATE_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
}

export async function postReview(req, res, next) {
  try {
    const { movieId, rating, comment } = req.body;
    const userId = req.user._id;

    // Rule: Only a user with a CONFIRMED booking for that movie whose show time has passed may review
    const now = new Date();
    const eligibleBooking = await Booking.findOne({
      userId,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
    }).populate({
      path: 'showId',
      match: { movieId, startTime: { $lt: now } },
    });

    if (!eligibleBooking || !eligibleBooking.showId) {
      return res.status(403).json({
        error: MESSAGES.REVIEW_ONLY_CONFIRMED_PAST,
      });
    }

    // Check if user already reviewed
    const existing = await Review.findOne({ userId, movieId });
    if (existing) {
      return res.status(409).json({
        error: MESSAGES.REVIEW_ALREADY_SUBMITTED,
      });
    }

    const review = await Review.create({
      userId,
      movieId,
      bookingId: eligibleBooking._id,
      rating,
      comment: comment.trim(),
    });

    apiCache.del(`movie:${movieId}`);
    apiCache.delByPrefix('movies:');

    return res.status(201).json({
      message: MESSAGES.REVIEW_SUBMITTED_SUCCESS,
      review,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserReviews(req, res, next) {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .populate('movieId', 'title posterUrl')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ reviews });
  } catch (error) {
    next(error);
  }
}

export async function applyCouponToBooking(req, res, next) {
  try {
    const { couponCode } = req.body;
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
    });

    if (!booking) {
      return res.status(404).json({
        error: MESSAGES.BOOKING_NOT_FOUND,
      });
    }

    if (new Date(booking.holdExpiresAt) < new Date()) {
      return res.status(409).json({
        error: MESSAGES.HOLD_EXPIRED,
        code: 'HOLD_EXPIRED',
      });
    }

    const pricing = await calculateBookingPricing(
      booking.seats,
      couponCode || null,
      req.user._id
    );

    booking.couponCode = couponCode && couponCode.trim() !== '' ? couponCode.trim().toUpperCase() : undefined;
    booking.subtotal = pricing.subtotal;
    booking.discount = pricing.discount;
    booking.convenienceFee = pricing.convenienceFee;
    booking.total = pricing.total;
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('showId')
      .populate({
        path: 'showId',
        populate: [
          { path: 'movieId' },
          { path: 'theatreId' },
          { path: 'screenId' },
        ],
      });

    return res.status(200).json({
      message: 'Coupon applied successfully',
      booking: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyRazorpayPayment(req, res, next) {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
    });

    if (!booking) {
      return res.status(404).json({ error: MESSAGES.BOOKING_NOT_FOUND });
    }

    if (new Date(booking.holdExpiresAt) < new Date()) {
      return res.status(409).json({ error: MESSAGES.HOLD_EXPIRED, code: 'HOLD_EXPIRED' });
    }

    // 1. Verify Razorpay HMAC signature if secret is configured
    if (env.RAZORPAY_KEY_SECRET && razorpaySignature) {
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: 'Invalid Razorpay payment signature.' });
      }
    }

    // 2. Atomic confirmation in MongoDB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const seatLabels = booking.seats.map((s) => s.seatLabel);

      booking.status = BOOKING_STATUS.CONFIRMED;
      booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
      booking.razorpayPaymentId = razorpayPaymentId;
      await booking.save({ session });

      await ShowSeat.updateMany(
        { showId: booking.showId, seatLabel: { $in: seatLabels } },
        {
          $set: {
            status: SEAT_STATUS.BOOKED,
            bookingId: booking._id,
            heldBy: booking.userId,
            holdExpiresAt: undefined,
          },
        },
        { session }
      );

      await Payment.create(
        [
          {
            bookingId: booking._id,
            userId: booking.userId,
            razorpayOrderId: razorpayOrderId || booking.razorpayOrderId || `order_${booking.bookingCode}`,
            razorpayPaymentId: razorpayPaymentId,
            amount: booking.total,
            method: 'razorpay_modal',
            status: PAYMENT_STATUS.SUCCESS,
            paidAt: now,
          },
        ],
        { session }
      );

      if (booking.couponCode) {
        await Coupon.updateOne(
          { code: booking.couponCode },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }

      await session.commitTransaction();

      // Emit socket event for real-time seat booked
      emitToShowRoom(booking.showId.toString(), 'SEATS_BOOKED', {
        seatLabels,
        bookingId: booking._id,
      });

      // Trigger confirmation email & SMS asynchronously
      Booking.findById(booking._id)
        .populate('userId', 'name email phone')
        .populate({
          path: 'showId',
          populate: [{ path: 'movieId', select: 'title' }, { path: 'theatreId', select: 'name' }],
        })
        .then((b) => {
          if (b && b.userId?.email) {
            sendBookingConfirmationEmail({
              to: b.userId.email,
              name: b.userId.name,
              bookingCode: b.bookingCode,
              movieTitle: b.showId?.movieId?.title || 'Movie',
              theatreName: b.showId?.theatreId?.name || 'Cinema',
              showDate: b.showDateSnapshot || 'Confirmed',
              showTime: b.showTimeSnapshot || '',
              seats: b.seats.map((s) => s.seatLabel),
              totalFormatted: `₹${(b.total / 100).toFixed(2)}`,
            }).catch(() => {});
          }
          if (b && b.userId?.phone) {
            sendBookingConfirmationSMS({
              phone: b.userId.phone,
              bookingCode: b.bookingCode,
              movieTitle: b.showId?.movieId?.title || 'Movie',
              showTime: `${b.showDateSnapshot || ''} ${b.showTimeSnapshot || ''}`.trim(),
              seats: b.seats.map((s) => s.seatLabel),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      return res.status(200).json({
        message: 'Payment verified successfully. Booking confirmed.',
        bookingId: booking._id,
      });
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

export async function getUserFavorites(req, res, next) {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .populate('movieId')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ favorites });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserFavorite(req, res, next) {
  try {
    const movieId = req.params.movieId || req.body.movieId;
    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID is required' });
    }

    const existing = await Favorite.findOne({ userId: req.user._id, movieId });
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      return res.status(200).json({ message: 'Removed from favorites', isFavorite: false });
    }

    const favorite = await Favorite.create({ userId: req.user._id, movieId });
    return res.status(201).json({ message: 'Added to favorites', isFavorite: true, favorite });
  } catch (error) {
    next(error);
  }
}

export async function removeUserFavorite(req, res, next) {
  try {
    const { movieId } = req.params;
    await Favorite.deleteOne({ userId: req.user._id, movieId });
    return res.status(200).json({ message: 'Removed from favorites', isFavorite: false });
  } catch (error) {
    next(error);
  }
}


