import mongoose from 'mongoose';
import { FORMATS, SHOW_STATUS } from '../constants/enums.js';

const showSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Movie ID is required'],
      index: true,
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: [true, 'Screen ID is required'],
      index: true,
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: [true, 'Theatre ID is required'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
    },
    format: {
      type: String,
      enum: Object.values(FORMATS),
      default: FORMATS.TWO_D,
    },
    pricing: {
      REGULAR: { type: Number, required: true, min: 0 }, // in paise
      PREMIUM: { type: Number, required: true, min: 0 }, // in paise
      RECLINER: { type: Number, required: true, min: 0 }, // in paise
      VIP: { type: Number, default: undefined },
    },
    status: {
      type: String,
      enum: Object.values(SHOW_STATUS),
      default: SHOW_STATUS.SCHEDULED,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to detect overlapping shows on a screen and for show searching
showSchema.index({ screenId: 1, startTime: 1, endTime: 1 });
showSchema.index({ movieId: 1, startTime: 1, status: 1 });
showSchema.index({ theatreId: 1, startTime: 1, status: 1 });
showSchema.index({ movieId: 1, theatreId: 1, status: 1, startTime: 1 });

export const Show = mongoose.model('Show', showSchema);
