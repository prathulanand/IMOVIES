import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Show, ShowSeat, User, Booking } from '../src/models/index.js';
import { resolveSeatStatus, isSeatFree } from '../src/services/seatAvailability.service.js';
import { createSeatHold } from '../src/services/booking.service.js';
import { SEAT_STATUS } from '../src/constants/enums.js';

describe('Immediate Expired Hold Availability Engine', () => {
  let show;
  let testUser1;
  let testUser2;
  const testSeatLabel = 'EXP-A1';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    show = await Show.findOne({ status: 'SCHEDULED', startTime: { $gt: new Date() } });
    testUser1 = (await User.findOne({ email: 'rahul@example.com' })) || (await User.findOne({ role: 'USER' }));
    testUser2 =
      (await User.findOne({ email: 'priya@example.com' })) ||
      (await User.findOne({ role: 'USER', _id: { $ne: testUser1?._id } }));
  }, 30000);

  afterAll(async () => {
    if (show) {
      await ShowSeat.deleteMany({ showId: show._id, seatLabel: testSeatLabel });
      await Booking.deleteMany({ showId: show._id, 'seats.seatLabel': testSeatLabel });
    }
  });

  test('resolveSeatStatus and isSeatFree evaluate expired HELD seat as AVAILABLE immediately', () => {
    const expiredSeat = {
      seatLabel: testSeatLabel,
      status: SEAT_STATUS.HELD,
      holdExpiresAt: new Date(Date.now() - 30000), // 30 seconds ago
    };

    const status = resolveSeatStatus(expiredSeat, new Date());
    expect(status).toBe(SEAT_STATUS.AVAILABLE);

    const isFree = isSeatFree(expiredSeat, new Date());
    expect(isFree).toBe(true);
  });

  test('createSeatHold acquires an expired HELD seat immediately without waiting for cron job', async () => {
    // 1. Mark seat as HELD by user 1, but with an expired timestamp (e.g. 1 minute in the past)
    await ShowSeat.findOneAndUpdate(
      { showId: show._id, seatLabel: testSeatLabel },
      {
        $set: {
          category: 'REGULAR',
          price: 20000,
          status: SEAT_STATUS.HELD,
          heldBy: testUser1._id,
          holdExpiresAt: new Date(Date.now() - 60000), // 1 min expired
        },
      },
      { upsert: true }
    );

    // 2. User 2 requests to hold this exact seat
    const holdResult = await createSeatHold({
      showId: show._id,
      seatLabels: [testSeatLabel],
      user: testUser2,
    });

    expect(holdResult.bookingId).toBeDefined();

    // 3. Seat is now held by User 2 with a future hold expiry
    const seatInDb = await ShowSeat.findOne({ showId: show._id, seatLabel: testSeatLabel });
    expect(seatInDb.status).toBe(SEAT_STATUS.HELD);
    expect(seatInDb.heldBy.toString()).toBe(testUser2._id.toString());
    expect(new Date(seatInDb.holdExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
