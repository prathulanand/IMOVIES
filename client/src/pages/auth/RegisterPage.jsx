import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { Film, CheckCircle2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Email OTP verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSendOtp = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address first');
      return;
    }
    setSendingOtp(true);
    setError(null);
    try {
      const res = await api.post('/auth/send-otp', { email: email.trim() });
      setOtpSent(true);
      toast.success(res.data.message || 'OTP sent to your Gmail inbox! Please check.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send verification OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification OTP');
      return;
    }
    setVerifyingOtp(true);
    setError(null);
    try {
      const res = await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
      setIsEmailVerified(true);
      toast.success(res.data.message || 'Email verified successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid or expired OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setError('Please verify your email address by clicking "Verify Email" and entering the OTP.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      toast.success(`Welcome to IMovies, ${user.name}!`);
      navigate('/movies', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 py-md-5 d-flex justify-content-center align-items-center min-vh-75">
      <div className="im-glass p-3 p-sm-4 p-md-5 rounded-4 shadow-lg w-100" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-3">
            <Film size={36} color="var(--primary-color)" />
            <span className="fw-bold fs-3 text-light">IMOVIES</span>
          </Link>
          <h4 className="fw-bold m-0">Create Your Account</h4>
          <p className="text-secondary small mt-1">Join thousands of cinema lovers across India</p>
        </div>

        {error && (
          <div className="mb-3">
            <AlertBanner type="danger" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          {/* Email with OTP Verification Button */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-1.5">
              <label className="form-label text-secondary small fw-medium m-0">
                Email Address <span className="text-danger">*</span>
              </label>
              {isEmailVerified ? (
                <span className="badge bg-success bg-opacity-25 text-success d-inline-flex align-items-center gap-1 small py-1 px-2">
                  <CheckCircle2 size={12} />
                  <span>Verified</span>
                </span>
              ) : null}
            </div>

            <div className="input-group">
              <input
                type="email"
                className="form-control"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (isEmailVerified) setIsEmailVerified(false);
                  if (otpSent) setOtpSent(false);
                }}
                disabled={isEmailVerified}
                required
                style={{ background: '#121624', border: '1px solid #242c44', color: '#fff' }}
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !email}
                  className="btn btn-danger px-3 fw-medium"
                >
                  {sendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Verify Email'}
                </button>
              )}
            </div>
          </div>

          {/* 6-Digit OTP Input Box */}
          {otpSent && !isEmailVerified && (
            <div className="p-3 rounded-3" style={{ background: '#161124', border: '1px dashed #a855f7' }}>
              <label className="form-label text-light small fw-medium mb-1 d-flex align-items-center gap-1.5">
                <Mail size={14} className="text-danger" />
                <span>Enter 6-Digit OTP sent to your Gmail</span>
              </label>
              <div className="input-group">
                <input
                  type="text"
                  maxLength={6}
                  className="form-control text-center fw-bold text-light"
                  placeholder="e.g. 583921"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ background: '#0e101a', border: '1px solid #333d59', letterSpacing: '4px', fontSize: '18px' }}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otp.length !== 6}
                  className="btn btn-success px-3 fw-medium"
                >
                  {verifyingOtp ? 'Checking...' : 'Confirm OTP'}
                </button>
              </div>
              <div className="text-secondary mt-1.5" style={{ fontSize: '11px' }}>
                A real verification code was dispatched to <strong>{email}</strong>. Valid for 10 minutes.
              </div>
            </div>
          )}

          <Input
            type="tel"
            label="Phone Number (Optional)"
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            type="password"
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isEmailVerified}
            className="w-100 mt-2 rounded-pill py-2.5 fw-semibold shadow-sm"
            style={{ minHeight: '42px', fontSize: '0.95rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
          >
            {isEmailVerified ? 'Create Account' : 'Verify Email to Register'}
          </Button>
        </form>

        <div className="d-flex align-items-center gap-3 my-3">
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span className="text-secondary small fw-medium">OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        <GoogleSignInButton label="Sign up with Google" />

        <div className="text-center mt-4 text-secondary small">
          Already have an account?{' '}
          <Link to="/login" className="text-danger fw-semibold text-decoration-none">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
