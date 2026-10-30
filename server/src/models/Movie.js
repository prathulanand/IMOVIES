import mongoose from 'mongoose';
import { MOVIE_STATUS, CERTIFICATES } from '../constants/enums.js';

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
      index: true,
    },
    posterUrl: {
      type: String,
      required: [true, 'Poster URL is required'],
      trim: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    synopsis: {
      type: String,
      default: function () {
        return this?.title ? `${this.title} storyline summary.` : 'Movie synopsis';
      },
      trim: true,
    },
    cast: {
      type: [String],
      default: [],
    },
    director: {
      type: String,
      trim: true,
      default: undefined,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    genres: {
      type: [String],
      required: [true, 'At least one genre is required'],
      index: true,
    },
    languages: {
      type: [String],
      required: [true, 'At least one language is required'],
      index: true,
    },
    certificate: {
      type: String,
      enum: Object.values(CERTIFICATES),
      default: CERTIFICATES.UA,
    },
    releaseDate: {
      type: Date,
      required: [true, 'Release date is required'],
    },
    status: {
      type: String,
      enum: Object.values(MOVIE_STATUS),
      default: MOVIE_STATUS.NOW_SHOWING,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast query & sorting indexes
movieSchema.index({ status: 1, releaseDate: -1, createdAt: -1 });
movieSchema.index({ status: 1, languages: 1 });
movieSchema.index({ status: 1, genres: 1 });

// Search index on title, director and cast
movieSchema.index({ title: 'text', synopsis: 'text', director: 'text' });

export const Movie = mongoose.model('Movie', movieSchema);
