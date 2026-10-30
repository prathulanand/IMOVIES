import React from 'react';
import { Clock } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';

export default function CountdownTimer({ targetDate, expiresAt, onExpire, className = '' }) {
  const date = targetDate || expiresAt;
  const { formattedTime, minutes, isExpired } = useCountdown(date, onExpire);

  const isCritical = minutes < 2 && !isExpired;

  return (
    <div
      className={`d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill border transition ${
        isExpired
          ? 'bg-danger bg-opacity-25 border-danger text-danger'
          : isCritical
          ? 'bg-warning bg-opacity-25 border-warning text-warning animate-pulse'
          : 'bg-dark border-secondary text-light'
      } ${className}`}
    >
      <Clock size={16} className={isCritical ? 'text-warning' : 'text-danger'} />
      <span className="small fw-semibold">
        {isExpired ? 'Hold Expired' : `Time Remaining: ${formattedTime}`}
      </span>
    </div>
  );
}
