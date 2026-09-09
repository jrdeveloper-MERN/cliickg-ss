'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import orderService from '../../services/order.service';
import getImageUrl from '../../utils/image.utils';
import { Order } from '../../types/orders/order.types';
import ErrorState from '../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../utils/error-handler.utils';
import { OrderSkeleton } from '../../components/ui/Skeleton/Skeleton';
import { Search, Filter, Calendar, ShoppingBag, X, ArrowRight } from 'lucide-react';

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');

  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?from=/orders');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const res = await orderService.getMyOrders();
      setOrders(res.data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      if (err?.response?.status === 401 || err?.status === 401) {
        router.push('/login?from=/orders');
        return;
      }
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelModal = (order: Order) => {
    setCancelModalOrder(order);
    setCancelReason('');
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    setCancelModalOrder(null);
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelError('Please enter a cancellation reason before proceeding.');
      return;
    }

    if (!cancelModalOrder) return;

    try {
      setCancelling(true);
      setCancelError('');
      const targetId = cancelModalOrder.id || (cancelModalOrder as any)._id;
      await orderService.cancelOrder(targetId, trimmed);
      handleCloseCancelModal();
      await fetchOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      setCancelError(err?.response?.data?.message || err?.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toDateString();

    return orders.filter((order) => {
      if (!order) return false;
      const oId = order.id || (order as any)._id || '';
      const orderNoStr = String(order.orderNumber || (order as any).orderNo || order.orderId || oId).toLowerCase();
      const statusStr = String(order.orderStatus || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      let matchesSearch = true;
      if (query) {
        const itemNames = (order.items || []).map((i: any) => String(i?.name || i?.productName || '').toLowerCase()).join(' ');
        const mobile = String((order as any).mobile || (order as any).phone || '').toLowerCase();
        const statusHistoryText = Array.isArray((order as any).statusHistory)
          ? (order as any).statusHistory
              .filter(Boolean)
              .map((h: any) => `${h?.status || ''} ${h?.note || h?.comment || ''}`)
              .join(' ')
              .toLowerCase()
          : '';
        matchesSearch = orderNoStr.includes(query) || itemNames.includes(query) || mobile.includes(query) || statusStr.includes(query) || statusHistoryText.includes(query);
      }

      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        const targetStatus = selectedStatus.toLowerCase();
        const hasMatchingStatusInHistory = Array.isArray((order as any).statusHistory)
          ? (order as any).statusHistory.some((h: any) => h && String(h?.status || '').toLowerCase() === targetStatus)
          : false;
        matchesStatus = statusStr === targetStatus || hasMatchingStatusInHistory;
      }

      let matchesDate = true;
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      if (dateFilter === 'today') {
        matchesDate = Boolean(orderDate && !isNaN(orderDate.getTime()) && orderDate.toDateString() === todayStr);
      } else if (dateFilter === 'month') {
        const now = new Date();
        matchesDate = Boolean(orderDate && !isNaN(orderDate.getTime()) && orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear());
      } else if (dateFilter === 'older') {
        matchesDate = Boolean(!orderDate || isNaN(orderDate.getTime()) || orderDate.toDateString() !== todayStr);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, selectedStatus, dateFilter]);

  const todayStr = new Date().toDateString();
  const todaysOrders = filteredOrders.filter((o) => o?.createdAt && new Date(o.createdAt).toDateString() === todayStr);
  const pastOrders = filteredOrders.filter((o) => !o?.createdAt || new Date(o.createdAt).toDateString() !== todayStr);

  const getStatusBadgeClasses = (status?: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'SHIPPED':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'PROCESSING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RECEIVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-120px)] py-10">
        <div className="w-[min(100%-2rem,920px)] mx-auto">
          <OrderSkeleton />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-14">
        <ErrorState error={pageError} onRetry={fetchOrders} fullPage />
      </div>
    );
  }

  const renderOrderCard = (order: Order) => {
    const oId = order.id || (order as any)._id;
    const orderNoStr = order.orderNumber || (order as any).orderNo || order.orderId || oId;
    const isCancelled = (order.orderStatus || '').toUpperCase() === 'CANCELLED';
    const isCancellable = order.orderStatus === 'Received' || order.orderStatus === 'Processing';

    return (
      <div
        key={oId}
        className={`bg-white rounded-xl p-5 md:p-6 shadow-sm transition-all duration-200 border ${
          isCancelled ? 'border-rose-200' : 'border-slate-200'
        }`}
      >
        {/* Top Bar */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">Order Number: </span>
            <strong className="text-base text-slate-800 font-bold">
              #{orderNoStr}
            </strong>
            <div className="text-xs text-slate-400 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>

          <div>
            <span
              className={`text-[0.75rem] font-bold py-1 px-3 rounded-full uppercase tracking-wider border ${getStatusBadgeClasses(
                order.orderStatus
              )}`}
            >
              {order.orderStatus || 'RECEIVED'}
            </span>
          </div>
        </div>

        {/* Cancelled Banner inside Card */}
        {isCancelled && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-bold text-rose-800 uppercase">
                Order Cancelled
              </span>
              {order.cancelledAt && (
                <span className="text-xs text-rose-700">
                  Cancelled on: {new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {order.cancellationReason && (
              <p className="m-0 text-xs text-rose-900">
                <strong>Reason:</strong> {order.cancellationReason}
              </p>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="flex flex-col gap-3.5 mb-4">
          {(order.items || []).map((item: any, idx: number) => {
            const targetProdId = item.productId || item._id || item.id || '';
            const productHref = targetProdId ? `/product/${targetProdId}` : '#';

            return (
              <div key={idx} className="flex items-center gap-4">
                <Link href={productHref} className="shrink-0 no-underline">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer">
                    <img
                      src={getImageUrl(item.image || item.productImage)}
                      alt={item.name || item.productName || 'Item'}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/uploads/fallbackimg.png';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div className="flex-1">
                  <Link href={productHref} className="no-underline">
                    <h5 className="text-sm font-bold text-slate-800 m-0 cursor-pointer hover:text-primary">
                      {item.name || item.productName}
                    </h5>
                  </Link>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Qty: {item.quantity} | ₹{Number(item.price || item.unitPrice || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Footer */}
        <div className="flex justify-between items-center flex-wrap gap-3 border-t border-slate-100 pt-3.5">
          <div>
            <span className="text-xs text-slate-500">Total Amount: </span>
            <strong className="text-lg text-slate-900 font-extrabold">
              ₹{Number(order.totalAmount || order.total || 0).toLocaleString('en-IN')}
            </strong>
          </div>

          <div className="flex gap-2.5 items-center">
            {isCancellable && (
              <button
                type="button"
                onClick={() => handleOpenCancelModal(order)}
                className="bg-white hover:bg-rose-50 text-rose-500 border border-rose-300 py-1.5 px-3 rounded-md text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}
            <Link
              href={`/orders/${oId}`}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 rounded-md text-xs font-bold no-underline shadow-sm transition-colors"
            >
              <span>View Details</span>
              <ArrowRight size={14} className="stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-120px)] py-10">
      <div className="w-[min(100%-2rem,920px)] mx-auto">
        {/* Header Title */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-800 m-0">
              My Orders
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              View and track all your purchase order history
            </p>
          </div>
        </div>

        {/* ADVANCED SEARCH & FILTER BAR */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm mb-8 flex gap-3.5 flex-wrap items-center">
          {/* Main Search Input */}
          <div className="flex-1 min-w-[240px] relative">
            <Search size={18} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Product Name, Mobile..."
              className="w-full pl-10 pr-8 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter size={16} className="text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-slate-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Purchase History</option>
              <option value="today">Today's Purchase Orders</option>
              <option value="month">This Month</option>
              <option value="older">Past History</option>
            </select>
          </div>
        </div>

        {/* Orders List Container */}
        {filteredOrders.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white rounded-xl border border-dashed border-slate-300 shadow-sm">
            <ShoppingBag size={42} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg text-slate-700 mb-2 font-semibold">
              No purchase orders found
            </h3>
            <p className="text-slate-500 mb-6 text-xs">
              {searchQuery || selectedStatus !== 'All' || dateFilter !== 'all'
                ? 'Try adjusting your search query or filter options.'
                : 'When you place an order, it will appear here in your purchase order history.'}
            </p>
            <Link
              href="/shop"
              className="inline-block bg-primary hover:bg-primary-hover text-white py-2.5 px-7 rounded-md font-bold text-xs no-underline transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* TODAY'S PURCHASE ORDERS SECTION */}
            {todaysOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 border-b-2 border-primary pb-1.5">
                  <h3 className="text-sm font-bold text-primary m-0 uppercase tracking-wider">
                    Today's Purchase Orders ({todaysOrders.length})
                  </h3>
                </div>
                <div className="flex flex-col gap-5">
                  {todaysOrders.map(renderOrderCard)}
                </div>
              </div>
            )}

            {/* PAST PURCHASE HISTORY SECTION */}
            {pastOrders.length > 0 && (
              <div>
                {todaysOrders.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-1.5 mt-4">
                    <h3 className="text-sm font-bold text-slate-600 m-0 uppercase tracking-wider">
                      Previous Purchase History ({pastOrders.length})
                    </h3>
                  </div>
                )}
                <div className="flex flex-col gap-5">
                  {pastOrders.map(renderOrderCard)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Cancellation Modal */}
        {cancelModalOrder && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 animate-drawer-fade">
            <div className="bg-white rounded-2xl p-7 w-full max-w-[480px] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Cancel Order #{cancelModalOrder.orderNumber || cancelModalOrder.id}
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Why are you cancelling this order? Please provide a cancellation reason.
              </p>

              <textarea
                rows={4}
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelError) setCancelError('');
                }}
                placeholder="Please enter your cancellation reason..."
                className={`w-full p-3 rounded-lg border text-sm outline-none resize-y mb-4 ${
                  cancelError ? 'border-rose-500' : 'border-slate-300 focus:border-primary'
                }`}
              />

              {cancelError && (
                <p className="text-rose-500 text-xs font-semibold mb-4">
                  {cancelError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseCancelModal}
                  disabled={cancelling}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 border-none py-2.5 px-5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="bg-rose-600 hover:bg-rose-700 text-white border-none py-2.5 px-5 rounded-md text-xs font-bold cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
