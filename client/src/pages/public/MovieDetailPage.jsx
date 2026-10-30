import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Calendar, Play, Ticket, MessageSquare, ArrowLeft, Heart } from 'lucide-react';
import api from '../../lib/api';
import { formatIST } from '../../lib/ist-date';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TrailerModal from '../../components/movies/TrailerModal';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    async function loadMovie() {
      setLoading(true);
      try {
        const res = await api.get(`/public/movies/${id}`);
        setMovie(res.data.movie);

        // Check favorite status if logged in
        if (user) {
          try {
            const favRes = await api.get('/user/favorites');
            const favs = favRes.data.favorites || [];
            const isFav = favs.some((f) => (f.movieId?._id || f.movieId) === id);
            setIsFavorite(isFav);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadMovie();
  }, [id, user]);

  const handleToggleWatchlist = async () => {
    if (!user) {
      toast.error('Please login to save to watchlist');
      return;
    }
    try {
      setFavLoading(true);
      const res = await api.post(`/user/favorites/${id}`);
      setIsFavorite(res.data.isFavorite);
      if (res.data.isFavorite) {
        toast.success(`"${movie.title}" added to your Watchlist!`);
      } else {
        toast.success(`"${movie.title}" removed from your Watchlist`);
      }
    } catch {
      toast.error('Failed to update watchlist');
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading movie details..." fullScreen />;
  if (error || !movie) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-danger fw-bold">Movie not found</h3>
        <p className="text-secondary">{error || 'Unable to locate movie details.'}</p>
        <Link to="/" className="btn btn-outline-secondary mt-3">
          Back to Movies
        </Link>
      </div>
    );
  }

  const isUpcoming = movie.status === 'UPCOMING';

  return (
    <div className="movie-detail-page pb-5">
      {/* Backdrop Header */}
      <div
        className="position-relative w-100 py-5"
        style={{
          minHeight: '380px',
          background: `linear-gradient(to bottom, rgba(10, 12, 19, 0.7) 0%, rgba(10, 12, 19, 0.95) 100%), url(${
            movie.bannerUrl || movie.posterUrl
          }) center/cover no-repeat`,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container py-4">
          <Link to="/" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 mb-4 rounded-pill text-light">
            <ArrowLeft size={16} />
            <span>Back to Movies</span>
          </Link>

          <div className="row g-4 align-items-center">
            {/* Poster */}
            <div className="col-12 col-md-4 col-lg-3 text-center text-md-start">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="img-fluid rounded-4 shadow-lg border border-secondary"
                style={{ maxHeight: '320px', width: 'auto', aspectRatio: '2/3', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80';
                }}
              />
            </div>

            {/* Core Details */}
            <div className="col-12 col-md-8 col-lg-9">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="badge bg-danger px-2 py-1 text-uppercase">{movie.certificate}</span>
                <span className="badge bg-dark border border-secondary text-light">
                  {movie.status === 'NOW_SHOWING' ? 'Now Showing' : 'Coming Soon'}
                </span>
                {movie.avgRating && (
                  <span className="badge bg-warning bg-opacity-25 border border-warning text-warning d-flex align-items-center gap-1 px-2 py-1">
                    <Star size={12} fill="#f59e0b" />
                    <strong>{movie.avgRating} / 5</strong>
                    <span className="text-secondary">({movie.reviewCount} reviews)</span>
                  </span>
                )}
              </div>

              <h1 className="hero-fluid-title fw-extrabold text-white mb-2">{movie.title}</h1>

              <div className="d-flex flex-wrap align-items-center gap-2 gap-sm-3 text-secondary small mb-3">
                <span className="d-flex align-items-center gap-1">
                  <Clock size={14} /> {movie.durationMinutes} mins
                </span>
                <span>•</span>
                <span>{movie.languages?.join(', ')}</span>
                <span>•</span>
                <span>{movie.genres?.join(', ')}</span>
                <span>•</span>
                <span className="d-flex align-items-center gap-1">
                  <Calendar size={14} /> Released {new Date(movie.releaseDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="text-light opacity-90 fs-6 lh-base mb-4" style={{ maxWidth: '750px' }}>
                {movie.synopsis}
              </p>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap align-items-center gap-2.5 gap-sm-3 mt-4">
                {!isUpcoming ? (
                  <Link
                    to={`/movies/${movie._id}/shows`}
                    className="btn btn-danger rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap shadow-sm transition"
                    style={{
                      fontSize: '0.925rem',
                      minHeight: '42px',
                      boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)',
                    }}
                  >
                    <Ticket size={17} />
                    <span>Book Tickets</span>
                  </Link>
                ) : (
                  <span
                    className="badge bg-secondary rounded-pill px-3.5 py-2 d-inline-flex align-items-center text-center"
                    style={{ fontSize: '0.875rem', minHeight: '42px' }}
                  >
                    Tickets Opening Soon
                  </span>
                )}

                {/* Add to Watchlist / Favorite Button */}
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  disabled={favLoading}
                  className={`btn rounded-pill px-3.5 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap transition ${
                    isFavorite ? 'btn-danger shadow-sm' : 'btn-outline-danger'
                  }`}
                  style={{
                    fontSize: '0.925rem',
                    minHeight: '42px',
                    background: isFavorite ? undefined : 'rgba(168, 85, 247, 0.1)',
                    borderColor: isFavorite ? undefined : 'rgba(168, 85, 247, 0.45)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Heart
                    size={17}
                    fill={isFavorite ? 'currentColor' : 'none'}
                    color="currentColor"
                  />
                  <span>{isFavorite ? 'In Watchlist' : 'Add to Watchlist'}</span>
                </button>

                {movie.trailerUrl && (
                  <button
                    type="button"
                    onClick={() => setTrailerOpen(true)}
                    className="btn btn-outline-light rounded-pill px-3.5 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap transition"
                    style={{
                      fontSize: '0.925rem',
                      minHeight: '42px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Watch Trailer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast, Crew & Reviews */}
      <div className="container py-5">
        <div className="row g-5">
          {/* Left Column: Cast & Crew */}
          <div className="col-lg-7">
            <h4 className="fw-bold text-light mb-4 pb-2 border-bottom border-secondary border-opacity-25">
              Cast & Crew
            </h4>

            {movie.director && (
              <div className="mb-4">
                <span className="text-secondary small fw-semibold text-uppercase d-block mb-1">Director</span>
                <span className="text-light fw-medium fs-6">{movie.director}</span>
              </div>
            )}

            <div>
              <span className="text-secondary small fw-semibold text-uppercase d-block mb-2">Key Cast</span>
              <div className="d-flex flex-wrap gap-2">
                {movie.cast?.map((actor) => (
                  <span key={actor} className="badge bg-dark border border-secondary text-light px-3 py-2 fs-7 fw-normal">
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: User Reviews */}
          <div className="col-lg-5">
            <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom border-secondary border-opacity-25">
              <h4 className="fw-bold text-light m-0">User Reviews</h4>
              <span className="badge bg-secondary text-light">{movie.reviewCount || 0} reviews</span>
            </div>

            {movie.recentReviews?.length === 0 ? (
              <div className="im-glass p-4 rounded-4 text-center text-secondary small">
                <MessageSquare size={28} className="mb-2 text-dim" />
                <div>No reviews yet. Verified viewers who attend this movie will be able to leave a rating.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {movie.recentReviews?.map((rev) => (
                  <div key={rev._id} className="im-glass p-3 rounded-3 border border-secondary border-opacity-25">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-light small">{rev.userName}</strong>
                      <div className="d-flex align-items-center gap-1 text-warning small">
                        <Star size={12} fill="#f59e0b" />
                        <span>{rev.rating} / 5</span>
                      </div>
                    </div>
                    <p className="text-secondary small m-0 lh-sm">{rev.comment}</p>
                    <div className="text-dim mt-2" style={{ fontSize: '10px' }}>
                      {formatIST(rev.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={movie.trailerUrl}
        title={movie.title}
      />
    </div>
  );
}
