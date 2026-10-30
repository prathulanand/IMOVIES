import React from 'react';
import QRCode from 'react-qr-code';
import { Film } from 'lucide-react';
import { formatIST } from '../../lib/ist-date';
import { formatPaise } from '../../lib/currency';

export default function TicketPrintable({ booking }) {
  if (!booking) return null;

  const show = booking.showId;
  const movie = show?.movieId;
  const theatre = show?.theatreId;
  const screen = show?.screenId;
  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'USED';

  return (
    <div
      data-bs-theme="light"
      className="ticket-card rounded-4 p-3 p-sm-4 p-md-5"
      style={{
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'var(--font-family-sans, sans-serif)',
      }}
    >
      {/* Brand Header */}
      <div
        className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-4 border-bottom"
        style={{ borderColor: '#e2e8f0' }}
      >
        <div>
          <div className="d-flex align-items-center gap-2">
            <Film size={26} color="#9333ea" />
            <h2 className="fw-bold m-0" style={{ color: '#9333ea', letterSpacing: '1.5px', fontSize: '1.6rem' }}>
              IMOVIES
            </h2>
          </div>
          <div style={{ color: '#475569', fontSize: '0.825rem', fontWeight: 600, marginTop: '2px' }}>
            Official Cinema E-Ticket
          </div>
        </div>

        <div className="text-end mt-2 mt-sm-0">
          <span
            style={{
              background: isConfirmed ? '#f3e8ff' : '#fef3c7',
              color: isConfirmed ? '#7e22ce' : '#b45309',
              border: `1px solid ${isConfirmed ? '#d8b4fe' : '#fcd34d'}`,
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'inline-block',
            }}
          >
            {isConfirmed ? '✓ CONFIRMED E-TICKET' : '⏳ PAYMENT PENDING'}
          </span>
          <div style={{ color: '#1e293b', fontSize: '0.875rem', fontWeight: 700, marginTop: '4px' }}>
            Ref: <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{booking.bookingCode}</span>
          </div>
        </div>
      </div>

      {/* Main Ticket Info & QR Code */}
      <div className="row g-4 mb-2 align-items-start">
        <div className="col-12 col-md-7">
          <div className="d-flex gap-3 mb-3">
            {movie?.posterUrl && (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                style={{
                  width: '64px',
                  height: '92px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              />
            )}
            <div>
              <h3 style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.35rem', margin: 0, lineHeight: 1.25 }}>
                {movie?.title}
              </h3>
              <div className="d-flex flex-wrap align-items-center gap-1 mt-2">
                {movie?.certificate && (
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {movie.certificate}
                  </span>
                )}
                {show?.language && (
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {show.language}
                  </span>
                )}
                {show?.format && (
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {show.format}
                  </span>
                )}
                {movie?.durationMinutes && (
                  <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600, marginLeft: '4px' }}>
                    • {movie.durationMinutes} mins
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cinema & Screen */}
          <div className="mb-3">
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cinema & Screen
            </div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1rem', marginTop: '1px' }}>
              {theatre?.name}, {screen?.name}
            </div>
            {theatre?.address && (
              <div style={{ color: '#475569', fontSize: '0.825rem', fontWeight: 500, marginTop: '2px' }}>
                {theatre.address}
              </div>
            )}
          </div>

          {/* Showtime */}
          <div className="mb-3">
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Showtime (IST)
            </div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', marginTop: '1px' }}>
              📅 {formatIST(show?.startTime)}
            </div>
          </div>

          {/* Seats */}
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Booked Seats ({booking.seats?.length || 0})
            </div>
            <div className="d-flex flex-wrap gap-2">
              {booking.seats?.map((s) => (
                <span
                  key={s.seatLabel}
                  style={{
                    background: '#9333ea',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '3px 12px',
                    borderRadius: '6px',
                    fontSize: '0.925rem',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 4px rgba(147, 51, 234, 0.25)',
                  }}
                >
                  {s.seatLabel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="col-12 col-md-5 d-flex flex-column align-items-center justify-content-center text-center">
          <div
            className="w-100 p-3 rounded-3 d-flex flex-column align-items-center justify-content-center"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              className="p-2 bg-white rounded-3 mb-2"
              style={{ border: '2px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
            >
              <QRCode value={booking.bookingCode} size={120} />
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#0f172a', letterSpacing: '1.5px' }}>
              {booking.bookingCode}
            </div>
            <div style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>
              Scan at Cinema Entrance
            </div>
          </div>
        </div>
      </div>

      {/* Perforated separator */}
      <div
        className="my-3"
        style={{
          borderTop: '2px dashed #cbd5e1',
        }}
      />

      {/* Payment Summary */}
      <div
        className="rounded-3 p-3 mb-3"
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
        }}
      >
        <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: '#334155', fontWeight: 600 }}>Tickets Subtotal</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>{formatPaise(booking.subtotal)}</span>
        </div>
        {booking.discount > 0 && (
          <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.875rem' }}>
            <span style={{ color: '#7e22ce', fontWeight: 600 }}>Coupon Discount ({booking.couponCode})</span>
            <span style={{ color: '#7e22ce', fontWeight: 700 }}>-{formatPaise(booking.discount)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: '#334155', fontWeight: 600 }}>Convenience Fee</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>{formatPaise(booking.convenienceFee)}</span>
        </div>
        <div
          className="d-flex justify-content-between pt-2 mt-1 border-top"
          style={{ borderColor: '#cbd5e1', fontSize: '1rem' }}
        >
          <span style={{ color: '#0f172a', fontWeight: 800 }}>Total Amount Paid</span>
          <span style={{ color: '#7e22ce', fontWeight: 800, fontSize: '1.15rem' }}>{formatPaise(booking.total)}</span>
        </div>
      </div>

      {/* Footer Instructions */}
      <div
        className="text-center pt-2"
        style={{
          color: '#475569',
          fontSize: '0.78rem',
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        📌 Please show this digital ticket or QR code at cinema entry. Outside food &amp; beverages are not permitted.
      </div>
    </div>
  );
}

