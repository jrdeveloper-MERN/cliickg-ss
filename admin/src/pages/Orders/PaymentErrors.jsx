import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Common/Modal';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

const PaymentErrors = () => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [selectedError, setSelectedError] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchErrors();
  }, [gatewayFilter, resolvedFilter]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (gatewayFilter) params.gateway = gatewayFilter;
      if (resolvedFilter) params.resolved = resolvedFilter;

      const res = await api.get('/payment/errors', { params });
      setErrors(res.data?.data || []);
    } catch (err) {
      showToast('Failed to load Payment Errors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchErrors();
  };

  const handleOpenDetail = (errLog) => {
    setSelectedError(errLog);
    setResolutionNotes(errLog.notes || '');
    setIsDetailOpen(true);
  };

  const handleMarkResolved = async () => {
    if (!selectedError) return;
    try {
      await api.put(`/payment/errors/${selectedError._id}/resolve`, {
        notes: resolutionNotes
      });
      showToast('Payment error marked as resolved', 'success');
      setIsDetailOpen(false);
      fetchErrors();
    } catch (err) {
      showToast('Failed to resolve payment error', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-gradient-to-br from-rose-900 to-rose-800 p-6 md:px-8 rounded-2xl text-white shadow-xl flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={24} className="text-rose-300" />
            <h1 className="text-xl md:text-2xl font-extrabold m-0">
              Payment Errors &amp; Exception Monitoring
            </h1>
          </div>
          <p className="text-rose-200 text-xs mt-1.5 m-0">
            Audit log of failed payment attempts, signature errors, network timeouts, and gateway exceptions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchErrors}
          className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 py-2.5 px-4.5 rounded-xl cursor-pointer font-semibold text-xs transition-colors"
        >
          <RefreshCw size={16} /> Refresh Logs
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-minimal p-4 md:px-5 flex gap-4 items-center flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[280px]">
          <div className="search-box flex-1">
            <Search size={16} className="text-admin-text-muted shrink-0 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID, customer name, mobile, error message..."
            />
          </div>
          <button
            type="submit"
            className="btn-primary px-4.5 font-semibold text-xs"
          >
            Search
          </button>
        </form>

        <div className="flex gap-3">
          <select
            value={gatewayFilter}
            onChange={e => setGatewayFilter(e.target.value)}
            className="form-control py-2 px-3 text-xs"
          >
            <option value="">All Gateways</option>
            <option value="Razorpay">Razorpay</option>
          </select>

          <select
            value={resolvedFilter}
            onChange={e => setResolvedFilter(e.target.value)}
            className="form-control py-2 px-3 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
          </select>
        </div>
      </div>

      {/* Errors Table */}
      <div className="card-minimal p-0 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-admin-text-muted text-xs">Loading Payment Error logs...</div>
        ) : errors.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="m-0 text-admin-text-primary text-base font-bold">No Payment Errors Recorded</h3>
            <p className="text-admin-text-muted text-xs mt-1">All payment operations and webhooks are operating smoothly.</p>
          </div>
        ) : (
          <div className="data-table-container overflow-x-auto">
            <table className="data-table w-full text-xs">
              <thead>
                <tr>
                  <th>Order &amp; Customer</th>
                  <th>Gateway</th>
                  <th>Error Code &amp; Message</th>
                  <th>Recorded At</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((errLog) => (
                  <tr key={errLog._id}>
                    <td>
                      <div className="font-bold text-admin-text-primary">{errLog.orderId || 'N/A'}</div>
                      <div className="text-[11px] text-admin-text-muted">
                        {errLog.customer?.name || 'Guest'} {errLog.customer?.mobile ? `(${errLog.customer.mobile})` : ''}
                      </div>
                    </td>

                    <td>
                      <span className={`font-bold py-1 px-2.5 rounded-md text-[11px] ${
                        errLog.gateway === 'Cashfree' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {errLog.gateway}
                      </span>
                    </td>

                    <td className="max-w-xs">
                      <div className="font-semibold text-rose-600 dark:text-rose-400">{errLog.errorCode}</div>
                      <div className="text-[11px] text-admin-text-secondary truncate">
                        {errLog.errorMessage}
                      </div>
                    </td>

                    <td className="text-[11px] text-admin-text-muted">
                      {new Date(errLog.createdAt).toLocaleString()}
                    </td>

                    <td>
                      <span className={`font-bold py-1 px-2.5 rounded-full text-[11px] ${
                        errLog.resolved
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      }`}>
                        {errLog.resolved ? '✓ Resolved' : '● Unresolved'}
                      </span>
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(errLog)}
                        className="btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1.5"
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ERROR DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Payment Error Detail: ${selectedError?.orderId || ''}`}
        variant="drawer"
        width="700px"
      >
        {selectedError && (
          <div className="flex flex-col gap-5">
            {/* Header info box */}
            <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-900">
              <div className="text-sm font-bold text-rose-800 dark:text-rose-300">
                [{selectedError.gateway}] {selectedError.errorCode}
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                {selectedError.errorMessage}
              </div>
            </div>

            {/* Error JSON Payload Blocks */}
            {selectedError.apiResponse && (
              <div>
                <h4 className="text-xs font-bold mb-1.5 text-admin-text-primary">API / SDK Response Payload</h4>
                <pre className="bg-slate-900 text-sky-400 p-3.5 rounded-xl text-xs overflow-x-auto">
                  {JSON.stringify(selectedError.apiResponse, null, 2)}
                </pre>
              </div>
            )}

            {selectedError.webhookPayload && (
              <div>
                <h4 className="text-xs font-bold mb-1.5 text-admin-text-primary">Webhook Raw Payload</h4>
                <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs overflow-x-auto">
                  {JSON.stringify(selectedError.webhookPayload, null, 2)}
                </pre>
              </div>
            )}

            {selectedError.stackTrace && (
              <div>
                <h4 className="text-xs font-bold mb-1.5 text-admin-text-primary">Stack Trace</h4>
                <pre className="bg-slate-900 text-rose-400 p-3.5 rounded-xl text-[11px] overflow-x-auto">
                  {selectedError.stackTrace}
                </pre>
              </div>
            )}

            {/* Resolution Section */}
            <div className="bg-admin-subtle p-4 rounded-xl border border-admin-border">
              <h4 className="text-xs font-bold mb-2 text-admin-text-primary">
                Resolution Management
              </h4>

              {selectedError.resolved ? (
                <div className="text-emerald-600 text-xs font-semibold">
                  ✓ Resolved by {selectedError.resolvedBy || 'Admin'} at {new Date(selectedError.resolvedAt).toLocaleString()}
                </div>
              ) : (
                <div>
                  <textarea
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="Enter resolution notes (e.g. Customer retried successfully, refund issued manually)..."
                    className="form-control w-full h-20 p-2.5 text-xs mb-3"
                  />

                  <button
                    type="button"
                    onClick={handleMarkResolved}
                    className="btn-primary py-2 px-5 font-bold text-xs"
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentErrors;
