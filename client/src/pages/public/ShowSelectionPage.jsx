import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Film, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { useCity } from '../../context/CityContext';
import { formatISTDateOnly, formatISTDayBadge } from '../../lib/ist-date';
import ShowTimeChip from '../../components/movies/ShowTimeChip';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

export default function ShowSelectionPage() {
  const params = useParams();
  const id = params.id || params.movieId;
  const { city } = useCity();

  const [movie, setMovie] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(() => formatISTDateOnly(new Date()));
  const [theatresData, setTheatresData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate next 7 days in IST
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = formatISTDateOnly(d);
    const badge = formatISTDayBadge(d);
    return {
      dateStr,
      ...badge,
      isToday: i === 0,
    };
  });

  // Fetch movie details
  useEffect(() => {
    async function loadMovie() {
      try {
        const res = await api.get(`/public/movies/${id}`);
        setMovie(res.data.movie);
      } catch (err) {
        console.error('Error loading movie:', err);
      }
    }
    loadMovie();
  }, [id]);

  // Fetch shows for movie + city + date
  useEffect(() => {
    async function loadShows() {
      setLoading(true);
      try {
        const res = await api.get(`/public/movies/${id}/shows`, {
          params: { city, date: selectedDateStr },
        });
        setTheatresData(res.data.theatres || []);
      } catch (err) {
        console.error('Error loading shows:', err);
      } finally {
        setLoading(false);
      }
    }
    loadShows();
  }, [id, city, selectedDateStr]);

  return (
    <div className="show-selection-page py-4 pb-5">
      <div className="container">
        {/* Top Breadcrumb & Movie Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <Link to={`/movies/${id}`} className="btn btn-sm btn-outline-secondary rounded-circle p-2 text-light">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h3 className="fw-bold text-white m-0">{movie?.title || 'Select Showtime'}</h3>
            <div className="text-secondary small d-flex align-items-center gap-2 mt-1">
              <span className="badge bg-dark border border-secondary">{movie?.certificate}</span>
              <span>{movie?.languages?.join(', ')}</span>
              <span>•</span>
              <span className="d-flex align-items-center gap-1 text-danger">
                <MapPin size={12} /> {city}
              </span>
            </div>
          </div>
        </div>

        {/* 7-Day Date Carousel */}
        <div className="im-glass p-2.5 p-sm-3 rounded-4 mb-4 overflow-x-auto touch-scroll no-scrollbar">
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 'max-content' }}>
            {next7Days.map((d) => {
              const isSelected = d.dateStr === selectedDateStr;
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(d.dateStr)}
                  className={`btn p-2 px-3 text-center rounded-3 transition d-flex flex-column align-items-center ${
                    isSelected
                      ? 'btn-danger shadow'
                      : 'btn-dark border-secondary hover-border-danger text-light'
                  }`}
                  style={{ minWidth: '74px' }}
                >
                  <span className="small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                    {d.isToday ? 'Today' : d.dayName}
                  </span>
                  <span className="fs-5 fw-extrabold my-1">{d.dateNum}</span>
                  <span className="small" style={{ fontSize: '11px' }}>
                    {d.monthName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theatres & Shows List */}
        {loading ? (
          <LoadingSpinner text="Searching available showtimes..." />
        ) : theatresData.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No shows scheduled"
            description={`There are no shows scheduled for this movie in ${city} on ${selectedDateStr}. Try picking another date or city.`}
          />
        ) : (
          <div className="d-flex flex-column gap-3 gap-sm-4">
            {theatresData.map((item) => (
              <div key={item.theatre._id} className="im-card p-3 p-sm-4 rounded-4">
                {/* Theatre Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-3 mb-3">
                  <div>
                    <h5 className="fw-bold text-light m-0">{item.theatre.name}</h5>
                    <div className="small text-secondary d-flex align-items-center gap-1 mt-1">
                      <MapPin size={12} /> {item.theatre.address}
                    </div>
                  </div>
                </div>

                {/* Screens & Showtimes */}
                <div className="d-flex flex-column gap-3">
                  {item.screens.map((sGroup) => (
                    <div key={sGroup.screen._id} className="row g-2 g-sm-3 align-items-center">
                      <div className="col-12 col-md-3">
                        <span className="text-light fw-semibold small d-block">{sGroup.screen.name}</span>
                        <span className="text-secondary" style={{ fontSize: '11px' }}>
                          M-Ticket Available
                        </span>
                      </div>
                      <div className="col-12 col-md-9">
                        <div className="d-flex flex-wrap gap-2 gap-sm-3">
                          {sGroup.shows.map((show) => (
                            <ShowTimeChip key={show._id} show={show} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
