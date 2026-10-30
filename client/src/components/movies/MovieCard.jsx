import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Ticket, Heart } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function MovieCard({ movie, isFavInitially = false, onToggleFavorite }) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(isFavInitially);
  const [loadingFav, setLoadingFav] = useState(false);

  if (!movie) return null;

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save to watchlist');
      return;
    }
    try {
      setLoadingFav(true);
      const res = await api.post(`/user/favorites/${movie._id}`);
      setIsFavorite(res.data.isFavorite);
      if (res.data.isFavorite) {
        toast.success(`Added "${movie.title}" to Watchlist!`);
      } else {
        toast.success(`Removed "${movie.title}" from Watchlist`);
      }
      if (onToggleFavorite) onToggleFavorite(movie._id, res.data.isFavorite);
    } catch {
      toast.error('Failed to update watchlist');
    } finally {
      setLoadingFav(false);
    }
  };

  return (
    <div className="im-card overflow-hidden h-100 d-flex flex-column">
      {/* Poster */}
      <div className="position-relative overflow-hidden" style={{ aspectRatio: '2/3' }}>
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-100 h-100 object-fit-cover transition"
          style={{ transition: 'transform 0.3s ease' }}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={loadingFav}
          aria-label="Add to watchlist"
          className="position-absolute top-0 end-0 m-2 btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(10, 12, 19, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(4px)',
            zIndex: 2,
          }}
        >
          <Heart
            size={16}
            color={isFavorite ? 'var(--primary-color)' : '#ffffff'}
            fill={isFavorite ? 'var(--primary-color)' : 'none'}
          />
        </button>

        {/* Certificate Badge */}
        <span
          className="position-absolute top-0 start-0 m-2 badge bg-dark bg-opacity-75 border border-secondary text-light px-2 py-1"
          style={{ fontSize: '11px' }}
        >
          {movie.certificate}
        </span>

        {/* Rating Badge */}
        {movie.avgRating ? (
          <span className="position-absolute bottom-0 start-0 m-2 badge bg-dark bg-opacity-90 border border-warning text-warning d-flex align-items-center gap-1 px-2 py-1">
            <Star size={12} fill="#f59e0b" />
            <span className="fw-bold">{movie.avgRating}</span>
            <span className="text-secondary small">({movie.reviewCount || 0})</span>
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="p-2.5 p-sm-3 d-flex flex-column flex-grow-1 justify-content-between">
        <div>
          <h6 className="fw-bold text-light text-truncate mb-1" title={movie.title}>
            {movie.title}
          </h6>
          <div className="text-secondary small d-flex align-items-center gap-2 mb-2">
            <span>{movie.languages?.join(', ')}</span>
            <span>•</span>
            <span className="d-flex align-items-center gap-1">
              <Clock size={12} /> {movie.durationMinutes}m
            </span>
          </div>
          <div className="d-flex flex-wrap gap-1 mb-3">
            {movie.genres?.slice(0, 2).map((g) => (
              <span key={g} className="badge bg-secondary bg-opacity-25 text-secondary" style={{ fontSize: '10px' }}>
                {g}
              </span>
            ))}
          </div>
        </div>

        <Link
          to={`/movies/${movie._id}`}
          className="btn btn-sm btn-danger w-100 d-flex align-items-center justify-content-center gap-2 fw-medium mt-auto"
        >
          <Ticket size={14} />
          <span>{movie.status === 'UPCOMING' ? 'View Details' : 'Book Tickets'}</span>
        </Link>
      </div>
    </div>
  );
}
