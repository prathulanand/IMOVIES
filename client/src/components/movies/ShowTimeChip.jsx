import React from 'react';
import { Link } from 'react-router-dom';
import { formatISTTimeOnly } from '../../lib/ist-date';
import { formatPaise } from '../../lib/currency';

export default function ShowTimeChip({ show }) {
  const isSoldOut = show.availability === 'SOLD_OUT';
  const isFillingFast = show.availability === 'FILLING_FAST';

  let badgeColor = 'text-success';
  let badgeText = 'Available';

  if (isSoldOut) {
    badgeColor = 'text-danger';
    badgeText = 'Sold Out';
  } else if (isFillingFast) {
    badgeColor = 'text-warning';
    badgeText = 'Filling Fast';
  }

  const content = (
    <div
      className={`p-2 px-3 rounded-3 border text-center transition ${
        isSoldOut
          ? 'bg-dark border-secondary opacity-50 cursor-not-allowed'
          : 'bg-dark border-secondary hover-border-danger cursor-pointer'
      }`}
      style={{ minWidth: '110px' }}
    >
      <div className="fw-bold text-light fs-6 mb-1">{formatISTTimeOnly(show.startTime)}</div>
      <div className="small text-secondary" style={{ fontSize: '11px' }}>
        {show.format} • {show.language}
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2 pt-1 border-top border-secondary border-opacity-25" style={{ fontSize: '10px' }}>
        <span className="text-secondary">{formatPaise(show.startingPrice)}</span>
        <span className={`fw-semibold ${badgeColor}`}>{badgeText}</span>
      </div>
    </div>
  );

  if (isSoldOut) {
    return <div>{content}</div>;
  }

  return (
    <Link to={`/shows/${show._id}/seats`} className="text-decoration-none">
      {content}
    </Link>
  );
}
