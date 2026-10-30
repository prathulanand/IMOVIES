import mongoose from 'mongoose';
import { CELL_KIND, SEAT_CATEGORIES } from '../constants/enums.js';

const cellSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    label: { type: String, trim: true, default: '' }, // e.g., 'A1' or '' for aisle
    category: {
      type: String,
      enum: [...Object.values(SEAT_CATEGORIES), 'NONE'],
      default: SEAT_CATEGORIES.REGULAR,
    },
    kind: {
      type: String,
      enum: Object.values(CELL_KIND),
      default: CELL_KIND.SEAT,
    },
  },
  { _id: false }
);

const screenSchema = new mongoose.Schema(
  {
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: [true, 'Theatre ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Screen name is required'],
      trim: true,
    },
    soundSystem: {
      type: String,
      trim: true,
      default: 'Dolby Atmos 7.1',
    },
    totalSeats: {
      type: Number,
      required: true,
      min: [1, 'Screen must have at least 1 seat'],
    },
    layout: {
      rows: { type: Number, required: true, min: 1 },
      cols: { type: Number, required: true, min: 1 },
      cells: [cellSchema],
    },
    categoryConfig: [
      {
        category: {
          type: String,
          enum: Object.values(SEAT_CATEGORIES),
          required: true,
        },
        defaultPricePaise: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

screenSchema.index({ theatreId: 1, name: 1 }, { unique: true });

export const Screen = mongoose.model('Screen', screenSchema);
