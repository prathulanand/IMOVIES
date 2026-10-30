import { Router } from 'express';
import {
  getDashboardStats,
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  getAdminTheatres,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  getAdminScreens,
  createScreen,
  updateScreen,
  deleteScreen,
  getAdminShows,
  createShow,
  updateShow,
  deleteShow,
  getAdminShowSeatsHandler,
  getAdminBookings,
  getAdminBookingById,
  deleteAdminBooking,
  verifyTicketGate,
  getAdminPayments,
  getAdminRefunds,
  getAdminUsers,
  updateUserStatus,
  createOrPromoteAdmin,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  exportReportCSV,
  getAdminAuditLogs,
  getAdminSettings,
  updateAdminSettings,
  getAdminReviews,
  deleteAdminReview,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { ROLES } from '../constants/enums.js';

const router = Router();

// All routes under /api/admin/* require authenticated ADMIN role
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// Movies
router.get('/movies', getAdminMovies);
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// Theatres
router.get('/theatres', getAdminTheatres);
router.post('/theatres', createTheatre);
router.put('/theatres/:id', updateTheatre);
router.delete('/theatres/:id', deleteTheatre);

// Screens & Layout
router.get('/screens', getAdminScreens);
router.post('/screens', createScreen);
router.put('/screens/:id', updateScreen);
router.delete('/screens/:id', deleteScreen);

// Shows
router.get('/shows', getAdminShows);
router.post('/shows', createShow);
router.put('/shows/:id', updateShow);
router.delete('/shows/:id', deleteShow);
router.get('/shows/:id/seats', getAdminShowSeatsHandler);

// Bookings & Verification
router.get('/bookings', getAdminBookings);
router.get('/bookings/:id', getAdminBookingById);
router.delete('/bookings/:id', deleteAdminBooking);
router.post('/bookings/verify', verifyTicketGate);

// Payments & Refunds
router.get('/payments', getAdminPayments);
router.get('/refunds', getAdminRefunds);

// Users
router.get('/users', getAdminUsers);
router.post('/users/admin', createOrPromoteAdmin);
router.patch('/users/:id', updateUserStatus);

// Coupons
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Reports
router.get('/reports/:type', exportReportCSV);

// Audit Logs
router.get('/audit-logs', getAdminAuditLogs);

// Settings
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

// Reviews Moderation
router.get('/reviews', getAdminReviews);
router.delete('/reviews/:id', deleteAdminReview);

export default router;
