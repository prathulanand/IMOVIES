import React from 'react';
import { formatPaise } from '../../lib/currency';

export default function SeatCell({
  cell,
  seatData,
  isSelected,
  onToggle,
  selectable = true,
  showDetails = false,
}) {
  // If this cell is an aisle, render an empty spacer preserving grid column width
  if (cell.kind === 'AISLE') {
    return (
      <div
        style={{
          width: 'var(--seat-size, 34px)',
          height: 'var(--seat-size, 34px)',
          margin: 'var(--seat-gap, 3px)',
        }}
        aria-hidden="true"
      />
    );
  }

  const label = cell.label;
  const isBlocked = cell.kind === 'BLOCKED' || seatData?.status === 'BLOCKED';
  const status = isBlocked ? 'BLOCKED' : seatData?.status || 'AVAILABLE';
  const price = seatData?.price || 0;
  const category = seatData?.category || cell.category || 'REGULAR';

  // Compute status style & interaction
  let tileClass = 'btn p-0 d-flex align-items-center justify-content-center text-center';
  let backgroundColor = 'var(--seat-available-bg)';
  let borderColor = 'var(--seat-available-border)';
  let textColor = '#ffffff';
  let cursor = 'pointer';
  let disabled = !selectable;

  if (isBlocked) {
    backgroundColor = 'var(--seat-blocked-bg)';
    borderColor = 'var(--seat-blocked-border)';
    textColor = 'var(--text-dim)';
    cursor = 'not-allowed';
    disabled = true;
  } else if (status === 'BOOKED') {
    backgroundColor = 'var(--seat-booked-bg)';
    borderColor = 'transparent';
    textColor = 'rgba(255, 255, 255, 0.3)';
    cursor = 'not-allowed';
    disabled = true;
  } else if (status === 'HELD') {
    backgroundColor = 'var(--seat-held-bg)';
    borderColor = 'var(--accent-gold)';
    textColor = '#000000';
    cursor = 'not-allowed';
    disabled = true;
  } else if (isSelected) {
    backgroundColor = 'var(--seat-selected-bg)';
    borderColor = 'var(--primary-light)';
    textColor = '#ffffff';
    cursor = 'pointer';
  }

  const handleClick = (e) => {
    if (disabled || isBlocked) return;
    if (onToggle) onToggle(label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  const ariaDescription = `${label}, Category: ${category}, State: ${
    isSelected ? 'Selected' : status
  }, Price: ${formatPaise(price)}`;

  const occupantText = seatData?.heldBy?.name ? `Occupant: ${seatData.heldBy.name}` : '';

  return (
    <button
      type="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaDescription}
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={showDetails && occupantText ? `${ariaDescription} | ${occupantText}` : ariaDescription}
      className={tileClass}
      style={{
        width: 'var(--seat-size, 34px)',
        height: 'var(--seat-size, 34px)',
        margin: 'var(--seat-gap, 3px)',
        fontSize: 'var(--seat-font-size, 11px)',
        fontWeight: '600',
        borderRadius: 'var(--seat-radius, 6px)',
        backgroundColor,
        border: `1.5px solid ${borderColor}`,
        color: textColor,
        cursor,
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 10px var(--seat-selected-glow)' : 'none',
        flexShrink: 0,
      }}
    >
      {isBlocked ? '✕' : label.replace(/^[A-Z]+/, '')}
    </button>
  );
}
