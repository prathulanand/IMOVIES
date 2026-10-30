import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Film, Plus, Edit2, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  title: '',
  synopsis: '',
  posterUrl: '',
  bannerUrl: '',
  trailerUrl: '',
  durationMinutes: 120,
  releaseDate: new Date().toISOString().slice(0, 10),
  genres: 'Action, Drama',
  languages: 'Hindi, English',
  formats: '2D, 3D',
  certificate: 'UA',
  status: 'NOW_SHOWING',
};

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/movies', { params });
      setMovies(res.data.movies || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleOpenCreate = () => {
    setEditingMovie(null);
    setFormData(INITIAL_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      synopsis: movie.synopsis || '',
      posterUrl: movie.posterUrl || '',
      bannerUrl: movie.bannerUrl || '',
      trailerUrl: movie.trailerUrl || '',
      durationMinutes: movie.durationMinutes || 120,
      releaseDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString().slice(0, 10) : '',
      genres: movie.genres?.join(', ') || '',
      languages: movie.languages?.join(', ') || '',
      formats: movie.formats?.join(', ') || '',
      certificate: movie.certificate || 'UA',
      status: movie.status || 'NOW_SHOWING',
    });
    setModalOpen(true);
  };

  const handleSaveMovie = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const title = formData.title?.trim() || '';
      const synopsis = formData.synopsis?.trim() || `${title} - Now screening in theatres. Experience the epic cinematic journey with premium sound and visuals.`;
      const payload = {
        title,
        synopsis,
        posterUrl: formData.posterUrl?.trim() || '',
        bannerUrl: formData.bannerUrl?.trim() || undefined,
        trailerUrl: formData.trailerUrl?.trim() || undefined,
        durationMinutes: parseInt(formData.durationMinutes, 10) || 120,
        releaseDate: formData.releaseDate ? new Date(formData.releaseDate) : new Date(),
        genres: (formData.genres || 'Action').split(',').map((s) => s.trim()).filter(Boolean),
        languages: (formData.languages || 'Hindi, English').split(',').map((s) => s.trim()).filter(Boolean),
        formats: (formData.formats || '2D, 3D').split(',').map((s) => s.trim()).filter(Boolean),
        certificate: formData.certificate || 'UA',
        status: formData.status || 'NOW_SHOWING',
      };

      if (editingMovie) {
        await api.put(`/admin/movies/${editingMovie._id}`, payload);
        toast.success('Movie updated successfully');
      } else {
        await api.post('/admin/movies', payload);
        toast.success('Movie created successfully');
      }

      setModalOpen(false);
      fetchMovies();
    } catch (err) {
      toast.error(err.message || 'Failed to save movie');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovie = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/movies/${deleteTarget._id}`);
      toast.success('Movie deleted successfully');
      setDeleteTarget(null);
      fetchMovies();
    } catch (err) {
      toast.error(err.message || 'Cannot delete movie with active shows');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">Movie Catalog</h2>
          <p className="text-secondary small m-0">Manage cinematic titles, media banners, and screening statuses.</p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate} className="d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto">
          <Plus size={16} />
          <span>Add New Movie</span>
        </Button>
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
              placeholder="Search movies by title..."
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
            <option value="NOW_SHOWING">Now Showing</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Movies Table */}
      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading catalog..." />
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            No movies found. Click &quot;Add New Movie&quot; to add one.
          </div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Movie</th>
                  <th>Duration</th>
                  <th>Languages</th>
                  <th>Formats</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100'}
                          alt={m.title}
                          className="rounded-2 shadow"
                          style={{ width: '40px', height: '56px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=100';
                          }}
                        />
                        <div>
                          <div className="fw-bold text-light d-flex align-items-center gap-2">
                            <span>{m.title}</span>
                            <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                              {m.certificate}
                            </span>
                          </div>
                          <div className="text-secondary small">{m.genres?.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.durationMinutes} mins</td>
                    <td>{m.languages?.join(', ')}</td>
                    <td>
                      {m.formats?.map((fmt) => (
                        <span key={fmt} className="badge bg-dark border border-secondary text-secondary me-1">
                          {fmt}
                        </span>
                      ))}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(m)}
                          title="Edit Movie"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(m)}
                          title="Delete Movie"
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
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        title={editingMovie ? 'Edit Movie Details' : 'Add New Movie Title'}
        onClose={() => setModalOpen(false)}
        maxWidth="720px"
      >
        <form onSubmit={handleSaveMovie}>
          <div className="row g-3">
            <div className="col-12 col-md-8">
              <Input
                label="Movie Title"
                placeholder="e.g. Spider-Man: No Way Home"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Select
                label="Age Certificate"
                value={formData.certificate}
                onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                options={[
                  { value: 'U', label: 'U (Universal)' },
                  { value: 'UA', label: 'UA (Parental Guidance)' },
                  { value: 'A', label: 'A (Adults Only)' },
                  { value: 'S', label: 'S (Specialized)' },
                ]}
              />
            </div>

            <div className="col-12">
              <label className="form-label text-secondary small fw-medium">
                Storyline / Synopsis (Optional)
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Enter storyline or summary (optional — will auto-generate if left blank)..."
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                style={{ background: '#121624', border: '1px solid #242c44', color: '#fff' }}
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Poster Image URL"
                placeholder="https://images.unsplash.com/..."
                value={formData.posterUrl}
                onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Wide Banner Image URL (Optional)"
                placeholder="https://images.unsplash.com/..."
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Trailer YouTube Embed URL"
                placeholder="https://www.youtube.com/embed/..."
                value={formData.trailerUrl}
                onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                type="number"
                label="Duration (Minutes)"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input
                type="date"
                label="Release Date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Input
                label="Genres (comma-separated)"
                placeholder="Action, Sci-Fi, Thriller"
                value={formData.genres}
                onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <Select
                label="Screening Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'NOW_SHOWING', label: 'Now Showing' },
                  { value: 'UPCOMING', label: 'Upcoming' },
                  { value: 'ARCHIVED', label: 'Archived' },
                ]}
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Languages (comma-separated)"
                placeholder="Hindi, English, Telugu"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <Input
                label="Formats (comma-separated)"
                placeholder="2D, 3D, IMAX, 4DX"
                value={formData.formats}
                onChange={(e) => setFormData({ ...formData, formats: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingMovie ? 'Save Changes' : 'Create Movie'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Movie Title"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone. If shows exist for this movie, deletion will be rejected.`
            : ''
        }
        confirmText="Yes, Delete Movie"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteMovie}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
