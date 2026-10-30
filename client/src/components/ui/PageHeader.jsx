import React from 'react';

export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 ${className}`}>
      <div>
        <h2 className="fw-bold m-0 text-light">{title}</h2>
        {subtitle && <p className="text-secondary small m-0 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
    </div>
  );
}
