import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { History, Shield, Eye, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data.auditLogs || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold m-0">System Audit Trail & Mutation Log</h2>
        <p className="text-secondary small m-0">Immutable compliance record of administrative changes, deletions, and config edits.</p>
      </div>

      <div className="im-glass p-3 p-sm-4 rounded-4">
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Querying audit records..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-secondary">No administrative mutations recorded yet.</div>
        ) : (
          <div className="table-responsive touch-scroll">
            <table className="table table-dark table-hover align-middle mb-0 text-nowrap" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-secondary small text-uppercase">
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Admin Actor</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                  <th className="text-end">Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className="badge bg-danger bg-opacity-25 text-danger font-monospace">
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">{log.entity}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-light">{log.actorName || 'Admin'}</div>
                      <div className="text-secondary small">{log.actorEmail}</div>
                    </td>
                    <td className="font-monospace text-secondary small">{log.ipAddress}</td>
                    <td className="text-secondary small">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          title={`Audit Snapshot — ${selectedLog.action} on ${selectedLog.entity}`}
          onClose={() => setSelectedLog(null)}
          size="lg"
        >
          <div className="d-flex flex-column gap-3">
            <div className="p-3 rounded-3" style={{ background: '#121624', border: '1px solid #242c44' }}>
              <div className="text-secondary small mb-1">Actor: <span className="text-light fw-medium">{selectedLog.actorName} ({selectedLog.actorEmail})</span></div>
              <div className="text-secondary small mb-1">IP: <span className="text-light font-monospace">{selectedLog.ipAddress}</span></div>
              <div className="text-secondary small">Timestamp: <span className="text-light">{new Date(selectedLog.timestamp).toISOString()}</span></div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="text-secondary small fw-semibold text-uppercase mb-1">Before Snapshot</div>
                <pre
                  className="p-3 rounded-3 small font-monospace"
                  style={{
                    background: '#0d1117',
                    border: '1px solid #21262d',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    color: '#f85149',
                  }}
                >
                  {selectedLog.beforeSnapshot
                    ? JSON.stringify(selectedLog.beforeSnapshot, null, 2)
                    : '// None (Create mutation)'}
                </pre>
              </div>

              <div className="col-12 col-md-6">
                <div className="text-secondary small fw-semibold text-uppercase mb-1">After Snapshot</div>
                <pre
                  className="p-3 rounded-3 small font-monospace"
                  style={{
                    background: '#0d1117',
                    border: '1px solid #21262d',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    color: '#3fb950',
                  }}
                >
                  {selectedLog.afterSnapshot
                    ? JSON.stringify(selectedLog.afterSnapshot, null, 2)
                    : '// None (Delete mutation)'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
