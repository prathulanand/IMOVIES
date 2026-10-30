import React from 'react';
import { Film } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-top border-secondary border-opacity-25 py-5 mt-auto bg-dark bg-opacity-50">
      <div className="container">
        <div className="row g-4 align-items-center">
          <div className="col-md-6 text-center text-md-start">
            <div className="d-flex align-items-center gap-2 mb-2 justify-content-center justify-content-md-start">
              <Film size={22} className="text-danger" style={{ filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))' }} />
              <span className="fw-bold fs-5 text-light" style={{ letterSpacing: '1.5px', textShadow: '0 0 12px rgba(168, 85, 247, 0.3)' }}>
                IMOVIES
              </span>
            </div>
            <p className="text-secondary small m-0">
              Movie ticket booking made simple. Real-time seats, instant confirmation, seamless cinema experience.
            </p>
          </div>
          <div className="col-md-6 text-center text-md-end text-secondary small">
            <div>© {new Date().getFullYear()} IMovies Entertainment Inc. All rights reserved.</div>
            <div className="mt-1 text-dim">
              Prices displayed in INR (inclusive of GST). Payments secured by Razorpay.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
