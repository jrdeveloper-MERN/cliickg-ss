import React, { useState, useEffect } from 'react';
import { CreditCard, Save, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { resolveRazorpayError, getPaymentInstrumentDetails } from '../../utils/razorpayErrorDictionary';

const PAYMENT_STATUS_OPTIONS = [
  'Pending', 'Initiated', 'Processing', 'Success', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'
];

const PaymentTab = ({ order, onPaymentUpdated }) => {
  if (!order) return null;

  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'Pending');
  const [savingPayment, setSavingPayment] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setPaymentStatus(order.paymentStatus || 'Pending');
  }, [order]);

  const handleUpdatePaymentStatus = async () => {
    setSavingPayment(true);
    try {
      const res = await api.patch(`/orders/${order._id || order.id}/payment-status`, { paymentStatus });
      showToast(`Payment status updated to '${paymentStatus}'`, 'success');
      if (onPaymentUpdated) {
        onPaymentUpdated(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const grandTotal = Number(order.total || order.totalAmount || 0);
  const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success';
  const isFailed = order.paymentStatus === 'Failed' || order.paymentStatus === 'Cancelled';
  const paidAmount = isPaid ? grandTotal : Number(order.amountPaid || 0);
  const isSandbox = (order.gatewayMode || order.environment || 'TEST').toUpperCase() !== 'PRODUCTION';

  const timeline = Array.isArray(order.paymentTimeline) ? order.paymentTimeline : [];

  const instrument = getPaymentInstrumentDetails(order);

  const rawFailure = (isFailed || order.paymentStatus === 'Failed') ? (order.failureReason || (timeline.find(t => t.payload?.errorMessage || t.payload?.reason || t.errorReason)?.payload?.errorMessage) || (timeline.find(t => t.payload?.errorMessage || t.payload?.reason || t.errorReason)?.payload?.reason) || 'payment_failed') : '';
  
  const isCancelReasonNote = rawFailure.toLowerCase().includes('sorry') || rawFailure.toLowerCase().includes('cancel') || rawFailure.toLowerCase().includes('stock');

  const hasFailure = Boolean(rawFailure && !isCancelReasonNote && rawFailure !== 'NA' && rawFailure !== 'N/A' && rawFailure !== 'undefined');
  const resolvedFailure = hasFailure ? resolveRazorpayError(rawFailure, order.customerName) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* TOP GRID: Payment Gateway & Instrument Card + Customer & Status Control Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. PAYMENT GATEWAY & INSTRUMENT SUMMARY */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border flex flex-col gap-3.5">
          <div className="font-bold text-sm text-admin-text-primary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-blue-500" /> Payment &amp; Instrument Summary
            </div>
            <span
              className={`text-[11px] py-0.5 px-2 rounded font-extrabold ${
                isSandbox
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {isSandbox ? 'SANDBOX / TEST' : 'PRODUCTION'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-admin-text-muted block text-[11px]">Payment Status</span>
              <span
                className={`badge mt-0.5 inline-block ${
                  isPaid ? 'badge-success' : (isFailed ? 'badge-danger' : 'badge-warning')
                }`}
              >
                {order.paymentStatus || 'Pending'}
              </span>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Gateway Provider</span>
              <strong className="text-admin-text-primary">{order.paymentGateway || 'Razorpay'}</strong>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Payment Method</span>
              <span
                className="font-bold py-0.5 px-1.5 rounded text-xs inline-block mt-0.5"
                style={{
                  backgroundColor: instrument.badgeColor + '15',
                  color: instrument.badgeColor,
                }}
              >
                {instrument.methodLabel}
              </span>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Payment / Txn ID</span>
              <span className="font-mono text-xs font-bold text-admin-text-primary">
                {order.paymentId || order.gatewayPaymentId || order.transactionId || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Gateway Order ID</span>
              <span className="font-mono text-xs">{order.razorpayOrderId || order.gatewayOrderId || 'N/A'}</span>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Paid Timestamp</span>
              <span>{order.paidAt ? new Date(order.paidAt).toLocaleString() : (isPaid ? new Date(order.updatedAt || order.createdAt).toLocaleString() : 'Not Paid')}</span>
            </div>

            {instrument.details.map((dt, i) => (
              <div key={i}>
                <span className="text-admin-text-muted block text-[11px]">{dt.label}</span>
                <strong className="text-admin-text-primary text-xs">{dt.value}</strong>
              </div>
            ))}

            <div>
              <span className="text-admin-text-muted block text-[11px]">Paid Amount / Total</span>
              <strong className={isPaid ? 'text-emerald-500' : 'text-admin-text-primary'}>
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div>
              <span className="text-admin-text-muted block text-[11px]">Attempts Made</span>
              <strong>{timeline.length || order.paymentAttempts || 1} Attempt(s)</strong>
            </div>
          </div>

          {/* Render Failure Diagnostics Card */}
          {resolvedFailure && !isPaid && (
            <div
              className="rounded-lg p-2.5 px-3 text-xs mt-1.5"
              style={{
                backgroundColor: resolvedFailure.sourceInfo.badgeBg,
                border: `1px solid ${resolvedFailure.sourceInfo.borderColor}`,
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <strong className="flex items-center gap-1" style={{ color: resolvedFailure.sourceInfo.badgeColor }}>
                  <AlertTriangle size={14} color={resolvedFailure.sourceInfo.badgeColor} /> Original Failure Reason:
                </strong>
                <span
                  className="text-[11px] font-bold py-0.5 px-1.5 rounded bg-white"
                  style={{
                    color: resolvedFailure.sourceInfo.badgeColor,
                    border: `1px solid ${resolvedFailure.sourceInfo.borderColor}`,
                  }}
                >
                  Source: {resolvedFailure.sourceInfo.badge} ({resolvedFailure.sourceInfo.actor})
                </span>
              </div>
              <div className="font-bold text-admin-text-primary mb-0.5">
                {resolvedFailure.rawMessage}
              </div>
              <div className="text-admin-text-secondary text-[11px] leading-relaxed mb-1">
                <strong>Description:</strong> {resolvedFailure.description}
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 py-1 px-2 rounded text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                <strong>Next Steps:</strong> {resolvedFailure.nextSteps}
              </div>
            </div>
          )}
        </div>

        {/* 2. AUTHORIZED PAYMENT STATUS CONTROL & CUSTOMER INFO */}
        <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border flex flex-col gap-5">
          <div className="font-bold text-sm text-admin-text-primary flex items-center gap-2">
            <ShieldCheck size={16} className="text-admin-accent" /> Authorized Payment Status Control
          </div>

          <div className="flex flex-col gap-2 text-xs bg-admin-card p-2.5 px-3 rounded-lg border border-admin-border">
            <div className="flex justify-between">
              <span className="text-admin-text-muted">Customer Name:</span>
              <strong className="text-admin-text-primary">{order.customerName || 'Customer'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-text-muted">Contact Mobile:</span>
              <strong>{order.mobile || 'N/A'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-text-muted">Email Address:</span>
              <span>{order.email || 'N/A'}</span>
            </div>
          </div>

          <p className="text-xs text-admin-text-muted m-0">
            Modify payment state using authorized backend gateway status updates.
          </p>

          <div className="flex gap-2.5 mt-auto">
            <select
              className="form-control flex-1 text-xs"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleUpdatePaymentStatus}
              disabled={savingPayment}
              className="btn-primary flex items-center gap-1.5 py-2 px-5 text-xs"
            >
              <Save size={14} /> {savingPayment ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. PAYMENT ATTEMPT HISTORY & EVENT TIMELINE */}
      <div className="bg-admin-subtle rounded-xl border border-admin-border p-5">
        <div className="font-bold text-sm text-admin-text-primary mb-4 flex items-center gap-2">
          <Clock size={16} className="text-admin-accent" /> Payment Attempt History &amp; Event Timeline ({timeline.length} Event{timeline.length > 1 ? 's' : ''})
        </div>

        {timeline.length === 0 ? (
          <div className="p-6 text-center text-admin-text-muted text-xs">
            No payment attempt history recorded yet for this order.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {timeline.map((evt, idx) => {
              const statusStr = (evt.status || evt.event || 'INITIATED').toUpperCase();
              const isEvtSuccess = statusStr === 'PAID' || statusStr === 'SUCCESS' || statusStr === 'PAYMENT_SUCCESS';
              const isEvtFailed = statusStr === 'FAILED' || statusStr === 'CANCELLED' || statusStr === 'PAYMENT_FAILED';

              const badgeBg = isEvtSuccess ? 'bg-emerald-50 dark:bg-emerald-950/30' : (isEvtFailed ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-blue-50 dark:bg-blue-950/30');
              const badgeColor = isEvtSuccess ? 'bg-emerald-700 text-white' : (isEvtFailed ? 'bg-rose-700 text-white' : 'bg-blue-700 text-white');
              const borderColor = isEvtSuccess ? 'border-emerald-300 dark:border-emerald-900' : (isEvtFailed ? 'border-rose-300 dark:border-rose-900' : 'border-blue-300 dark:border-blue-900');

              const rawErr = evt.errorReason || evt.payload?.reason || evt.payload?.errorMessage;
              const errDiag = (isEvtFailed && rawErr && rawErr !== 'NA' && rawErr !== 'N/A') ? resolveRazorpayError(rawErr, order.customerName) : null;

              return (
                <div
                  key={evt._id || evt.id || idx}
                  className={`border rounded-lg p-2.5 px-3.5 flex flex-col gap-1.5 text-xs ${badgeBg} ${borderColor}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className={`font-extrabold text-[11px] py-0.5 px-2 rounded ${badgeColor}`}>
                        {statusStr}
                      </span>
                      <strong className="text-admin-text-primary">{evt.event ? evt.event.replace(/_/g, ' ') : statusStr}</strong>
                      {evt.gateway && <span className="text-[11px] text-admin-text-muted">({evt.gateway})</span>}
                    </div>

                    <div className="text-[11px] text-admin-text-muted">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>

                  {errDiag && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 border-t border-dashed border-admin-border pt-1">
                      <strong>Reason:</strong> {errDiag.rawMessage}
                      {errDiag.description && <span className="ml-1.5 text-admin-text-secondary">— {errDiag.description}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTab;
