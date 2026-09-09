import React from 'react';
import { CheckCircle, Clock, Package, Truck, ShieldCheck, XCircle, RotateCcw, IndianRupee } from 'lucide-react';

const Timeline = ({ order }) => {
  if (!order) return null;

  const status = order.orderStatus || 'Received';
  const statusHistory = order.statusHistory || [];

  const combinedLogs = [
    ...statusHistory.map((h) => {
      let noteText = h.notes || '';
      if (!noteText || noteText === `Order status updated to ${h.status}` || noteText === `Order status set to ${h.status}` || noteText === `${h.status} status recorded`) {
        if (h.status === 'Cancelled') noteText = order.cancellationReason ? `Reason: ${order.cancellationReason}` : 'Order cancelled';
        else if (h.status === 'Refund Initiated') noteText = 'Refund process initiated';
        else if (h.status === 'Refunded') noteText = 'Refund completed successfully';
        else if (h.status === 'Received') noteText = 'Order placed by customer';
        else noteText = `Status transitioned to ${h.status}`;
      }
      return {
        title: h.status,
        notes: noteText,
        updatedBy: (h.updatedBy && h.updatedBy !== 'System') ? h.updatedBy : '',
        date: h.createdAt || h.updatedAt,
        type: 'status'
      };
    })
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const getDynamicSteps = () => {
    const steps = [
      { key: 'Received', label: 'Order Received', icon: Clock, color: '#3B82F6' },
    ];

    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Success') {
      steps.push({ key: 'Payment', label: 'Payment Success', icon: ShieldCheck, color: '#10B981' });
    }

    if (status === 'Cancelled') {
      steps.push({ key: 'Cancelled', label: 'Cancelled', icon: XCircle, color: '#EF4444' });
      if (order.paymentStatus === 'Paid' || order.refundStatus === 'Pending' || order.refundStatus === 'Refunded' || statusHistory.some(h => h.status === 'Refund Initiated' || h.status === 'Refunded')) {
        steps.push({ key: 'Refund Initiated', label: 'Refund Initiated', icon: RotateCcw, color: '#F59E0B' });
        steps.push({ key: 'Refunded', label: 'Refund Completed', icon: IndianRupee, color: '#10B981' });
      }
      return steps;
    }

    steps.push({ key: 'Processing', label: 'Processing', icon: Package, color: '#6366F1' });
    steps.push({ key: 'Shipped', label: 'Shipped', icon: Truck, color: '#0284C7' });
    steps.push({ key: 'Delivered', label: 'Delivered', icon: CheckCircle, color: '#16A34A' });

    if (['Return Requested', 'Returned', 'Refund Initiated', 'Refunded'].includes(status) || statusHistory.some(h => ['Return Requested', 'Returned', 'Refund Initiated', 'Refunded'].includes(h.status))) {
      steps.push({ key: 'Return Requested', label: 'Return Requested', icon: RotateCcw, color: '#F59E0B' });
      steps.push({ key: 'Returned', label: 'Returned', icon: Package, color: '#8B5CF6' });
      steps.push({ key: 'Refund Initiated', label: 'Refund Initiated', icon: RotateCcw, color: '#F59E0B' });
      steps.push({ key: 'Refunded', label: 'Refund Completed', icon: IndianRupee, color: '#10B981' });
    }

    return steps;
  };

  const steps = getDynamicSteps();

  const getStepState = (stepKey) => {
    if (stepKey === 'Received') return { isDone: true, isCurrent: status === 'Received' };
    if (stepKey === 'Payment') {
      const isPaid = order.paymentStatus === 'Paid' || order.paymentStatus === 'Success';
      return { isDone: isPaid, isCurrent: false };
    }

    if (status === 'Cancelled') {
      if (stepKey === 'Cancelled') return { isDone: true, isCurrent: true };
      if (stepKey === 'Refund Initiated') {
        const isInit = order.refundStatus === 'Pending' || order.refundStatus === 'Refunded' || statusHistory.some(h => h.status === 'Refund Initiated');
        return { isDone: isInit, isCurrent: statusHistory.some(h => h.status === 'Refund Initiated') };
      }
      if (stepKey === 'Refunded') {
        const isRef = order.refundStatus === 'Refunded' || statusHistory.some(h => h.status === 'Refunded');
        return { isDone: isRef, isCurrent: isRef };
      }
      return { isDone: false, isCurrent: false };
    }

    const orderFlowSequence = ['Received', 'Processing', 'Shipped', 'Delivered', 'Return Requested', 'Returned', 'Refund Initiated', 'Refunded'];
    const currentIdx = orderFlowSequence.indexOf(status);
    const stepIdx = orderFlowSequence.indexOf(stepKey);

    if (stepIdx !== -1 && currentIdx !== -1) {
      return {
        isDone: stepIdx <= currentIdx,
        isCurrent: stepIdx === currentIdx
      };
    }

    return { isDone: false, isCurrent: false };
  };

  return (
    <div className="bg-admin-subtle rounded-2xl p-6 border border-admin-border flex flex-col gap-5">
      <div className="font-bold text-sm text-admin-text-primary flex items-center gap-2">
        <Clock size={16} className="text-admin-accent" /> Dynamic Order & Payment Lifecycle Timeline
      </div>

      {/* Step Bar Visualizer */}
      <div className="flex items-center justify-between relative py-2 overflow-x-auto gap-2">
        {steps.map((step) => {
          const { isDone, isCurrent } = getStepState(step.key);
          const IconComp = step.icon;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center text-center min-w-[95px] relative z-[2] flex-1"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                  isDone
                    ? 'text-white'
                    : 'text-admin-text-muted bg-admin-card'
                } ${
                  isCurrent
                    ? 'border-4'
                    : 'border-2 border-admin-border'
                }`}
                style={{
                  backgroundColor: isDone ? step.color : undefined,
                  borderColor: isCurrent ? step.color : undefined,
                  boxShadow: isCurrent ? `0 0 12px ${step.color}66` : 'none',
                }}
              >
                <IconComp size={16} />
              </div>

              <div
                className={`text-xs leading-tight ${
                  isDone ? 'font-bold text-admin-text-primary' : 'font-medium text-admin-text-muted'
                }`}
              >
                {step.label}
              </div>

              <div className="text-[10px] text-admin-text-muted mt-0.5">
                {isCurrent ? 'Current' : isDone ? 'Completed' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Logs Trail */}
      {combinedLogs.length > 0 && (
        <div className="border-t border-admin-border pt-4 flex flex-col gap-2">
          <div className="text-xs font-bold text-admin-text-muted mb-1">
            Detailed Log Trail ({combinedLogs.length} events recorded)
          </div>
          {combinedLogs.map((ev, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-admin-text-secondary">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ev.title === 'Cancelled'
                      ? 'bg-rose-500'
                      : ev.title.includes('Paid') || ev.title.includes('Delivered') || ev.title.includes('Refunded')
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <strong className="text-admin-text-primary">{ev.title}</strong>
                <span>— {ev.notes}</span>
                {ev.updatedBy && <span className="text-[11px] text-admin-text-muted bg-admin-card py-0.5 px-1.5 rounded">by {ev.updatedBy}</span>}
              </div>
              <span className="text-[11px] text-admin-text-muted whitespace-nowrap">
                {ev.date ? new Date(ev.date).toLocaleString() : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;
