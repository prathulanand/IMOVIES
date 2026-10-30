import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { formatINR } from '../../lib/currency';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Tag, Plus, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_COUPON = {
  code: '',
  discountType: 'FLAT',
  discountValue: 100,
  minOrderAmount: 300,
  maxDiscountAmount: 200,
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  maxUses: 100,
  isActive: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_COUPON);
  const [saving, setSaving] = useState(false);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/coupons');
      setCoupons(res.data.coupons || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleOpenCreate = () => {
    setFormData(INITIAL_COUPON);
    setModalOpen(true);
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isFlat = formData.discountType === 'FLAT';
      const minAmountPaise = Math.round(Number(formData.minOrderAmount || 0) * 100);
      const maxDiscountPaise = formData.maxDiscountAmount
        ? Math.round(Number(formData.maxDiscountAmount) * 100)
        : undefined;
      const usageLimit = Number(formData.maxUses) || 1000;

      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType === 'PERCENTAGE' ? 'PERCENT' : formData.discountType,
        // Flat discount in paise, percentage discount as plain integer percentage
        discountValue: isFlat
          ? Math.round(Number(formData.discountValue) * 100)
          : Number(formData.discountValue),
        minAmount: minAmountPaise,
        minOrderAmount: minAmountPaise,
        maxDiscount: maxDiscountPaise,
        maxDiscountAmount: maxDiscountPaise,
        validFrom: new Date(),
        validUntil: new Date(formData.validUntil),
        usageLimit,
        maxUses: usageLimit,
        isActive: formData.isActive,
      };

      await api.post('/admin/coupons', payload);
      toast.success('Promotional coupon created successfully');
      setModalOpen(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/coupons/${deleteTarget._id}`);
      toast.success('Coupon removed successfully');
      setDeleteTarget(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message || 'Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">Coupons & Promotional Discounts</h2>
          <p className="text-secondary small m-0">Issue promotional discount vouchers and track redemptions.</p>
        </div>

        <Button variant="primary" onClick={handleOpenCreate} className="d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto">
          <Plus size={16} />
          <span>Create Coupon</span>
        </Button>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading coupons..." />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            No active discount vouchers. Click &quot;Create Coupon&quot; to issue one.
          </div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Coupon Code</th>
                  <th>Discount Rule</th>
                  <th>Min Order</th>
                  <th>Max Discount</th>
                  <th>Expiry Date</th>
                  <th>Redemptions</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const isExpired = new Date(c.validUntil) < new Date();

                  return (
                    <tr key={c._id}>
                      <td>
                        <span className="badge bg-danger fs-6 font-monospace">{c.code}</span>
                      </td>
                      <td>
                        <span className="fw-bold text-light">
                          {c.discountType === 'FLAT'
                            ? `${formatINR(c.discountValue)} OFF`
                            : `${c.discountValue}% OFF`}
                        </span>
                      </td>
                      <td className="text-secondary small">{formatINR(c.minAmount ?? c.minOrderAmount ?? 0)}</td>
                      <td className="text-secondary small">
                        {(c.maxDiscount ?? c.maxDiscountAmount) ? formatINR(c.maxDiscount ?? c.maxDiscountAmount) : 'No cap'}
                      </td>
                      <td className="text-secondary small">
                        {new Date(c.validUntil).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="text-light fw-medium">
                          {c.usedCount || 0} / {(c.usageLimit ?? c.maxUses) || '∞'}
                        </span>
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="badge bg-secondary">Expired</span>
                        ) : c.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-warning">Inactive</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete Coupon"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        title="Create Promotional Discount Coupon"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateCoupon} className="d-flex flex-column gap-3">
          <Input
            label="Coupon Code"
            placeholder="e.g. FESTIVAL100, SUMMER50"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            autoFocus
          />

          <div className="row g-2">
            <div className="col-6">
              <Select
                label="Discount Type"
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                options={[
                  { value: 'FLAT', label: 'Flat (₹ Amount)' },
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                ]}
              />
            </div>
            <div className="col-6">
              <Input
                type="number"
                label={formData.discountType === 'FLAT' ? 'Discount in ₹' : 'Discount in %'}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-6">
              <Input
                type="number"
                label="Min Order Amount (₹)"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                required
              />
            </div>
            <div className="col-6">
              <Input
                type="number"
                label="Max Discount Cap in ₹ (Optional)"
                placeholder="e.g. 200"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-6">
              <Input
                type="date"
                label="Expiration Date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
              />
            </div>
            <div className="col-6">
              <Input
                type="number"
                label="Max Redemptions Allowed"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Coupon Voucher"
        message={
          deleteTarget
            ? `Are you sure you want to delete coupon "${deleteTarget.code}"? Customers will no longer be able to use it at checkout.`
            : ''
        }
        confirmText="Yes, Delete Coupon"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteCoupon}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
