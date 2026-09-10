'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import orderService from '../../../services/order.service';
import getImageUrl from '../../../utils/image.utils';
import { Order } from '../../../types/orders/order.types';
import ErrorState from '../../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../../utils/error-handler.utils';
import { OrderDetailSkeleton } from '../../../components/ui/Skeleton/Skeleton';
import { Eye, FileText, CheckCircle2, Circle, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function OrderDetailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);

  const [selectedBreakupItem, setSelectedBreakupItem] = useState<any | null>(null);
  const [showPriceBreakupModal, setShowPriceBreakupModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?from=/orders/${id || ''}`);
    }
  }, [user, authLoading, router, id]);

  useEffect(() => {
    if (!id || !user) return;
    fetchOrder();
  }, [id, user]);

  const fetchOrder = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      if (err?.response?.status === 401 || err?.status === 401) {
        router.push(`/login?from=/orders/${id || ''}`);
        return;
      }
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const blob = await orderService.downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order?.orderNumber || (order as any)?.orderNo || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to download invoice PDF.');
    }
  };

  const handleOpenBreakup = (item: any) => {
    setSelectedBreakupItem(item);
    setShowPriceBreakupModal(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-120px)] py-8 pb-16">
        <div className="w-[min(100%-2rem,980px)] mx-auto">
          <OrderDetailSkeleton />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center">
        <ErrorState error={pageError} onRetry={fetchOrder} fullPage />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Order Not Found</h2>
        <Link
          href="/orders"
          className="inline-block bg-primary hover:bg-primary-hover text-white py-2.5 px-6 rounded-md no-underline font-bold text-sm transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const orderNoStr = order.orderNumber || (order as any).orderNo || order.orderId || id;
  const orderDateStr = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const paymentVia = (order as any).paymentMethod || 'Online';
  const paymentStatus = (order as any).paymentStatus || 'Pending';
  const orderStatus = (order.orderStatus || 'Received').trim();
  const upperStatus = orderStatus.toUpperCase();

  const itemsList = order.items || [];
  const subtotalAmt = Number(order.subtotal || order.total || (order as any).subTotal || 0);
  const totalAmt = Number((order as any).totalAmount || order.total || 0);
  const shippingFee = Number((order as any).shippingFee || 0);
  const promoDiscount = Number((order as any).promoDiscount || 0);

  const custName = (order as any).customerName || (order as any).shippingAddress?.fullName || 'Customer';
  const custPhone = (order as any).mobile || (order as any).shippingAddress?.mobile || (order as any).phone || 'N/A';

  let addressText = (order as any).address || '';
  if (!addressText && order.shippingAddress) {
    const sa = order.shippingAddress;
    addressText = `${sa.addressLine1 || ''}, ${sa.city || ''}, ${sa.state || ''} - ${sa.pincode || ''}`;
  }

  const statusHistoryList: any[] = Array.isArray((order as any).statusHistory) ? (order as any).statusHistory : [];
  const shipmentList: any[] = Array.isArray((order as any).shipmentTimeline) ? (order as any).shipmentTimeline : [];

  const formatDate = (dateInput?: any) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const orderedPlacedRecord =
    statusHistoryList.find((h: any) => {
      const s = String(h?.status || '').toUpperCase();
      return s === 'PENDING_PAYMENT' || s === 'RECEIVED';
    }) || statusHistoryList[0];

  const processedRecord = statusHistoryList.find((h: any) => String(h?.status || '').toUpperCase() === 'PROCESSING');
  const shippedRecord =
    shipmentList.find(
      (s: any) => String(s?.status || '').toUpperCase().includes('SHIP') || String(s?.status || '').toUpperCase().includes('TRANSIT')
    ) || statusHistoryList.find((h: any) => String(h?.status || '').toUpperCase() === 'SHIPPED');
  const deliveredRecord = statusHistoryList.find((h: any) => String(h?.status || '').toUpperCase() === 'DELIVERED');
  const refundInitiatedRecord = statusHistoryList.find(
    (h: any) =>
      String(h?.status || '').toUpperCase().includes('REFUND INITIATED') ||
      String(h?.status || '').toUpperCase().includes('REFUND_INITIATED')
  );
  const refundedRecord = statusHistoryList.find((h: any) => String(h?.status || '').toUpperCase() === 'REFUNDED');
  const cancelledRecord = statusHistoryList.find((h: any) => String(h?.status || '').toUpperCase() === 'CANCELLED');

  const isRefunded = upperStatus === 'REFUNDED';
  const isRefundInitiated = upperStatus === 'REFUND INITIATED' || upperStatus === 'REFUND_INITIATED';
  const isCancelled = upperStatus === 'CANCELLED';

  const isProcessed = ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(upperStatus);
  const isShipped = ['SHIPPED', 'DELIVERED'].includes(upperStatus);
  const isDelivered = upperStatus === 'DELIVERED';

  const orderedPlacedDate = formatDate(orderedPlacedRecord?.createdAt || order.createdAt);
  const shippedDate = isShipped
    ? formatDate(shippedRecord?.timestamp || shippedRecord?.createdAt) ||
      formatDate(deliveredRecord?.createdAt) ||
      orderedPlacedDate
    : '';

  const processedDate = isProcessed
    ? formatDate(processedRecord?.createdAt) || shippedDate || orderedPlacedDate
    : '';

  const deliveredDate = isDelivered
    ? formatDate(deliveredRecord?.createdAt) || formatDate((order as any).updatedAt) || shippedDate
    : '';

  const refundInitiatedDate = formatDate(refundInitiatedRecord?.createdAt || (order as any).updatedAt);
  const refundedDate = formatDate(refundedRecord?.createdAt || (order as any).updatedAt);
  const cancelledDate = formatDate(cancelledRecord?.createdAt || (order as any).cancelledAt || (order as any).updatedAt);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-120px)] py-8 pb-16">
      <div className="w-[min(100%-2rem,980px)] mx-auto">
        {/* Back Link */}
        <Link
          href="/orders"
          className="text-xs text-slate-500 hover:text-primary no-underline mb-5 inline-block transition-colors"
        >
          ← Back to Orders
        </Link>

        {/* Main Card Wrapper */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
          {/* Header Title */}
          <div className="flex items-center gap-2.5 mb-6">
            <FileText size={28} className="text-primary" />
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-800 m-0">
              Order View
            </h1>
          </div>

          {/* Sub-Header Banner Box */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 px-5 flex justify-between items-center flex-wrap gap-4 mb-7">
            <div className="text-xs text-slate-600">
              Order No: <strong className="text-slate-900 font-bold">{orderNoStr}</strong>
            </div>
            <div className="text-xs text-slate-600">
              Order Date: <strong className="text-slate-900 font-bold">{orderDateStr}</strong>
            </div>
            <div className="text-xs text-slate-600">
              Via: <strong className="text-slate-900 font-bold">{paymentVia}</strong>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse rounded-lg overflow-hidden text-xs">
              <thead>
                <tr className="bg-primary text-white text-center">
                  <th className="py-3 px-3.5 font-semibold">Image</th>
                  <th className="py-3 px-3.5 font-semibold text-left">Name</th>
                  <th className="py-3 px-3.5 font-semibold">Quantity</th>
                  <th className="py-3 px-3.5 font-semibold">Price</th>
                  <th className="py-3 px-3.5 font-semibold">Payment Status</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                  <th className="py-3 px-3.5 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.map((item: any, idx: number) => {
                  const itemPrice = Number(item.price || item.unitPrice || item.totalPrice || 0);
                  const targetProdId = item.productId || item._id || item.id || '';
                  const productHref = targetProdId ? `/product/${targetProdId}` : '#';

                  return (
                    <tr key={idx} className="border-b border-slate-100 text-center">
                      <td className="p-3">
                        <Link href={productHref} className="inline-block no-underline">
                          <img
                            src={getImageUrl(item.image || item.productImage)}
                            alt={item.name || item.productName || 'Product'}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/uploads/fallbackimg.png';
                            }}
                            className="w-12 h-12 object-cover rounded-md border border-slate-200 cursor-pointer"
                          />
                        </Link>
                      </td>
                      <td className="p-3 text-left font-semibold text-slate-800">
                        <Link href={productHref} className="text-slate-800 hover:text-primary no-underline cursor-pointer">
                          {item.name || item.productName}
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600">{item.quantity}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            ₹{itemPrice.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenBreakup(item)}
                            className="bg-primary hover:bg-primary-hover text-white border-none rounded-full py-0.5 px-2.5 text-[0.72rem] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                            title="View Price Breakup"
                          >
                            <Eye size={12} /> View
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`py-1 px-2.5 rounded-full text-[0.72rem] font-extrabold uppercase ${
                            paymentStatus === 'Paid' || paymentStatus === 'Success' || paymentStatus === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : paymentStatus === 'REFUNDED' || paymentStatus === 'Refunded'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`py-1 px-2.5 rounded-full text-[0.72rem] font-extrabold uppercase ${
                            isRefunded
                              ? 'bg-amber-100 text-amber-800'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {orderStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">-</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Download Invoice Button */}
          <div className="mb-8">
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="bg-primary hover:bg-primary-hover text-white border-none py-2.5 px-6 rounded-md text-xs font-bold cursor-pointer shadow-sm transition-colors"
            >
              Download Invoice
            </button>
          </div>

          {/* Price Details & Other Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-10">
            {/* Price Details Card */}
            <div className="border border-slate-100 rounded-xl p-6 bg-white shadow-sm">
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5">
                Price Details
              </h3>

              <div className="flex flex-col gap-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Item Price:</span>
                  <span>₹{subtotalAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>₹{shippingFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>₹{promoDiscount > 0 ? promoDiscount.toLocaleString('en-IN') : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>₹{subtotalAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Promo Applied:</span>
                  <span>₹{promoDiscount.toLocaleString('en-IN')}</span>
                </div>

                <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-3.5 px-4 mt-2 flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">Final Total:</span>
                  <strong className="text-xl text-slate-900 font-extrabold">
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Other Details Card */}
            <div className="border border-slate-100 rounded-xl p-6 bg-white shadow-sm">
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5">
                Other Details
              </h3>

              <div className="flex flex-col gap-3.5 text-xs text-slate-600">
                <div className="grid grid-cols-[90px_1fr]">
                  <span>Name:</span>
                  <span className="text-slate-800 font-semibold">{custName}</span>
                </div>
                <div className="grid grid-cols-[90px_1fr]">
                  <span>Mobileno:</span>
                  <span className="text-slate-800 font-semibold">{custPhone}</span>
                </div>
                <div className="grid grid-cols-[90px_1fr]">
                  <span>Address:</span>
                  <span className="text-slate-800 break-words">{addressText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC TIMELINE CONTAINER */}
          <div className="border border-slate-100 rounded-xl p-7 bg-white">
            {isRefunded || isRefundInitiated ? (
              <div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 px-5 mb-6 flex items-center gap-2.5">
                  <RefreshCw size={22} className="text-amber-700 shrink-0" />
                  <div>
                    <strong className="text-amber-900 text-sm">
                      {isRefunded ? 'Order Refund Completed' : 'Refund Initiated'}
                    </strong>
                    <p className="text-amber-700 m-0 mt-0.5 text-xs">
                      {isRefunded
                        ? `The refund amount of ₹${totalAmt.toLocaleString('en-IN')} has been processed and credited.`
                        : 'Your refund request has been initiated and is being processed by the payment gateway.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between relative max-w-[600px] mx-auto">
                  <div className="absolute top-4 left-[15%] right-[15%] h-0.5 bg-slate-300 z-1" />
                  <div
                    className={`absolute top-4 left-[15%] h-0.5 bg-amber-600 z-1 transition-all duration-300 ${
                      isRefunded ? 'w-[70%]' : 'w-[35%]'
                    }`}
                  />

                  {/* Step 1: Ordered Placed */}
                  <div className="relative z-2 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Order Placed</span>
                    <span className="text-[0.72rem] text-slate-600 mt-0.5">{orderedPlacedDate}</span>
                  </div>

                  {/* Step 2: Refund Initiated */}
                  <div className="relative z-2 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Refund Initiated</span>
                    <span className="text-[0.72rem] text-slate-600 mt-0.5">{refundInitiatedDate || orderedPlacedDate}</span>
                  </div>

                  {/* Step 3: Refunded */}
                  <div className="relative z-2 flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-white ${
                        isRefunded ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      {isRefunded ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </div>
                    <span className={`text-xs ${isRefunded ? 'font-bold text-emerald-600' : 'font-medium text-slate-400'}`}>
                      Amount Refunded
                    </span>
                    {isRefunded && (
                      <span className="text-[0.72rem] text-emerald-600 mt-0.5 font-semibold">
                        {refundedDate || refundInitiatedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : isCancelled ? (
              <div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 px-5 mb-6 flex items-center gap-2.5">
                  <AlertCircle size={22} className="text-rose-800 shrink-0" />
                  <div>
                    <strong className="text-rose-900 text-sm">Order Cancelled</strong>
                    <p className="text-rose-700 m-0 mt-0.5 text-xs">
                      {(order as any).cancellationReason
                        ? `Reason: ${(order as any).cancellationReason}`
                        : 'This order was cancelled.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-around relative max-w-[450px] mx-auto">
                  <div className="absolute top-4 left-[20%] right-[20%] h-0.5 bg-rose-500 z-1" />

                  {/* Step 1: Ordered Placed */}
                  <div className="relative z-2 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Order Placed</span>
                    <span className="text-[0.72rem] text-slate-600 mt-0.5">{orderedPlacedDate}</span>
                  </div>

                  {/* Step 2: Cancelled */}
                  <div className="relative z-2 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center mb-2">
                      <X size={18} />
                    </div>
                    <span className="text-xs font-bold text-rose-600">Cancelled</span>
                    <span className="text-[0.72rem] text-rose-600 mt-0.5 font-semibold">
                      {cancelledDate || orderedPlacedDate}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between relative max-w-[700px] mx-auto">
                <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-slate-300 z-1" />
                <div
                  className={`absolute top-4 left-[10%] h-0.5 bg-primary z-1 transition-all duration-300 ${
                    isDelivered ? 'w-[80%]' : isShipped ? 'w-[53%]' : isProcessed ? 'w-[26%]' : 'w-0'
                  }`}
                />

                {/* Step 1: Ordered Placed */}
                <div className="relative z-2 flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mb-2">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Ordered Placed</span>
                  <span className="text-[0.72rem] text-slate-600 mt-0.5 font-medium">{orderedPlacedDate}</span>
                </div>

                {/* Step 2: Processed */}
                <div className="relative z-2 flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-white ${
                      isProcessed ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    {isProcessed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <span className={`text-xs ${isProcessed ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>
                    Processed
                  </span>
                  <span className="text-[0.72rem] text-slate-600 mt-0.5 font-medium">
                    {isProcessed ? processedDate : 'Pending'}
                  </span>
                </div>

                {/* Step 3: Shipped */}
                <div className="relative z-2 flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-white ${
                      isShipped ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    {isShipped ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <span className={`text-xs ${isShipped ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>
                    Shipped
                  </span>
                  <span className="text-[0.72rem] text-slate-600 mt-0.5 font-medium">
                    {isShipped ? shippedDate : 'Pending'}
                  </span>
                </div>

                {/* Step 4: Delivered */}
                <div className="relative z-2 flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-white ${
                      isDelivered ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    {isDelivered ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <span className={`text-xs ${isDelivered ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>
                    Delivered
                  </span>
                  <span className="text-[0.72rem] text-slate-600 mt-0.5 font-medium">
                    {isDelivered ? deliveredDate : 'Pending'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRICE BREAKUP MODAL */}
      {showPriceBreakupModal && selectedBreakupItem && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 animate-drawer-fade">
          <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 px-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-800 m-0">Price Breakup</h2>
              <button
                type="button"
                onClick={() => setShowPriceBreakupModal(false)}
                className="bg-transparent border-none cursor-pointer p-1 text-slate-500 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const itemPrice = Number(selectedBreakupItem.price || selectedBreakupItem.unitPrice || selectedBreakupItem.sellingPrice || 0);
              const qty = Number(selectedBreakupItem.quantity || 1);
              const attrs = selectedBreakupItem.attributes || {};
              const gstAmt = Number(attrs.gstAmount !== undefined ? attrs.gstAmount : attrs.gst || 0);
              const itemTotal = Number(
                selectedBreakupItem.totalPrice !== undefined && selectedBreakupItem.totalPrice !== null
                  ? selectedBreakupItem.totalPrice
                  : selectedBreakupItem.total !== undefined && selectedBreakupItem.total !== null
                    ? selectedBreakupItem.total
                    : itemPrice * qty + (attrs.gstMode === 'EXCLUSIVE' ? gstAmt : 0)
              );

              const variantName = selectedBreakupItem.variant || selectedBreakupItem.variantName || 'Standard';
              const gstRate = attrs.gstRate !== undefined ? Number(attrs.gstRate) : 0;
              const basePrice = itemPrice;

              return (
                <div className="p-5 px-6 flex flex-col gap-5 text-xs">
                  {/* Product Information Section */}
                  <div>
                    <h4 className="text-[0.78rem] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                      Product Information
                    </h4>
                    <div className="border border-slate-100 rounded-lg p-3 px-4 flex flex-col gap-1.5 bg-slate-50">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Product Name</span>
                        <span className="font-semibold text-slate-800">{selectedBreakupItem.name || selectedBreakupItem.productName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Variant</span>
                        <span className="font-semibold text-slate-800">{variantName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specifications Section */}
                  {(attrs.grade || attrs.material || attrs.size || attrs.dimensions) && (
                    <div>
                      <h4 className="text-[0.78rem] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                        Specifications
                      </h4>
                      <div className="border border-slate-100 rounded-lg p-3 px-4 flex flex-col gap-1.5 bg-white">
                        {attrs.grade && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Grade</span>
                            <span className="font-semibold text-slate-800">{attrs.grade}</span>
                          </div>
                        )}
                        {attrs.material && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Material</span>
                            <span className="font-semibold text-slate-800">{attrs.material}</span>
                          </div>
                        )}
                        {attrs.size && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Size</span>
                            <span className="font-semibold text-slate-800">{attrs.size}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Summary Section */}
                  <div>
                    <h4 className="text-[0.78rem] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                      Payment Summary ({qty} {qty === 1 ? 'Item' : 'Items'})
                    </h4>
                    <div className="border border-slate-100 rounded-lg p-3.5 px-4 flex flex-col gap-2 bg-white">
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">GST Tax Status</span>
                        <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                          attrs.gstMode === 'EXCLUSIVE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {attrs.gstMode === 'EXCLUSIVE' ? 'Excluded from Price (Added Extra)' : 'Included in Price (Inclusive)'}
                        </span>
                      </div>
                      {attrs.gstMode === 'EXCLUSIVE' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Unit Base Price</span>
                            <span>₹{itemPrice.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal</span>
                            <span>₹{(itemPrice * qty).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span className="text-slate-500">GST Tax {gstRate > 0 ? `(${gstRate}%)` : ''}</span>
                            <span>+₹{gstAmt.toLocaleString('en-IN')} (Excluded)</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Selling Subtotal (Excl. GST)</span>
                            <span>₹{Math.max(0, itemTotal - gstAmt).toLocaleString('en-IN')}</span>
                          </div>
                          {gstAmt > 0 && (
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span className="text-slate-500">GST Tax {gstRate > 0 ? `(${gstRate}%)` : ''}</span>
                              <span>₹{gstAmt.toLocaleString('en-IN')} (Included)</span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 px-4 mt-1 flex justify-between items-center">
                        <span className="font-bold text-emerald-800">Final Item Total</span>
                        <strong className="text-base text-emerald-700 font-extrabold">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
