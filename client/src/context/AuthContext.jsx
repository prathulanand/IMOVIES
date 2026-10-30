import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (emailOrCredentials, maybePassword) => {
    let email;
    let password;
    if (typeof emailOrCredentials === 'object' && emailOrCredentials !== null) {
      email = emailOrCredentials.email;
      password = emailOrCredentials.password;
    } else {
      email = emailOrCredentials;
      password = maybePassword;
    }
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    // Navigate immediately to landing page so ProtectedRoute doesn't bounce to /login
    navigate('/', { replace: true });
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
