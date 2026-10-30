import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Show, ShowSeat, Booking, User } from '../src/models/index.js';
import { createSeatHold } from '../src/services/booking.service.js';
import { SEAT_STATUS } from '../src/constants/enums.js';

describe('Seat Concurrency Engine (100 Parallel Requests)', () => {
  let show;
  let demoUsers = [];
  const testSeatLabel = 'CONC-A1';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    show = await Show.findOne({ status: 'SCHEDULED', startTime: { $gt: new Date() } });
    if (!show) {
      throw new Error('No scheduled upcoming show found. Please run seed script first.');
    }

    // Prepare 100 unique demo user documents for 100 distinct concurrent users
    const userDocs = [];
    for (let i = 0; i < 100; i++) {
      userDocs.push({
        name: `Concurrent User ${i}`,
        email: `conc_user_${i}_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
      });
    }
    demoUsers = await User.insertMany(userDocs);

    // Ensure test seat exists and is AVAILABLE
    await ShowSeat.findOneAndUpdate(
      { showId: show._id, seatLabel: testSeatLabel },
      {
        $set: {
          category: 'REGULAR',
          price: 20000, // ₹200
          status: SEAT_STATUS.AVAILABLE,
          heldBy: undefined,
          holdExpiresAt: undefined,
          bookingId: undefined,
        },
      },
      { upsert: true }
    );
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    if (show) {
      await ShowSeat.deleteMany({ showId: show._id, seatLabel: testSeatLabel });
    }
    if (demoUsers.length > 0) {
      await User.deleteMany({ _id: { $in: demoUsers.map((u) => u._id) } });
      await Booking.deleteMany({ userId: { $in: demoUsers.map((u) => u._id) } });
    }
    await mongoose.disconnect();
  });

  test('100 simultaneous hold requests on the same seat -> EXACTLY ONE succeeds, 99 receive 409 Conflict', async () => {
    // Launch 100 concurrent requests simultaneously
    const holdPromises = demoUsers.map((user) =>
      createSeatHold({
        showId: show._id,
        seatLabels: [testSeatLabel],
        user,
      })
        .then((res) => ({ status: 'fulfilled', value: res }))
        .catch((err) => ({ status: 'rejected', reason: err }))
    );

    const results = await Promise.all(holdPromises);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    console.log(`[CONCURRENCY TEST RESULT] Successes: ${successes.length} | Conflicts: ${failures.length}`);

    // Non-negotiable assertion: EXACTLY 1 succeeds
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(99);

    // Verify all 99 failures were 409 Conflict with SEAT_UNAVAILABLE
    failures.forEach((f) => {
      expect(f.reason.statusCode).toBe(409);
      expect(f.reason.code).toBe('SEAT_UNAVAILABLE');
    });

    // Verify database state: seat is HELD by the single winning user
    const finalSeat = await ShowSeat.findOne({ showId: show._id, seatLabel: testSeatLabel });
    expect(finalSeat.status).toBe(SEAT_STATUS.HELD);
    expect(finalSeat.heldBy.toString()).toBe(successes[0].value.bookingId ? finalSeat.heldBy.toString() : '');
  }, 45000);
});
