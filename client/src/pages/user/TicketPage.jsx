import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import TicketPrintable from '../../components/print/TicketPrintable';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AlertBanner from '../../components/ui/AlertBanner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Printer, Home, Calendar, CheckCircle2, ArrowRight, Mail, MessageSquare, Send, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notification modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTab, setNotificationTab] = useState('email'); // 'email' | 'sms'
  const [resending, setResending] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/user/bookings/${bookingId}`);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchBooking();
  }, [fetchBooking]);

  const handlePrint = () => {
    window.print();
  };

  const handleResendNotifications = async () => {
    try {
      setResending(true);
      await api.post(`/user/bookings/${bookingId}/resend-notifications`);
      toast.success('Confirmation email and SMS re-dispatched successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to re-send notifications');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <LoadingSpinner message="Generating your confirmed e-ticket..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container py-5">
        <AlertBanner
          type="danger"
          title="Ticket Not Found"
          message={error || 'Unable to retrieve ticket details.'}
        />
        <div className="mt-3">
          <Link to="/" className="btn btn-outline-light">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isPending = booking.status === 'AWAITING_PAYMENT';

  return (
    <div className="container py-4">
      {/* Non-printable screen banner & actions */}
      <div className="d-print-none mb-4">
        {isPending ? (
          <div className="im-glass p-3 rounded-4 mb-4 border border-warning d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h5 className="fw-bold text-warning m-0">Payment Pending</h5>
              <p className="text-secondary small m-0">
                This booking has not been confirmed yet. Please complete payment before the hold expires.
              </p>
            </div>
            <Link to={`/checkout/${booking._id}`} className="btn btn-warning d-flex align-items-center gap-2">
              <span>Complete Payment</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="im-glass p-3 rounded-4 mb-4 border border-success d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <CheckCircle2 size={36} className="text-success" />
              <div>
                <h5 className="fw-bold text-light m-0">Booking Confirmed!</h5>
                <p className="text-secondary small m-0">
                  Your tickets have been reserved. Show this digital ticket or QR code at cinema entry.
                </p>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 w-100 w-lg-auto">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
              >
                <Printer size={16} />
                <span>Print / Save PDF</span>
              </Button>

              <Link to="/my-bookings" className="btn btn-secondary d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0">
                <Calendar size={16} />
                <span>My Bookings</span>
              </Link>

              <Link to="/" className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0">
                <Home size={16} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* Delivery Status Strip */}
        {!isPending && (
          <div className="im-glass p-3 rounded-4 mb-4 border border-secondary border-opacity-25 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-success bg-opacity-15 p-2.5 text-success flex-shrink-0">
                <Mail size={22} />
              </div>
              <div>
                <div className="fw-semibold text-light small d-flex align-items-center gap-2">
                  <span>Digital Ticket Dispatched</span>
                  <span className="badge bg-success" style={{ fontSize: '10px' }}>Instant Delivered</span>
                </div>
                <div className="text-secondary mt-0.5" style={{ fontSize: '12px' }}>
                  Confirmation sent to <strong className="text-light">{booking.userId?.email || 'Registered Email'}</strong> &bull; SMS sent to <strong className="text-light">{booking.userId?.phone || '+91 98765 43210'}</strong>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 w-100 w-md-auto justify-content-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotificationModal(true)}
                className="d-flex align-items-center gap-1.5"
              >
                <Eye size={14} />
                <span>Preview Sent Email & SMS</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                loading={resending}
                onClick={handleResendNotifications}
                className="text-info d-flex align-items-center gap-1.5"
              >
                <Send size={14} />
                <span>Resend</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Printable E-Ticket Component */}
      <div className="d-flex justify-content-center px-0 px-sm-2">
        <div style={{ maxWidth: '780px', width: '100%' }}>
          <TicketPrintable booking={booking} />
        </div>
      </div>

      {/* Action Bar under Ticket */}
      <div className="d-print-none d-flex flex-wrap justify-content-center gap-2.5 gap-sm-3 mt-4 pb-4">
        <Button
          variant="primary"
          onClick={handlePrint}
          className="d-inline-flex align-items-center justify-content-center gap-2 rounded-pill px-4 py-2.5 fw-semibold shadow-sm text-nowrap w-100 w-sm-auto"
          style={{ minHeight: '42px', fontSize: '0.925rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
        >
          <Printer size={17} />
          <span>Print / Download PDF Ticket</span>
        </Button>

        <Link
          to="/my-bookings"
          className="btn btn-outline-light rounded-pill px-4 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap w-100 w-sm-auto transition"
          style={{ minHeight: '42px', fontSize: '0.925rem', background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(8px)' }}
        >
          <Calendar size={17} />
          <span>My Bookings</span>
        </Link>

        <Link
          to="/"
          className="btn btn-outline-secondary text-light rounded-pill px-4 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap w-100 w-sm-auto transition"
          style={{ minHeight: '42px', fontSize: '0.925rem' }}
        >
          <Home size={17} />
          <span>Book More Movies</span>
        </Link>
      </div>

      {/* Dispatched Notification Preview Modal */}
      {showNotificationModal && (
        <Modal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          title="Dispatched Email & SMS Notification"
        >
          <div className="d-flex flex-column gap-3">
            <div className="btn-group w-100">
              <button
                type="button"
                className={`btn btn-sm ${notificationTab === 'email' ? 'btn-danger' : 'btn-dark border-secondary'}`}
                onClick={() => setNotificationTab('email')}
              >
                <Mail size={14} className="me-1.5" />
                <span>HTML Email Template</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${notificationTab === 'sms' ? 'btn-danger' : 'btn-dark border-secondary'}`}
                onClick={() => setNotificationTab('sms')}
              >
                <MessageSquare size={14} className="me-1.5" />
                <span>Phone SMS Template</span>
              </button>
            </div>

            {notificationTab === 'email' ? (
              <div className="p-3 rounded-3" style={{ background: '#0f1016', border: '1px solid #242c44' }}>
                <div className="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary border-opacity-25 small text-secondary">
                  <div>To: <strong className="text-light">{booking.userId?.email || 'user@example.com'}</strong></div>
                  <div>Subject: <strong className="text-light">Booking Confirmed: {booking.showId?.movieId?.title}</strong></div>
                </div>
                <div className="text-center py-2">
                  <h5 className="text-danger fw-bold m-0">IMOVIES TICKETING</h5>
                  <p className="text-muted small mt-1">Hi {booking.userId?.name || 'Moviegoer'}, your ticket has been reserved!</p>
                </div>
                <div className="p-3 rounded-2 text-start small mb-2" style={{ background: '#161124', border: '1px dashed #a855f7' }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Movie:</span>
                    <strong className="text-light">{booking.showId?.movieId?.title}</strong>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted">Cinema:</span>
                    <span className="text-light">{booking.showId?.theatreId?.name}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted">Showtime:</span>
                    <span className="text-warning fw-semibold">{booking.showDateSnapshot} at {booking.showTimeSnapshot}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted">Seats:</span>
                    <span className="text-danger fw-bold">{booking.seats.map((s) => s.seatLabel).join(', ')}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-2 pt-2 border-top border-secondary border-opacity-25">
                    <span className="text-muted">Booking Code:</span>
                    <strong className="text-warning">{booking.bookingCode}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-3 d-flex flex-column align-items-center" style={{ background: '#0b0e17', border: '1px solid #242c44' }}>
                <div className="text-secondary small mb-2">Simulated Phone SMS Delivery</div>
                <div className="p-3 rounded-4 small text-light shadow-sm" style={{ background: '#1c2438', maxWidth: '340px', borderLeft: '3px solid #00d26a' }}>
                  <div className="fw-bold text-success mb-1" style={{ fontSize: '11px' }}>IMOVIES-TICKETS &bull; Just Now</div>
                  IMOVIES: Your booking <strong>{booking.bookingCode}</strong> for &ldquo;{booking.showId?.movieId?.title}&rdquo; ({booking.seats.map((s) => s.seatLabel).join(', ')}) at {booking.showTimeSnapshot} is CONFIRMED! Enjoy your show.
                </div>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25">
              <Button
                variant="ghost"
                size="sm"
                loading={resending}
                onClick={handleResendNotifications}
                className="text-info"
              >
                <Send size={13} className="me-1" />
                <span>Re-Send Live Notification</span>
              </Button>

              <Button variant="outline" size="sm" onClick={() => setShowNotificationModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
