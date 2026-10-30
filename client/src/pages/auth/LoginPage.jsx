import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { Film } from 'lucide-react';
import toast from 'react-hot-toast';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'ADMIN' && (from === '/' || from === '/login')) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from === '/login' || from === '/' ? '/movies' : from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="container py-4 py-md-5 d-flex justify-content-center align-items-center min-vh-75">
      <div className="im-glass p-3 p-sm-4 p-md-5 rounded-4 shadow-lg w-100" style={{ maxWidth: '460px' }}>
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-3">
            <Film size={36} color="var(--primary-color)" />
            <span className="fw-bold fs-3 text-light">IMOVIES</span>
          </Link>
          <h4 className="fw-bold m-0">Sign In to Your Account</h4>
          <p className="text-secondary small mt-1">Book movie tickets in seconds with live seat tracking</p>
        </div>

        {error && (
          <div className="mb-3">
            <AlertBanner type="danger" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-secondary small fw-medium m-0">Password</label>
              <Link to="/forgot-password" className="text-danger small text-decoration-none">
                Forgot Password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-100 mt-2 rounded-pill py-2.5 fw-semibold shadow-sm"
            style={{ minHeight: '42px', fontSize: '0.95rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
          >
            Sign In
          </Button>
        </form>

        <div className="d-flex align-items-center gap-3 my-3">
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span className="text-secondary small fw-medium">OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        <GoogleSignInButton label="Continue with Google" />

        <div className="text-center mt-4 text-secondary small">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-danger fw-semibold text-decoration-none">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
