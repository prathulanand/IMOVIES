import React from 'react';

export default function SeatLegend() {
  const items = [
    { label: 'Available', color: 'var(--seat-available-bg)', border: 'var(--seat-available-border)' },
    { label: 'Selected', color: 'var(--seat-selected-bg)', border: 'var(--primary-light)' },
    { label: 'Held', color: 'var(--seat-held-bg)', border: 'var(--accent-gold)' },
    { label: 'Booked', color: 'var(--seat-booked-bg)', border: 'transparent', opacity: 0.5 },
    { label: 'Blocked / Maint', color: 'var(--seat-blocked-bg)', border: 'var(--seat-blocked-border)' },
  ];

  return (
    <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 gap-md-4 py-3 my-2 text-secondary small">
      {items.map((item) => (
        <div key={item.label} className="d-flex align-items-center gap-2">
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: item.color,
              border: `1.5px solid ${item.border}`,
              opacity: item.opacity || 1,
              display: 'inline-block',
            }}
          />
          <span className="text-light">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
