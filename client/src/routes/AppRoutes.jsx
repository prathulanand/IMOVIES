import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Eagerly import primary public home & landing for instant first-paint
import HomePage from '../pages/public/HomePage';
import LandingPage from '../pages/public/LandingPage';

// Lazy-load secondary public pages
const MovieDetailPage = lazy(() => import('../pages/public/MovieDetailPage'));
const ShowSelectionPage = lazy(() => import('../pages/public/ShowSelectionPage'));
const SeatSelectionPage = lazy(() => import('../pages/public/SeatSelectionPage'));
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage'));

// Lazy-load Auth pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));

// Lazy-load User pages
const CheckoutPage = lazy(() => import('../pages/user/CheckoutPage'));
const TicketPage = lazy(() => import('../pages/user/TicketPage'));
const MyBookingsPage = lazy(() => import('../pages/user/MyBookingsPage'));
const ProfilePage = lazy(() => import('../pages/user/ProfilePage'));
const FavoritesPage = lazy(() => import('../pages/user/FavoritesPage'));

// Lazy-load heavy Admin Portal pages (contains Recharts, BI reports, etc.)
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminMoviesPage = lazy(() => import('../pages/admin/AdminMoviesPage'));
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage'));
const AdminTheatresPage = lazy(() => import('../pages/admin/AdminTheatresPage'));
const AdminScreensPage = lazy(() => import('../pages/admin/AdminScreensPage'));
const AdminShowsPage = lazy(() => import('../pages/admin/AdminShowsPage'));
const AdminBookingsPage = lazy(() => import('../pages/admin/AdminBookingsPage'));
const AdminVerifyTicketPage = lazy(() => import('../pages/admin/AdminVerifyTicketPage'));
const AdminPaymentsPage = lazy(() => import('../pages/admin/AdminPaymentsPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminCouponsPage = lazy(() => import('../pages/admin/AdminCouponsPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/AdminAuditLogsPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));

// Guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

function PageFallback() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5" style={{ minHeight: '40vh' }}>
      <div className="spinner-border text-danger" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-secondary mt-3 fs-6" style={{ letterSpacing: '0.5px' }}>
        Loading IMovies...
      </p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      {/* Public Landing Entrance */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pages/landing/Landing" element={<LandingPage />} />

      {/* Inside Website Pages - Protected: Requires Sign-in */}
      <Route
        path="/movies"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movies/:id"
        element={
          <ProtectedRoute>
            <MovieDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movie/:id"
        element={
          <ProtectedRoute>
            <MovieDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movies/:id/shows"
        element={
          <ProtectedRoute>
            <ShowSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movie/:id/shows"
        element={
          <ProtectedRoute>
            <ShowSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shows/:showId/seats"
        element={
          <ProtectedRoute>
            <SeatSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shows/:id/seats"
        element={
          <ProtectedRoute>
            <SeatSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book/:showId"
        element={
          <ProtectedRoute>
            <SeatSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book/:id"
        element={
          <ProtectedRoute>
            <SeatSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected User Routes */}
      <Route
        path="/checkout/:bookingId"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticket/:bookingId"
        element={
          <ProtectedRoute>
            <TicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/:bookingId"
        element={
          <ProtectedRoute>
            <TicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watchlist"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/favoriteshows/FavoriteShows"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="movies" element={<AdminMoviesPage />} />
        <Route path="theatres" element={<AdminTheatresPage />} />
        <Route path="screens" element={<AdminScreensPage />} />
        <Route path="shows" element={<AdminShowsPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="verify-ticket" element={<AdminVerifyTicketPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
  );
}
