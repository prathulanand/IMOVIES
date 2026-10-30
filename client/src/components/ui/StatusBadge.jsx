import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const config = {
    // Booking
    CONFIRMED: { label: 'Confirmed', bg: 'bg-success bg-opacity-25 text-success border border-success border-opacity-50' },
    AWAITING_PAYMENT: { label: 'Awaiting Payment', bg: 'bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50' },
    USED: { label: 'Used / Admitted', bg: 'bg-info bg-opacity-25 text-info border border-info border-opacity-50' },
    EXPIRED: { label: 'Expired', bg: 'bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-50' },

    // Payment
    SUCCESS: { label: 'Success', bg: 'bg-success bg-opacity-25 text-success border border-success border-opacity-50' },
    PENDING_PAYMENT: { label: 'Pending', bg: 'bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50' },
    FAILED: { label: 'Failed', bg: 'bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50' },
    REFUNDED: { label: 'Refunded', bg: 'bg-purple bg-opacity-25 text-info border border-info border-opacity-50' },

    // Movie
    NOW_SHOWING: { label: 'Now Showing', bg: 'bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50' },
    UPCOMING: { label: 'Upcoming', bg: 'bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50' },
    ARCHIVED: { label: 'Archived', bg: 'bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-50' },

    // User
    ACTIVE: { label: 'Active', bg: 'bg-success bg-opacity-25 text-success border border-success border-opacity-50' },
    SUSPENDED: { label: 'Suspended', bg: 'bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50' },
  };

  const style = config[status] || { label: status, bg: 'bg-secondary bg-opacity-25 text-light border border-secondary' };

  return (
    <span className={`badge rounded-pill px-3 py-1 fw-semibold small ${style.bg} ${className}`}>
      {style.label}
    </span>
  );
}
