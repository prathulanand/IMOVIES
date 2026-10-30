import mongoose from 'mongoose';
import { COUPON_TYPE } from '../constants/enums.js';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: [...Object.values(COUPON_TYPE), 'PERCENTAGE'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDiscount: {
      type: Number, // in paise
      default: undefined,
    },
    minAmount: {
      type: Number, // in paise
      default: 0,
      min: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Coupon = mongoose.model('Coupon', couponSchema);
