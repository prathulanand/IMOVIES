import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { UserX, UserCheck, ShieldCheck, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status toggle confirm
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Add Admin modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setToggling(true);
    try {
      await api.patch(`/admin/users/${toggleTarget._id}`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      setToggleTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setToggling(false);
    }
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }

    setSubmittingAdmin(true);
    try {
      const res = await api.post('/admin/users/admin', {
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || undefined,
        password: adminForm.password.trim() || undefined,
      });

      toast.success(res.data.message || 'Admin access granted successfully!');
      setShowAddModal(false);
      setAdminForm({ name: '', email: '', phone: '', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create or promote admin');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">User Accounts & RBAC</h2>
          <p className="text-secondary small m-0">Directory of registered patrons, account states, and role allocations.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-danger d-inline-flex align-items-center justify-content-center gap-2 rounded-pill px-4 py-2 fw-medium shadow w-100 w-sm-auto"
        >
          <UserPlus size={16} />
          <span>+ Add New Admin</span>
        </button>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading user directory..." />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-5 text-secondary">No users found.</div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>User Profile</th>
                  <th>Contact Phone</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Joined Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u._id === currentUser?._id;
                  const isActive = u.status === 'ACTIVE';

                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="rounded-circle shadow"
                              style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow"
                              style={{
                                width: '36px',
                                height: '36px',
                                background: u.role === 'ADMIN' ? 'var(--primary-gradient)' : '#1e293b',
                              }}
                            >
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-light d-flex align-items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-secondary small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-secondary small">{u.phone || '—'}</td>
                      <td>
                        <span
                          className={`badge ${u.role === 'ADMIN' ? 'bg-danger' : 'bg-secondary'} text-uppercase`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="text-secondary small">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        {!isSelf && (
                          <button
                            className={`btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'} d-inline-flex align-items-center gap-1`}
                            onClick={() => setToggleTarget(u)}
                          >
                            {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                            <span>{isActive ? 'Suspend' : 'Activate'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Admin Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Admin Account"
        maxWidth="500px"
      >
        <form onSubmit={handleAddAdminSubmit} className="p-4 d-flex flex-column gap-3">
          <div
            className="p-3 rounded-3"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
          >
            <div className="d-flex gap-2">
              <ShieldCheck size={18} className="text-danger flex-shrink-0 mt-1" />
              <div className="small text-secondary">
                <strong className="text-light">Full Administrative Access:</strong> This account will be granted the{' '}
                <span className="text-danger fw-bold">ADMIN</span> role. They can log in using their credentials OR by
                clicking <strong>&apos;Continue with Google&apos;</strong> with this Gmail address to open the Admin Portal.
              </div>
            </div>
          </div>

          <Input
            label="Full Name *"
            placeholder="e.g. John Doe"
            value={adminForm.name}
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            type="email"
            label="Admin Email / Gmail *"
            placeholder="e.g. newadmin@gmail.com"
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            required
          />

          <Input
            type="tel"
            label="Contact Phone"
            placeholder="e.g. 9876543210 (Optional)"
            value={adminForm.phone}
            onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
          />

          <Input
            type="password"
            label="Password (Optional)"
            placeholder="Leave empty for default (Admin@123)"
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
          />

          <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top border-secondary border-opacity-25">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 rounded-pill"
              onClick={() => setShowAddModal(false)}
              disabled={submittingAdmin}
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              loading={submittingAdmin}
              className="rounded-pill px-4"
            >
              Grant Admin Role
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toggleTarget)}
        title={toggleTarget?.status === 'ACTIVE' ? 'Suspend User Account' : 'Reactivate User Account'}
        message={
          toggleTarget
            ? `Are you sure you want to ${
                toggleTarget.status === 'ACTIVE' ? 'suspend' : 'reactivate'
              } account "${toggleTarget.name}" (${toggleTarget.email})? ${
                toggleTarget.status === 'ACTIVE'
                  ? 'They will not be able to log in or book tickets.'
                  : 'Their access will be immediately restored.'
              }`
            : ''
        }
        confirmText={toggleTarget?.status === 'ACTIVE' ? 'Yes, Suspend Account' : 'Yes, Reactivate'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={toggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
