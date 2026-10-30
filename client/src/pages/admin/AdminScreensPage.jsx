import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LayoutBuilder from '../../components/admin/LayoutBuilder';
import { Monitor, Plus, Edit2, Trash2, Grid3X3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminScreensPage() {
  const [screens, setScreens] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Screen Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState(null);
  const [theatreId, setTheatreId] = useState('');
  const [name, setName] = useState('');
  const [soundSystem, setSoundSystem] = useState('Dolby Atmos 7.1');
  const [saving, setSaving] = useState(false);

  // Layout Builder Modal
  const [layoutScreen, setLayoutScreen] = useState(null);
  const [savingLayout, setSavingLayout] = useState(false);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [screensRes, theatresRes] = await Promise.all([
        api.get('/admin/screens'),
        api.get('/admin/theatres'),
      ]);
      setScreens(screensRes.data.screens || []);
      setTheatres(theatresRes.data.theatres || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch screens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingScreen(null);
    setTheatreId(theatres[0]?._id || '');
    setName('Audi 1');
    setSoundSystem('Dolby Atmos 7.1');
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingScreen(s);
    setTheatreId(s.theatreId?._id || s.theatreId || theatres[0]?._id || '');
    setName(s.name);
    setSoundSystem(s.soundSystem || 'Dolby Atmos 7.1');
    setModalOpen(true);
  };

  const handleSaveScreen = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingScreen) {
        await api.put(`/admin/screens/${editingScreen._id}`, {
          name: name.trim(),
          soundSystem,
        });
        toast.success('Screen updated successfully');
      } else {
        // Generate a standard 8x12 auditorium layout (80 seats, 2 aisles)
        const rowLetters = 'ABCDEFGH';
        const defaultCells = [];
        let totalSeatsCount = 0;
        for (let r = 1; r <= 8; r++) {
          const rowChar = rowLetters[r - 1] || `R${r}`;
          const category = r <= 2 ? 'REGULAR' : r <= 5 ? 'PREMIUM' : 'RECLINER';
          for (let c = 1; c <= 12; c++) {
            if (c === 4 || c === 9) {
              defaultCells.push({ row: r, col: c, label: '', category: 'NONE', kind: 'AISLE' });
            } else {
              totalSeatsCount++;
              defaultCells.push({ row: r, col: c, label: `${rowChar}${c}`, category, kind: 'SEAT' });
            }
          }
        }

        await api.post('/admin/screens', {
          theatreId,
          name: name.trim(),
          soundSystem,
          totalSeats: totalSeatsCount,
          layout: { rows: 8, cols: 12, cells: defaultCells },
          categoryConfig: [
            { category: 'REGULAR', defaultPricePaise: 20000 },
            { category: 'PREMIUM', defaultPricePaise: 30000 },
            { category: 'RECLINER', defaultPricePaise: 40000 },
          ],
        });
        toast.success('Screen created successfully! You can now customize its seat layout.');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save screen');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLayout = async (newLayout) => {
    if (!layoutScreen) return;
    setSavingLayout(true);
    try {
      const seatsCount =
        typeof newLayout.totalSeats === 'number'
          ? newLayout.totalSeats
          : Array.isArray(newLayout.cells)
          ? newLayout.cells.filter((c) => c.kind === 'SEAT').length
          : layoutScreen.totalSeats || 60;

      await api.put(`/admin/screens/${layoutScreen._id}`, {
        layout: newLayout,
        totalSeats: seatsCount,
      });
      toast.success('Auditorium seat layout updated successfully!');
      setLayoutScreen(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save seat layout');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleDeleteScreen = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/screens/${deleteTarget._id}`);
      toast.success('Screen deleted successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Cannot delete screen with active shows');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">Auditoriums & Seat Layouts</h2>
          <p className="text-secondary small m-0">Configure screens, sound specs, and visual seating arrangements.</p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          disabled={theatres.length === 0}
          className="d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto"
        >
          <Plus size={16} />
          <span>Add New Screen</span>
        </Button>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading auditoriums..." />
          </div>
        ) : screens.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            No screens configured yet. Add a cinema theatre first, then create an auditorium screen.
          </div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Screen Name</th>
                  <th>Cinema Multiplex</th>
                  <th>Sound Specs</th>
                  <th>Total Capacity</th>
                  <th>Layout Config</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((s) => {
                  const totalSeats =
                    typeof s.totalSeats === 'number'
                      ? s.totalSeats
                      : Array.isArray(s.layout?.cells)
                      ? s.layout.cells.filter((c) => c.kind === 'SEAT').length
                      : Array.isArray(s.layout?.rows)
                      ? s.layout.rows.reduce((acc, r) => acc + (r.seats?.length || 0), 0)
                      : 60;

                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3 bg-primary bg-opacity-25 text-primary">
                            <Monitor size={18} />
                          </div>
                          <span className="fw-bold text-light">{s.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-light">{s.theatreId?.name || 'Multiplex'}</span>
                        <div className="text-secondary small">{s.theatreId?.city}</div>
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-secondary">
                          {s.soundSystem || 'Dolby Atmos'}
                        </span>
                      </td>
                      <td>
                        <span className="fw-bold text-success">{totalSeats} seats</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                          onClick={() => setLayoutScreen(s)}
                        >
                          <Grid3X3 size={14} />
                          <span>Seat Layout Builder</span>
                        </button>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Screen Info"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTarget(s)}
                            title="Delete Screen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        title={editingScreen ? 'Edit Screen Details' : 'Add New Screen'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveScreen} className="d-flex flex-column gap-3">
          {!editingScreen && (
            <div>
              <label className="form-label text-secondary small fw-medium">Select Cinema Multiplex</label>
              <select
                className="form-select text-light"
                value={theatreId}
                onChange={(e) => setTheatreId(e.target.value)}
                style={{ background: '#121624', borderColor: 'var(--border-color)' }}
                required
              >
                {theatres.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Auditorium Name"
            placeholder="e.g. Audi 1 (IMAX Laser)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Sound System Specification"
            placeholder="e.g. Dolby Atmos 7.1, DTS:X"
            value={soundSystem}
            onChange={(e) => setSoundSystem(e.target.value)}
          />

          <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editingScreen ? 'Save Changes' : 'Create Screen'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Visual Seat Layout Builder Modal */}
      {layoutScreen && (
        <Modal
          isOpen={Boolean(layoutScreen)}
          title={`Visual Seat Layout Designer — ${layoutScreen.name} (${layoutScreen.theatreId?.name || 'Cinema'})`}
          onClose={() => setLayoutScreen(null)}
          size="xl"
        >
          <LayoutBuilder
            key={layoutScreen._id}
            initialLayout={layoutScreen.layout}
            onSave={handleSaveLayout}
            loading={savingLayout}
          />
        </Modal>
      )}

      {/* Delete Screen Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Auditorium Screen"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? If shows or booking history exist on this screen, deletion will be blocked.`
            : ''
        }
        confirmText="Yes, Delete Screen"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteScreen}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
