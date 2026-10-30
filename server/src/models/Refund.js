import mongoose from 'mongoose';
import { REFUND_STATUS } from '../constants/enums.js';

const refundSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount in paise is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      trim: true,
    },
    razorpayRefundId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    processedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

export const Refund = mongoose.model('Refund', refundSchema);
