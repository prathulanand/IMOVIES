import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/enums.js';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      min: 0,
    },
    method: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING_PAYMENT,
      index: true,
    },
    paidAt: {
      type: Date,
      default: undefined,
    },
    // Used to guarantee webhook idempotency
    rawEventId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
