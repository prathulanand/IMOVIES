import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { formatINR } from '../../lib/currency';
import { formatISTDateTime } from '../../lib/ist-date';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import SeatMap from '../../components/seats/SeatMap';
import {
  CalendarDays,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminShowsPage() {
  const [shows, setShows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [theatreFilter, setTheatreFilter] = useState('');
  const [movieFilter, setMovieFilter] = useState('');
  const [screenFilter, setScreenFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'tomorrow' | 'upcoming' | 'past' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = Nearest First, 'desc' = Furthest First

  // Create Show Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movieId, setMovieId] = useState('');
  const [theatreId, setTheatreId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [format, setFormat] = useState('2D');
  const [language, setLanguage] = useState('Hindi');
  const [priceVip, setPriceVip] = useState(400);
  const [pricePremium, setPricePremium] = useState(300);
  const [priceRegular, setPriceRegular] = useState(200);

  // Occupancy Map Modal
  const [seatMapShow, setSeatMapShow] = useState(null);
  const [showSeats, setShowSeats] = useState([]);
  const [seatLayout, setSeatLayout] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Cancel/Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchShows = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sort: sortOrder,
      };

      if (theatreFilter) params.theatreId = theatreFilter;
      if (movieFilter) params.movieId = movieFilter;
      if (screenFilter) params.screenId = screenFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      if (dateFilter === 'custom' && customDate) {
        params.date = customDate;
      } else if (dateFilter && dateFilter !== 'all') {
        params.date = dateFilter;
      }

      const res = await api.get('/admin/shows', { params });
      setShows(res.data.shows || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch shows');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    sortOrder,
    theatreFilter,
    movieFilter,
    screenFilter,
    statusFilter,
    searchQuery,
    dateFilter,
    customDate,
  ]);

  const fetchDependencies = async () => {
    try {
      const [mRes, tRes, sRes] = await Promise.all([
        api.get('/admin/movies'),
        api.get('/admin/theatres'),
        api.get('/admin/screens'),
      ]);
      setMovies(mRes.data.movies || []);
      setTheatres(tRes.data.theatres || []);
      setScreens(sRes.data.screens || []);
    } catch (err) {
      // quiet
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const filteredScreensForCreate = useMemo(() => {
    return screens.filter(
      (s) => !theatreId || s.theatreId?._id === theatreId || s.theatreId === theatreId
    );
  }, [screens, theatreId]);

  const filteredScreensForFilter = useMemo(() => {
    return screens.filter(
      (s) => !theatreFilter || s.theatreId?._id === theatreFilter || s.theatreId === theatreFilter
    );
  }, [screens, theatreFilter]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      theatreFilter ||
      movieFilter ||
      screenFilter ||
      statusFilter ||
      dateFilter !== 'all' ||
      customDate ||
      sortOrder !== 'asc'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setTheatreFilter('');
    setMovieFilter('');
    setScreenFilter('');
    setDateFilter('all');
    setCustomDate('');
    setStatusFilter('');
    setSortOrder('asc');
    setLimit(50);
    setPage(1);
  };

  const handleOpenCreate = () => {
    const firstMovie = movies[0];
    const firstTheatre = theatres[0];
    const availScreens = screens.filter(
      (s) => s.theatreId?._id === firstTheatre?._id || s.theatreId === firstTheatre?._id
    );

    setMovieId(firstMovie?._id || '');
    setTheatreId(firstTheatre?._id || '');
    setScreenId(availScreens[0]?._id || '');

    // Default to tomorrow 6:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    setStartTime(tomorrow.toISOString().slice(0, 16));
    setFormat(firstMovie?.formats?.[0] || '2D');
    setLanguage(firstMovie?.languages?.[0] || 'Hindi');
    setPriceVip(450);
    setPricePremium(320);
    setPriceRegular(220);
    setModalOpen(true);
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    if (!movieId || !theatreId || !screenId || !startTime) {
      toast.error('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        movieId,
        theatreId,
        screenId,
        startTime: new Date(startTime),
        format,
        language,
        pricing: {
          RECLINER: Math.round(Number(priceVip) * 100),
          VIP: Math.round(Number(priceVip) * 100),
          PREMIUM: Math.round(Number(pricePremium) * 100),
          REGULAR: Math.round(Number(priceRegular) * 100),
        },
      };

      await api.post('/admin/shows', payload);
      toast.success('Show scheduled successfully! Seats generated.');
      setModalOpen(false);
      fetchShows();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule show (possible screen time clash)');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSeatOccupancy = async (show) => {
    setSeatMapShow(show);
    setLoadingSeats(true);
    try {
      const res = await api.get(`/admin/shows/${show._id}/seats`);
      setShowSeats(res.data.seats || []);
      setSeatLayout(res.data.screen?.layout || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load show seats');
      setSeatMapShow(null);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleDeleteShow = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/shows/${deleteTarget._id}`);
      toast.success(res.data.message || 'Show cancelled and auto-refunds processed');
      setDeleteTarget(null);
      fetchShows();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel show');
    } finally {
      setDeleting(false);
    }
  };

  const startIndex = total === 0 ? 0 : (page - 1) * (limit === 'all' ? total : limit) + 1;
  const endIndex = limit === 'all' ? total : Math.min(page * limit, total);

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="fw-bold m-0 fs-3 fs-sm-2">Showtime Scheduler</h2>
            <span className="badge bg-danger rounded-pill px-2.5 py-1">
              {total} {total === 1 ? 'Show' : 'Shows'}
            </span>
          </div>
          <p className="text-secondary small m-0 mt-1">
            Schedule screenings, filter by cinema or date, and view full seating occupancy.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          disabled={movies.length === 0 || screens.length === 0}
          className="d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto shadow"
        >
          <Plus size={16} />
          <span>Schedule New Show</span>
        </Button>
      </div>

      {/* Comprehensive Filter Control Bar */}
      <div className="im-glass p-3 rounded-4 mb-4">
        <div className="row g-2 align-items-center">
          {/* Search by Movie */}
          <div className="col-12 col-md-3">
            <div className="position-relative">
              <Search
                size={16}
                className="position-absolute top-50 translate-middle-y ms-3 text-secondary"
              />
              <input
                type="text"
                className="form-control text-light ps-5"
                placeholder="Search movie title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{ background: '#121624', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>

          {/* Theatre Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select text-light"
              value={theatreFilter}
              onChange={(e) => {
                setTheatreFilter(e.target.value);
                setScreenFilter('');
                setPage(1);
              }}
              style={{ background: '#121624', borderColor: 'var(--border-color)' }}
            >
              <option value="">All Theatres</option>
              {theatres.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          {/* Movie Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select text-light"
              value={movieFilter}
              onChange={(e) => {
                setMovieFilter(e.target.value);
                setPage(1);
              }}
              style={{ background: '#121624', borderColor: 'var(--border-color)' }}
            >
              <option value="">All Movies ({movies.length})</option>
              {movies.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select text-light"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              style={{ background: '#121624', borderColor: 'var(--border-color)' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="past">Past Shows</option>
              <option value="custom">Custom Date...</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="col-6 col-md-2">
            <select
              className="form-select text-light"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              style={{ background: '#121624', borderColor: 'var(--border-color)' }}
            >
              <option value="asc">Nearest Showtime First</option>
              <option value="desc">Furthest Showtime First</option>
            </select>
          </div>

          {/* Rows Per Page */}
          <div className="col-6 col-md-1">
            <select
              className="form-select text-light"
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setPage(1);
              }}
              style={{ background: '#121624', borderColor: 'var(--border-color)' }}
              title="Shows per page"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {/* Secondary controls row: Custom Date picker & Reset filters button */}
        {(dateFilter === 'custom' || hasActiveFilters) && (
          <div
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 pt-2 border-top"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {dateFilter === 'custom' ? (
              <div className="d-flex align-items-center gap-2">
                <span className="text-secondary small">Pick Date:</span>
                <input
                  type="date"
                  className="form-control form-control-sm text-light"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ background: '#121624', borderColor: 'var(--border-color)', width: 'auto' }}
                />
              </div>
            ) : (
              <div />
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 ms-auto"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shows Table */}
      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading scheduled screenings..." />
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <p className="mb-2">No shows match your current filter criteria.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
              >
                <RotateCcw size={14} />
                <span>Clear Filters to Show All ({total})</span>
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="table-responsive touch-scroll">
              <table
                className="table table-dark table-hover align-middle mb-0 text-nowrap"
                style={{ background: 'transparent' }}
              >
                <thead>
                  <tr className="text-secondary small text-uppercase">
                    <th>Movie</th>
                    <th>Cinema & Screen</th>
                    <th>Showtime (IST)</th>
                    <th>Format / Audio</th>
                    <th>Pricing (Base)</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={
                              s.movieId?.posterUrl ||
                              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100'
                            }
                            alt={s.movieId?.title}
                            className="rounded-2"
                            style={{ width: '36px', height: '48px', objectFit: 'cover' }}
                          />
                          <div>
                            <span className="fw-bold text-light d-block">{s.movieId?.title}</span>
                            {s.movieId?.durationMinutes && (
                              <span className="text-secondary small">
                                {s.movieId.durationMinutes} mins • {s.movieId.certificate || 'UA'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-light">{s.theatreId?.name}</div>
                        <div className="text-secondary small">
                          {s.screenId?.name} ({s.theatreId?.city})
                        </div>
                      </td>
                      <td>
                        <div className="text-light fw-medium">
                          {s.startTime ? formatISTDateTime(s.startTime) : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary me-1">{s.format}</span>
                        <span className="badge bg-dark border border-secondary text-secondary">
                          {s.language}
                        </span>
                      </td>
                      <td>
                        <div className="small">
                          <span className="text-danger fw-semibold">
                            REC: {formatINR(s.pricing?.RECLINER || s.pricing?.VIP || 40000)}
                          </span>{' '}
                          •{' '}
                          <span className="text-warning fw-semibold">
                            PREM: {formatINR(s.pricing?.PREMIUM || 30000)}
                          </span>{' '}
                          •{' '}
                          <span className="text-info fw-semibold">
                            REG: {formatINR(s.pricing?.REGULAR || 20000)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                            onClick={() => handleOpenSeatOccupancy(s)}
                            title="View Live Seat Occupancy"
                          >
                            <Eye size={14} />
                            <span>Seats</span>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(s)}
                            title="Cancel Show & Auto-Refund"
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

            {/* Showing Count + Pagination Bar */}
            <div
              className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3 border-top gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span className="text-secondary small">
                Showing <strong className="text-light">{startIndex}–{endIndex}</strong> of{' '}
                <strong className="text-light">{total}</strong> screenings
              </span>

              {totalPages > 1 && limit !== 'all' && (
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <div className="d-flex align-items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-secondary px-1">...</span>
                          )}
                          <button
                            className={`btn btn-sm px-2.5 py-1 ${
                              page === p
                                ? 'btn-danger text-white fw-bold'
                                : 'btn-dark text-secondary'
                            }`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Show Modal */}
      <Modal
        isOpen={modalOpen}
        title="Schedule New Movie Screening"
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleCreateShow}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label text-secondary small fw-medium">Select Movie</label>
              <select
                className="form-select text-light"
                value={movieId}
                onChange={(e) => setMovieId(e.target.value)}
                style={{ background: '#121624', borderColor: 'var(--border-color)' }}
                required
              >
                {movies.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} ({m.durationMinutes}m)
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-secondary small fw-medium">
                Select Cinema Multiplex
              </label>
              <select
                className="form-select text-light"
                value={theatreId}
                onChange={(e) => {
                  setTheatreId(e.target.value);
                  const matching = screens.filter(
                    (s) => s.theatreId?._id === e.target.value || s.theatreId === e.target.value
                  );
                  setScreenId(matching[0]?._id || '');
                }}
                style={{ background: '#121624', borderColor: 'var(--border-color)' }}
                required
              >
                {theatres.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-secondary small fw-medium">
                Select Auditorium Screen
              </label>
              <select
                className="form-select text-light"
                value={screenId}
                onChange={(e) => setScreenId(e.target.value)}
                style={{ background: '#121624', borderColor: 'var(--border-color)' }}
                required
              >
                {filteredScreensForCreate.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.soundSystem || 'Stereo'})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <Input
                type="datetime-local"
                label="Show Start Time (IST)"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Experience Format"
                placeholder="2D, 3D, IMAX 3D"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Audio Language"
                placeholder="Hindi, English, Tamil"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                required
              />
            </div>

            <div className="col-12">
              <div
                className="p-3 rounded-3"
                style={{ background: '#121624', border: '1px solid #242c44' }}
              >
                <div className="fw-semibold text-light mb-2 small text-uppercase">
                  Seat Category Pricing (in INR ₹)
                </div>
                <div className="row g-2">
                  <div className="col-12 col-sm-4">
                    <Input
                      type="number"
                      label="RECLINER / VIP Row (₹)"
                      value={priceVip}
                      onChange={(e) => setPriceVip(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-4">
                    <Input
                      type="number"
                      label="PREMIUM Row (₹)"
                      value={pricePremium}
                      onChange={(e) => setPricePremium(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-4">
                    <Input
                      type="number"
                      label="REGULAR Row (₹)"
                      value={priceRegular}
                      onChange={(e) => setPriceRegular(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Schedule Show
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live Seat Occupancy Modal */}
      {seatMapShow && (
        <Modal
          isOpen={Boolean(seatMapShow)}
          title={`Live Seat Occupancy — ${seatMapShow.movieId?.title} (${seatMapShow.screenId?.name})`}
          onClose={() => setSeatMapShow(null)}
          size="xl"
        >
          {loadingSeats ? (
            <div className="text-center py-5">
              <LoadingSpinner message="Loading live seats..." />
            </div>
          ) : (
            <div>
              <div className="mb-3 text-secondary small">
                Showing live occupancy for {formatISTDateTime(seatMapShow.startTime)}. Red seats are
                booked, yellow are held, dark are free.
              </div>
              <SeatMap
                layout={seatLayout}
                seats={showSeats}
                selectedSeats={[]}
                onToggleSeat={() => {}} // admin view is read-only
                mode="admin"
              />
            </div>
          )}
        </Modal>
      )}

      {/* Cancel Show Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Cancel Show & Issue Automated Refunds"
        message={
          deleteTarget ? (
            <div>
              <p>
                Are you sure you want to cancel the show of <strong>{deleteTarget.movieId?.title}</strong> on{' '}
                <strong>{formatISTDateTime(deleteTarget.startTime)}</strong>?
              </p>
              <div className="alert alert-danger p-3 small mb-0 d-flex gap-2">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <div>
                  <strong>Refund Invariant:</strong>
                  <div className="pt-1">
                    Cancelling this show will immediately trigger <strong>100% automated refunds</strong> to all
                    moviegoers with confirmed bookings, cancel their tickets, and release all seats.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            ''
          )
        }
        confirmText="Confirm Cancellation & Refund"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteShow}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
