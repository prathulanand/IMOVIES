import mongoose from 'mongoose';

const theatreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Theatre name is required'],
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    contact: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    coordinates: {
      lat: { type: Number, default: undefined },
      lng: { type: Number, default: undefined },
    },
  },
  {
    timestamps: true,
  }
);

theatreSchema.index({ city: 1, name: 1 });

export const Theatre = mongoose.model('Theatre', theatreSchema);
