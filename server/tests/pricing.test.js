import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Coupon, Setting } from '../src/models/index.js';
import { calculateBookingPricing } from '../src/services/pricing.service.js';
import { COUPON_TYPE } from '../src/constants/enums.js';

describe('Pricing & Coupon Precision Engine (Integer Paise)', () => {
  let testPercentCoupon;
  let testFlatCoupon;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    await Setting.getSettings();

    // Setup test percentage coupon: 50% discount up to ₹150 (15000 paise), min ₹200 (20000 paise)
    testPercentCoupon = await Coupon.findOneAndUpdate(
      { code: 'TEST50' },
      {
        $set: {
          code: 'TEST50',
          discountType: COUPON_TYPE.PERCENT,
          discountValue: 50,
          maxDiscount: 15000,
          minAmount: 20000,
          validFrom: new Date(Date.now() - 100000),
          validUntil: new Date(Date.now() + 1000000),
          usageLimit: 100,
          usedCount: 0,
          perUserLimit: 5,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    // Setup test flat coupon: ₹100 flat (10000 paise), min ₹350 (35000 paise)
    testFlatCoupon = await Coupon.findOneAndUpdate(
      { code: 'TESTFLAT100' },
      {
        $set: {
          code: 'TESTFLAT100',
          discountType: COUPON_TYPE.FLAT,
          discountValue: 10000,
          maxDiscount: 10000,
          minAmount: 35000,
          validFrom: new Date(Date.now() - 100000),
          validUntil: new Date(Date.now() + 1000000),
          usageLimit: 100,
          usedCount: 0,
          perUserLimit: 5,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
  });

  afterAll(async () => {
    await Coupon.deleteMany({ code: { $in: ['TEST50', 'TESTFLAT100'] } });
    await mongoose.disconnect();
  });

  test('Calculates correct subtotal, convenience fee, and total without coupon', async () => {
    const seats = [
      { seatLabel: 'A1', category: 'REGULAR', price: 22000 }, // ₹220
      { seatLabel: 'A2', category: 'PREMIUM', price: 32000 }, // ₹320
    ];

    const result = await calculateBookingPricing(seats);

    // subtotal = 22000 + 32000 = 54000 paise
    expect(result.subtotal).toBe(54000);
    expect(result.discount).toBe(0);

    // 5% convenience fee on 54000 = 2700 paise
    expect(result.convenienceFee).toBe(2700);

    // total = 54000 - 0 + 2700 = 56700 paise
    expect(result.total).toBe(56700);
  });

  test('Applies percentage coupon capped by maxDiscount correctly in paise', async () => {
    const seats = [
      { seatLabel: 'A1', category: 'REGULAR', price: 25000 },
      { seatLabel: 'A2', category: 'PREMIUM', price: 35000 },
    ]; // subtotal = 60000 paise (₹600)

    const result = await calculateBookingPricing(seats, 'TEST50');

    expect(result.subtotal).toBe(60000);
    // 50% of 60000 is 30000, but capped at maxDiscount 15000 paise
    expect(result.discount).toBe(15000);

    // subtotal after discount = 45000. 5% convenience fee = 2250 paise
    expect(result.convenienceFee).toBe(2250);

    // total = 60000 - 15000 + 2250 = 47250 paise (₹472.50)
    expect(result.total).toBe(47250);
  });

  test('Applies flat coupon correctly in paise', async () => {
    const seats = [
      { seatLabel: 'A1', category: 'REGULAR', price: 20000 },
      { seatLabel: 'A2', category: 'REGULAR', price: 20000 },
    ]; // subtotal = 40000 paise (₹400, >= minAmount 35000)

    const result = await calculateBookingPricing(seats, 'TESTFLAT100');

    expect(result.subtotal).toBe(40000);
    expect(result.discount).toBe(10000);

    // subtotal after discount = 30000. 5% fee = 1500 paise
    expect(result.convenienceFee).toBe(1500);

    // total = 40000 - 10000 + 1500 = 31500 paise
    expect(result.total).toBe(31500);
  });

  test('Rejects coupon if subtotal is below minAmount', async () => {
    const seats = [
      { seatLabel: 'A1', category: 'REGULAR', price: 15000 }, // ₹150 (< min ₹200)
    ];

    await expect(calculateBookingPricing(seats, 'TEST50')).rejects.toThrow();
  });

  test('Rejects invalid non-existent coupon', async () => {
    const seats = [{ seatLabel: 'A1', category: 'REGULAR', price: 25000 }];
    await expect(calculateBookingPricing(seats, 'NONEXISTENT_CODE')).rejects.toThrow();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await Coupon.deleteMany({ code: { $in: ['TEST50', 'TESTFLAT100'] } });
    }
  });
});
