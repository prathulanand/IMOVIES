import React from 'react';

export default function LoadingSpinner({ text, message, fullScreen = false }) {
  const displayText = message || text || 'Loading...';
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center">
      <div className="spinner-border text-danger mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-secondary small fw-medium m-0">{displayText}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="d-flex align-items-center justify-content-center min-vh-100 position-fixed top-0 start-0 w-100"
        style={{ background: 'var(--bg-main)', zIndex: 1060 }}
      >
        {content}
      </div>
    );
  }

  return content;
}
