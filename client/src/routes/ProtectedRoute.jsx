import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner text="Checking authentication..." fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.status === 'SUSPENDED') {
    return (
      <div className="container py-5 text-center">
        <div className="im-glass p-5 rounded-4 mx-auto" style={{ maxWidth: '500px' }}>
          <h3 className="text-danger fw-bold mb-2">Account Suspended</h3>
          <p className="text-secondary mb-0">
            Your account has been suspended by administration. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return children || <Outlet />;
}
