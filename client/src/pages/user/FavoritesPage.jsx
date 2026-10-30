import React, { useEffect, useState } from 'react';
import { Heart, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import MovieCard from '../../components/movies/MovieCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.get('/user/favorites');
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggle = (movieId, isFav) => {
    if (!isFav) {
      setFavorites((prev) => prev.filter((f) => (f.movieId?._id || f.movieId) !== movieId));
    }
  };

  if (loading) {
    return (
      <div className="container py-5 d-flex justify-content-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center justify-content-between mb-4 border-bottom border-secondary pb-3">
        <div className="d-flex align-items-center gap-2">
          <Heart size={28} className="text-danger" fill="#a855f7" />
          <h2 className="fw-bold text-light mb-0">My Watchlist</h2>
          <span className="badge bg-secondary ms-2">{favorites.length}</span>
        </div>
        <Link to="/" className="btn btn-sm btn-outline-light d-flex align-items-center gap-1">
          <Film size={14} />
          <span>Browse All Movies</span>
        </Link>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your watchlist is empty"
          description="Save movies you want to watch later by clicking the heart icon on any movie card."
          actionText="Discover Movies"
          actionLink="/"
        />
      ) : (
        <div className="row g-4 row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5">
          {favorites.map((fav) => {
            const movie = fav.movieId;
            if (!movie) return null;
            return (
              <div key={fav._id} className="col">
                <MovieCard
                  movie={movie}
                  isFavInitially={true}
                  onToggleFavorite={handleToggle}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
