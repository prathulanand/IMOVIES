import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { formatINR } from '../../lib/currency';
import { formatISTDateTime } from '../../lib/ist-date';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Search, Ticket, User, Film, CreditCard, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspector Modal
  const [inspectBooking, setInspectBooking] = useState(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);


  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/bookings', { params });
      setBookings(res.data.bookings || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleDeleteBooking = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/bookings/${deleteTarget._id}`);
      toast.success(`Booking #${deleteTarget.bookingCode} removed successfully`);
      setDeleteTarget(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0 fs-3 fs-sm-2">Customer Bookings Ledger</h2>
        <p className="text-secondary small m-0">Master audit ledger of all user reservations, ticket codes, and transactions.</p>
      </div>

      {/* Filter Bar */}
      <div className="im-glass p-3 rounded-4 mb-4 d-flex flex-wrap gap-2 gap-sm-3">
        <div className="flex-grow-1" style={{ minWidth: '180px' }}>
          <div className="input-group">
            <span className="input-group-text bg-transparent border-secondary text-secondary">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control text-light"
              placeholder="Search by Booking Code (e.g. IMV-)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', borderColor: 'var(--border-color)' }}
            />
          </div>
        </div>

        <div className="w-100 w-sm-auto" style={{ minWidth: '160px' }}>
          <select
            className="form-select text-light"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: '#121624', borderColor: 'var(--border-color)' }}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="USED">Used / Admitted</option>
            <option value="AWAITING_PAYMENT">Awaiting Payment</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Querying booking ledger..." />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            No bookings found matching your search.
          </div>
        ) : (
          <div>
            <div className="table-responsive touch-scroll">
              <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
                <thead>
                  <tr className="text-secondary small text-uppercase">
                    <th>Ref Code</th>
                    <th>Customer</th>
                    <th>Movie & Show</th>
                    <th>Seats</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <span className="fw-bold font-monospace text-light">{b.bookingCode}</span>
                        <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                          {new Date(b.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-light">{b.userId?.name || 'Customer'}</div>
                        <div className="text-secondary small">{b.userId?.email}</div>
                      </td>
                      <td>
                        <div className="text-light fw-medium">{b.showId?.movieId?.title}</div>
                        <div className="text-secondary small">
                          {b.showId?.theatreId?.name} ({b.showId?.screenId?.name})
                        </div>
                        <div className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                          {b.showId?.startTime && formatISTDateTime(b.showId.startTime)}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {b.seats?.map((s) => (
                            <span key={s.seatLabel} className="badge bg-secondary">
                              {s.seatLabel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold text-success">{formatINR(b.total)}</span>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                            onClick={() => setInspectBooking(b)}
                            title="Inspect Booking Details"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                            onClick={() => setDeleteTarget(b)}
                            title="Delete Booking Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-secondary small">
                  Page {page} of {totalPages}
                </span>
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Inspector Modal */}
      {inspectBooking && (
        <Modal
          isOpen={Boolean(inspectBooking)}
          title={`Booking Details — #${inspectBooking.bookingCode}`}
          onClose={() => setInspectBooking(null)}
          size="lg"
        >
          <div className="d-flex flex-column gap-3">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3" style={{ background: '#121624', border: '1px solid #242c44' }}>
                  <div className="text-secondary small text-uppercase fw-semibold mb-2 d-flex align-items-center gap-1">
                    <User size={14} /> Customer Profile
                  </div>
                  <div className="fw-bold text-light">{inspectBooking.userId?.name}</div>
                  <div className="text-secondary small">{inspectBooking.userId?.email}</div>
                  {inspectBooking.userId?.phone && (
                    <div className="text-secondary small">{inspectBooking.userId.phone}</div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded-3" style={{ background: '#121624', border: '1px solid #242c44' }}>
                  <div className="text-secondary small text-uppercase fw-semibold mb-2 d-flex align-items-center gap-1">
                    <CreditCard size={14} /> Financial Snapshot
                  </div>
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>Subtotal:</span>
                    <span>{formatINR(inspectBooking.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>Convenience Fee:</span>
                    <span>{formatINR(inspectBooking.convenienceFee)}</span>
                  </div>
                  {inspectBooking.discount > 0 && (
                    <div className="d-flex justify-content-between small text-success">
                      <span>Discount ({inspectBooking.couponCode}):</span>
                      <span>-{formatINR(inspectBooking.discount)}</span>
                    </div>
                  )}
                  <hr className="my-1" style={{ borderColor: 'var(--border-color)' }} />
                  <div className="d-flex justify-content-between fw-bold text-light">
                    <span>Total:</span>
                    <span className="text-danger">{formatINR(inspectBooking.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-3" style={{ background: '#121624', border: '1px solid #242c44' }}>
              <div className="text-secondary small text-uppercase fw-semibold mb-2">Booked Seats</div>
              <div className="d-flex flex-wrap gap-2">
                {inspectBooking.seats?.map((s) => (
                  <span
                    key={s.seatLabel}
                    className="badge p-2 px-3 fs-6 d-flex align-items-center gap-2"
                    style={{ background: '#1c2236', border: '1px solid #2d3752', color: '#fff' }}
                  >
                    <span className="fw-bold">{s.seatLabel}</span>
                    <span className="badge bg-danger text-uppercase" style={{ fontSize: '0.65rem' }}>
                      {s.category}
                    </span>
                    <span className="text-secondary small">{formatINR(s.price)}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="text-secondary small">
              <div>Razorpay Order ID: <span className="text-light">{inspectBooking.razorpayOrderId || 'N/A'}</span></div>
              <div>Created Timestamp: <span className="text-light">{new Date(inspectBooking.createdAt).toISOString()}</span></div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Booking Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Booking Record"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete booking #${deleteTarget.bookingCode} for "${deleteTarget.userId?.name || 'Customer'}" (${deleteTarget.seats?.map((s) => s.seatLabel).join(', ')})? Any held seats associated with it will immediately be freed.`
            : ''
        }
        confirmText="Yes, Delete Booking"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteBooking}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
