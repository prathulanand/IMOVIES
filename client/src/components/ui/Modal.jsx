import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
  size = 'md',
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeMap = {
    sm: '420px',
    md: '560px',
    lg: '760px',
    xl: '980px',
    full: '95vw',
  };

  const computedMaxWidth = maxWidth || sizeMap[size] || sizeMap.md;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        padding: '0.75rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="im-glass rounded-4 shadow-2xl d-flex flex-column"
        style={{
          width: '100%',
          maxWidth: computedMaxWidth,
          maxHeight: '92vh',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-modal)',
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3 p-sm-4 border-bottom border-secondary border-opacity-25">
          <h5 className="m-0 fw-bold text-light fs-6 fs-sm-5 text-truncate pe-2">{title}</h5>
          <button
            onClick={onClose}
            className="btn btn-sm btn-link text-secondary p-1 text-decoration-none"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 p-sm-4 overflow-y-auto touch-scroll" style={{ flex: '1 1 auto' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3 p-sm-4 border-top border-secondary border-opacity-25 d-flex flex-wrap justify-content-end gap-2 bg-dark bg-opacity-25 rounded-bottom-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
