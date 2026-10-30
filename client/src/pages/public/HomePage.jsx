import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Play, Heart, Ticket } from 'lucide-react';
import api from '../../lib/api';
import { useCity } from '../../context/CityContext';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import MovieCard from '../../components/movies/MovieCard';
import TrailerModal from '../../components/movies/TrailerModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

export default function HomePage() {
  const { city } = useCity();
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [favMovieIds, setFavMovieIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('NOW_SHOWING'); // NOW_SHOWING | UPCOMING
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [trailerMovie, setTrailerMovie] = useState(null);

  // Load user favorites to synchronize heart states
  useEffect(() => {
    async function loadFavs() {
      if (!user) {
        setFavMovieIds([]);
        return;
      }
      try {
        const res = await api.get('/user/favorites');
        const ids = (res.data.favorites || []).map((f) => f.movieId?._id || f.movieId);
        setFavMovieIds(ids);
      } catch {
        // quiet fail
      }
    }
    loadFavs();
  }, [user]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: activeTab,
        city: activeTab === 'NOW_SHOWING' ? city : undefined,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedGenre) params.genre = selectedGenre;
      if (selectedLanguage) params.language = selectedLanguage;

      const res = await api.get('/public/movies', { params });
      setMovies(res.data.movies || []);
    } catch (err) {
      console.error('Failed to load movies:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, city, searchQuery, selectedGenre, selectedLanguage]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovies();
  };

  // Hero movie (e.g. first movie in list)
  const heroMovie = movies.find((m) => m.bannerUrl) || movies[0];

  const genresList = ['Action', 'Sci-Fi', 'Adventure', 'Drama', 'Biography', 'Crime', 'History'];
  const languagesList = ['English', 'Hindi', 'Telugu', 'Tamil'];

  const handleHeroToggleWatchlist = async () => {
    if (!heroMovie) return;
    if (!user) {
      toast.error('Please login to save to watchlist');
      return;
    }
    try {
      const res = await api.post(`/user/favorites/${heroMovie._id}`);
      if (res.data.isFavorite) {
        setFavMovieIds((prev) => [...prev, heroMovie._id]);
        toast.success(`"${heroMovie.title}" added to Watchlist!`);
      } else {
        setFavMovieIds((prev) => prev.filter((id) => id !== heroMovie._id));
        toast.success(`"${heroMovie.title}" removed from Watchlist`);
      }
    } catch {
      toast.error('Failed to update watchlist');
    }
  };

  const isHeroFavorite = heroMovie && favMovieIds.includes(heroMovie._id);

  return (
    <div className="home-page pb-5">
      {/* Hero Section */}
      {heroMovie && (
        <div
          className="position-relative w-100 overflow-hidden mb-4 mb-md-5"
          style={{
            minHeight: '400px',
            background: `linear-gradient(to top, var(--bg-main) 12%, rgba(7, 5, 10, 0.55) 60%, rgba(7, 5, 10, 0.85) 100%), url(${
              heroMovie.bannerUrl || heroMovie.posterUrl
            }) center/cover no-repeat`,
          }}
        >
          <div className="container h-100 py-4 py-md-5 d-flex flex-column justify-content-center" style={{ minHeight: '400px' }}>
            <div className="row align-items-center g-4 my-auto">
              {/* Poster on Left */}
              <div className="col-12 col-md-4 col-lg-3 d-flex justify-content-center justify-content-md-start">
                <div
                  className="rounded-4 overflow-hidden position-relative"
                  style={{
                    width: 'min(220px, 60vw)',
                    aspectRatio: '2/3',
                    border: '2px solid rgba(168, 85, 247, 0.35)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 35px rgba(168, 85, 247, 0.35)',
                  }}
                >
                  <img
                    src={heroMovie.posterUrl}
                    alt={heroMovie.title}
                    className="w-100 h-100 object-fit-cover"
                  />
                </div>
              </div>

              {/* Core Details on Right */}
              <div className="col-12 col-md-8 col-lg-9 text-start">
                <span className="badge bg-danger px-2.5 py-1 text-uppercase fw-bold mb-2" style={{ fontSize: '11px' }}>
                  Featured Spotlight
                </span>
                <h1 className="hero-fluid-title fw-extrabold text-white mb-2">{heroMovie.title}</h1>
                <div className="d-flex flex-wrap align-items-center gap-2 gap-sm-3 text-secondary small mb-3">
                  <span className="badge bg-dark border border-secondary">{heroMovie.certificate}</span>
                  <span>{heroMovie.languages?.join(', ')}</span>
                  <span>•</span>
                  <span>{heroMovie.durationMinutes} mins</span>
                  <span>•</span>
                  <span>{heroMovie.genres?.join(', ')}</span>
                </div>
                <p className="text-light opacity-90 line-clamp-3 mb-4 fs-6" style={{ maxWidth: '680px' }}>
                  {heroMovie.synopsis}
                </p>
                <div className="d-flex flex-wrap align-items-center gap-2.5 gap-sm-3">
                  <Link
                    to={`/movies/${heroMovie._id}`}
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
                  <button
                    type="button"
                    onClick={handleHeroToggleWatchlist}
                    className={`btn rounded-pill px-3.5 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 text-nowrap transition ${
                      isHeroFavorite ? 'btn-danger shadow-sm' : 'btn-outline-danger'
                    }`}
                    style={{
                      fontSize: '0.925rem',
                      minHeight: '42px',
                    }}
                  >
                    <Heart
                      size={17}
                      fill={isHeroFavorite ? 'currentColor' : 'none'}
                      color="currentColor"
                    />
                    <span>{isHeroFavorite ? 'In Watchlist' : 'Add to Watchlist'}</span>
                  </button>
                  {heroMovie.trailerUrl && (
                    <button
                      type="button"
                      onClick={() => setTrailerMovie(heroMovie)}
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
      )}

      {/* Main Catalog Container */}
      <div className="container">
        {/* Search & Filter Bar */}
        <div className="im-glass p-3 rounded-4 mb-4">
          <div className="row g-2 g-sm-3 align-items-center">
            {/* Search */}
            <div className="col-12 col-lg-5">
              <form onSubmit={handleSearchSubmit} className="input-group">
                <span className="input-group-text bg-dark border-secondary text-secondary">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Search movies, cast, director..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control bg-dark text-light border-secondary"
                />
                <button type="submit" className="btn btn-danger px-3">
                  Search
                </button>
              </form>
            </div>

            {/* Genre Filter */}
            <div className="col-6 col-lg-3">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="form-select bg-dark text-light border-secondary"
              >
                <option value="">All Genres</option>
                {genresList.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div className="col-6 col-lg-3">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="form-select bg-dark text-light border-secondary"
              >
                <option value="">All Languages</option>
                {languagesList.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="col-12 col-lg-1 text-center text-lg-end">
              {(searchQuery || selectedGenre || selectedLanguage) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('');
                    setSelectedLanguage('');
                  }}
                  className="btn btn-sm btn-link text-secondary text-decoration-none"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Tabs with Horizontal Touch Scroll */}
        <div className="overflow-x-auto touch-scroll no-scrollbar border-bottom border-secondary border-opacity-25 mb-4">
          <div className="d-flex gap-3 gap-sm-4" style={{ minWidth: 'max-content' }}>
            <button
              type="button"
              onClick={() => setActiveTab('NOW_SHOWING')}
              className={`btn btn-link text-decoration-none pb-3 px-2 position-relative fw-bold fs-6 fs-sm-5 ${
                activeTab === 'NOW_SHOWING' ? 'text-danger' : 'text-secondary hover-text-white'
              }`}
            >
              Now Showing in {city}
              {activeTab === 'NOW_SHOWING' && (
                <span
                  className="position-absolute bottom-0 start-0 w-100 bg-danger"
                  style={{ height: '3px', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('UPCOMING')}
              className={`btn btn-link text-decoration-none pb-3 px-2 position-relative fw-bold fs-6 fs-sm-5 ${
                activeTab === 'UPCOMING' ? 'text-danger' : 'text-secondary hover-text-white'
              }`}
            >
              Coming Soon
              {activeTab === 'UPCOMING' && (
                <span
                  className="position-absolute bottom-0 start-0 w-100 bg-danger"
                  style={{ height: '3px', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Movie Cards Grid */}
        {loading ? (
          <LoadingSpinner text="Fetching movies..." />
        ) : movies.length === 0 ? (
          <EmptyState
            title="No movies found"
            description={
              activeTab === 'NOW_SHOWING'
                ? `No movies currently scheduled in ${city}. Try switching cities or clearing filters.`
                : 'No upcoming movies match your current criteria.'
            }
          />
        ) : (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 row-cols-xxl-6 g-2 g-sm-3 g-md-4">
            {movies.map((movie) => (
              <div key={movie._id} className="col">
                <MovieCard
                  movie={movie}
                  isFavInitially={favMovieIds.includes(movie._id)}
                  onToggleFavorite={(id, isFav) => {
                    setFavMovieIds((prev) => (isFav ? [...prev, id] : prev.filter((x) => x !== id)));
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {trailerMovie && (
        <TrailerModal
          isOpen={!!trailerMovie}
          onClose={() => setTrailerMovie(null)}
          trailerUrl={trailerMovie.trailerUrl}
          title={trailerMovie.title}
        />
      )}
    </div>
  );
}
