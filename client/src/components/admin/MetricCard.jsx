import React from 'react';

export default function MetricCard({ title, value, icon: Icon, color = 'danger', helper }) {
  const colorMap = {
    danger: { text: 'text-danger', bg: 'bg-danger bg-opacity-25' },
    warning: { text: 'text-warning', bg: 'bg-warning bg-opacity-25' },
    success: { text: 'text-success', bg: 'bg-success bg-opacity-25' },
    info: { text: 'text-info', bg: 'bg-info bg-opacity-25' },
    primary: { text: 'text-primary', bg: 'bg-primary bg-opacity-25' },
  };

  const scheme = colorMap[color] || colorMap.danger;

  return (
    <div className="im-card p-3 p-sm-4 rounded-4 h-100 d-flex flex-column justify-content-between">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-circle ${scheme.bg} ${scheme.text}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div>
        <h3 className="fw-bold text-light m-0 mb-1">{value}</h3>
        {helper && <div className="text-secondary small">{helper}</div>}
      </div>
    </div>
  );
}
