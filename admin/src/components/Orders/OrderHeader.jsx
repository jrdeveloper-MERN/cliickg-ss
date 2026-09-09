import React from 'react';
import { Calendar, FileText } from 'lucide-react';

const OrderHeader = ({ order }) => {
  if (!order) return null;

  const paymentStatus = order.paymentStatus || 'Pending';
  const orderStatus = order.orderStatus || 'Received';

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case 'Paid':
      case 'Success': return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300';
      case 'Failed':
      case 'Failure': return 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400';
      case 'Cancelled': return 'bg-slate-100 dark:bg-neutral-800 text-slate-500';
      case 'Refunded':
      case 'Partially Refunded': return 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300';
      case 'Initiated':
      case 'Processing': return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      default: return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
    }
  };

  const getOrderBadgeClass = (status) => {
    switch (status) {
      case 'Delivered':
      case 'Completed': return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300';
      case 'Shipped': return 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300';
      case 'Processing': return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      case 'Return Requested': return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      case 'Refund Initiated': return 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300';
      case 'Cancelled': return 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400';
      case 'Returned': return 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400';
      case 'Refunded': return 'bg-slate-100 dark:bg-neutral-800 text-slate-500';
      case 'Received':
      default: return 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="bg-admin-subtle rounded-xl p-4 md:px-5 border border-admin-border flex flex-col gap-2 shadow-xs">
      {/* Top Banner Row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-extrabold text-admin-text-primary m-0">
              Order #{order.orderNo || order.orderId}
            </h2>
            <span className={`font-bold text-xs py-0.5 px-2.5 rounded-full ${getOrderBadgeClass(orderStatus)}`}>
              {orderStatus}
            </span>
            <span className={`font-bold text-xs py-0.5 px-2.5 rounded-full ${getPaymentBadgeClass(paymentStatus)}`}>
              Payment: {paymentStatus}
            </span>
          </div>

          <div className="flex items-center gap-3.5 mt-1.5 text-xs text-admin-text-muted flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {new Date(order.orderDate || order.createdAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <FileText size={13} /> Invoice: {order.invoiceNo || 'INV-Pending'}
            </span>
          </div>
        </div>

        {/* Grand Total Amount Badge */}
        <div className="text-right">
          <div className="text-[11px] text-admin-text-muted uppercase tracking-wider font-semibold">Grand Total</div>
          <div className="text-2xl font-extrabold text-admin-accent">
            ₹{Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Payment Failure Reason Banner (ONLY shown if paymentStatus === 'Failed') */}
      {(() => {
        if (order.paymentStatus !== 'Failed') return null;

        const dynamicReason =
          order.failureReason ||
          order.lastGatewayResponse?.errorMessage ||
          order.lastGatewayResponse?.reason ||
          order.lastGatewayResponse?.error?.description ||
          (Array.isArray(order.paymentTimeline) && order.paymentTimeline.find(t => t.payload?.errorMessage || t.payload?.reason)?.payload?.errorMessage) ||
          (Array.isArray(order.paymentTimeline) && order.paymentTimeline.find(t => t.payload?.errorMessage || t.payload?.reason)?.payload?.reason);

        const isCancelNote = dynamicReason?.toLowerCase()?.includes('sorry') || dynamicReason?.toLowerCase()?.includes('cancel') || dynamicReason?.toLowerCase()?.includes('stock');

        if (!dynamicReason || isCancelNote || dynamicReason === 'NA' || dynamicReason === 'N/A' || dynamicReason === 'undefined') return null;

        return (
          <div className="bg-admin-card border border-admin-border rounded-lg p-2 px-3.5 mt-1.5 text-admin-text-secondary text-xs flex items-center gap-2">
            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 py-0.5 px-2 rounded font-bold text-[11px]">
              Payment Failed
            </span>
            <span className="text-admin-text-primary font-semibold">{dynamicReason}</span>
          </div>
        );
      })()}
    </div>
  );
};

export default OrderHeader;
