import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="container py-5 text-center min-vh-75 d-flex flex-column align-items-center justify-content-center">
      <div className="im-glass p-5 rounded-4 shadow-lg" style={{ maxWidth: '520px', width: '100%' }}>
        <Film size={54} color="var(--primary-color)" className="mb-3" />
        <h1 className="fw-bold display-4 mb-2">404</h1>
        <h4 className="fw-bold mb-3">Screen Not Found</h4>
        <p className="text-secondary mb-4">
          The page or show you are looking for has moved, expired, or does not exist.
        </p>
        <Link to="/" className="btn btn-primary d-inline-flex align-items-center gap-2">
          <Home size={18} />
          <span>Back to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
