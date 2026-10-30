import React, { useState } from 'react';
import api from '../../lib/api';
import { formatISTDateTime } from '../../lib/ist-date';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, User, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminVerifyTicketPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const cleanCode = code.trim().toUpperCase();
      const res = await api.post('/admin/bookings/verify', { bookingCode: cleanCode });
      const data = res.data;

      const record = {
        code: cleanCode,
        status: 'SUCCESS',
        booking: data.booking,
        message: data.message || 'Ticket valid & admitted!',
        timestamp: new Date(),
      };

      setResult(record);
      setScanHistory((prev) => [record, ...prev]);
      toast.success('Ticket Verified — Admitted!');
      setCode('');
    } catch (err) {
      const record = {
        code: code.trim().toUpperCase(),
        status: 'FAILED',
        error: err.message || 'Invalid ticket code',
        codeType: err.code || 'INVALID_TICKET',
        timestamp: new Date(),
      };
      setResult(record);
      setScanHistory((prev) => [record, ...prev]);
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">Cinema Gate Admission Scanner</h2>
        <p className="text-secondary small m-0">Scan customer QR codes or enter booking references to admit moviegoers.</p>
      </div>

      <div className="row g-3 g-sm-4 mb-4">
        {/* Verification Form */}
        <div className="col-12 col-lg-6">
          <div className="im-glass p-3 p-sm-4 rounded-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <ScanLine size={20} className="text-danger" />
              <span>Enter Ticket Reference Code</span>
            </h5>

            <form onSubmit={handleVerify} className="d-flex flex-column gap-3">
              <Input
                label="Booking Code"
                placeholder="e.g. IMV-123456"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                required
              />

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!code.trim()}
                className="rounded-pill px-4 py-2.5 fw-semibold shadow-sm text-nowrap d-flex align-items-center justify-content-center gap-2"
                style={{ minHeight: '42px', fontSize: '0.925rem', boxShadow: '0 4px 18px rgba(168, 85, 247, 0.45)' }}
              >
                <ScanLine size={17} />
                <span>Verify & Admit Ticket</span>
              </Button>
            </form>

            <div className="mt-3 text-secondary small">
              Tip: Standard handheld 2D QR scanners operate as keyboard wedge inputs and will trigger enter automatically.
            </div>
          </div>
        </div>

        {/* Verification Result Card */}
        <div className="col-12 col-lg-6">
          <div className="im-glass p-3 p-sm-4 rounded-4 h-100">
            <h5 className="fw-bold mb-3">Admission Decision</h5>

            {!result ? (
              <div className="text-center py-5 text-secondary">
                <Ticket size={40} className="mb-2 opacity-50" />
                <p className="m-0 small">Awaiting ticket scan...</p>
              </div>
            ) : result.status === 'SUCCESS' ? (
              <div className="p-4 rounded-4 text-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid #a855f7' }}>
                <CheckCircle2 size={48} className="text-success mb-2" />
                <h4 className="fw-bold text-success mb-1">ENTRY GRANTED</h4>
                <div className="badge bg-success mb-3 fs-6 font-monospace">{result.booking?.bookingCode}</div>

                <div className="text-start p-3 rounded-3 mb-2" style={{ background: '#0e0b16', border: '1px solid #281d3d' }}>
                  <div className="fw-bold text-light fs-5 mb-1">{result.booking?.showId?.movieId?.title}</div>
                  <div className="text-secondary small mb-2">
                    {result.booking?.showId?.theatreId?.name} • {result.booking?.showId?.screenId?.name}
                  </div>
                  <div className="text-light small fw-medium mb-3">
                    {result.booking?.showId?.startTime && formatISTDateTime(result.booking?.showId?.startTime)}
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-secondary small">Customer:</span>
                    <span className="text-light fw-medium">{result.booking?.userId?.name}</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-1">
                    <span className="text-secondary small">Seats:</span>
                    <span className="badge bg-danger fs-6">
                      {result.booking?.seats?.map((s) => s.seatLabel).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-4 text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
                <XCircle size={48} className="text-danger mb-2" />
                <h4 className="fw-bold text-danger mb-1">ACCESS DENIED</h4>
                <div className="badge bg-danger mb-3 fs-6 font-monospace">{result.code}</div>
                <p className="text-light fw-medium mb-0">{result.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Scan Log */}
      {scanHistory.length > 0 && (
        <div className="im-glass p-4 rounded-4">
          <h5 className="fw-bold mb-3">Session Gate Log ({scanHistory.length} Scans)</h5>
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Code</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th className="text-end">Time</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((s, idx) => (
                  <tr key={idx}>
                    <td className="font-monospace fw-bold">{s.code}</td>
                    <td>
                      <span className={`badge ${s.status === 'SUCCESS' ? 'bg-success' : 'bg-danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="small text-secondary">
                      {s.status === 'SUCCESS'
                        ? `${s.booking?.showId?.movieId?.title} — Seats: ${s.booking?.seats?.map((st) => st.seatLabel).join(', ')}`
                        : s.error}
                    </td>
                    <td className="text-end text-secondary small">
                      {s.timestamp.toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
