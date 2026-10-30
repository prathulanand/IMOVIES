import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { formatINR } from '../../lib/currency';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { CreditCard, Search, ArrowUpRight, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState('PAYMENTS'); // PAYMENTS | REFUNDS
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLedgers = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, rRes] = await Promise.all([
        api.get('/admin/payments'),
        api.get('/admin/refunds'),
      ]);
      setPayments(pRes.data.payments || []);
      setRefunds(rRes.data.refunds || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch financial transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 fs-3 fs-sm-2">Financial Transactions & Settlements</h2>
          <p className="text-secondary small m-0">Payment gateway capture audit trail and automated refund logs.</p>
        </div>

        <div className="btn-group im-glass p-1 rounded-3 w-100 w-sm-auto">
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`btn btn-sm ${activeTab === 'PAYMENTS' ? 'btn-primary' : 'btn-link text-secondary text-decoration-none'}`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('REFUNDS')}
            className={`btn btn-sm ${activeTab === 'REFUNDS' ? 'btn-primary' : 'btn-link text-secondary text-decoration-none'}`}
          >
            Refunds ({refunds.length})
          </button>
        </div>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Auditing ledger transactions..." />
          </div>
        ) : activeTab === 'PAYMENTS' ? (
          payments.length === 0 ? (
            <div className="text-center py-5 text-secondary">No payment captures found.</div>
          ) : (
            <div className="table-responsive touch-scroll">
              <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
                <thead>
                  <tr className="text-secondary small text-uppercase">
                    <th>Razorpay Payment ID</th>
                    <th>Booking Ref</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="text-end">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <span className="font-monospace fw-bold text-light">{p.razorpayPaymentId}</span>
                        <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                          Order: {p.razorpayOrderId}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-secondary">
                          {p.bookingId?.bookingCode || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-light">{p.userId?.name || 'Customer'}</div>
                        <div className="text-secondary small">{p.userId?.email}</div>
                      </td>
                      <td>
                        <span className="badge bg-secondary text-uppercase">{p.method || 'online'}</span>
                      </td>
                      <td>
                        <span className="fw-bold text-success">{formatINR(p.amount)}</span>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="text-end text-secondary small">
                        {p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date(p.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : refunds.length === 0 ? (
          <div className="text-center py-5 text-secondary">No refund transactions recorded.</div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Refund Reference</th>
                  <th>Booking Ref</th>
                  <th>Reason</th>
                  <th>Refund Amount</th>
                  <th>Status</th>
                  <th className="text-end">Processed At</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className="font-monospace fw-bold text-light">
                        {r.razorpayRefundId || r._id}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-dark border border-secondary text-secondary">
                        {r.bookingId?.bookingCode || 'N/A'}
                      </span>
                    </td>
                    <td className="text-secondary small">{r.reason}</td>
                    <td>
                      <span className="fw-bold text-warning">{formatINR(r.amount)}</span>
                    </td>
                    <td>
                      <span className="badge bg-success">{r.status}</span>
                    </td>
                    <td className="text-end text-secondary small">
                      {r.processedAt ? new Date(r.processedAt).toLocaleString() : new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
