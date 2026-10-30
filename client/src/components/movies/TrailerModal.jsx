import React from 'react';
import Modal from '../ui/Modal';

export default function TrailerModal({ isOpen, onClose, trailerUrl, title }) {
  if (!isOpen || !trailerUrl) return null;

  // Extract YouTube embed ID
  let embedUrl = trailerUrl;
  const match = trailerUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} — Official Trailer`} maxWidth="800px">
      <div className="position-relative overflow-hidden rounded-3" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="position-absolute top-0 start-0 w-100 h-100 border-0"
        />
      </div>
    </Modal>
  );
}
