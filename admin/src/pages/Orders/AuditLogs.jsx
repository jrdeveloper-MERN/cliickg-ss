import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { RefreshCw, User } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/audit-logs');
      const dataList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setLogs(dataList);
    } catch (err) {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">System &amp; Payment Audit Logs</h1>
          <p className="subheading mt-1">
            Comprehensive audit trail of administrative actions, gateway state updates, and verification events
          </p>
        </div>

        <button type="button" onClick={fetchLogs} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw size={15} /> Refresh Logs
        </button>
      </div>

      <div className="card-minimal p-5">
        <div className="data-table-container">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Module</th>
                <th>Target / Order ID</th>
                <th>Customer / User</th>
                <th>IP Address</th>
                <th>Details / Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center p-8 text-admin-text-muted">Loading Audit Logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-8 text-admin-text-muted">No audit log records found</td></tr>
              ) : (
                logs.map((l, idx) => (
                  <tr key={l.id || l._id || idx}>
                    <td className="text-[11px] text-admin-text-muted">
                      {new Date(l.updatedAt || l.timestamp || l.createdAt).toLocaleString()}
                    </td>
                    <td className="font-bold text-admin-accent">
                      {l.action || l.orderStatus || 'ORDER_UPDATE'}
                    </td>
                    <td>
                      <span className="badge badge-accent">{l.module || 'Order'}</span>
                    </td>
                    <td className="font-mono font-semibold">
                      {l.orderId || l.targetId || l.id || 'N/A'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs">
                        <User size={13} className="text-admin-accent" />
                        <span>{l.customerName || l.performedBy?.name || 'System'}</span>
                      </div>
                    </td>
                    <td className="text-[11px] text-admin-text-muted">{l.ipAddress || '127.0.0.1'}</td>
                    <td className="text-xs text-admin-text-secondary">
                      {l.details || (l.paymentStatus ? `Payment: ${l.paymentStatus} | Status: ${l.orderStatus}` : 'N/A')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
