export const MESSAGES = {
  // Auth
  AUTH_REQUIRED: 'Authentication is required to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact support.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
  EMAIL_ALREADY_EXISTS: 'An account with this email address already exists.',
  PHONE_ALREADY_EXISTS: 'An account with this phone number already exists.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  PASSWORD_RESET_SENT: 'If your email is registered, you will receive password reset instructions.',
  PASSWORD_RESET_SUCCESS: 'Your password has been reset successfully.',
  INVALID_OR_EXPIRED_TOKEN: 'This token is invalid or has expired.',
  CURRENT_PASSWORD_INCORRECT: 'Current password does not match.',
  PASSWORD_UPDATE_SUCCESS: 'Password updated successfully.',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully.',

  // Booking & Seats
  SEATS_REQUIRED: 'Please select at least one seat to proceed.',
  MAX_SEATS_EXCEEDED: (max) => `You can select a maximum of ${max} seats per booking.`,
  SEAT_UNAVAILABLE: 'One or more selected seats are no longer available.',
  UNPAID_HOLD_EXISTS: (mins) => `You already have an active unpaid hold on this show (expires in ~${mins} min). Please complete payment or release it before starting a new hold.`,
  HOLD_EXPIRED: 'Your seat hold has expired. Please select your seats again.',
  HOLD_RELEASED: 'Seats have been released successfully.',
  HOLD_NOT_FOUND: 'Active seat hold not found or already processed.',
  PAST_SHOW_BOOKING_FORBIDDEN: 'Tickets cannot be booked for shows that have already started.',
  BOOKING_NOT_FOUND: 'Booking details could not be found.',
  BOOKING_ALREADY_CONFIRMED: 'This booking is already confirmed.',
  BOOKING_NOT_ELIGIBLE_FOR_PAYMENT: 'This booking is no longer eligible for payment.',
  CANCEL_WINDOW_PASSED: 'This booking can no longer be cancelled as showtime is too close.',
  BOOKING_CANCELLED_SUCCESS: 'Booking cancelled successfully. Refund initiated.',
  TICKET_ALREADY_USED: 'Ticket has already been verified and used.',
  TICKET_VERIFIED_SUCCESS: 'Ticket verified successfully. Admitted.',
  TICKET_CANCELLED: 'This ticket belongs to a cancelled booking and is invalid.',

  // Review
  REVIEW_ONLY_CONFIRMED_PAST: 'You can only review movies for which you attended a confirmed show.',
  REVIEW_ALREADY_SUBMITTED: 'You have already submitted a review for this movie.',
  REVIEW_SUBMITTED_SUCCESS: 'Thank you for submitting your review.',

  // Coupons
  COUPON_INVALID: 'Invalid or inactive coupon code.',
  COUPON_EXPIRED: 'This coupon code has expired.',
  COUPON_MIN_AMOUNT_NOT_MET: (min) => `Coupon requires a minimum booking amount of ₹${(min / 100).toFixed(2)}.`,
  COUPON_LIMIT_EXCEEDED: 'This coupon usage limit has been reached.',
  COUPON_USER_LIMIT_EXCEEDED: 'You have already reached the maximum usage for this coupon.',

  // Admin Mutations & Referential Integrity
  THEATRE_HAS_SCREENS: 'Cannot delete theatre with existing screens. Please remove screens first.',
  SCREEN_HAS_SHOWS: 'Cannot delete or modify layout for a screen with existing shows.',
  SHOW_HAS_BOOKINGS: 'Cannot delete a show that has active or past bookings. Please cancel the show instead.',
  MOVIE_HAS_SHOWS: 'Cannot delete a movie with scheduled shows. Please cancel shows first.',
  SHOW_CLASH_DETECTED: 'The selected screen already has an overlapping show scheduled during this time slot.',

  // Generic
  VALIDATION_ERROR: 'Validation error: please check the submitted data.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again shortly.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again later.',
};

export const MACHINE_CODES = {
  UNPAID_HOLD: 'UNPAID_HOLD',
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  PAST_SHOW: 'PAST_SHOW',
  SHOW_CLASH: 'SHOW_CLASH',
  REFERENTIAL_CONFLICT: 'REFERENTIAL_CONFLICT',
  TICKET_ALREADY_USED: 'TICKET_ALREADY_USED',
  TICKET_CANCELLED: 'TICKET_CANCELLED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
};
