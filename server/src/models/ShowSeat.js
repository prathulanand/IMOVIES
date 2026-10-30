import mongoose from 'mongoose';
import { SEAT_CATEGORIES, SEAT_STATUS } from '../constants/enums.js';

const showSeatSchema = new mongoose.Schema(
  {
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show ID is required'],
      index: true,
    },
    seatLabel: {
      type: String,
      required: [true, 'Seat label is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(SEAT_CATEGORIES),
      default: SEAT_CATEGORIES.REGULAR,
    },
    price: {
      type: Number,
      required: [true, 'Seat price in paise is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(SEAT_STATUS),
      default: SEAT_STATUS.AVAILABLE,
      index: true,
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    holdExpiresAt: {
      type: Date,
      default: undefined,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX: Guarantees concurrency safety per seat per show
showSeatSchema.index({ showId: 1, seatLabel: 1 }, { unique: true });

// Read & hold queries index
showSeatSchema.index({ showId: 1, status: 1, holdExpiresAt: 1 });

export const ShowSeat = mongoose.model('ShowSeat', showSeatSchema);
