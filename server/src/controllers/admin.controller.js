import {
  Movie,
  Theatre,
  Screen,
  Show,
  ShowSeat,
  Booking,
  Payment,
  Refund,
  User,
  Coupon,
  AuditLog,
  Setting,
  Review,
} from '../models/index.js';
import {
  BOOKING_STATUS,
  SEAT_STATUS,
  SHOW_STATUS,
  AUDIT_ENTITIES,
  CELL_KIND,
  ROLES,
  USER_STATUS,
} from '../constants/enums.js';
import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';
import { cancelShowAndRefundAll } from '../services/refund.service.js';
import { getAdminShowSeats } from '../services/seatAvailability.service.js';
import {
  generateBookingsReportCSV,
  generateRevenueReportCSV,
  generateOccupancyReportCSV,
} from '../services/report.service.js';
import { getISTDayRange, formatISTDateOnly } from '../utils/ist-date.js';
import { cleanupExpiredHolds } from '../jobs/expireHolds.js';
import { apiCache } from '../utils/cache.js';

// Helper to log admin actions inside audit trail
async function logAudit(actor, action, entity, entityId, beforeSnapshot, afterSnapshot, ip) {
  try {
    apiCache.clear();
    await AuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action,
      entity,
      entityId: entityId.toString(),
      beforeSnapshot,
      afterSnapshot,
      ipAddress: ip || '127.0.0.1',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}

// 1. Dashboard Stats
export async function getDashboardStats(req, res, next) {
  try {
    await cleanupExpiredHolds();
    const todayStr = formatISTDateOnly(new Date());
    const { startUTC: todayStart, endUTC: todayEnd } = getISTDayRange(todayStr);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      bookingsTodayCount,
      revenueTodayResult,
      revenueMonthResult,
      totalScreens,
      upcomingShowsCount,
      pendingRefundsCount,
      topMoviesResult,
    ] = await Promise.all([
      Booking.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
      }),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: now },
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Screen.countDocuments(),
      Show.countDocuments({
        startTime: { $gte: now },
        status: SHOW_STATUS.SCHEDULED,
      }),
      Refund.countDocuments({ status: 'PENDING' }),
      Booking.aggregate([
        {
          $match: {
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
          },
        },
        {
          $lookup: {
            from: 'shows',
            localField: 'showId',
            foreignField: '_id',
            as: 'show',
          },
        },
        { $unwind: '$show' },
        {
          $lookup: {
            from: 'movies',
            localField: 'show.movieId',
            foreignField: '_id',
            as: 'movie',
          },
        },
        { $unwind: '$movie' },
        {
          $group: {
            _id: '$movie._id',
            title: { $first: '$movie.title' },
            posterUrl: { $first: '$movie.posterUrl' },
            bookingsCount: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Compute approximate occupancy rate for today
    const activeShowsToday = await Show.find({
      startTime: { $gte: todayStart, $lte: todayEnd },
    }).select('_id');

    let totalSeatsToday = 0;
    let bookedSeatsToday = 0;

    if (activeShowsToday.length > 0) {
      const showIds = activeShowsToday.map((s) => s._id);
      totalSeatsToday = await ShowSeat.countDocuments({ showId: { $in: showIds } });
      bookedSeatsToday = await ShowSeat.countDocuments({
        showId: { $in: showIds },
        status: SEAT_STATUS.BOOKED,
      });
    }

    const occupancyRate = totalSeatsToday > 0 ? Number(((bookedSeatsToday / totalSeatsToday) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      revenueTodayPaise: revenueTodayResult[0]?.total || 0,
      revenueMonthPaise: revenueMonthResult[0]?.total || 0,
      bookingsToday: bookingsTodayCount,
      occupancyRate,
      totalScreens,
      upcomingShowsCount,
      pendingRefundsCount,
      topMovies: topMoviesResult,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Movies CRUD
export async function getAdminMovies(req, res, next) {
  try {
    const { page = 1, limit = 20, q, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$text = { $search: q };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [movies, total] = await Promise.all([
      Movie.find(filter).sort({ releaseDate: -1 }).skip(skip).limit(limitNum).lean(),
      Movie.countDocuments(filter),
    ]);

    return res.status(200).json({ movies, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

export async function createMovie(req, res, next) {
  try {
    const movieData = { ...req.body };
    if (!movieData.synopsis || movieData.synopsis.trim() === '') {
      movieData.synopsis = movieData.title || 'Movie synopsis';
    }
    const movie = await Movie.create(movieData);
    await logAudit(req.user, 'CREATE', AUDIT_ENTITIES.MOVIE, movie._id, null, movie.toObject(), req.ip);

    return res.status(201).json({ movie });
  } catch (error) {
    next(error);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const before = await Movie.findById(req.params.id);
    if (!before) {
      return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });
    }

    const updateData = { ...req.body };
    if (updateData.synopsis !== undefined && (!updateData.synopsis || updateData.synopsis.trim() === '')) {
      updateData.synopsis = updateData.title || before.title || 'Movie synopsis';
    }

    const after = await Movie.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true });
    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.MOVIE, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ movie: after });
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    // Referential integrity check: cannot delete if scheduled shows exist
    const hasShows = await Show.exists({ movieId: req.params.id });
    if (hasShows) {
      return res.status(409).json({
        error: MESSAGES.MOVIE_HAS_SHOWS,
        code: MACHINE_CODES.REFERENTIAL_CONFLICT,
      });
    }

    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });
    }

    await logAudit(req.user, 'DELETE', AUDIT_ENTITIES.MOVIE, movie._id, movie.toObject(), null, req.ip);
    return res.status(200).json({ message: 'Movie deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

// 3. Theatres CRUD
export async function getAdminTheatres(req, res, next) {
  try {
    const theatres = await Theatre.find().sort({ name: 1 }).lean();
    return res.status(200).json({ theatres });
  } catch (error) {
    next(error);
  }
}

export async function createTheatre(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.contact && typeof data.contact === 'object') {
      const phone = data.contact.phone?.trim();
      const email = data.contact.email?.trim();
      if (!phone && !email) {
        data.contact = undefined;
      } else {
        data.contact = {
          ...(phone && { phone }),
          ...(email && { email }),
        };
      }
    } else if (typeof data.contact === 'string') {
      data.contact = data.contact.trim() || undefined;
    }

    const theatre = await Theatre.create(data);
    await logAudit(req.user, 'CREATE', AUDIT_ENTITIES.THEATRE, theatre._id, null, theatre.toObject(), req.ip);
    return res.status(201).json({ theatre });
  } catch (error) {
    next(error);
  }
}

export async function updateTheatre(req, res, next) {
  try {
    const before = await Theatre.findById(req.params.id);
    if (!before) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    const data = { ...req.body };
    if (data.contact && typeof data.contact === 'object') {
      const phone = data.contact.phone?.trim();
      const email = data.contact.email?.trim();
      if (!phone && !email) {
        data.contact = undefined;
      } else {
        data.contact = {
          ...(phone && { phone }),
          ...(email && { email }),
        };
      }
    } else if (typeof data.contact === 'string') {
      data.contact = data.contact.trim() || undefined;
    }

    const after = await Theatre.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.THEATRE, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ theatre: after });
  } catch (error) {
    next(error);
  }
}

export async function deleteTheatre(req, res, next) {
  try {
    const hasScreens = await Screen.exists({ theatreId: req.params.id });
    if (hasScreens) {
      return res.status(409).json({
        error: MESSAGES.THEATRE_HAS_SCREENS,
        code: MACHINE_CODES.REFERENTIAL_CONFLICT,
      });
    }

    const theatre = await Theatre.findByIdAndDelete(req.params.id);
    if (!theatre) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    await logAudit(req.user, 'DELETE', AUDIT_ENTITIES.THEATRE, theatre._id, theatre.toObject(), null, req.ip);
    return res.status(200).json({ message: 'Theatre deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

// 4. Screens & Layout Builder
export async function getAdminScreens(req, res, next) {
  try {
    const filter = {};
    if (req.query.theatreId) filter.theatreId = req.query.theatreId;
    const screens = await Screen.find(filter).populate('theatreId', 'name city').sort({ name: 1 }).lean();
    return res.status(200).json({ screens });
  } catch (error) {
    next(error);
  }
}

export async function createScreen(req, res, next) {
  try {
    const screen = await Screen.create(req.body);
    await logAudit(req.user, 'CREATE', AUDIT_ENTITIES.SCREEN, screen._id, null, screen.toObject(), req.ip);
    return res.status(201).json({ screen });
  } catch (error) {
    next(error);
  }
}

export async function updateScreen(req, res, next) {
  try {
    const before = await Screen.findById(req.params.id);
    if (!before) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    // Prevent modifying layout if shows are already scheduled on this screen
    if (req.body.layout) {
      const hasUpcomingShows = await Show.exists({ screenId: req.params.id, startTime: { $gte: new Date() } });
      if (hasUpcomingShows) {
        return res.status(409).json({
          error: MESSAGES.SCREEN_HAS_SHOWS,
          code: MACHINE_CODES.REFERENTIAL_CONFLICT,
        });
      }
    }

    const after = await Screen.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.SCREEN, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ screen: after });
  } catch (error) {
    next(error);
  }
}

export async function deleteScreen(req, res, next) {
  try {
    const hasShows = await Show.exists({ screenId: req.params.id });
    if (hasShows) {
      return res.status(409).json({
        error: MESSAGES.SCREEN_HAS_SHOWS,
        code: MACHINE_CODES.REFERENTIAL_CONFLICT,
      });
    }

    const screen = await Screen.findByIdAndDelete(req.params.id);
    if (!screen) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    await logAudit(req.user, 'DELETE', AUDIT_ENTITIES.SCREEN, screen._id, screen.toObject(), null, req.ip);
    return res.status(200).json({ message: 'Screen deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

// 5. Shows & Screen Clash Prevention
export async function getAdminShows(req, res, next) {
  try {
    const { date, theatreId, movieId, screenId, status, q, sort = 'asc', page = 1, limit = 50 } = req.query;
    const filter = {};

    if (theatreId) filter.theatreId = theatreId;
    if (movieId) filter.movieId = movieId;
    if (screenId) filter.screenId = screenId;
    if (status) filter.status = status;

    if (date) {
      if (date === 'today') {
        const todayStr = formatISTDateOnly(new Date());
        const { startUTC, endUTC } = getISTDayRange(todayStr);
        filter.startTime = { $gte: startUTC, $lte: endUTC };
      } else if (date === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatISTDateOnly(tomorrow);
        const { startUTC, endUTC } = getISTDayRange(tomorrowStr);
        filter.startTime = { $gte: startUTC, $lte: endUTC };
      } else if (date === 'upcoming') {
        filter.startTime = { $gte: new Date() };
      } else if (date === 'past') {
        filter.startTime = { $lt: new Date() };
      } else if (date !== 'all') {
        const { startUTC, endUTC } = getISTDayRange(date);
        filter.startTime = { $gte: startUTC, $lte: endUTC };
      }
    }

    if (q && q.trim() !== '') {
      const matchingMovies = await Movie.find({
        title: new RegExp(q.trim(), 'i'),
      }).select('_id');
      const movieIds = matchingMovies.map((m) => m._id);
      filter.movieId = { $in: movieIds };
    }

    const sortOrder = sort === 'desc' ? -1 : 1;

    let limitNum = 50;
    if (limit === 'all') {
      limitNum = 500;
    } else {
      limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const skip = limit === 'all' ? 0 : (pageNum - 1) * limitNum;

    const [shows, total] = await Promise.all([
      Show.find(filter)
        .populate('movieId', 'title posterUrl durationMinutes certificate languages formats')
        .populate('theatreId', 'name city')
        .populate('screenId', 'name totalSeats soundSystem')
        .sort({ startTime: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Show.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      shows,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
}

export async function createShow(req, res, next) {
  try {
    const { movieId, screenId, startTime, language, format, pricing } = req.body;

    const [movie, screen] = await Promise.all([Movie.findById(movieId), Screen.findById(screenId)]);
    if (!movie || !screen) {
      return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });
    }

    const start = new Date(startTime);
    // Configurable cleaning buffer of 20 minutes
    const end = new Date(start.getTime() + (movie.durationMinutes + 20) * 60 * 1000);

    // Clash detection on same screen: start < existing.endTime && end > existing.startTime
    const clash = await Show.findOne({
      screenId: screen._id,
      status: SHOW_STATUS.SCHEDULED,
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } },
      ],
    });

    if (clash) {
      return res.status(409).json({
        error: MESSAGES.SHOW_CLASH_DETECTED,
        code: MACHINE_CODES.SHOW_CLASH,
      });
    }

    const reclinerPrice = pricing?.RECLINER || pricing?.VIP || 40000;
    const premiumPrice = pricing?.PREMIUM || 30000;
    const regularPrice = pricing?.REGULAR || 20000;

    const normalizedPricing = {
      REGULAR: Number(regularPrice),
      PREMIUM: Number(premiumPrice),
      RECLINER: Number(reclinerPrice),
      VIP: Number(reclinerPrice),
    };

    const show = await Show.create({
      movieId: movie._id,
      screenId: screen._id,
      theatreId: screen.theatreId,
      startTime: start,
      endTime: end,
      language: language || movie.languages[0],
      format: format || (screen.name.includes('IMAX') ? 'IMAX' : '2D'),
      pricing: normalizedPricing,
      status: SHOW_STATUS.SCHEDULED,
    });

    // Generate ShowSeat inventory
    const seatDocs = [];
    for (const cell of screen.layout.cells) {
      if (cell.kind === CELL_KIND.SEAT && cell.label) {
        const price = normalizedPricing[cell.category] || normalizedPricing.REGULAR;
        seatDocs.push({
          showId: show._id,
          seatLabel: cell.label,
          category: cell.category,
          price,
          status: SEAT_STATUS.AVAILABLE,
        });
      }
    }

    if (seatDocs.length > 0) {
      await ShowSeat.insertMany(seatDocs);
    }

    await logAudit(req.user, 'CREATE', AUDIT_ENTITIES.SHOW, show._id, null, show.toObject(), req.ip);
    return res.status(201).json({ show });
  } catch (error) {
    next(error);
  }
}

export async function updateShow(req, res, next) {
  try {
    const before = await Show.findById(req.params.id);
    if (!before) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    const after = await Show.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.SHOW, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ show: after });
  } catch (error) {
    next(error);
  }
}

export async function deleteShow(req, res, next) {
  try {
    // If show has bookings, invoke cancelShowAndRefundAll
    const hasBookings = await Booking.exists({ showId: req.params.id });
    if (hasBookings) {
      const result = await cancelShowAndRefundAll(req.params.id, req.user);
      await logAudit(req.user, 'CANCEL_AND_REFUND_SHOW', AUDIT_ENTITIES.SHOW, req.params.id, null, result, req.ip);
      return res.status(200).json(result);
    }

    // No bookings -> safe to delete inventory and show
    await ShowSeat.deleteMany({ showId: req.params.id });
    const show = await Show.findByIdAndDelete(req.params.id);
    if (!show) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    await logAudit(req.user, 'DELETE', AUDIT_ENTITIES.SHOW, show._id, show.toObject(), null, req.ip);
    return res.status(200).json({ message: 'Show deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function getAdminShowSeatsHandler(req, res, next) {
  try {
    const seats = await getAdminShowSeats(req.params.id);
    return res.status(200).json({ seats });
  } catch (error) {
    next(error);
  }
}

// 6. Bookings Inspector & Ticket Gate Verification
export async function getAdminBookings(req, res, next) {
  try {
    await cleanupExpiredHolds();
    const { q, status, showId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (showId) filter.showId = showId;
    if (q) {
      filter.$or = [{ bookingCode: new RegExp(q.trim(), 'i') }];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'name email phone')
        .populate({
          path: 'showId',
          populate: [
            { path: 'movieId', select: 'title posterUrl' },
            { path: 'theatreId', select: 'name city' },
            { path: 'screenId', select: 'name' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({ bookings, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

export async function getAdminBookingById(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate({
        path: 'showId',
        populate: [
          { path: 'movieId' },
          { path: 'theatreId' },
          { path: 'screenId' },
        ],
      })
      .lean();

    if (!booking) return res.status(404).json({ error: MESSAGES.BOOKING_NOT_FOUND });

    const [payment, refund] = await Promise.all([
      Payment.findOne({ bookingId: booking._id }).lean(),
      Refund.findOne({ bookingId: booking._id }).lean(),
    ]);

    return res.status(200).json({ booking, payment, refund });
  } catch (error) {
    next(error);
  }
}

export async function verifyTicketGate(req, res, next) {
  try {
    const { bookingCode } = req.body;
    if (!bookingCode) {
      return res.status(400).json({ error: 'Booking code is required for verification.' });
    }

    const code = bookingCode.trim().toUpperCase();
    const booking = await Booking.findOne({ bookingCode: code })
      .populate('userId', 'name email phone')
      .populate({
        path: 'showId',
        populate: [
          { path: 'movieId', select: 'title certificate posterUrl' },
          { path: 'theatreId', select: 'name city' },
          { path: 'screenId', select: 'name' },
        ],
      });

    if (!booking) {
      return res.status(404).json({
        error: MESSAGES.BOOKING_NOT_FOUND,
        code: 'NOT_FOUND',
      });
    }

    if (booking.status === BOOKING_STATUS.USED) {
      return res.status(409).json({
        error: MESSAGES.TICKET_ALREADY_USED,
        code: MACHINE_CODES.TICKET_ALREADY_USED,
        verifiedAt: booking.verifiedAt,
        booking,
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        error: MESSAGES.TICKET_CANCELLED,
        code: MACHINE_CODES.TICKET_CANCELLED,
        booking,
      });
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return res.status(400).json({
        error: `Cannot verify ticket with status: ${booking.status}`,
        booking,
      });
    }

    // Mark as USED
    booking.status = BOOKING_STATUS.USED;
    booking.verifiedAt = new Date();
    booking.verifiedBy = req.user._id;
    await booking.save();

    await logAudit(req.user, 'VERIFY_TICKET', AUDIT_ENTITIES.BOOKING, booking._id, { status: 'CONFIRMED' }, { status: 'USED' }, req.ip);

    return res.status(200).json({
      valid: true,
      message: MESSAGES.TICKET_VERIFIED_SUCCESS,
      booking,
      verifiedAt: booking.verifiedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: MESSAGES.BOOKING_NOT_FOUND });
    }

    // Release any seats that were held or reserved by this booking
    await ShowSeat.updateMany(
      { bookingId: booking._id },
      {
        $set: {
          status: SEAT_STATUS.AVAILABLE,
          heldBy: undefined,
          holdExpiresAt: undefined,
          bookingId: undefined,
        },
      }
    );

    await Booking.findByIdAndDelete(req.params.id);
    await logAudit(req.user, 'DELETE', 'BOOKING', booking._id, booking.toObject(), null, req.ip);

    return res.status(200).json({ message: 'Booking removed successfully from ledger.' });
  } catch (error) {
    next(error);
  }
}

// 7. Payments & Refunds Ledger
export async function getAdminPayments(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email phone')
        .populate('bookingId', 'bookingCode status total')
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({ payments, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

export async function getAdminRefunds(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate('bookingId', 'bookingCode status total')
        .sort({ processedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Refund.countDocuments(filter),
    ]);

    return res.status(200).json({ refunds, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

// 8. Users Administration
export async function getAdminUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, q, role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: new RegExp(q.trim(), 'i') },
        { email: new RegExp(q.trim(), 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users: users.map((u) => {
        delete u.passwordHash;
        return u;
      }),
      total,
      page: pageNum,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    const before = user.toObject();
    user.status = status;
    await user.save();

    await logAudit(req.user, 'UPDATE_USER_STATUS', AUDIT_ENTITIES.USER, user._id, before, user.toObject(), req.ip);
    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function createOrPromoteAdmin(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });
    const before = user ? user.toObject() : null;

    if (user) {
      user.role = ROLES.ADMIN;
      user.status = USER_STATUS.ACTIVE;
      if (name && name.trim()) user.name = name.trim();
      if (phone && phone.trim()) user.phone = phone.trim();
      if (password && password.trim()) {
        user.passwordHash = await User.hashPassword(password.trim());
      }
      await user.save();
    } else {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Full name is required to create a new admin.' });
      }
      const initialPassword = password && password.trim() ? password.trim() : 'Admin@123';
      const passwordHash = await User.hashPassword(initialPassword);

      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone && phone.trim() ? phone.trim() : undefined,
        passwordHash,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        authProvider: 'LOCAL',
      });
    }

    await logAudit(
      req.user,
      before ? 'PROMOTE_ADMIN' : 'CREATE_ADMIN',
      AUDIT_ENTITIES.USER,
      user._id,
      before,
      user.toObject(),
      req.ip
    );

    return res.status(201).json({
      message: `Admin access granted to ${user.email} successfully.`,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('[CREATE ADMIN ERROR]:', error);
    next(error);
  }
}

// 9. Coupons CRUD
export async function getAdminCoupons(req, res, next) {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ coupons });
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.code) data.code = data.code.trim().toUpperCase();
    if (data.discountType === 'PERCENTAGE') data.discountType = COUPON_TYPE.PERCENT;
    if (data.minOrderAmount !== undefined && data.minAmount === undefined) {
      data.minAmount = data.minOrderAmount;
    }
    if (data.maxDiscountAmount !== undefined && data.maxDiscount === undefined) {
      data.maxDiscount = data.maxDiscountAmount;
    }
    if (data.maxUses !== undefined && data.usageLimit === undefined) {
      data.usageLimit = data.maxUses;
    }
    if (!data.validFrom) {
      data.validFrom = new Date();
    }

    const coupon = await Coupon.create(data);
    await logAudit(req.user, 'CREATE', AUDIT_ENTITIES.COUPON, coupon._id, null, coupon.toObject(), req.ip);
    return res.status(201).json({ coupon });
  } catch (error) {
    next(error);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const before = await Coupon.findById(req.params.id);
    if (!before) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    const data = { ...req.body };
    if (data.code) data.code = data.code.trim().toUpperCase();
    if (data.discountType === 'PERCENTAGE') data.discountType = COUPON_TYPE.PERCENT;
    if (data.minOrderAmount !== undefined && data.minAmount === undefined) {
      data.minAmount = data.minOrderAmount;
    }
    if (data.maxDiscountAmount !== undefined && data.maxDiscount === undefined) {
      data.maxDiscount = data.maxDiscountAmount;
    }
    if (data.maxUses !== undefined && data.usageLimit === undefined) {
      data.usageLimit = data.maxUses;
    }

    const after = await Coupon.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.COUPON, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ coupon: after });
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    await logAudit(req.user, 'DELETE', AUDIT_ENTITIES.COUPON, coupon._id, coupon.toObject(), null, req.ip);
    return res.status(200).json({ message: 'Coupon deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

// 10. Reports (CSV Export)
export async function exportReportCSV(req, res, next) {
  try {
    const { type } = req.params;
    const { range, from, to } = req.query;

    let csvContent = '';
    let filename = `imovies_${type}_${Date.now()}.csv`;

    if (type === 'bookings') {
      csvContent = await generateBookingsReportCSV({ range, from, to });
    } else if (type === 'revenue') {
      csvContent = await generateRevenueReportCSV({ range, from, to });
    } else if (type === 'occupancy') {
      csvContent = await generateOccupancyReportCSV({ range, from, to });
    } else {
      return res.status(400).json({ error: 'Invalid report type. Valid options: bookings, revenue, occupancy.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

// 11. Audit Logs
export async function getAdminAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, entity } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({ logs, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

// 12. Settings
export async function getAdminSettings(req, res, next) {
  try {
    const settings = await Setting.getSettings();
    return res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminSettings(req, res, next) {
  try {
    const before = await Setting.getSettings();
    const after = await Setting.findOneAndUpdate({}, { $set: req.body }, { new: true, runValidators: true });
    Setting.clearCache();

    await logAudit(req.user, 'UPDATE', AUDIT_ENTITIES.SETTING, after._id, before.toObject(), after.toObject(), req.ip);
    return res.status(200).json({ settings: after });
  } catch (error) {
    next(error);
  }
}

// 13. Reviews Moderation
export async function getAdminReviews(req, res, next) {
  try {
    const { page = 1, limit = 20, movieId } = req.query;
    const filter = {};
    if (movieId) filter.movieId = movieId;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name email')
        .populate('movieId', 'title posterUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({ reviews, total, page: pageNum });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminReview(req, res, next) {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: MESSAGES.RESOURCE_NOT_FOUND });

    await logAudit(
      req.user,
      'DELETE_REVIEW',
      AUDIT_ENTITIES.USER,
      review._id,
      review.toObject(),
      null,
      req.ip
    );

    return res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
