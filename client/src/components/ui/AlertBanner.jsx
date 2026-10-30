import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function AlertBanner({
  type = 'error',
  message,
  onClose,
  className = '',
}) {
  if (!message) return null;

  const config = {
    error: { bg: 'alert-danger bg-opacity-25 border-danger text-danger', Icon: AlertCircle },
    success: { bg: 'alert-success bg-opacity-25 border-success text-success', Icon: CheckCircle },
    warning: { bg: 'alert-warning bg-opacity-25 border-warning text-warning', Icon: AlertTriangle },
    info: { bg: 'alert-info bg-opacity-25 border-info text-info', Icon: Info },
  };

  const { bg, Icon } = config[type] || config.error;

  return (
    <div className={`alert d-flex align-items-center justify-content-between p-3 rounded-3 border ${bg} ${className}`} role="alert">
      <div className="d-flex align-items-center gap-2">
        <Icon size={18} className="flex-shrink-0" />
        <span className="small fw-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="btn-close btn-close-white ms-3"
          aria-label="Close"
        ></button>
      )}
    </div>
  );
}
