import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Star, Film, Search } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatISTDateTime } from '../../lib/ist-date';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Delete modal state
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reviews');
      setReviews(res.data.reviews || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async () => {
    if (!selectedReview) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/admin/reviews/${selectedReview._id}`);
      toast.success('Review removed successfully');
      setSelectedReview(null);
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const q = search.toLowerCase();
    const movieTitle = r.movieId?.title?.toLowerCase() || '';
    const userName = r.userId?.name?.toLowerCase() || '';
    const userEmail = r.userId?.email?.toLowerCase() || '';
    const comment = r.comment?.toLowerCase() || '';
    return movieTitle.includes(q) || userName.includes(q) || userEmail.includes(q) || comment.includes(q);
  });

  return (
    <div className="admin-reviews-page">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <MessageSquare size={24} className="text-danger" />
            <h4 className="fw-bold text-light mb-0">Customer Reviews Moderation</h4>
            <span className="badge bg-secondary ms-2">{total} Total</span>
          </div>
          <p className="text-secondary small mb-0 mt-1">
            Review and moderate movie ratings and feedbacks submitted by audience members.
          </p>
        </div>

        {/* Search */}
        <div className="position-relative" style={{ minWidth: '260px' }}>
          <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" />
          <input
            type="text"
            className="form-control form-control-sm bg-dark border-secondary text-light ps-5"
            placeholder="Search movie, user, comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-5 d-flex justify-content-center">
          <LoadingSpinner />
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews found"
          description={search ? 'No reviews matched your search filter.' : 'No customer reviews have been submitted yet.'}
        />
      ) : (
        <div className="table-responsive bg-dark border border-secondary rounded">
          <table className="table table-dark table-hover mb-0 align-middle">
            <thead className="table-secondary text-uppercase small" style={{ fontSize: '11px' }}>
              <tr>
                <th scope="col" style={{ width: '22%' }}>Movie</th>
                <th scope="col" style={{ width: '20%' }}>User</th>
                <th scope="col" style={{ width: '12%' }}>Rating</th>
                <th scope="col" style={{ width: '30%' }}>Review Feedback</th>
                <th scope="col" style={{ width: '10%' }}>Date</th>
                <th scope="col" className="text-end" style={{ width: '6%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((r) => (
                <tr key={r._id}>
                  {/* Movie */}
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {r.movieId?.posterUrl ? (
                        <img
                          src={r.movieId.posterUrl}
                          alt={r.movieId.title}
                          className="rounded object-fit-cover"
                          style={{ width: '32px', height: '46px' }}
                        />
                      ) : (
                        <div
                          className="rounded bg-secondary d-flex align-items-center justify-content-center text-dark"
                          style={{ width: '32px', height: '46px' }}
                        >
                          <Film size={16} />
                        </div>
                      )}
                      <div>
                        <div className="fw-semibold text-light text-truncate" style={{ maxWidth: '160px' }}>
                          {r.movieId?.title || 'Unknown Movie'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* User */}
                  <td>
                    <div className="fw-medium text-light">{r.userId?.name || 'Anonymous'}</div>
                    <div className="text-secondary small">{r.userId?.email || 'N/A'}</div>
                  </td>

                  {/* Rating */}
                  <td>
                    <div className="d-flex align-items-center gap-1 text-warning">
                      <Star size={14} fill="#f59e0b" />
                      <span className="fw-bold">{r.rating} / 5</span>
                    </div>
                  </td>

                  {/* Comment */}
                  <td>
                    <div className="text-light small text-break" style={{ maxHeight: '60px', overflowY: 'auto' }}>
                      &ldquo;{r.comment}&rdquo;
                    </div>
                  </td>

                  {/* Date */}
                  <td className="text-secondary small">
                    {r.createdAt ? formatISTDateTime(r.createdAt) : 'N/A'}
                  </td>

                  {/* Action */}
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger p-1 rounded"
                      title="Delete inappropriate review"
                      onClick={() => setSelectedReview(r)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(selectedReview)}
        title="Delete User Review"
        message={`Are you sure you want to delete this review by ${
          selectedReview?.userId?.name || 'User'
        } for movie "${selectedReview?.movieId?.title || 'Movie'}"? This action cannot be undone.`}
        confirmText="Delete Review"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setSelectedReview(null)}
      />
    </div>
  );
}
