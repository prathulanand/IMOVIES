import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Settings, Shield, Clock, Percent, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [holdMinutes, setHoldMinutes] = useState(7);
  const [convenienceFeePercent, setConvenienceFeePercent] = useState(5);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(8);
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState(2);
  const [cancellationRefundPercent, setCancellationRefundPercent] = useState(75);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const res = await api.get('/admin/settings');
        const s = res.data.settings;
        if (s) {
          setHoldMinutes(s.holdMinutes ?? 7);
          setConvenienceFeePercent(s.convenienceFeePercent ?? 5);
          setMaxSeatsPerBooking(s.maxSeatsPerBooking ?? 8);
          setCancellationCutoffHours(s.cancellationPolicy?.cutoffHours ?? 2);
          setCancellationRefundPercent(s.cancellationPolicy?.refundPercent ?? 75);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to fetch global settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        holdMinutes: parseInt(holdMinutes, 10),
        convenienceFeePercent: parseFloat(convenienceFeePercent),
        maxSeatsPerBooking: parseInt(maxSeatsPerBooking, 10),
        cancellationPolicy: {
          cutoffHours: parseInt(cancellationCutoffHours, 10),
          refundPercent: parseInt(cancellationRefundPercent, 10),
        },
      };

      await api.put('/admin/settings', payload);
      toast.success('System business parameters updated and audited!');
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <LoadingSpinner message="Loading system configuration..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Global Platform Rules & Business Parameters</h2>
        <p className="text-secondary small m-0">Tune seat hold durations, fee percentages, and customer cancellation rules.</p>
      </div>

      <div className="im-glass p-4 rounded-4" style={{ maxWidth: '720px' }}>
        <form onSubmit={handleSaveSettings} className="d-flex flex-column gap-4">
          {/* Seat Hold Engine Parameters */}
          <div>
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Clock size={18} className="text-danger" />
              <span>Seat Hold Engine Rules</span>
            </h5>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Input
                  type="number"
                  label="Seat Hold Timeout (Minutes)"
                  min={1}
                  max={30}
                  value={holdMinutes}
                  onChange={(e) => setHoldMinutes(e.target.value)}
                  helperText="Default is 7 minutes. Orphaned holds expire automatically."
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <Input
                  type="number"
                  label="Max Seats Per Order"
                  min={1}
                  max={20}
                  value={maxSeatsPerBooking}
                  onChange={(e) => setMaxSeatsPerBooking(e.target.value)}
                  helperText="Prevents scalping; default is 8 seats."
                  required
                />
              </div>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)' }} />

          {/* Pricing & Convenience Fee */}
          <div>
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Percent size={18} className="text-danger" />
              <span>Financial & Convenience Fee Rules</span>
            </h5>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  max={30}
                  label="Convenience Fee Percentage (%)"
                  value={convenienceFeePercent}
                  onChange={(e) => setConvenienceFeePercent(e.target.value)}
                  helperText="Applied to subtotal. Non-refundable upon user cancellation."
                  required
                />
              </div>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)' }} />

          {/* Cancellation Policy */}
          <div>
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Shield size={18} className="text-danger" />
              <span>Cancellation & Refund Policy</span>
            </h5>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Input
                  type="number"
                  min={1}
                  max={48}
                  label="Cutoff Window (Hours Before Showtime)"
                  value={cancellationCutoffHours}
                  onChange={(e) => setCancellationCutoffHours(e.target.value)}
                  helperText="Cancellations closer than this window yield 0% refund."
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  label="Refund Percentage (%)"
                  value={cancellationRefundPercent}
                  onChange={(e) => setCancellationRefundPercent(e.target.value)}
                  helperText="Percentage of ticket base price refunded before cutoff."
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="px-4 py-2.5 rounded-pill fw-semibold shadow-sm text-nowrap d-inline-flex align-items-center gap-2"
              style={{ minHeight: '42px', fontSize: '0.925rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
            >
              <Save size={17} />
              <span>Save System Settings</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
