import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { Film, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & Set New Password
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const handleRequestToken = async (e) => {
    if (e) e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setInfo(res.data.message || `A real 6-digit verification OTP was dispatched to ${email.trim()}.`);
      setResetToken(''); // User must type the real OTP from their Gmail inbox
      setStep(2);
      toast.success('Real verification OTP sent to your Gmail inbox!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to dispatch verification OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendToken = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      toast.success(res.data.message || 'New OTP sent to your Gmail inbox!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || resetToken.trim().length !== 6) {
      setError('Please enter the 6-digit verification OTP received in your Gmail.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: resetToken.trim(),
        newPassword,
      });
      toast.success(res.data.message || 'Password successfully updated! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password. OTP may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center min-vh-75">
      <div className="im-glass p-4 p-md-5 rounded-4 shadow-lg w-100" style={{ maxWidth: '460px' }}>
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-3">
            <Film size={36} color="var(--primary-color)" />
            <span className="fw-bold fs-3 text-light">IMOVIES</span>
          </Link>
          <h4 className="fw-bold m-0">Reset Your Password</h4>
          <p className="text-secondary small mt-1">
            {step === 1
              ? 'Enter your registered Gmail to receive a real 6-digit verification code'
              : 'Enter the 6-digit code received in your Gmail to set a new password'}
          </p>
        </div>

        {error && (
          <div className="mb-3">
            <AlertBanner type="danger" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {info && (
          <div className="mb-3">
            <AlertBanner type="info" message={info} />
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestToken} className="d-flex flex-column gap-3">
            <Input
              type="email"
              label="Registered Email Address"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-100 mt-2 rounded-pill py-2.5 fw-semibold shadow-sm"
              style={{ minHeight: '42px', fontSize: '0.95rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
            >
              Send Real OTP to My Gmail
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="d-flex flex-column gap-3">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-secondary small fw-medium m-0">
                  6-Digit Gmail Verification OTP <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResendToken}
                  disabled={resending}
                  className="btn btn-link text-danger p-0 small text-decoration-none d-flex align-items-center gap-1"
                  style={{ fontSize: '11px' }}
                >
                  <RefreshCw size={11} className={resending ? 'spin' : ''} />
                  <span>{resending ? 'Sending...' : 'Resend OTP'}</span>
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                className="form-control text-center fw-bold text-light"
                placeholder="••••••"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                style={{
                  background: '#0e101a',
                  border: '1px solid #333d59',
                  letterSpacing: '5px',
                  fontSize: '20px',
                  height: '48px',
                }}
              />
              <div className="text-secondary mt-1.5" style={{ fontSize: '11px' }}>
                Check your Gmail inbox and Spam folder for the 6-digit code.
              </div>
            </div>

            <Input
              type="password"
              label="New Password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-100 mt-2 rounded-pill py-2.5 fw-semibold shadow-sm"
              style={{ minHeight: '42px', fontSize: '0.95rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
            >
              Update Password
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError(null);
                setInfo(null);
              }}
              className="btn btn-link text-secondary text-decoration-none small text-center mt-1"
            >
              &larr; Change email address
            </button>
          </form>
        )}

        <div className="text-center mt-4 text-secondary small">
          Remember your password?{' '}
          <Link to="/login" className="text-danger fw-semibold text-decoration-none">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
