import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Refund } from '../models/Refund.js';
import { Coupon } from '../models/Coupon.js';
import { razorpay } from '../config/razorpay.js';
import { BOOKING_STATUS, PAYMENT_STATUS, REFUND_STATUS, SEAT_STATUS } from '../constants/enums.js';
import { isSeatFree } from '../services/seatAvailability.service.js';
import { emitToShowRoom } from '../sockets/seatSocket.js';

export async function handleRazorpayWebhook(req, res) {
  // 1. Verify webhook secret is configured
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('\x1b[31m[WEBHOOK ERROR] RAZORPAY_WEBHOOK_SECRET is not set in environment.\x1b[0m');
    return res.status(503).json({ error: 'Webhook secret is not configured on the server.' });
  }

  // 2. Verify HMAC SHA256 signature on raw request body buffer
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing x-razorpay-signature header.' });
  }

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('\x1b[33m[WEBHOOK] Invalid signature received.\x1b[0m');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body;
  const eventId = event?.event_id || req.headers['x-razorpay-event-id'];
  const eventType = event?.event;

  console.log(`\x1b[34m[WEBHOOK EVENT]\x1b[0m Type: \x1b[36m${eventType}\x1b[0m | ID: ${eventId}`);

  // 3. Handle payment.captured
  if (eventType === 'payment.captured') {
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) {
      return res.status(400).json({ error: 'Missing payment entity in payload.' });
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const amount = paymentEntity.amount; // in paise
    const method = paymentEntity.method;

    // Idempotency check: if this payment was already processed, acknowledge immediately
    const existingPayment = await Payment.findOne({
      $or: [
        { razorpayPaymentId },
        ...(eventId ? [{ rawEventId: eventId }] : []),
      ],
    });

    if (existingPayment && existingPayment.status === PAYMENT_STATUS.SUCCESS) {
      console.log(`\x1b[32m[WEBHOOK IDEMPOTENT]\x1b[0m Payment ${razorpayPaymentId} already processed. Skipping.`);
      return res.status(200).json({ status: 'ok', message: 'Payment already processed.' });
    }

    const booking = await Booking.findOne({ razorpayOrderId });
    if (!booking) {
      console.error(`\x1b[31m[WEBHOOK ERROR] No booking found for order ID: ${razorpayOrderId}\x1b[0m`);
      return res.status(404).json({ error: 'Booking not found for this order.' });
    }

    // Atomic transaction for payment capture & seat confirmation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const seatLabels = booking.seats.map((s) => s.seatLabel);

      // Check current status of seats
      const currentSeats = await ShowSeat.find(
        { showId: booking.showId, seatLabel: { $in: seatLabels } },
        null,
        { session }
      );

      // Are all seats still held by this booking or free?
      const allStillHeldByMe = currentSeats.every(
        (s) => s.status === SEAT_STATUS.HELD && s.bookingId?.toString() === booking._id.toString()
      );

      let canConfirm = false;

      if (allStillHeldByMe) {
        canConfirm = true;
      } else {
        // Late capture handling: if hold expired, check if seats are still available
        const allFree = currentSeats.every((s) => isSeatFree(s, now));
        if (allFree) {
          canConfirm = true;
        }
      }

      if (canConfirm) {
        // Standard confirmation & Late capture when seats are still free
        booking.status = BOOKING_STATUS.CONFIRMED;
        booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
        await booking.save({ session });

        // Update all ShowSeats to BOOKED
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

        // Record successful Payment
        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          {
            $set: {
              bookingId: booking._id,
              userId: booking.userId,
              razorpayOrderId,
              razorpayPaymentId,
              amount,
              method,
              status: PAYMENT_STATUS.SUCCESS,
              paidAt: now,
              rawEventId: eventId,
            },
          },
          { upsert: true, session }
        );

        // Increment coupon usedCount if coupon was applied
        if (booking.couponCode) {
          await Coupon.updateOne(
            { code: booking.couponCode },
            { $inc: { usedCount: 1 } },
            { session }
          );
        }

        await session.commitTransaction();

        // Broadcast to show room
        emitToShowRoom(booking.showId, 'seats:booked', {
          seatLabels,
        });

        console.log(`\x1b[32m[CONFIRMED BOOKING]\x1b[0m Booking ${booking.bookingCode} confirmed.`);
      } else {
        // LATE CAPTURE RE-BOOKED: Seats were taken by someone else! Auto-refund to prevent dropping money.
        console.warn(
          `\x1b[33m[LATE CAPTURE CONFLICT] Seats re-booked for order ${razorpayOrderId}. Triggering auto-refund.\x1b[0m`
        );

        booking.status = BOOKING_STATUS.EXPIRED;
        booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
        await booking.save({ session });

        const paymentDoc = await Payment.findOneAndUpdate(
          { razorpayOrderId },
          {
            $set: {
              bookingId: booking._id,
              userId: booking.userId,
              razorpayOrderId,
              razorpayPaymentId,
              amount,
              method,
              status: PAYMENT_STATUS.REFUNDED,
              paidAt: now,
              rawEventId: eventId,
            },
          },
          { upsert: true, new: true, session }
        );

        // Auto refund via Razorpay
        let razorpayRefundId = null;
        if (razorpay) {
          try {
            const rpRefund = await razorpay.payments.refund(razorpayPaymentId, {
              amount,
              notes: {
                bookingCode: booking.bookingCode,
                reason: 'Auto-refund: seats expired and were re-booked before payment capture',
              },
            });
            razorpayRefundId = rpRefund.id;
          } catch (rfErr) {
            console.error('[AUTO REFUND GATEWAY ERROR]', rfErr.message);
            razorpayRefundId = `auto_rfnd_${Date.now()}`;
          }
        }

        await Refund.create(
          [
            {
              paymentId: paymentDoc._id,
              bookingId: booking._id,
              amount,
              status: REFUND_STATUS.PROCESSED,
              reason: 'Late capture conflict: seats re-booked after hold expiry',
              razorpayRefundId,
              processedAt: new Date(),
            },
          ],
          { session }
        );

        await session.commitTransaction();
      }
    } catch (txErr) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw txErr;
    } finally {
      session.endSession();
    }
  }

  return res.status(200).json({ status: 'ok' });
}
