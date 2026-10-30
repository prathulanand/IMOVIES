import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { User, Lock, Mail, Star, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate('/', { replace: true });
    try {
      await logout();
      toast.success('Signed out successfully');
    } catch {
      toast.success('Signed out');
    }
  };

  // Profile Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // User reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    async function loadReviews() {
      try {
        setReviewsLoading(true);
        const res = await api.get('/user/reviews');
        setReviews(res.data.reviews || []);
      } catch (err) {
        // quiet error
      } finally {
        setReviewsLoading(false);
      }
    }
    loadReviews();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      setProfileLoading(true);
      await api.put('/user/profile', {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success('Profile updated successfully');
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setPasswordLoading(true);
      await api.put('/user/password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <LoadingSpinner message="Loading account..." />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold m-0">My Account & Settings</h2>
        <p className="text-secondary small m-0">Manage your profile details and security credentials.</p>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile Card & Edit */}
        <div className="col-lg-6">
          <div className="im-glass p-3 p-sm-4 rounded-4 mb-4">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="rounded-circle shadow"
                  style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-4 shadow"
                  style={{ width: '56px', height: '56px', background: 'var(--primary-gradient)' }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-grow-1" style={{ minWidth: '200px' }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h4 className="fw-bold m-0 fs-5 fs-sm-4">{user.name}</h4>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 rounded-pill px-3"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
                <div className="text-secondary small d-flex align-items-center gap-2 mt-1">
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
                <div className="mt-2 d-flex gap-2">
                  <span className="badge bg-danger text-uppercase" style={{ fontSize: '0.65rem' }}>
                    {user.role}
                  </span>
                  <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <User size={18} className="text-danger" />
                <span>Personal Information</span>
              </h5>

              <div className="mb-3">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <Input
                  label="Email Address"
                  value={user.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </div>

              <div className="mb-4">
                <Input
                  label="Phone Number"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" loading={profileLoading}>
                Save Profile Changes
              </Button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="im-glass p-3 p-sm-4 rounded-4">
            <form onSubmit={handleChangePassword}>
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <Lock size={18} className="text-danger" />
                <span>Security & Password</span>
              </h5>

              <div className="mb-3">
                <Input
                  type="password"
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <Input
                  type="password"
                  label="New Password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <Input
                  type="password"
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="outline" loading={passwordLoading}>
                Update Password
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: User's Movie Reviews */}
        <div className="col-lg-6">
          <div className="im-glass p-3 p-sm-4 rounded-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Star size={18} className="text-warning" />
              <span>My Movie Reviews ({reviews.length})</span>
            </h5>

            {reviewsLoading ? (
              <div className="text-center py-4">
                <LoadingSpinner size="sm" message="Loading reviews..." />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-secondary small m-0 py-3">
                You haven&apos;t written any movie reviews yet. Watch a movie and share your experience!
              </p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="p-3 rounded-3"
                    style={{ background: '#121624', border: '1px solid #242c44' }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-bold text-light">
                        {rev.movieId?.title || 'Movie'}
                      </div>
                      <div className="d-flex text-warning">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? '#eab308' : 'none'}
                            color={i < rev.rating ? '#eab308' : '#6b7280'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-secondary small mb-1">{rev.comment}</p>
                    <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
