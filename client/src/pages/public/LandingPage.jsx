import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Film,
  Ticket,
  ShieldCheck,
  Zap,
  QrCode,
  ArrowRight,
  Play,
  Star,
  Clock,
  Heart,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Lock,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import TrailerModal from '../../components/movies/TrailerModal';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await api.get('/public/movies', { params: { limit: 24 } });
        setFeaturedMovies(res.data.movies || []);
      } catch (err) {
        console.error('Failed to load landing movies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeatured();
  }, []);

  // Auto-slide hero banner every 5 seconds (5000ms)
  useEffect(() => {
    if (featuredMovies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredMovies.length, isPaused, currentHeroIndex]);

  const handlePrevHero = () => {
    setCurrentHeroIndex((prev) =>
      prev === 0 ? featuredMovies.length - 1 : prev - 1
    );
  };

  const handleNextHero = () => {
    setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  const handleMovieClick = (movieId) => {
    if (!user) {
      toast('Please sign in or create an account to view showtimes & book seats!', {
        icon: '🔒',
        duration: 3500,
      });
      navigate('/login', { state: { from: `/movies/${movieId}` } });
    } else {
      navigate(`/movies/${movieId}`);
    }
  };

  const handleExploreClick = () => {
    if (!user) {
      toast('Please sign in to access movies and cinema schedules!', {
        icon: '🔒',
        duration: 3500,
      });
      navigate('/login', { state: { from: '/movies' } });
    } else {
      navigate('/movies');
    }
  };

  const genres = ['ALL', ...new Set(featuredMovies.flatMap((m) => m.genres || []))].slice(0, 7);
  const displayedMovies = selectedGenre === 'ALL'
    ? featuredMovies
    : featuredMovies.filter((m) => m.genres?.includes(selectedGenre));

  const currentMovie = featuredMovies[currentHeroIndex] || featuredMovies[0];

  const formatRuntime = (mins) => {
    if (!mins) return '2h 15m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="landing-page overflow-hidden">
      {/* Dynamic Keyframe style for 5s progress bar and entrance animations */}
      <style>{`
        @keyframes heroTimerFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .hero-timer-active {
          animation: heroTimerFill 5s linear forwards;
        }
        .hero-timer-paused {
          animation-play-state: paused !important;
        }
        @keyframes heroTextGlide {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes heroPosterGlide {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .hero-anim-text {
          animation: heroTextGlide 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-anim-poster {
          animation: heroPosterGlide 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* 1. AUTO-SLIDING HERO SECTION WITH FULL CINEMATIC ANIMATIONS (CHANGES EVERY 5 SECONDS) */}
      <section
        className="position-relative text-white hero-carousel-wrapper overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          minHeight: '88vh',
          background: '#0a0c13',
        }}
      >
        {/* STACKED BACKGROUND BANNERS WITH GPU-ACCELERATED CROSSFADE & KEN-BURNS ZOOM */}
        {featuredMovies.map((movie, idx) => {
          const isCurrent = idx === currentHeroIndex;
          const bgUrl =
            movie.bannerUrl ||
            movie.posterUrl ||
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80';

          return (
            <div
              key={`hero-bg-${movie._id}`}
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                opacity: isCurrent ? 1 : 0,
                transform: isCurrent ? 'scale(1)' : 'scale(1.08)',
                transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), transform 6s cubic-bezier(0.1, 0.9, 0.2, 1)',
                pointerEvents: 'none',
                zIndex: isCurrent ? 1 : 0,
              }}
            >
              <img
                src={bgUrl}
                alt={movie.title}
                className="w-100 h-100 object-fit-cover"
                loading={idx < 2 ? 'eager' : 'lazy'}
              />
              {/* Deep Cinema Vignette & Gradients Overlay */}
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{
                  background: `
                    linear-gradient(90deg, rgba(10, 12, 19, 0.98) 0%, rgba(10, 12, 19, 0.9) 45%, rgba(10, 12, 19, 0.65) 75%, rgba(10, 12, 19, 0.95) 100%),
                    linear-gradient(0deg, #0a0c13 0%, rgba(10, 12, 19, 0.25) 40%, rgba(10, 12, 19, 0.75) 100%)
                  `,
                }}
              />
            </div>
          );
        })}

        {/* Ambient Top Glow - Gothic Violet Mist */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'radial-gradient(ellipse 75% 45% at 50% -10%, rgba(168, 85, 247, 0.3), transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* HERO CONTENT CONTAINER */}
        <div
          className="container position-relative py-5 d-flex flex-column justify-content-center"
          style={{ minHeight: '88vh', zIndex: 3 }}
        >
          {currentMovie ? (
            <div
              key={`hero-content-${currentMovie._id}`}
              className="row align-items-center g-4 my-auto py-4"
            >
              {/* Left Column: 3D Poster Showcase with Gothic Frame & Entrance Animation */}
              <div className="col-12 col-lg-5 col-xl-4 d-flex justify-content-center hero-anim-poster mb-3 mb-lg-0">
                <div
                  className="position-relative cursor-pointer group"
                  onClick={() => handleMovieClick(currentMovie._id)}
                  style={{
                    width: 'min(300px, 75vw)',
                    aspectRatio: '2/3',
                    borderRadius: '22px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 45px rgba(168, 85, 247, 0.4)',
                    overflow: 'hidden',
                    border: '2px solid rgba(168, 85, 247, 0.35)',
                    transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                  }}
                >
                  <img
                    src={currentMovie.posterUrl}
                    alt={currentMovie.title}
                    className="w-100 h-100 object-fit-cover"
                  />

                  {/* Rating Ribbon */}
                  {currentMovie.avgRating && (
                    <div className="position-absolute top-0 end-0 m-3 badge bg-dark bg-opacity-90 border border-warning text-warning d-flex align-items-center gap-1 px-2.5 py-1.5 shadow">
                      <Star size={13} fill="#f59e0b" />
                      <span className="fw-bold">{currentMovie.avgRating}</span>
                    </div>
                  )}

                  {/* Play Trailer Floating Overlay */}
                  {currentMovie.trailerUrl && (
                    <div
                      className="position-absolute bottom-0 start-0 w-100 p-3 text-center"
                      style={{
                        background: 'linear-gradient(to top, rgba(7, 5, 10, 0.95), transparent)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrailerMovie(currentMovie);
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-danger rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-2 shadow"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Preview Trailer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Full Movie Details with Entrance Animation */}
              <div className="col-12 col-lg-7 col-xl-8 text-start hero-anim-text">
                {/* Cinema Status & Format Badges */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <div
                    className="d-inline-flex align-items-center gap-1.5 px-3 py-1 rounded-pill border border-danger border-opacity-50"
                    style={{ background: 'rgba(168, 85, 247, 0.16)', backdropFilter: 'blur(8px)' }}
                  >
                    <span className="spinner-grow spinner-grow-sm text-danger" style={{ width: '8px', height: '8px' }} />
                    <span className="text-danger text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '1.2px' }}>
                      Now Showing in Theatres
                    </span>
                  </div>

                  <span className="badge bg-danger text-uppercase fw-bold px-2.5 py-1" style={{ fontSize: '11px' }}>
                    {currentMovie.certificate || 'U/A'}
                  </span>

                  <span className="badge bg-dark bg-opacity-75 border border-secondary text-light px-2.5 py-1" style={{ fontSize: '11px' }}>
                    IMAX 3D • 2D • 4DX
                  </span>
                </div>

                {/* Movie Title */}
                <h1
                  className="hero-fluid-title fw-extrabold text-white mb-2"
                  style={{
                    textShadow: '0 4px 24px rgba(0,0,0,0.85)',
                  }}
                >
                  {currentMovie.title}
                </h1>

                {/* Meta stats bar (Rating, Duration, Year, Language) */}
                <div className="d-flex flex-wrap align-items-center gap-3 my-3 text-secondary" style={{ fontSize: '14px' }}>
                  {/* Rating */}
                  <div className="d-flex align-items-center gap-1 text-warning fw-bold">
                    <Star size={16} fill="#f59e0b" />
                    <span className="text-white">{currentMovie.avgRating || '4.8'}</span>
                    <span className="text-secondary small">({currentMovie.reviewCount || '1.2k'}+ ratings)</span>
                  </div>

                  <span className="text-secondary">•</span>

                  {/* Runtime */}
                  <div className="d-flex align-items-center gap-1 text-light">
                    <Clock size={15} className="text-danger" />
                    <span>{formatRuntime(currentMovie.durationMinutes)}</span>
                  </div>

                  <span className="text-secondary">•</span>

                  {/* Release Year */}
                  <div className="d-flex align-items-center gap-1 text-light">
                    <Calendar size={15} className="text-secondary" />
                    <span>{currentMovie.releaseDate ? new Date(currentMovie.releaseDate).getFullYear() : '2026'}</span>
                  </div>

                  <span className="text-secondary">•</span>

                  {/* Languages */}
                  <div className="text-light fw-medium">
                    {currentMovie.languages?.join(', ') || 'Hindi, English'}
                  </div>
                </div>

                {/* Genre Badges */}
                <div className="d-flex flex-wrap gap-1.5 mb-3">
                  {currentMovie.genres?.map((genre) => (
                    <span
                      key={genre}
                      className="badge rounded-pill text-white border border-secondary border-opacity-30"
                      style={{ background: 'rgba(255, 255, 255, 0.08)', fontSize: '12px', padding: '6px 12px' }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                {/* Storyline / Synopsis */}
                <p
                  className="lead text-light opacity-90 mb-4"
                  style={{
                    maxWidth: '680px',
                    fontSize: '15px',
                    lineHeight: '1.65',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {currentMovie.synopsis ||
                    'Immerse yourself in cinematic greatness with Dolby Atmos spatial sound, crystal-clear 4K projection, and instant live seat locks across premier theatres.'}
                </p>

                {/* Cast & Director if present */}
                {(currentMovie.cast?.length > 0 || currentMovie.director) && (
                  <div className="mb-4 small text-secondary">
                    {currentMovie.director && (
                      <span className="me-3">
                        <strong className="text-light">Director:</strong> {currentMovie.director}
                      </span>
                    )}
                    {currentMovie.cast?.length > 0 && (
                      <span>
                        <strong className="text-light">Starring:</strong> {currentMovie.cast.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex flex-column flex-sm-row flex-wrap align-items-stretch align-items-sm-center gap-2 gap-sm-3">
                  <button
                    type="button"
                    onClick={() => handleMovieClick(currentMovie._id)}
                    className="btn btn-danger px-4 py-2 fw-semibold rounded-pill shadow-lg d-inline-flex align-items-center justify-content-center gap-2 transition w-100 w-sm-auto text-nowrap"
                    style={{
                      boxShadow: '0 6px 22px rgba(168, 85, 247, 0.5)',
                      fontSize: '0.925rem',
                      minHeight: '42px',
                    }}
                  >
                    <Ticket size={17} />
                    <span>Book Tickets</span>
                    <ArrowRight size={16} />
                  </button>

                  {currentMovie.trailerUrl ? (
                    <button
                      type="button"
                      onClick={() => setTrailerMovie(currentMovie)}
                      className="btn btn-outline-light px-3.5 py-2 fw-semibold rounded-pill d-inline-flex align-items-center justify-content-center gap-2 transition w-100 w-sm-auto text-nowrap"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(8px)',
                        fontSize: '0.925rem',
                        minHeight: '42px',
                      }}
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Watch Trailer</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleExploreClick}
                    className="btn btn-outline-secondary text-light px-3.5 py-2 fw-medium rounded-pill d-inline-flex align-items-center justify-content-center gap-1.5 transition w-100 w-sm-auto text-nowrap"
                    style={{ fontSize: '0.925rem', minHeight: '42px' }}
                  >
                    <Film size={16} />
                    <span>All Movies</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <h2 className="display-4 fw-bold">Welcome to iMovies</h2>
              <p className="text-secondary lead">Loading premier blockbusters...</p>
            </div>
          )}

          {/* Carousel Arrows (Prev & Next - Desktop/Tablet Floating) */}
          {featuredMovies.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevHero}
                aria-label="Previous Movie"
                className="btn position-absolute top-50 start-0 translate-middle-y ms-2 ms-md-4 rounded-circle d-none d-md-flex align-items-center justify-content-center text-white border-0 shadow"
                style={{
                  width: '46px',
                  height: '46px',
                  background: 'rgba(20, 22, 32, 0.75)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 10,
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={handleNextHero}
                aria-label="Next Movie"
                className="btn position-absolute top-50 end-0 translate-middle-y me-2 me-md-4 rounded-circle d-none d-md-flex align-items-center justify-content-center text-white border-0 shadow"
                style={{
                  width: '46px',
                  height: '46px',
                  background: 'rgba(20, 22, 32, 0.75)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 10,
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Carousel Progress Indicators (Shows all listed movies, auto cycles every 5s) */}
          {featuredMovies.length > 1 && (
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 pt-3 border-top border-secondary border-opacity-25 mt-4">
              {/* Slide Counter & Mobile Arrow Controls */}
              <div className="d-flex align-items-center gap-2 text-secondary small" style={{ fontSize: '12px' }}>
                <div className="d-flex d-md-none gap-1 me-2">
                  <button
                    type="button"
                    onClick={handlePrevHero}
                    className="btn btn-sm btn-dark border-secondary p-1 rounded-circle text-white d-flex align-items-center justify-content-center"
                    style={{ width: '30px', height: '30px' }}
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextHero}
                    className="btn btn-sm btn-dark border-secondary p-1 rounded-circle text-white d-flex align-items-center justify-content-center"
                    style={{ width: '30px', height: '30px' }}
                    aria-label="Next Slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <span className="text-danger fw-bold fs-6">
                  {String(currentHeroIndex + 1).padStart(2, '0')}
                </span>
                <span>/</span>
                <span>{String(featuredMovies.length).padStart(2, '0')}</span>
                {isPaused && (
                  <span className="badge bg-secondary bg-opacity-25 text-secondary ms-2" style={{ fontSize: '10px' }}>
                    Auto-slide paused
                  </span>
                )}
              </div>

              {/* Progress Trackers for ALL Listed Movies */}
              <div className="d-flex align-items-center gap-2 overflow-x-auto pb-1" style={{ maxWidth: '650px' }}>
                {featuredMovies.map((movie, idx) => {
                  const isActive = idx === currentHeroIndex;
                  return (
                    <button
                      key={`hero-dot-${movie._id}`}
                      type="button"
                      onClick={() => setCurrentHeroIndex(idx)}
                      title={movie.title}
                      className="btn p-0 border-0 position-relative rounded-pill overflow-hidden"
                      style={{
                        width: isActive ? '60px' : '22px',
                        height: '6px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                        transition: 'width 0.3s ease, background 0.3s ease',
                      }}
                    >
                      {isActive && (
                        <div
                          key={`timer-${currentHeroIndex}`}
                          className={`h-100 rounded-pill bg-danger ${
                            isPaused ? 'hero-timer-paused' : 'hero-timer-active'
                          }`}
                          style={{ width: isPaused ? '50%' : '0%' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Prompt */}
              <div className="text-secondary small d-none d-lg-block" style={{ fontSize: '11px' }}>
                Auto-changes every 5s • Hover to pause
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. STATS STRIP */}
      <section className="bg-dark bg-opacity-75 py-3 border-bottom border-secondary border-opacity-20">
        <div className="container">
          <div className="row row-cols-2 row-cols-md-4 g-3 text-center">
            <div className="col">
              <div className="fs-4 fw-extrabold text-white">50+</div>
              <div className="small text-secondary text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                Blockbuster Releases
              </div>
            </div>
            <div className="col">
              <div className="fs-4 fw-extrabold text-danger">100%</div>
              <div className="small text-secondary text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                Live Seat Lock
              </div>
            </div>
            <div className="col">
              <div className="fs-4 fw-extrabold text-white">4.9 ★</div>
              <div className="small text-secondary text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                User Rating
              </div>
            </div>
            <div className="col">
              <div className="fs-4 fw-extrabold text-success">0 sec</div>
              <div className="small text-secondary text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                QR Gate Check-In
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. NOW SHOWING IN THEATRES SECTION */}
      <section className="py-5 bg-dark bg-opacity-50 border-top border-bottom border-secondary border-opacity-10">
        <div className="container py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 text-danger small fw-bold text-uppercase mb-1">
                <TrendingUp size={16} />
                <span>Scheduled in Theatres Now</span>
              </div>
              <h2 className="fw-bold text-light mb-1">All Movies Currently Showing</h2>
              <p className="text-secondary small mb-0">
                Pick a movie to check available showtimes, select seats & reserve instantly.
              </p>
            </div>

            {/* Quick Genre Pills */}
            <div className="d-flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGenre(g)}
                  className={`btn btn-sm rounded-pill px-3 py-1 transition ${
                    selectedGenre === g
                      ? 'btn-danger fw-bold'
                      : 'btn-outline-secondary text-light'
                  }`}
                  style={{ fontSize: '12px' }}
                >
                  {g === 'ALL' ? 'All Genres' : g}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status" />
              <p className="text-secondary small mt-2">Loading theater schedules...</p>
            </div>
          ) : displayedMovies.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              No movies currently scheduled in this category.
            </div>
          ) : (
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 row-cols-xxl-6 g-2 g-sm-3 g-md-4">
              {displayedMovies.map((movie) => (
                <div key={movie._id} className="col">
                  <div
                    className="card border-0 bg-transparent h-100 position-relative group overflow-hidden"
                    style={{ borderRadius: '14px', transition: 'transform 0.25s ease' }}
                  >
                    {/* Poster with Click Gate */}
                    <div
                      className="position-relative overflow-hidden rounded-3 shadow cursor-pointer"
                      style={{ aspectRatio: '2/3', background: '#121624' }}
                      onClick={() => handleMovieClick(movie._id)}
                    >
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                      />
                      {/* Rating Badge */}
                      {movie.avgRating ? (
                        <span className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-90 border border-warning text-warning d-flex align-items-center gap-1 shadow-sm">
                          <Star size={10} fill="#f59e0b" />
                          <span>{movie.avgRating}</span>
                        </span>
                      ) : null}

                      {/* Certificate Badge */}
                      <span className="position-absolute bottom-0 start-0 m-2 badge bg-danger text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                        {movie.certificate || 'U/A'}
                      </span>

                      {/* Lock indicator if not logged in */}
                      {!user && (
                        <span
                          className="position-absolute top-0 start-0 m-2 badge bg-dark bg-opacity-80 text-secondary border border-secondary border-opacity-25 d-flex align-items-center gap-1"
                          style={{ fontSize: '10px' }}
                          title="Sign in required to book"
                        >
                          <Lock size={10} />
                          <span>Sign In</span>
                        </span>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="pt-2 d-flex flex-column justify-content-between flex-grow-1">
                      <div>
                        <h6
                          className="text-light fw-bold text-truncate mb-1 cursor-pointer"
                          title={movie.title}
                          style={{ fontSize: '14px' }}
                          onClick={() => handleMovieClick(movie._id)}
                        >
                          {movie.title}
                        </h6>
                        <div className="text-secondary small text-truncate" style={{ fontSize: '11px' }}>
                          {movie.languages?.slice(0, 2).join(', ') || 'Hindi'} • {movie.genres?.[0] || 'Movie'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMovieClick(movie._id)}
                        className="btn btn-sm btn-outline-danger w-100 mt-2 py-1 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                        style={{ fontSize: '12px' }}
                      >
                        <Ticket size={13} />
                        <span>Book Tickets</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. PREMIUM CINEMA FEATURES */}
      <section className="py-5 position-relative">
        <div className="container py-4">
          <div className="text-center mx-auto mb-5" style={{ maxWidth: '640px' }}>
            <span className="text-danger text-uppercase fw-bold small" style={{ letterSpacing: '1px' }}>
              Why Choose iMovies
            </span>
            <h2 className="display-6 fw-bold text-white mt-1">Cinema Booking Redefined</h2>
            <p className="text-secondary">
              Engineered with zero-wait concurrency, instant digital gate verification, and enterprise-grade reliability.
            </p>
          </div>

          <div className="row g-4">
            {/* Feature 1 */}
            <div className="col-md-6 col-lg-3">
              <div
                className="p-4 rounded-4 h-100 border border-secondary border-opacity-25 transition"
                style={{ background: 'rgba(20, 22, 32, 0.6)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="d-inline-flex p-3 rounded-3 mb-3 bg-danger bg-opacity-10 text-danger"
                >
                  <Zap size={26} />
                </div>
                <h5 className="fw-bold text-light mb-2">Live Seat Lock Engine</h5>
                <p className="text-secondary small mb-0 lh-base">
                  Instant 10-minute hold window guarded by MongoDB ACID transactions prevents double-booking disputes.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="col-md-6 col-lg-3">
              <div
                className="p-4 rounded-4 h-100 border border-secondary border-opacity-25 transition"
                style={{ background: 'rgba(20, 22, 32, 0.6)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="d-inline-flex p-3 rounded-3 mb-3 bg-primary bg-opacity-10 text-primary"
                >
                  <QrCode size={26} />
                </div>
                <h5 className="fw-bold text-light mb-2">Contactless QR Gate Pass</h5>
                <p className="text-secondary small mb-0 lh-base">
                  Skip the cinema counter queue. Your digital e-ticket generates a cryptographic QR code for instant scan entry.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="col-md-6 col-lg-3">
              <div
                className="p-4 rounded-4 h-100 border border-secondary border-opacity-25 transition"
                style={{ background: 'rgba(20, 22, 32, 0.6)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="d-inline-flex p-3 rounded-3 mb-3 bg-success bg-opacity-10 text-success"
                >
                  <ShieldCheck size={26} />
                </div>
                <h5 className="fw-bold text-light mb-2">Instant Auto-Refunds</h5>
                <p className="text-secondary small mb-0 lh-base">
                  Transparent cancellation rules with server-computed refund tiers and direct Razorpay payout gateway triggers.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="col-md-6 col-lg-3">
              <div
                className="p-4 rounded-4 h-100 border border-secondary border-opacity-25 transition"
                style={{ background: 'rgba(20, 22, 32, 0.6)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="d-inline-flex p-3 rounded-3 mb-3 bg-warning bg-opacity-10 text-warning"
                >
                  <Heart size={26} />
                </div>
                <h5 className="fw-bold text-light mb-2">Personalized Watchlists</h5>
                <p className="text-secondary small mb-0 lh-base">
                  Save upcoming releases and blockbusters to your personal watchlist, complete with trailer previews and alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="py-5 bg-dark bg-opacity-25 border-top border-secondary border-opacity-10">
        <div className="container py-4">
          <div className="text-center mx-auto mb-5" style={{ maxWidth: '600px' }}>
            <span className="text-danger text-uppercase fw-bold small" style={{ letterSpacing: '1px' }}>
              How It Works
            </span>
            <h2 className="display-6 fw-bold text-white mt-1">Book Tickets in 3 Steps</h2>
          </div>

          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="p-4">
                <div
                  className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold fs-4"
                  style={{ width: '56px', height: '56px', boxShadow: '0 0 20px rgba(168, 85, 247, 0.55)' }}
                >
                  1
                </div>
                <h5 className="fw-bold text-light mb-2">Choose Your Movie</h5>
                <p className="text-secondary small mb-0">
                  Filter by language, genre, format (2D, 3D, IMAX) and select your convenient city & cinema.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4">
                <div
                  className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold fs-4"
                  style={{ width: '56px', height: '56px', boxShadow: '0 0 20px rgba(168, 85, 247, 0.55)' }}
                >
                  2
                </div>
                <h5 className="fw-bold text-light mb-2">Select Preferred Seats</h5>
                <p className="text-secondary small mb-0">
                  View interactive cinema layouts (VIP, Premium, Regular) with live seat lock indicators.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-4">
                <div
                  className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center mx-auto mb-3 fw-bold fs-4"
                  style={{ width: '56px', height: '56px', boxShadow: '0 0 20px rgba(168, 85, 247, 0.55)' }}
                >
                  3
                </div>
                <h5 className="fw-bold text-light mb-2">Flash QR & Enjoy the Show</h5>
                <p className="text-secondary small mb-0">
                  Complete secure Razorpay payment and scan your downloadable digital e-ticket at the gate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section className="py-5 position-relative">
        <div className="container py-4">
          <div
            className="p-5 rounded-4 text-center text-white position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(88, 28, 135, 0.95) 100%)',
              boxShadow: '0 16px 48px rgba(168, 85, 247, 0.45)',
            }}
          >
            <div className="position-relative z-1 mx-auto" style={{ maxWidth: '640px' }}>
              <h2 className="display-5 fw-extrabold mb-3">Ready for the Show?</h2>
              <p className="fs-5 opacity-90 mb-4">
                Grab your favorite popcorn, reserve the best seats in the house, and experience movies like never before.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleExploreClick}
                  className="btn btn-light px-4 py-2.5 fw-bold rounded-pill text-danger shadow-sm text-nowrap"
                  style={{ minHeight: '44px', fontSize: '0.95rem' }}
                >
                  Browse Now Showing
                </button>
                {!user && (
                  <Link
                    to="/register"
                    className="btn btn-outline-light px-4 py-2.5 fw-bold rounded-pill text-nowrap"
                    style={{ minHeight: '44px', fontSize: '0.95rem' }}
                  >
                    Create Free Account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      {trailerMovie && (
        <TrailerModal
          isOpen={Boolean(trailerMovie)}
          onClose={() => setTrailerMovie(null)}
          trailerUrl={trailerMovie.trailerUrl}
          title={trailerMovie.title}
        />
      )}
    </div>
  );
}
