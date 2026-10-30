import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner text="Verifying permissions..." fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container py-5 text-center">
        <div className="im-glass p-5 rounded-4 mx-auto" style={{ maxWidth: '500px' }}>
          <h3 className="text-danger fw-bold mb-2">Access Denied</h3>
          <p className="text-secondary mb-0">
            This area requires administrative privileges.
          </p>
        </div>
      </div>
    );
  }

  return children || <Outlet />;
}
