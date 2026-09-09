import React, { useState, useEffect } from 'react';
import { Save, Package, AlertTriangle, Check, AlertOctagon } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Timeline from './Timeline';
import Modal from '../Common/Modal';

const DEFAULT_ORDER_STATUS_OPTIONS = [
  'Received', 'Processing', 'Shipped', 'Delivered', 'Cancelled',
  'Return Requested', 'Returned', 'Refund Initiated', 'Refunded'
];

const ALLOWED_TRANSITIONS = {
  PENDING_PAYMENT: ['Received', 'PAYMENT_EXPIRED', 'Cancelled'],
  Received: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: ['Return Requested'],
  'Return Requested': ['Returned', 'Cancelled'],
  Returned: ['Refund Initiated'],
  'Refund Initiated': ['Refunded', 'Cancelled'],
  Refunded: [],
  Cancelled: ['Refund Initiated'],
  PAYMENT_EXPIRED: ['Cancelled'],
  DELETED: [],
};

const StatusTab = ({ order, onStatusUpdated }) => {
  if (!order) return null;

  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'Pending');
  const [orderStatus, setOrderStatus] = useState(order.orderStatus || 'Received');
  const [statusOptions, setStatusOptions] = useState(DEFAULT_ORDER_STATUS_OPTIONS);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Cancellation Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    setPaymentStatus(order.paymentStatus || 'Pending');
    setOrderStatus(order.orderStatus || 'Received');
    setStatusError('');
  }, [order]);

  useEffect(() => {
    fetchDynamicFlow();
  }, []);

  const fetchDynamicFlow = async () => {
    try {
      const res = await api.get('/orders/order-flow').catch(() => api.get('/order-flow'));
      if (res.data && res.data.steps && res.data.steps.length > 0) {
        const dynamicKeys = res.data.steps.map(s => s.key);
        const filtered = DEFAULT_ORDER_STATUS_OPTIONS.filter(st => dynamicKeys.includes(st));
        setStatusOptions(filtered.length > 0 ? filtered : DEFAULT_ORDER_STATUS_OPTIONS);
      }
    } catch (err) {
      console.warn('Using default order status options');
      setStatusOptions(DEFAULT_ORDER_STATUS_OPTIONS);
    }
  };

  const handleStatusSelectChange = (newStatus) => {
    setOrderStatus(newStatus);
    setStatusError('');
    const currentSt = order.orderStatus || 'Received';
    if (newStatus !== currentSt) {
      const allowed = ALLOWED_TRANSITIONS[currentSt] || [];
      if (!allowed.includes(newStatus)) {
        setStatusError(`Invalid status transition from '${currentSt}' to '${newStatus}'.`);
      }
    }

    if (newStatus === 'Cancelled') {
      setCancelReasonText(order.cancellationReason || '');
      setCancelError('');
      setIsCancelModalOpen(true);
    }
  };

  const handleStatusChangeClick = () => {
    if (orderStatus === 'Cancelled') {
      setCancelError('');
      setIsCancelModalOpen(true);
      return;
    }
    executeOrderStatusUpdate();
  };

  const executeOrderStatusUpdate = async (reasonOverride) => {
    setSavingOrder(true);
    setStatusError('');
    try {
      const targetId = order.id || order._id;
      const payload = { orderStatus };
      if (orderStatus === 'Cancelled' && reasonOverride) {
        payload.reason = reasonOverride;
        payload.notes = `Order cancelled by admin. Reason: ${reasonOverride}`;
      }
      const res = await api.patch(`/orders/${targetId}/status`, payload);
      showToast(`Order status updated to '${orderStatus}'`, 'success');
      if (onStatusUpdated) {
        onStatusUpdated(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update order status';
      setStatusError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleConfirmCancellation = async (e) => {
    if (e) e.preventDefault();
    const trimmed = cancelReasonText.trim();
    if (!trimmed) {
      setCancelError('Please select or type a cancellation reason before proceeding.');
      return;
    }
    setSubmittingCancel(true);
    try {
      const targetId = order.id || order._id;
      const res = await api.patch(`/orders/${targetId}/status`, {
        orderStatus: 'Cancelled',
        reason: trimmed,
        notes: `Order cancelled by admin. Reason: ${trimmed}`
      });
      showToast(`Order cancelled successfully`, 'success');
      setIsCancelModalOpen(false);
      if (onStatusUpdated) {
        onStatusUpdated(res.data);
      }
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const items = order.items && order.items.length > 0 ? order.items : [];

  return (
    <div className="flex flex-col gap-7">
      {/* Cancellation Notice Banner */}
      {(order.orderStatus === 'Cancelled' || order.cancellationReason) && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-5 text-rose-600 flex flex-col gap-1.5">
          <div className="font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
            <AlertTriangle size={18} className="text-rose-500" /> Order Cancelled Information
          </div>
          {order.cancelledAt && (
            <div className="text-xs text-admin-text-secondary">
              Cancelled Date: <strong>{new Date(order.cancelledAt).toLocaleString()}</strong> {order.cancelledBy ? ` • Cancelled By: ${order.cancelledBy}` : ''}
            </div>
          )}
          {order.cancellationReason && (
            <div className="text-xs text-admin-text-primary mt-1 p-2.5 px-3.5 bg-admin-card rounded-lg border-l-4 border-rose-500">
              <strong>Cancellation Reason:</strong> {order.cancellationReason}
            </div>
          )}
        </div>
      )}

      {/* Change Order Status */}
      <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border flex flex-col gap-4">
        <div className="font-bold text-sm text-admin-text-primary flex items-center gap-2">
          <Package size={16} className="text-admin-accent" /> Change Order Status
        </div>

        <div className="flex gap-2.5">
          <select
            className={`form-control flex-1 text-xs ${statusError ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20' : ''}`}
            value={orderStatus}
            onChange={(e) => handleStatusSelectChange(e.target.value)}
          >
            {statusOptions.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStatusChangeClick}
            disabled={savingOrder || (statusError && statusError.length > 0)}
            className="btn-primary flex items-center gap-1.5 py-2 px-5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={14} /> {savingOrder ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Invalid Transition Warning */}
        {statusError && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4 md:px-5 text-admin-text-primary flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
              <AlertOctagon size={18} />
              <span>Invalid Status Transition Rule</span>
            </div>
            
            <div className="text-xs text-admin-text-secondary leading-relaxed">
              {statusError}
            </div>

            {/* Permitted transition chips */}
            {(() => {
              const currentSt = order.orderStatus || 'Received';
              const allowed = ALLOWED_TRANSITIONS[currentSt] || [];
              return (
                <div className="mt-1">
                  <div className="text-[11px] font-bold text-admin-text-muted mb-1.5">
                    Permitted transitions from '{currentSt}':
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allowed.length === 0 ? (
                      <span className="text-xs text-rose-500 italic">
                        None (Terminal order state reached)
                      </span>
                    ) : (
                      allowed.map(targetSt => (
                        <button
                          key={targetSt}
                          type="button"
                          onClick={() => {
                            setOrderStatus(targetSt);
                            setStatusError('');
                          }}
                          className="text-xs py-1 px-2.5 rounded-full border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                        >
                          <Check size={12} /> {targetSt}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Product Status Breakdown */}
      <div className="bg-admin-subtle rounded-xl border border-admin-border overflow-hidden">
        <div className="p-4 px-5 border-b border-admin-border font-bold text-sm text-admin-text-primary">
          Product Status Breakdown
        </div>

        <div className="data-table-container">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Variant</th>
                <th>Size</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Current Status</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="8" className="text-center p-6 text-admin-text-muted">No products found</td></tr>
              ) : (
                items.map((item, idx) => {
                  const itemName = item.productName || item.name || item.title || item.product?.name || 'Product';
                  const itemVariant = item.variant || item.variantName || item.attributes?.variant || item.attributes?.grade || item.attributes?.purity || item.purity || item.metalColor || 'Standard';
                  const itemSize = item.size || item.variantSize || item.attributes?.size || 'Standard';
                  const qty = Number(item.quantity || item.qty || 1);
                  const lineTotal = Number(item.totalPrice || item.amount || 0);
                  const unitPrice = Number(item.unitPrice || item.sellingPrice || item.price || (lineTotal > 0 ? lineTotal / qty : 0));
                  const amount = lineTotal > 0 ? lineTotal : unitPrice * qty;

                  return (
                    <tr key={item.id || item._id || item.productId || idx}>
                      <td className="font-semibold text-admin-text-primary">{itemName}</td>
                      <td>{itemVariant}</td>
                      <td>{itemSize}</td>
                      <td>₹{unitPrice.toLocaleString('en-IN')}</td>
                      <td className="font-bold">{qty}</td>
                      <td className="font-bold text-admin-accent">₹{amount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${order.orderStatus === 'Cancelled' ? 'badge-danger' : 'badge-accent'}`}>
                          {order.orderStatus || 'Received'}
                        </span>
                      </td>
                      <td className="text-[11px] text-admin-text-muted">
                        {new Date(order.updatedAt || order.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise Order & Payment Timeline */}
      <Timeline order={order} />

      {/* Custom Admin Cancellation Reason Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setOrderStatus(order.orderStatus || 'Received');
        }}
        title={`Cancel Order #${order.orderNo || order.orderId}`}
        width="520px"
      >
        <form onSubmit={handleConfirmCancellation} className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg text-xs">
            <AlertTriangle size={20} className="shrink-0" />
            <span>Cancelling an order will restore item stock back to inventory and cannot be undone.</span>
          </div>

          <div>
            <label className="form-label text-xs font-bold mb-1.5 block">
              Cancellation Notes / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              className={`form-control w-full p-2.5 rounded-lg text-xs resize-y ${
                cancelError ? 'border-rose-500' : ''
              }`}
              rows={3}
              placeholder="Provide a detailed cancellation reason for the customer and audit log..."
              value={cancelReasonText}
              onChange={(e) => {
                setCancelReasonText(e.target.value);
                setCancelError('');
              }}
            />
            {cancelError && (
              <div className="text-rose-500 text-[11px] mt-1 font-semibold">
                {cancelError}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCancelModalOpen(false);
                setOrderStatus(order.orderStatus || 'Received');
              }}
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={submittingCancel}
              className="btn-danger flex items-center gap-1.5 py-2 px-5 font-bold text-xs disabled:opacity-70"
            >
              {submittingCancel ? 'Processing...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StatusTab;
