import React, { useState } from 'react';
import Modal from '../Common/Modal';
import OrderHeader from './OrderHeader';
import ShippingTab from './ShippingTab';
import StatusTab from './StatusTab';
import PODTab from './PODTab';
import PaymentTab from './PaymentTab';
import PriceBreakupModal from './PriceBreakupModal';
import { Download, Printer, Truck, Package, ShieldCheck, CreditCard } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const OrderDetailDrawer = ({ isOpen, onClose, order, onOrderUpdated }) => {
  if (!order) return null;

  const [activeTab, setActiveTab] = useState('shipping');
  const [selectedItemForBreakup, setSelectedItemForBreakup] = useState(null);
  const [isBreakupOpen, setIsBreakupOpen] = useState(false);
  const { showToast } = useToast();

  const handleOpenBreakup = (item) => {
    setSelectedItemForBreakup(item);
    setIsBreakupOpen(true);
  };

  const handleDownloadInvoice = async () => {
    try {
      showToast('Generating invoice PDF...', 'info');
      const orderId = order.id || order._id || order.orderNo || order.orderId;
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${order.invoiceNo || order.orderNo || order.orderId || order._id || order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Invoice downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download invoice PDF', 'error');
    }
  };

  const handlePrintInvoice = async () => {
    try {
      showToast('Opening invoice for printing...', 'info');
      const orderId = order.id || order._id || order.orderNo || order.orderId;
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        showToast('Please allow popups to open invoice print tab', 'error');
      }
    } catch (err) {
      showToast('Failed to generate invoice for printing', 'error');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={` Order Details — ${order.orderNo || order.orderId}`}
        variant="drawer"
        width="85vw"
      >
        <div className="flex flex-col gap-7 pb-8">
          {/* Action Buttons Toolbar - 4 Tabs */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('shipping')}
                className={`flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === 'shipping'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                <Package size={15} /> Shipping Format
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === 'status'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                <ShieldCheck size={15} /> Status
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pod')}
                className={`flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === 'pod'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                <Truck size={15} /> POD &amp; Dispatch
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payment')}
                className={`flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-md cursor-pointer transition-colors ${
                  activeTab === 'payment'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                <CreditCard size={15} /> Payment Status
              </button>
            </div>

            {/* Right Invoice Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Download size={14} /> Download Invoice
              </button>

              <button
                type="button"
                onClick={handlePrintInvoice}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Printer size={14} /> Print Invoice
              </button>
            </div>
          </div>

          {/* Top Order Header Card (Hidden on Shipping Format tab) */}
          {activeTab !== 'shipping' && <OrderHeader order={order} />}

          {/* Active Tab Content */}
          <div>
            {activeTab === 'shipping' && (
              <ShippingTab order={order} onOpenPriceBreakup={handleOpenBreakup} />
            )}

            {activeTab === 'status' && (
              <StatusTab order={order} onStatusUpdated={onOrderUpdated} />
            )}

            {activeTab === 'pod' && (
              <PODTab order={order} onCourierUpdated={onOrderUpdated} />
            )}

            {activeTab === 'payment' && (
              <PaymentTab order={order} onPaymentUpdated={onOrderUpdated} />
            )}
          </div>
        </div>
      </Modal>

      {/* Price Breakup Modal */}
      <PriceBreakupModal
        isOpen={isBreakupOpen}
        onClose={() => setIsBreakupOpen(false)}
        item={selectedItemForBreakup}
        order={order}
      />
    </>
  );
};

export default OrderDetailDrawer;
