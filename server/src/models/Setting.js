import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    holdDurationMinutes: {
      type: Number,
      default: 7,
      min: [3, 'Hold duration must be at least 3 minutes'],
      max: [15, 'Hold duration cannot exceed 15 minutes'],
    },
    convenienceFeePercent: {
      type: Number,
      default: 5,
      min: 0,
      max: 20,
    },
    maxSeatsPerBooking: {
      type: Number,
      default: 8,
      min: 1,
      max: 10,
    },
    cancellationPolicy: {
      windows: [
        {
          hoursBeforeShow: { type: Number, required: true },
          refundPercent: { type: Number, required: true, min: 0, max: 100 },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

let cachedSettings = null;
let cacheExpiresAt = 0;

// Singleton helper: get or create settings with fast in-memory caching
settingSchema.statics.getSettings = async function (forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      holdDurationMinutes: 7,
      convenienceFeePercent: 5,
      maxSeatsPerBooking: 8,
      cancellationPolicy: {
        windows: [
          { hoursBeforeShow: 4, refundPercent: 90 },
          { hoursBeforeShow: 1, refundPercent: 50 },
          { hoursBeforeShow: 0, refundPercent: 0 },
        ],
      },
    });
  }
  cachedSettings = settings;
  cacheExpiresAt = now + 60 * 1000; // 60 seconds TTL
  return settings;
};

settingSchema.statics.clearCache = function () {
  cachedSettings = null;
  cacheExpiresAt = 0;
};

export const Setting = mongoose.model('Setting', settingSchema);
