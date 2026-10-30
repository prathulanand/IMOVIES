import React from 'react';
import { Film } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Film,
  title = 'No items found',
  description = 'There are no records to display at this moment.',
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div className={`text-center py-5 px-4 my-4 im-glass rounded-4 ${className}`}>
      <div className="d-inline-flex p-3 rounded-circle bg-dark border border-secondary text-secondary mb-3">
        <Icon size={36} />
      </div>
      <h5 className="fw-bold text-light mb-2">{title}</h5>
      <p className="text-secondary small mx-auto mb-4" style={{ maxWidth: '420px' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
