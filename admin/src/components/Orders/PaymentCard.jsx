import React from 'react';
import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { resolveRazorpayError } from '../../utils/razorpayErrorDictionary';

const PaymentCard = ({ order }) => {
  if (!order) return null;

  const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success';
  const isSandbox = (order.gatewayMode || order.environment || 'TEST').toUpperCase() !== 'PRODUCTION';

  return (
    <div className="bg-admin-subtle rounded-xl p-5 border border-admin-border flex flex-col gap-3.5 text-xs">
      <div className="font-bold text-sm text-admin-text-primary flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CreditCard size={16} className="text-blue-500" /> Payment Diagnostics & Gateway Info
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-admin-text-secondary">
        <div>
          <span className="text-admin-text-muted block">Gateway Name</span>
          <strong className="text-admin-text-primary">{order.paymentGateway || 'N/A'}</strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Payment Method</span>
          <strong className="text-admin-text-primary">{order.paymentMethod || 'N/A'}</strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Payment ID</span>
          <span className="font-mono font-bold text-admin-text-primary">
            {order.gatewayPaymentId || order.transactionId || 'N/A'}
          </span>
        </div>

        <div>
          <span className="text-admin-text-muted block">Gateway Order ID</span>
          <span className="font-mono font-bold text-admin-text-primary">
            {order.gatewayOrderId || order.razorpayOrderId || 'N/A'}
          </span>
        </div>

        <div>
          <span className="text-admin-text-muted block">Signature Verification</span>
          <strong className={`flex items-center gap-1 ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
            {isPaid ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            {isPaid ? 'Verified Valid' : 'Pending / Unverified'}
          </strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Webhook Status</span>
          <strong className={order.webhookReceived ? 'text-emerald-500' : 'text-admin-text-primary'}>
            {order.webhookReceived ? 'Received & Processed' : 'Standard API Direct'}
          </strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Paid Timestamp</span>
          <span>{order.paidAt ? new Date(order.paidAt).toLocaleString() : (isPaid ? new Date(order.updatedAt || order.createdAt).toLocaleString() : 'Not Paid')}</span>
        </div>

        <div>
          <span className="text-admin-text-muted block">Payment Attempts</span>
          <strong className="text-admin-text-primary">{order.paymentAttempts || 1} Attempt(s)</strong>
        </div>
      </div>

      {(() => {
        const rawReason =
          order.failureReason ||
          order.lastGatewayResponse?.errorMessage ||
          order.lastGatewayResponse?.reason ||
          order.lastGatewayResponse?.error?.description ||
          (Array.isArray(order.paymentTimeline) && order.paymentTimeline.find(t => t.payload?.errorMessage || t.payload?.reason)?.payload?.errorMessage) ||
          (Array.isArray(order.paymentTimeline) && order.paymentTimeline.find(t => t.payload?.errorMessage || t.payload?.reason)?.payload?.reason);

        if (!rawReason && isPaid) return null;

        const errorDiag = resolveRazorpayError(rawReason || (order.paymentStatus === 'Failed' ? 'payment_failed' : ''));
        const src = errorDiag.sourceInfo;

        return (
          <div
            className="bg-admin-card rounded-xl p-3.5 md:p-4 flex flex-col gap-2 text-xs"
            style={{ border: `1px solid ${src.borderColor}` }}
          >
            <div className="flex justify-between items-center">
              <strong className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" /> Failure Reason:
              </strong>
              <span
                className="py-0.5 px-2 rounded font-bold text-[11px]"
                style={{
                  backgroundColor: src.badgeBg,
                  color: src.badgeColor,
                  border: `1px solid ${src.borderColor}`,
                }}
              >
                Source: {src.badge} ({src.actor})
              </span>
            </div>

            <div className="font-bold text-admin-text-primary text-sm">
              {errorDiag.rawMessage}
            </div>

            <div className="text-admin-text-secondary leading-relaxed">
              <strong>Description:</strong> {errorDiag.description}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 py-1.5 px-2.5 rounded text-admin-text-primary mt-0.5">
              <strong className="text-emerald-700 dark:text-emerald-300">Next Steps:</strong> {errorDiag.nextSteps}
            </div>
          </div>
        );
      })()}

      {/* Detailed Log Trail */}
      {Array.isArray(order.paymentTimeline) && order.paymentTimeline.length > 0 && (
        <div className="mt-2 pt-3 border-t border-dashed border-admin-border">
          <div className="font-bold text-xs mb-2 text-admin-text-primary">
            Detailed Log Trail ({order.paymentTimeline.length} events)
          </div>
          <div className="flex flex-col gap-1.5">
            {order.paymentTimeline.map((item, idx) => {
              const isSuccess = item.status === 'SUCCESS' || item.status === 'Paid' || item.status === 'Success';
              const isCancel = item.status === 'CANCELLED' || item.status === 'Cancelled' || item.event === 'PAYMENT_CANCELLED_BY_USER';
              const statusClass = isSuccess ? 'text-emerald-500' : isCancel ? 'text-rose-500' : 'text-amber-500';

              return (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-center bg-admin-card p-1.5 px-2.5 rounded-md border border-admin-border text-xs"
                >
                  <div>
                    <span className={`font-extrabold mr-2 ${statusClass}`}>
                      {item.status || item.event || 'LOG'}
                    </span>
                    <span className="text-admin-text-muted">— {item.event ? item.event.replace(/_/g, ' ') : 'System log recorded'}</span>
                    {(item.payload?.errorMessage || item.payload?.reason) && (
                      <div className="text-rose-700 dark:text-rose-400 text-[11px] mt-0.5 font-semibold">
                        Reason: {item.payload.errorMessage || item.payload.reason}
                      </div>
                    )}
                  </div>
                  <span className="text-admin-text-muted text-[11px]">
                    {new Date(item.createdAt || Date.now()).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCard;
