import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Movie ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One favorite per user per movie
favoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export const Favorite = mongoose.model('Favorite', favoriteSchema);
