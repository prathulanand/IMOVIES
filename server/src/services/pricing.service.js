import { Coupon } from '../models/Coupon.js';
import { Booking } from '../models/Booking.js';
import { Setting } from '../models/Setting.js';
import { COUPON_TYPE, BOOKING_STATUS } from '../constants/enums.js';
import { MESSAGES } from '../constants/messages.js';

/**
 * Computes server-authoritative financial breakdown in integer paise.
 * Zero client trust: client amount inputs are strictly ignored.
 *
 * @param {Array<{ price: number, seatLabel: string, category: string }>} seats
 * @param {string|null} [couponCode]
 * @param {string|mongoose.Types.ObjectId} [userId]
 * @returns {Promise<{
 *   subtotal: number,
 *   discount: number,
 *   convenienceFee: number,
 *   total: number,
 *   coupon: Object|null
 * }>}
 */
export async function calculateBookingPricing(seats, couponCode = null, userId = null) {
  if (!seats || seats.length === 0) {
    throw new Error(MESSAGES.SEATS_REQUIRED);
  }

  // 1. Authoritative subtotal = sum of seat prices (paise)
  const subtotal = seats.reduce((acc, s) => acc + (s.price || 0), 0);

  let discount = 0;
  let appliedCoupon = null;

  // 2. Validate and apply coupon if provided
  if (couponCode && typeof couponCode === 'string' && couponCode.trim() !== '') {
    const code = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      const err = new Error(MESSAGES.COUPON_INVALID);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      const err = new Error(MESSAGES.COUPON_EXPIRED);
      err.statusCode = 400;
      throw err;
    }

    if (subtotal < coupon.minAmount) {
      const err = new Error(MESSAGES.COUPON_MIN_AMOUNT_NOT_MET(coupon.minAmount));
      err.statusCode = 400;
      throw err;
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      const err = new Error(MESSAGES.COUPON_LIMIT_EXCEEDED);
      err.statusCode = 400;
      throw err;
    }

    if (userId) {
      const userUsage = await Booking.countDocuments({
        userId,
        couponCode: code,
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.USED] },
      });
      if (userUsage >= coupon.perUserLimit) {
        const err = new Error(MESSAGES.COUPON_USER_LIMIT_EXCEEDED);
        err.statusCode = 400;
        throw err;
      }
    }

    // Calculate discount amount in paise
    if (coupon.discountType === COUPON_TYPE.PERCENT || coupon.discountType === 'PERCENTAGE') {
      let calcDiscount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && calcDiscount > coupon.maxDiscount) {
        calcDiscount = coupon.maxDiscount;
      }
      discount = calcDiscount;
    } else if (coupon.discountType === COUPON_TYPE.FLAT) {
      discount = Math.min(coupon.discountValue, subtotal);
    }

    appliedCoupon = coupon;
  }

  // 3. Convenience fee calculation
  const settings = await Setting.getSettings();
  const feePercent = settings.convenienceFeePercent || 5;

  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  const convenienceFee = Math.round((subtotalAfterDiscount * feePercent) / 100);

  // 4. Final total in integer paise
  const total = subtotal - discount + convenienceFee;

  return {
    subtotal,
    discount,
    convenienceFee,
    total,
    coupon: appliedCoupon ? { code: appliedCoupon.code, discountType: appliedCoupon.discountType, discountValue: appliedCoupon.discountValue } : null,
  };
}
