import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Building, Plus, Edit2, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_THEATRE = {
  name: '',
  city: 'Mumbai',
  address: '',
  contactPhone: '',
  contactEmail: '',
};

export default function AdminTheatresPage() {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTheatre, setEditingTheatre] = useState(null);
  const [formData, setFormData] = useState(INITIAL_THEATRE);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTheatres = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/theatres');
      setTheatres(res.data.theatres || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch theatres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheatres();
  }, [fetchTheatres]);

  const handleOpenCreate = () => {
    setEditingTheatre(null);
    setFormData(INITIAL_THEATRE);
    setModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTheatre(t);
    const phone = typeof t.contact === 'string' ? t.contact : t.contact?.phone || '';
    const email = typeof t.contact === 'object' ? t.contact?.email || '' : '';
    setFormData({
      name: t.name,
      city: t.city,
      address: t.address || '',
      contactPhone: phone,
      contactEmail: email,
    });
    setModalOpen(true);
  };

  const handleSaveTheatre = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
      };

      const phone = formData.contactPhone?.trim();
      const email = formData.contactEmail?.trim();
      if (phone || email) {
        payload.contact = {
          ...(phone && { phone }),
          ...(email && { email }),
        };
      }

      if (editingTheatre) {
        await api.put(`/admin/theatres/${editingTheatre._id}`, payload);
        toast.success('Theatre updated successfully');
      } else {
        await api.post('/admin/theatres', payload);
        toast.success('Theatre created successfully');
      }

      setModalOpen(false);
      fetchTheatres();
    } catch (err) {
      toast.error(err.message || 'Failed to save theatre');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTheatre = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/theatres/${deleteTarget._id}`);
      toast.success('Theatre removed successfully');
      setDeleteTarget(null);
      fetchTheatres();
    } catch (err) {
      toast.error(err.message || 'Cannot delete theatre with active screens or bookings');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">Theatres & Multiplexes</h2>
          <p className="text-secondary small m-0">Manage cinema locations and property details.</p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate} className="d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto">
          <Plus size={16} />
          <span>Add New Theatre</span>
        </Button>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading cinema multiplexes..." />
          </div>
        ) : theatres.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            No theatres configured yet. Click &quot;Add New Theatre&quot; to begin.
          </div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Theatre / Multiplex</th>
                  <th>City</th>
                  <th>Address</th>
                  <th>Contact Info</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {theatres.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="p-2 rounded-3 bg-danger bg-opacity-25 text-danger">
                          <Building size={20} />
                        </div>
                        <span className="fw-bold text-light">{t.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{t.city}</span>
                    </td>
                    <td className="text-secondary small">{t.address}</td>
                    <td className="text-secondary small">
                      {typeof t.contact === 'string' && t.contact && (
                        <div className="d-flex align-items-center gap-1">
                          <Phone size={12} /> {t.contact}
                        </div>
                      )}
                      {typeof t.contact === 'object' && t.contact?.phone && (
                        <div className="d-flex align-items-center gap-1">
                          <Phone size={12} /> {t.contact.phone}
                        </div>
                      )}
                      {typeof t.contact === 'object' && t.contact?.email && (
                        <div className="d-flex align-items-center gap-1">
                          <Mail size={12} /> {t.contact.email}
                        </div>
                      )}
                      {!t.contact && <span className="text-secondary opacity-50">—</span>}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(t)}
                          title="Edit Theatre"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(t)}
                          title="Delete Theatre"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        title={editingTheatre ? 'Edit Cinema Multiplex' : 'Add New Cinema Multiplex'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveTheatre} className="d-flex flex-column gap-3">
          <Input
            label="Theatre Name"
            placeholder="e.g. PVR ICON Oberoi Mall"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="City"
            placeholder="e.g. Mumbai, Delhi, Bengaluru"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />

          <div>
            <label className="form-label text-secondary small fw-medium">Street Address</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Full address of cinema..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={{ background: '#121624', border: '1px solid #242c44', color: '#fff' }}
              required
            />
          </div>

          <Input
            label="Contact Phone (Optional)"
            placeholder="+91 22 2840 1234"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          />

          <Input
            type="email"
            label="Contact Email (Optional)"
            placeholder="manager@pvr.com"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />

          <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingTheatre ? 'Save Changes' : 'Create Theatre'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Cinema Property"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? If screens or shows are linked to this theatre, deletion will be blocked by referential integrity.`
            : ''
        }
        confirmText="Yes, Delete Theatre"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTheatre}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
