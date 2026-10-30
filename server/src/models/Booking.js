import mongoose from 'mongoose';
import { BOOKING_STATUS, PAYMENT_STATUS, SEAT_CATEGORIES } from '../constants/enums.js';

const seatSnapshotSchema = new mongoose.Schema(
  {
    seatLabel: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(SEAT_CATEGORIES),
      required: true,
    },
    price: { type: Number, required: true, min: 0 }, // in paise
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: [true, 'Booking code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show ID is required'],
      index: true,
    },
    seats: {
      type: [seatSnapshotSchema],
      required: [true, 'At least one seat is required'],
      validate: [(val) => val.length > 0, 'At least one seat must be selected'],
    },
    // Immutable booking-time financial snapshots (all stored in integer paise)
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    convenienceFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.AWAITING_PAYMENT,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING_PAYMENT,
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
      default: undefined,
    },
    verifiedAt: {
      type: Date,
      default: undefined,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ showId: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
