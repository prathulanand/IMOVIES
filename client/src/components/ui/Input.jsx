import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label small fw-semibold text-secondary mb-1">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className="input-group">
        {Icon && (
          <span className="input-group-text bg-dark border-secondary text-secondary">
            <Icon size={16} />
          </span>
        )}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`form-control bg-dark text-light border-secondary ${error ? 'is-invalid border-danger' : ''}`}
          {...props}
        />
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
      {!error && helperText && <div className="text-secondary small mt-1">{helperText}</div>}
    </div>
  );
}
