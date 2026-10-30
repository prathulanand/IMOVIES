import mongoose from 'mongoose';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { Show, ShowSeat, Booking, Payment, User, Refund } from '../src/models/index.js';
import { BOOKING_STATUS, PAYMENT_STATUS, SEAT_STATUS } from '../src/constants/enums.js';

describe('Razorpay Webhook & Payment Capture Engine', () => {
  let testUser;
  let testShow;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    testUser = await User.findOne({ role: 'USER' });
    testShow = await Show.findOne({ status: 'SCHEDULED', startTime: { $gt: new Date() } });
  }, 30000);

  afterAll(async () => {});

  function generateSignature(payloadString) {
    return crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
  }

  test('Rejects webhook request with missing or invalid signature', async () => {
    const payload = JSON.stringify({ event: 'payment.captured' });

    // Missing signature
    const resNoSig = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(resNoSig.status).toBe(400);

    // Invalid signature
    const resBadSig = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid_signature_hex')
      .send(payload);
    expect(resBadSig.status).toBe(400);
  });

  test('Valid payment.captured event atomically confirms Booking and sets ShowSeat to BOOKED', async () => {
    const seatLabel = `WH-A1-${Date.now().toString().slice(-4)}`;
    const orderId = `order_normal_${Date.now()}`;
    const paymentId = `pay_normal_${Date.now()}`;
    const eventId = `evt_normal_${Date.now()}`;

    // Setup seat and booking
    const seat = await ShowSeat.create({
      showId: testShow._id,
      seatLabel,
      category: 'REGULAR',
      price: 20000,
      status: SEAT_STATUS.HELD,
      heldBy: testUser._id,
      holdExpiresAt: new Date(Date.now() + 600000),
    });

    const booking = await Booking.create({
      bookingCode: `IMV-${Date.now().toString().slice(-6)}`,
      userId: testUser._id,
      showId: testShow._id,
      seats: [{ seatLabel, category: 'REGULAR', price: 20000 }],
      subtotal: 20000,
      discount: 0,
      convenienceFee: 1000,
      total: 21000,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
      holdExpiresAt: new Date(Date.now() + 600000),
      razorpayOrderId: orderId,
    });

    await ShowSeat.updateOne({ _id: seat._id }, { $set: { bookingId: booking._id } });

    const eventPayload = {
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 21000,
            method: 'upi',
            status: 'captured',
          },
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    expect(res.status).toBe(200);

    // Verify Booking is now CONFIRMED
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe(BOOKING_STATUS.CONFIRMED);
    expect(updatedBooking.paymentStatus).toBe(PAYMENT_STATUS.SUCCESS);

    // Verify ShowSeat is now BOOKED
    const updatedSeat = await ShowSeat.findById(seat._id);
    expect(updatedSeat.status).toBe(SEAT_STATUS.BOOKED);

    // Verify Payment document was recorded
    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    expect(payment).not.toBeNull();
    expect(payment.status).toBe(PAYMENT_STATUS.SUCCESS);

    // Cleanup
    await Booking.deleteOne({ _id: booking._id });
    await ShowSeat.deleteOne({ _id: seat._id });
    await Payment.deleteMany({ bookingId: booking._id });
  });

  test('Idempotency: Repeated delivery of identical payment.captured event returns 200 without duplicate side effects', async () => {
    const seatLabel = `WH-B1-${Date.now().toString().slice(-4)}`;
    const orderId = `order_idem_${Date.now()}`;
    const paymentId = `pay_idem_${Date.now()}`;
    const eventId = `evt_idem_${Date.now()}`;

    const seat = await ShowSeat.create({
      showId: testShow._id,
      seatLabel,
      category: 'REGULAR',
      price: 25000,
      status: SEAT_STATUS.HELD,
      heldBy: testUser._id,
      holdExpiresAt: new Date(Date.now() + 600000),
    });

    const booking = await Booking.create({
      bookingCode: `IMV-${Date.now().toString().slice(-6)}`,
      userId: testUser._id,
      showId: testShow._id,
      seats: [{ seatLabel, category: 'REGULAR', price: 25000 }],
      subtotal: 25000,
      discount: 0,
      convenienceFee: 1250,
      total: 26250,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
      holdExpiresAt: new Date(Date.now() + 600000),
      razorpayOrderId: orderId,
    });

    await ShowSeat.updateOne({ _id: seat._id }, { $set: { bookingId: booking._id } });

    const eventPayload = {
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 26250,
            method: 'card',
          },
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const signature = generateSignature(payloadString);

    // First delivery -> confirms booking & creates payment record
    const res1 = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);
    expect(res1.status).toBe(200);

    // Second delivery of IDENTICAL event -> intercepted by idempotency check
    const res2 = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    expect(res2.status).toBe(200);
    expect(res2.body.message).toMatch(/already processed/i);

    // Exactly one payment record exists with this paymentId
    const count = await Payment.countDocuments({ razorpayPaymentId: paymentId });
    expect(count).toBe(1);

    // Cleanup
    await Booking.deleteOne({ _id: booking._id });
    await ShowSeat.deleteOne({ _id: seat._id });
    await Payment.deleteMany({ bookingId: booking._id });
  });

  test('Late capture safety: If payment arrives after hold expired but seats are still free, confirms booking', async () => {
    const seatLabel = `WH-LATE-${Date.now().toString().slice(-4)}`;
    const orderId = `order_late_${Date.now()}`;
    const paymentId = `pay_late_${Date.now()}`;
    const eventId = `evt_late_${Date.now()}`;

    // Seat hold expired 5 minutes ago
    const seat = await ShowSeat.create({
      showId: testShow._id,
      seatLabel,
      category: 'REGULAR',
      price: 20000,
      status: SEAT_STATUS.HELD,
      heldBy: testUser._id,
      holdExpiresAt: new Date(Date.now() - 300000), // expired 5 min ago
    });

    const booking = await Booking.create({
      bookingCode: `IMV-${Date.now().toString().slice(-6)}`,
      userId: testUser._id,
      showId: testShow._id,
      seats: [{ seatLabel, category: 'REGULAR', price: 20000 }],
      subtotal: 20000,
      discount: 0,
      convenienceFee: 1000,
      total: 21000,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
      holdExpiresAt: new Date(Date.now() - 300000),
      razorpayOrderId: orderId,
    });

    await ShowSeat.updateOne({ _id: seat._id }, { $set: { bookingId: booking._id } });

    const eventPayload = {
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 21000,
            method: 'upi',
          },
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    expect(res.status).toBe(200);

    // Successfully confirmed because seat was still free!
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe(BOOKING_STATUS.CONFIRMED);

    const updatedSeat = await ShowSeat.findById(seat._id);
    expect(updatedSeat.status).toBe(SEAT_STATUS.BOOKED);

    // Cleanup
    await Booking.deleteOne({ _id: booking._id });
    await ShowSeat.deleteOne({ _id: seat._id });
    await Payment.deleteMany({ bookingId: booking._id });
  });

  test('Late capture safety: If hold expired and seat was re-booked by someone else, auto-refunds and records refund', async () => {
    const seatLabel = `WH-REBOOK-${Date.now().toString().slice(-4)}`;
    const orderId = `order_rebook_${Date.now()}`;
    const paymentId = `pay_rebook_${Date.now()}`;
    const eventId = `evt_rebook_${Date.now()}`;

    // Seat was re-booked by someone else
    const anotherUser = await User.findOne({ email: 'priya@example.com' });
    const seat = await ShowSeat.create({
      showId: testShow._id,
      seatLabel,
      category: 'REGULAR',
      price: 20000,
      status: SEAT_STATUS.BOOKED, // taken!
      heldBy: anotherUser._id,
    });

    const booking = await Booking.create({
      bookingCode: `IMV-${Date.now().toString().slice(-6)}`,
      userId: testUser._id,
      showId: testShow._id,
      seats: [{ seatLabel, category: 'REGULAR', price: 20000 }],
      subtotal: 20000,
      discount: 0,
      convenienceFee: 1000,
      total: 21000,
      status: BOOKING_STATUS.AWAITING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING_PAYMENT,
      holdExpiresAt: new Date(Date.now() - 300000), // expired
      razorpayOrderId: orderId,
    });

    const eventPayload = {
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 21000,
            method: 'netbanking',
          },
        },
      },
    };

    const payloadString = JSON.stringify(eventPayload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    expect(res.status).toBe(200);

    // Booking marked EXPIRED and paymentStatus REFUNDED
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe(BOOKING_STATUS.EXPIRED);
    expect(updatedBooking.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);

    // Refund row created
    const refund = await Refund.findOne({ bookingId: booking._id });
    expect(refund).not.toBeNull();
    expect(refund.status).toBe('PROCESSED');
    expect(refund.amount).toBe(21000);

    // Cleanup
    await Booking.deleteOne({ _id: booking._id });
    await ShowSeat.deleteOne({ _id: seat._id });
    await Payment.deleteMany({ bookingId: booking._id });
    await Refund.deleteMany({ bookingId: booking._id });
  });
});
