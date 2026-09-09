import React from 'react';
import OrderDetailDrawer from './OrderDetailDrawer';

const OrderDetailView = ({ order, onBack, onOrderUpdated, isOpen = true, onClose }) => {
  if (!order) return null;

  return (
    <OrderDetailDrawer
      isOpen={isOpen}
      onClose={onClose || onBack}
      order={order}
      onOrderUpdated={onOrderUpdated}
    />
  );
};

export default OrderDetailView;
