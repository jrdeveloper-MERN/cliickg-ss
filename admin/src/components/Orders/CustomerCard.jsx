import React from 'react';
import { User, ShoppingBag, Award } from 'lucide-react';

const CustomerCard = ({ order }) => {
  if (!order) return null;

  const grandTotal = Number(order.total || 0);

  return (
    <div className="bg-admin-subtle rounded-xl p-5 border border-admin-border flex flex-col gap-3.5 text-xs">
      <div className="font-bold text-sm text-admin-text-primary flex items-center gap-1.5">
        <User size={16} className="text-admin-accent" /> Customer Metrics & Profile
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-admin-text-secondary">
        <div>
          <span className="text-admin-text-muted block">Customer Name</span>
          <strong className="text-admin-text-primary">{order.customerName || 'N/A'}</strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Mobile Number</span>
          <strong className="text-admin-text-primary">{order.mobile || 'N/A'}</strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Email Address</span>
          <span>{order.email || 'customer@.com'}</span>
        </div>

        <div>
          <span className="text-admin-text-muted block">Customer Since</span>
          <span>{new Date(order.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>

        <div>
          <span className="text-admin-text-muted block">Total Orders</span>
          <strong className="text-admin-accent flex items-center gap-1">
            <ShoppingBag size={13} /> {order.customerTotalOrders || 1} Order(s)
          </strong>
        </div>

        <div>
          <span className="text-admin-text-muted block">Lifetime Value (LTV)</span>
          <strong className="text-emerald-500 flex items-center gap-1">
            <Award size={13} /> ₹{((order.customerTotalOrders || 1) * grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
