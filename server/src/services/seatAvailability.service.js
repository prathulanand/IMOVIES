import { ShowSeat } from '../models/ShowSeat.js';
import { SEAT_STATUS } from '../constants/enums.js';

/**
 * Pure evaluation function: single source of truth for seat status across the entire application.
 * Used by seat-map API, hold requests, payment verification, and admin occupancy inspector.
 *
 * @param {Object} seat - ShowSeat document or plain object with status and holdExpiresAt
 * @param {Date} [now=new Date()]
 * @returns {'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED'}
 */
export function resolveSeatStatus(seat, now = new Date()) {
  if (!seat) return SEAT_STATUS.AVAILABLE;

  if (seat.status === SEAT_STATUS.BLOCKED) {
    return SEAT_STATUS.BLOCKED;
  }

  if (seat.status === SEAT_STATUS.BOOKED) {
    return SEAT_STATUS.BOOKED;
  }

  if (seat.status === SEAT_STATUS.HELD) {
    // If hold has expired, it is immediately available on the fly without waiting for cron
    if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) < now) {
      return SEAT_STATUS.AVAILABLE;
    }
    return SEAT_STATUS.HELD;
  }

  return SEAT_STATUS.AVAILABLE;
}

/**
 * Checks whether a single seat is currently free for holding/booking.
 * @param {Object} seat
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isSeatFree(seat, now = new Date()) {
  const status = resolveSeatStatus(seat, now);
  return status === SEAT_STATUS.AVAILABLE;
}

/**
 * Retrieves all seats for a given show with resolved statuses (no personal data for public maps).
 * @param {string|mongoose.Types.ObjectId} showId
 * @param {Date} [now=new Date()]
 * @returns {Promise<Array>}
 */
export async function getShowSeatsWithStatus(showId, now = new Date()) {
  const seats = await ShowSeat.find({ showId }).lean();

  return seats.map((seat) => ({
    _id: seat._id,
    showId: seat.showId,
    seatLabel: seat.seatLabel,
    category: seat.category,
    price: seat.price,
    status: resolveSeatStatus(seat, now),
  }));
}

/**
 * Retrieves all seats for admin with occupant & booking details.
 * @param {string|mongoose.Types.ObjectId} showId
 * @param {Date} [now=new Date()]
 * @returns {Promise<Array>}
 */
export async function getAdminShowSeats(showId, now = new Date()) {
  const seats = await ShowSeat.find({ showId })
    .populate('heldBy', 'name email phone')
    .populate('bookingId', 'bookingCode status total paymentStatus createdAt')
    .lean();

  return seats.map((seat) => ({
    _id: seat._id,
    seatLabel: seat.seatLabel,
    category: seat.category,
    price: seat.price,
    status: resolveSeatStatus(seat, now),
    rawStatus: seat.status,
    holdExpiresAt: seat.holdExpiresAt,
    heldBy: seat.heldBy ? { name: seat.heldBy.name, email: seat.heldBy.email, phone: seat.heldBy.phone } : null,
    booking: seat.bookingId
      ? {
          bookingCode: seat.bookingId.bookingCode,
          status: seat.bookingId.status,
          total: seat.bookingId.total,
          createdAt: seat.bookingId.createdAt,
        }
      : null,
  }));
}
