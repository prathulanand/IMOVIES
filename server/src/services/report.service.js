import { Booking } from '../models/Booking.js';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { generateCSV } from '../utils/csv.js';
import { formatIST, getISTDayRange } from '../utils/ist-date.js';
import { BOOKING_STATUS, SEAT_STATUS } from '../constants/enums.js';

const MAX_RANGE_DAYS = 732; // ~2 years

/**
 * Validates and extracts start and end UTC timestamps for a report range.
 * Throws clear error sentences if malformed or range exceeded.
 */
export function parseReportDateRange(range = 'month', from, to) {
  const now = new Date();

  if (range === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: startOfMonth,
      endDate: now,
    };
  }

  if (range === 'all') {
    return {
      startDate: new Date(now.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000),
      endDate: now,
    };
  }

  if (range === 'custom') {
    if (!from || !to) {
      const err = new Error('Custom range requires both "from" and "to" query parameters in YYYY-MM-DD format.');
      err.statusCode = 400;
      throw err;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const err = new Error('Invalid date format for report range. Please use YYYY-MM-DD.');
      err.statusCode = 400;
      throw err;
    }

    const { startUTC } = getISTDayRange(from);
    const { endUTC } = getISTDayRange(to);

    if (startUTC > endUTC) {
      const err = new Error('The "from" date must be before or equal to the "to" date.');
      err.statusCode = 400;
      throw err;
    }

    const diffDays = Math.ceil((endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_RANGE_DAYS) {
      const err = new Error(`Report range cannot exceed ${MAX_RANGE_DAYS} days (requested: ${diffDays} days).`);
      err.statusCode = 400;
      throw err;
    }

    return { startDate: startUTC, endDate: endUTC };
  }

  const err = new Error('Invalid range parameter. Valid values are "all", "month", or "custom".');
  err.statusCode = 400;
  throw err;
}

/**
 * Generates Bookings CSV report.
 */
export async function generateBookingsReportCSV({ range, from, to }) {
  const { startDate, endDate } = parseReportDateRange(range, from, to);

  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .populate('userId', 'name email phone')
    .populate({
      path: 'showId',
      populate: [{ path: 'movieId', select: 'title' }, { path: 'theatreId', select: 'name city' }],
    })
    .sort({ createdAt: -1 })
    .lean();

  const fields = [
    { label: 'Booking Code', key: 'bookingCode' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Customer Email', key: 'customerEmail' },
    { label: 'Movie Title', key: 'movieTitle' },
    { label: 'Theatre', key: 'theatre' },
    { label: 'City', key: 'city' },
    { label: 'Show Time (IST)', key: 'showTime' },
    { label: 'Seats', key: 'seatLabels' },
    { label: 'Subtotal (INR)', key: 'subtotal' },
    { label: 'Discount (INR)', key: 'discount' },
    { label: 'Convenience Fee (INR)', key: 'convenienceFee' },
    { label: 'Total (INR)', key: 'total' },
    { label: 'Status', key: 'status' },
    { label: 'Payment Status', key: 'paymentStatus' },
    { label: 'Booked At (IST)', key: 'bookedAt' },
  ];

  const data = bookings.map((b) => ({
    bookingCode: b.bookingCode,
    customerName: b.userId?.name || 'N/A',
    customerEmail: b.userId?.email || 'N/A',
    movieTitle: b.showId?.movieId?.title || 'N/A',
    theatre: b.showId?.theatreId?.name || 'N/A',
    city: b.showId?.theatreId?.city || 'N/A',
    showTime: formatIST(b.showId?.startTime),
    seatLabels: b.seats.map((s) => s.seatLabel).join('; '),
    subtotal: (b.subtotal / 100).toFixed(2),
    discount: (b.discount / 100).toFixed(2),
    convenienceFee: (b.convenienceFee / 100).toFixed(2),
    total: (b.total / 100).toFixed(2),
    status: b.status,
    paymentStatus: b.paymentStatus,
    bookedAt: formatIST(b.createdAt),
  }));

  return generateCSV(data, fields);
}

/**
 * Generates Revenue CSV report.
 */
export async function generateRevenueReportCSV({ range, from, to }) {
  const { startDate, endDate } = parseReportDateRange(range, from, to);

  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
  })
    .populate({
      path: 'showId',
      populate: [{ path: 'movieId', select: 'title' }, { path: 'theatreId', select: 'name city' }],
    })
    .lean();

  const fields = [
    { label: 'Booking Code', key: 'bookingCode' },
    { label: 'Movie', key: 'movie' },
    { label: 'Theatre', key: 'theatre' },
    { label: 'City', key: 'city' },
    { label: 'Gross Ticket Revenue (INR)', key: 'subtotal' },
    { label: 'Discounts Given (INR)', key: 'discount' },
    { label: 'Convenience Fee Collected (INR)', key: 'fee' },
    { label: 'Net Collected (INR)', key: 'total' },
    { label: 'Date (IST)', key: 'date' },
  ];

  const data = bookings.map((b) => ({
    bookingCode: b.bookingCode,
    movie: b.showId?.movieId?.title || 'N/A',
    theatre: b.showId?.theatreId?.name || 'N/A',
    city: b.showId?.theatreId?.city || 'N/A',
    subtotal: (b.subtotal / 100).toFixed(2),
    discount: (b.discount / 100).toFixed(2),
    fee: (b.convenienceFee / 100).toFixed(2),
    total: (b.total / 100).toFixed(2),
    date: formatIST(b.createdAt),
  }));

  return generateCSV(data, fields);
}

/**
 * Generates Occupancy CSV report.
 */
export async function generateOccupancyReportCSV({ range, from, to }) {
  const { startDate, endDate } = parseReportDateRange(range, from, to);

  const shows = await Show.find({
    startTime: { $gte: startDate, $lte: endDate },
  })
    .populate('movieId', 'title')
    .populate('theatreId', 'name city')
    .populate('screenId', 'name totalSeats')
    .lean();

  const fields = [
    { label: 'Show ID', key: 'showId' },
    { label: 'Movie', key: 'movie' },
    { label: 'Theatre', key: 'theatre' },
    { label: 'City', key: 'city' },
    { label: 'Screen', key: 'screen' },
    { label: 'Show Time (IST)', key: 'showTime' },
    { label: 'Total Seats', key: 'totalSeats' },
    { label: 'Booked Seats', key: 'bookedSeats' },
    { label: 'Occupancy %', key: 'occupancyPercent' },
  ];

  const data = [];
  for (const show of shows) {
    const totalSeats = show.screenId?.totalSeats || 0;
    const bookedCount = await ShowSeat.countDocuments({
      showId: show._id,
      status: SEAT_STATUS.BOOKED,
    });

    const percent = totalSeats > 0 ? ((bookedCount / totalSeats) * 100).toFixed(1) : '0.0';

    data.push({
      showId: show._id.toString(),
      movie: show.movieId?.title || 'N/A',
      theatre: show.theatreId?.name || 'N/A',
      city: show.theatreId?.city || 'N/A',
      screen: show.screenId?.name || 'N/A',
      showTime: formatIST(show.startTime),
      totalSeats,
      bookedSeats: bookedCount,
      occupancyPercent: `${percent}%`,
    });
  }

  return generateCSV(data, fields);
}
