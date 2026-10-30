import { Movie } from '../models/Movie.js';
import { Theatre } from '../models/Theatre.js';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Review } from '../models/Review.js';
import { getShowSeatsWithStatus, resolveSeatStatus } from '../services/seatAvailability.service.js';
import { getISTDayRange, formatISTDateOnly } from '../utils/ist-date.js';
import { MOVIE_STATUS, SHOW_STATUS, SEAT_STATUS } from '../constants/enums.js';
import { MESSAGES } from '../constants/messages.js';
import { apiCache } from '../utils/cache.js';

export async function getMovies(req, res, next) {
  try {
    const { status, language, genre, q, city, page = 1, limit = 12 } = req.query;

    const cacheKey = `movies:${status || ''}:${language || ''}:${genre || ''}:${q || ''}:${city || ''}:${page}:${limit}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: MOVIE_STATUS.ARCHIVED };
    }

    if (language) {
      filter.languages = language;
    }

    if (genre) {
      filter.genres = genre;
    }

    if (q && q.trim() !== '') {
      filter.$text = { $search: q.trim() };
    }

    // Filter by city: find theatres in this city, then find movies with shows in those theatres
    if (city && city.trim() !== '') {
      const theatres = await Theatre.find({ city: new RegExp(`^${city.trim()}$`, 'i') }).select('_id').lean();
      const theatreIds = theatres.map((t) => t._id);

      const [activeShows, allNowShowing] = await Promise.all([
        Show.find({
          theatreId: { $in: theatreIds },
          startTime: { $gte: new Date() },
          status: SHOW_STATUS.SCHEDULED,
        }).select('movieId').lean(),
        Movie.find({ status: MOVIE_STATUS.NOW_SHOWING }).select('_id').lean(),
      ]);

      const movieIdsWithShows = activeShows.map((s) => s.movieId.toString());
      const allNowShowingIds = allNowShowing.map((m) => m._id.toString());

      filter._id = { $in: [...new Set([...movieIdsWithShows, ...allNowShowingIds])] };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [movies, total] = await Promise.all([
      Movie.find(filter).sort({ releaseDate: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Movie.countDocuments(filter),
    ]);

    // Attach review counts and ratings
    const movieIds = movies.map((m) => m._id);
    const ratings = await Review.aggregate([
      { $match: { movieId: { $in: movieIds } } },
      {
        $group: {
          _id: '$movieId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const ratingMap = new Map();
    ratings.forEach((r) => {
      ratingMap.set(r._id.toString(), {
        avgRating: Number(r.avgRating.toFixed(1)),
        reviewCount: r.reviewCount,
      });
    });

    const enrichedMovies = movies.map((m) => ({
      ...m,
      avgRating: ratingMap.get(m._id.toString())?.avgRating || null,
      reviewCount: ratingMap.get(m._id.toString())?.reviewCount || 0,
    }));

    const responsePayload = {
      movies: enrichedMovies,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };

    // Cache results for 30 seconds
    apiCache.set(cacheKey, responsePayload, 30);

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getMovieById(req, res, next) {
  try {
    const { id } = req.params;
    const cacheKey = `movie:${id}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const movie = await Movie.findById(id).lean();
    if (!movie) {
      return res.status(404).json({
        error: MESSAGES.RESOURCE_NOT_FOUND,
        code: 'NOT_FOUND',
      });
    }

    // Parallelize reviews and rating aggregation
    const [reviews, ratingStats] = await Promise.all([
      Review.find({ movieId: movie._id })
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Review.aggregate([
        { $match: { movieId: movie._id } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const result = {
      movie: {
        ...movie,
        avgRating: ratingStats[0] ? Number(ratingStats[0].avgRating.toFixed(1)) : null,
        reviewCount: ratingStats[0] ? ratingStats[0].reviewCount : 0,
        recentReviews: reviews.map((r) => ({
          _id: r._id,
          userName: r.userId?.name || 'Anonymous',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
        })),
      },
    };

    apiCache.set(cacheKey, result, 60);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMovieShows(req, res, next) {
  try {
    const { id } = req.params;
    const { city, date } = req.query;

    // Default to today in IST
    const targetDateStr = date || formatISTDateOnly(new Date());

    const cacheKey = `shows:${id}:${city || ''}:${targetDateStr}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const movie = await Movie.findById(id).lean();
    if (!movie) {
      return res.status(404).json({
        error: MESSAGES.RESOURCE_NOT_FOUND,
        code: 'NOT_FOUND',
      });
    }

    const { startUTC, endUTC } = getISTDayRange(targetDateStr);

    const theatreQuery = {};
    if (city && city.trim() !== '') {
      theatreQuery.city = new RegExp(`^${city.trim()}$`, 'i');
    }

    const matchingTheatres = await Theatre.find(theatreQuery).lean();
    const theatreIds = matchingTheatres.map((t) => t._id);

    // Shows for this movie in matching theatres within IST day range
    const now = new Date();
    const effectiveStart = startUTC < now ? now : startUTC;

    const shows = await Show.find({
      movieId: movie._id,
      theatreId: { $in: theatreIds },
      startTime: { $gte: effectiveStart, $lte: endUTC },
      status: SHOW_STATUS.SCHEDULED,
    })
      .populate('screenId', 'name totalSeats')
      .sort({ startTime: 1 })
      .lean();

    // Group by Theatre
    const theatreMap = new Map();
    matchingTheatres.forEach((t) => {
      theatreMap.set(t._id.toString(), {
        theatre: t,
        screens: new Map(),
      });
    });

    // HIGH SPEED OPTIMIZATION: Batch fetch ALL seats for all shows in 1 single query (replaces N+1 DB loop)
    const showIds = shows.map((s) => s._id);
    const allSeats = await ShowSeat.find(
      { showId: { $in: showIds } },
      'showId status holdExpiresAt'
    ).lean();

    const seatsByShowId = new Map();
    for (const seat of allSeats) {
      const sId = seat.showId.toString();
      if (!seatsByShowId.has(sId)) {
        seatsByShowId.set(sId, []);
      }
      seatsByShowId.get(sId).push(seat);
    }

    for (const show of shows) {
      const tKey = show.theatreId.toString();
      if (!theatreMap.has(tKey)) continue;

      const group = theatreMap.get(tKey);
      const sKey = show.screenId._id.toString();

      if (!group.screens.has(sKey)) {
        group.screens.set(sKey, {
          screen: show.screenId,
          shows: [],
        });
      }

      // Check availability indicator in-memory instantly using single source of truth
      const totalSeats = show.screenId.totalSeats || 60;
      const showSeats = seatsByShowId.get(show._id.toString()) || [];
      const availableCount = showSeats.filter((s) => resolveSeatStatus(s, now) === SEAT_STATUS.AVAILABLE).length;

      let availability = 'AVAILABLE';
      const availableRatio = availableCount / totalSeats;
      if (availableCount === 0) {
        availability = 'SOLD_OUT';
      } else if (availableRatio < 0.25) {
        availability = 'FILLING_FAST';
      }

      // Price starting from lowest category
      const startingPrice = Math.min(...Object.values(show.pricing));

      group.screens.get(sKey).shows.push({
        _id: show._id,
        startTime: show.startTime,
        endTime: show.endTime,
        language: show.language,
        format: show.format,
        pricing: show.pricing,
        startingPrice,
        availability,
        availableSeatsCount: availableCount,
      });
    }

    // Convert nested map to clean JSON array
    const result = [];
    for (const [, val] of theatreMap.entries()) {
      const screenList = [];
      for (const [, sVal] of val.screens.entries()) {
        if (sVal.shows.length > 0) {
          screenList.push({
            screen: sVal.screen,
            shows: sVal.shows,
          });
        }
      }
      if (screenList.length > 0) {
        result.push({
          theatre: val.theatre,
          screens: screenList,
        });
      }
    }

    const payload = {
      date: targetDateStr,
      theatres: result,
    };

    // Cache showtimes for 15 seconds
    apiCache.set(cacheKey, payload, 15);

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getCities(req, res, next) {
  try {
    const cached = apiCache.get('public_cities');
    if (cached) {
      return res.status(200).json(cached);
    }

    const cities = await Theatre.distinct('city');
    const payload = {
      cities: cities.sort(),
    };

    apiCache.set('public_cities', payload, 300); // 5 minutes TTL
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getShowSeats(req, res, next) {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movieId', 'title posterUrl durationMinutes certificate')
      .populate('theatreId', 'name city address')
      .populate('screenId')
      .lean();

    if (!show) {
      return res.status(404).json({
        error: MESSAGES.RESOURCE_NOT_FOUND,
        code: 'NOT_FOUND',
      });
    }

    // Fetch seats with authoritative resolved status
    const seats = await getShowSeatsWithStatus(show._id);

    return res.status(200).json({
      show: {
        _id: show._id,
        startTime: show.startTime,
        endTime: show.endTime,
        language: show.language,
        format: show.format,
        pricing: show.pricing,
        movie: show.movieId,
        theatre: show.theatreId,
        screen: {
          _id: show.screenId._id,
          name: show.screenId.name,
          layout: show.screenId.layout,
        },
      },
      seats,
    });
  } catch (error) {
    next(error);
  }
}
