import { Router } from 'express';
import {
  holdSeats,
  releaseHold,
  resumePayment,
  testPayBooking,
  verifyRazorpayPayment,
  applyCouponToBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  resendBookingNotifications,
  getProfile,
  updateProfile,
  updatePassword,
  postReview,
  getUserReviews,
  getUserFavorites,
  toggleUserFavorite,
  removeUserFavorite,
  holdSeatsSchema,
  updateProfileSchema,
  updatePasswordSchema,
  postReviewSchema,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { holdLimiter } from '../middleware/rateLimit.js';

const router = Router();

// All routes here require authenticated active user
router.use(requireAuth);

router.post('/bookings/hold', holdLimiter, validate(holdSeatsSchema), holdSeats);
router.post('/bookings/:id/release', releaseHold);
router.post('/bookings/:id/pay', resumePayment);
router.post('/bookings/:id/test-pay', testPayBooking);
router.post('/bookings/:id/verify-payment', verifyRazorpayPayment);
router.post('/bookings/:id/apply-coupon', applyCouponToBooking);
router.get('/bookings', getUserBookings);
router.get('/bookings/:id', getBookingById);
router.post('/bookings/:id/cancel', cancelBooking);
router.post('/bookings/:id/reschedule', rescheduleBooking);
router.post('/bookings/:id/resend-notifications', resendBookingNotifications);

router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.put('/password', validate(updatePasswordSchema), updatePassword);

router.post('/reviews', validate(postReviewSchema), postReview);
router.get('/reviews', getUserReviews);

// Favorites / Watchlist
router.get('/favorites', getUserFavorites);
router.post('/favorites/:movieId', toggleUserFavorite);
router.delete('/favorites/:movieId', removeUserFavorite);

export default router;
