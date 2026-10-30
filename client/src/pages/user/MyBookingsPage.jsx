import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { formatINR } from '../../lib/currency';
import { formatISTDateTime } from '../../lib/ist-date';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { Film, Ticket, ArrowRight, XCircle, Star, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, CONFIRMED, AWAITING_PAYMENT, CANCELLED

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [availableShows, setAvailableShows] = useState([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [selectedNewShowId, setSelectedNewShowId] = useState('');

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/user/bookings?limit=50');
      setBookings(res.data.bookings || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      const res = await api.post(`/user/bookings/${cancelTarget._id}/cancel`);
      toast.success(res.data.message || 'Booking cancelled successfully');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleOpenReschedule = async (booking) => {
    setRescheduleTarget(booking);
    setSelectedNewShowId('');
    setLoadingShows(true);
    try {
      const movieId = booking.showId?.movieId?._id || booking.showId?.movieId;
      const city = booking.showId?.theatreId?.city;
      if (movieId) {
        const res = await api.get(`/public/movies/${movieId}/shows`, {
          params: { city },
        });
        const theatres = res.data.theatres || [];
        const flatShows = [];
        theatres.forEach((t) => {
          (t.shows || []).forEach((s) => {
            if (s._id !== (booking.showId?._id || booking.showId) && new Date(s.startTime) > new Date()) {
              flatShows.push({
                ...s,
                theatreName: t.theatre?.name || 'Cinema',
                theatreCity: t.theatre?.city,
              });
            }
          });
        });
        setAvailableShows(flatShows);
      }
    } catch (err) {
      toast.error('Failed to load upcoming showtimes for rescheduling');
    } finally {
      setLoadingShows(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !selectedNewShowId) {
      toast.error('Please select a new showtime');
      return;
    }
    setRescheduling(true);
    try {
      const res = await api.post(`/user/bookings/${rescheduleTarget._id}/reschedule`, {
        newShowId: selectedNewShowId,
      });
      toast.success(res.data.message || 'Show rescheduled successfully!');
      setRescheduleTarget(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to reschedule show');
    } finally {
      setRescheduling(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewTarget) return;
    try {
      setSubmittingReview(true);
      await api.post('/user/reviews', {
        movieId: reviewTarget.showId?.movieId?._id,
        rating,
        comment,
      });
      toast.success('Thank you! Your review has been posted.');
      setReviewTarget(null);
      setComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'ALL') return true;
    if (filter === 'CONFIRMED') return b.status === 'CONFIRMED' || b.status === 'USED';
    if (filter === 'AWAITING_PAYMENT') return b.status === 'AWAITING_PAYMENT';
    if (filter === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'EXPIRED';
    return true;
  });

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0">My Bookings</h2>
          <p className="text-secondary small m-0">Manage all your movie tickets, reservations, and history.</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="im-glass p-1 rounded-3 overflow-x-auto w-100 w-md-auto no-scrollbar">
          <div className="btn-group flex-nowrap w-100">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CONFIRMED', label: 'Confirmed' },
              { id: 'AWAITING_PAYMENT', label: 'Pending Hold' },
              { id: 'CANCELLED', label: 'Cancelled / Expired' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`btn btn-sm text-nowrap px-2.5 px-sm-3 py-1.5 ${filter === tab.id ? 'btn-primary' : 'btn-link text-secondary text-decoration-none'}`}
                style={{ fontSize: '12px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <LoadingSpinner message="Loading your tickets..." />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="im-glass p-4 p-sm-5 rounded-4 text-center">
          <EmptyState
            title="No Bookings Found"
            message={
              filter === 'ALL'
                ? "You haven't booked any movie tickets yet. Explore movies showing near you!"
                : `No bookings matching the filter "${filter}".`
            }
            actionLabel="Browse Movies"
            onAction={() => window.location.assign('/')}
          />
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredBookings.map((b) => {
            const show = b.showId;
            const movie = show?.movieId;
            const theatre = show?.theatreId;
            const screen = show?.screenId;
            const isHold = b.status === 'AWAITING_PAYMENT';
            const isConfirmed = b.status === 'CONFIRMED' || b.status === 'USED';
            const showHasPassed = show?.startTime && new Date(show.startTime) < new Date();

            return (
              <div
                key={b._id}
                className="im-glass p-3 p-sm-4 rounded-4 transition-all"
                style={{ border: isHold ? '1px solid #f59e0b' : '1px solid var(--border-color)' }}
              >
                <div className="row g-3 align-items-center">
                  {/* Poster Thumbnail */}
                  <div className="col-auto">
                    <img
                      src={movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'}
                      alt={movie?.title}
                      className="rounded-3 shadow flex-shrink-0"
                      style={{ width: '70px', height: '100px', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Details */}
                  <div className="col min-w-0">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <h5 className="fw-bold m-0 text-truncate" style={{ maxWidth: '100%' }}>{movie?.title || 'Movie'}</h5>
                      <StatusBadge status={b.status} />
                      <span className="badge bg-dark border border-secondary text-secondary small">
                        Ref: {b.bookingCode}
                      </span>
                    </div>

                    <div className="text-secondary small mb-1.5 text-truncate">
                      <span>{theatre?.name}, {theatre?.city}</span> • <span>{screen?.name}</span> • <span>{show?.format} ({show?.language})</span>
                    </div>

                    <div className="text-light small fw-medium mb-2">
                      {show?.startTime ? formatISTDateTime(show.startTime) : 'Show date unavailable'}
                    </div>

                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <span className="text-secondary small">Seats:</span>
                      {b.seats?.map((s) => (
                        <span key={s.seatLabel} className="badge bg-secondary" style={{ fontSize: '11px' }}>
                          {s.seatLabel}
                        </span>
                      ))}
                      <span className="ms-auto ms-sm-2 fw-bold text-light">Total: {formatINR(b.total)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-12 col-lg-auto d-flex flex-column flex-sm-row flex-lg-column gap-2 mt-2 mt-lg-0 border-top border-lg-0 border-secondary border-opacity-25 pt-2 pt-lg-0">
                    {isHold && (
                      <Link
                        to={`/checkout/${b._id}`}
                        className="btn btn-warning btn-sm d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                      >
                        <span>Resume Payment</span>
                        <ArrowRight size={14} />
                      </Link>
                    )}

                    {isConfirmed && (
                      <Link
                        to={`/ticket/${b._id}`}
                        className="btn btn-outline-light btn-sm d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                      >
                        <Ticket size={14} />
                        <span>View E-Ticket</span>
                      </Link>
                    )}

                    {isConfirmed && !showHasPassed && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-info border-info border-opacity-50 d-flex align-items-center justify-content-center gap-1.5 flex-grow-1"
                          onClick={() => handleOpenReschedule(b)}
                        >
                          <RefreshCw size={13} />
                          <span>Reschedule</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger d-flex align-items-center justify-content-center gap-1 flex-grow-1"
                          onClick={() => setCancelTarget(b)}
                        >
                          <XCircle size={14} />
                          <span>Cancel Ticket</span>
                        </Button>
                      </>
                    )}

                    {isConfirmed && showHasPassed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="d-flex align-items-center justify-content-center gap-1"
                        onClick={() => setReviewTarget(b)}
                      >
                        <Star size={14} className="text-warning" />
                        <span>Leave Review</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Booking Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Cancel Booking & Request Refund"
        message={
          cancelTarget ? (
            <div>
              <p>
                Are you sure you want to cancel your booking <strong>{cancelTarget.bookingCode}</strong>?
              </p>
              <div className="alert alert-warning p-3 small mb-0 d-flex gap-2">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <div>
                  <strong>Cancellation Policy:</strong>
                  <ul className="m-0 ps-3 pt-1">
                    <li>More than 2 hours before showtime: <strong>75% refund</strong> of seat price.</li>
                    <li>Less than 2 hours before showtime: <strong>No refund</strong> allowed.</li>
                    <li>Convenience fee is non-refundable.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : ''
        }
        confirmText="Confirm Cancellation"
        cancelText="Nevermind"
        variant="danger"
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {/* Review Modal */}
      {reviewTarget && (
        <Modal
          isOpen={Boolean(reviewTarget)}
          title={`Review ${reviewTarget.showId?.movieId?.title || 'Movie'}`}
          onClose={() => setReviewTarget(null)}
        >
          <form onSubmit={handleSubmitReview}>
            <div className="mb-3">
              <label className="form-label text-secondary small fw-medium">Rating (1 to 5 Stars)</label>
              <div className="d-flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="btn p-1"
                    style={{ background: 'transparent', border: 'none' }}
                  >
                    <Star
                      size={28}
                      fill={s <= rating ? '#eab308' : 'none'}
                      color={s <= rating ? '#eab308' : '#6b7280'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary small fw-medium">Your Review</label>
              <textarea
                className="form-control"
                rows={4}
                required
                minLength={5}
                placeholder="Share your thoughts about the movie..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ background: '#121624', border: '1px solid #242c44', color: '#fff' }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReviewTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingReview}>
                Submit Review
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <Modal
          isOpen={Boolean(rescheduleTarget)}
          onClose={() => setRescheduleTarget(null)}
          title="Reschedule Movie Show"
        >
          <div className="d-flex flex-column gap-3">
            <div className="im-glass p-3 rounded-3 small">
              <div className="fw-bold text-light mb-1 fs-6">
                {rescheduleTarget.showId?.movieId?.title || 'Movie'}
              </div>
              <div className="text-secondary">
                Current Show: <span className="text-warning fw-semibold">{rescheduleTarget.showDateSnapshot} at {rescheduleTarget.showTimeSnapshot}</span> ({rescheduleTarget.showId?.theatreId?.name || 'Cinema'})
              </div>
              <div className="text-secondary mt-1">
                Seats Booked: <span className="badge bg-secondary">{rescheduleTarget.seats.map((s) => s.seatLabel).join(', ')}</span>
              </div>
            </div>

            <p className="text-secondary small m-0">
              Select an alternative upcoming showtime for this movie. Your tickets will be transferred immediately without any cancellation fee.
            </p>

            {loadingShows ? (
              <div className="text-center py-4">
                <LoadingSpinner message="Finding other available showtimes..." />
              </div>
            ) : availableShows.length === 0 ? (
              <div className="alert alert-info py-2.5 px-3 small mb-0">
                No alternative upcoming shows available for this movie right now in your city.
              </div>
            ) : (
              <div>
                <label className="form-label text-secondary small fw-medium mb-1.5">
                  Available Showtimes ({availableShows.length})
                </label>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {availableShows.map((s) => {
                    const isSelected = selectedNewShowId === s._id;
                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => setSelectedNewShowId(s._id)}
                        className={`btn text-start p-2.5 rounded-3 d-flex justify-content-between align-items-center transition-all ${
                          isSelected ? 'btn-danger' : 'btn-dark border-secondary'
                        }`}
                      >
                        <div>
                          <div className="fw-semibold small">{s.theatreName}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {formatISTDateTime(s.startTime)} • {s.screenId?.name || 'Screen'}
                          </div>
                        </div>
                        <span className={`badge ${isSelected ? 'bg-light text-dark' : 'bg-secondary'}`}>
                          {isSelected ? 'Selected' : 'Choose'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 pt-2 border-top border-secondary border-opacity-25">
              <Button type="button" variant="outline" onClick={() => setRescheduleTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!selectedNewShowId || rescheduling}
                loading={rescheduling}
                onClick={handleConfirmReschedule}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
