import cron from 'node-cron';
import { ShowSeat } from '../models/ShowSeat.js';
import { Booking } from '../models/Booking.js';
import { SEAT_STATUS, BOOKING_STATUS } from '../constants/enums.js';
import { emitToShowRoom } from '../sockets/seatSocket.js';

let cronJob = null;

/**
 * Atomic cleanup of expired holds and bookings.
 * Works both in-process via node-cron AND on-demand in serverless environments (Vercel).
 */
export async function cleanupExpiredHolds() {
  try {
    const now = new Date();

    // 1. Tidy up expired Bookings
    const expiredBookings = await Booking.find({
      status: BOOKING_STATUS.AWAITING_PAYMENT,
      holdExpiresAt: { $lt: now },
    });

    if (expiredBookings.length > 0) {
      await Booking.updateMany(
        {
          _id: { $in: expiredBookings.map((b) => b._id) },
        },
        {
          $set: { status: BOOKING_STATUS.EXPIRED },
        }
      );
    }

    // 2. Tidy up orphaned held seats
    const expiredSeats = await ShowSeat.find({
      status: SEAT_STATUS.HELD,
      holdExpiresAt: { $lt: now },
    });

    if (expiredSeats.length > 0) {
      await ShowSeat.updateMany(
        {
          _id: { $in: expiredSeats.map((s) => s._id) },
        },
        {
          $set: {
            status: SEAT_STATUS.AVAILABLE,
            heldBy: undefined,
            holdExpiresAt: undefined,
            bookingId: undefined,
          },
        }
      );

      // Group by showId and broadcast via socket if active
      const showGroups = new Map();
      expiredSeats.forEach((s) => {
        const showKey = s.showId.toString();
        if (!showGroups.has(showKey)) showGroups.set(showKey, []);
        showGroups.get(showKey).push(s.seatLabel);
      });

      for (const [showId, seatLabels] of showGroups.entries()) {
        try {
          emitToShowRoom(showId, 'seats:released', { seatLabels });
        } catch {
          // Socket might be idle/unavailable in serverless
        }
      }
    }
  } catch (err) {
    console.error('[CLEANUP ERROR] Hold cleanup failed:', err.message);
  }
}

export function startHoldExpirationCron() {
  // Runs every minute: "* * * * *"
  cronJob = cron.schedule('* * * * *', async () => {
    await cleanupExpiredHolds();
  });

  console.log('\x1b[32m[CRON STARTED]\x1b[0m Hold expiration cleanup scheduled (every minute).');
}

export function stopHoldExpirationCron() {
  if (cronJob) {
    cronJob.stop();
  }
}
