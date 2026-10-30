import React from 'react';

export default function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label small fw-semibold text-secondary mb-1">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`form-select bg-dark text-light border-secondary ${error ? 'is-invalid border-danger' : ''}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-dark text-light">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}
