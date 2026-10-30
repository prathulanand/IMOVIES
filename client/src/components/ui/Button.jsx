import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseClass = 'btn d-inline-flex align-items-center justify-content-center gap-2 fw-semibold transition rounded-pill text-nowrap';

  const variantMap = {
    primary: 'btn-danger shadow-sm',
    secondary: 'btn-secondary',
    outline: 'btn-outline-danger',
    ghost: 'btn-outline-secondary',
    dark: 'btn-dark border-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
  };

  const sizeMap = {
    sm: 'btn-sm px-3 py-1',
    md: 'px-3.5 py-2',
    lg: 'px-4 py-2.5',
  };

  const chosenVariant = variantMap[variant] || variantMap.primary;
  const chosenSize = sizeMap[size] || sizeMap.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClass} ${chosenVariant} ${chosenSize} ${className}`}
      {...props}
    >
      {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
      {!loading && Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      <span>{children}</span>
    </button>
  );
}
