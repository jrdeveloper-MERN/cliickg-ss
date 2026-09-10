import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import OrderDetailDrawer from '../../components/Orders/OrderDetailDrawer';
import Modal from '../../components/Common/Modal';
import {
  Search, Download, Filter, Eye, RefreshCw, Package,
  Trash2, Save, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

import { useSearchParams, useNavigate } from 'react-router-dom';

const ORDER_STATUS_OPTIONS = [
  'Received', 'Processing', 'Shipped', 'Delivered', 'Cancelled',
  'Return Requested', 'Returned', 'Refund Initiated', 'Refunded'
];

const PAYMENT_STATUS_OPTIONS = [
  'Pending', 'Initiated', 'Processing', 'Success', 'Failed', 'Cancelled', 'Refunded'
];

const OrderList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Search, Filters & Sorting State
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    if (searchParams.get('date') === 'today' || searchParams.get('filter') === 'today') {
      return getTodayStr();
    }
    return searchParams.get('fromDate') || '';
  });
  const [toDate, setToDate] = useState(() => {
    if (searchParams.get('date') === 'today' || searchParams.get('filter') === 'today') {
      return getTodayStr();
    }
    return searchParams.get('toDate') || '';
  });
  const [orderStatus, setOrderStatus] = useState(() => {
    return searchParams.get('status') || searchParams.get('orderStatus') || '';
  });
  const [paymentStatus, setPaymentStatus] = useState(() => {
    return searchParams.get('paymentStatus') || '';
  });

  useEffect(() => {
    const urlStatus = searchParams.get('status') || searchParams.get('orderStatus');
    if (urlStatus !== null && urlStatus !== orderStatus) {
      setOrderStatus(urlStatus);
    }
    const urlPaymentStatus = searchParams.get('paymentStatus');
    if (urlPaymentStatus !== null && urlPaymentStatus !== paymentStatus) {
      setPaymentStatus(urlPaymentStatus);
    }
    if (searchParams.get('date') === 'today' || searchParams.get('filter') === 'today') {
      const todayStr = getTodayStr();
      setFromDate(todayStr);
      setToDate(todayStr);
    }

    const orderIdParam = searchParams.get('id');
    if (orderIdParam) {
      api.get(`/orders/${orderIdParam}`)
        .then((res) => {
          const fetched = res.data?.data || res.data;
          if (fetched) {
            setSelectedOrder(fetched);
            setIsDrawerOpen(true);
          }
        })
        .catch((err) => {
          console.error('Failed to auto-open order drawer for id:', orderIdParam, err);
        });
    }
  }, [searchParams]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals & Active Drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPaymentStatusModalOpen, setIsPaymentStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Status Change State
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [page, sortBy, orderStatus, paymentStatus, paymentMethod, gatewayFilter, orderTypeFilter, courierFilter, fromDate, toDate]);

  const fetchOrders = async (resetPage = false, overrideFilters = null) => {
    try {
      setLoading(true);
      const p = resetPage ? 1 : page;
      if (resetPage && page !== 1) setPage(1);

      const params = { page: p, limit, sortBy: overrideFilters?.sortBy || sortBy };
      const fFromDate = overrideFilters ? overrideFilters.fromDate : fromDate;
      const fToDate = overrideFilters ? overrideFilters.toDate : toDate;
      const fOrderStatus = overrideFilters ? overrideFilters.orderStatus : orderStatus;
      const fPaymentStatus = overrideFilters ? overrideFilters.paymentStatus : paymentStatus;
      const fPaymentMethod = overrideFilters ? overrideFilters.paymentMethod : paymentMethod;
      const fGateway = overrideFilters ? overrideFilters.gatewayFilter : gatewayFilter;
      const fOrderType = overrideFilters ? overrideFilters.orderTypeFilter : orderTypeFilter;
      const fCourier = overrideFilters ? overrideFilters.courierFilter : courierFilter;
      const fSearch = overrideFilters ? overrideFilters.search : search;

      if (fFromDate) params.fromDate = fFromDate;
      if (fToDate) params.toDate = fToDate;
      if (fOrderStatus) params.orderStatus = fOrderStatus;
      if (fPaymentStatus) params.paymentStatus = fPaymentStatus;
      if (fPaymentMethod) params.paymentMethod = fPaymentMethod;
      if (fGateway) params.gateway = fGateway;
      if (fOrderType) params.orderType = fOrderType;
      if (fCourier) params.courier = fCourier;
      if (fSearch && fSearch.trim()) params.search = fSearch.trim();

      const res = await api.get('/orders', { params });
      setOrders(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchOrders(false);
    }
  };

  const handleClearFilters = () => {
    navigate('/orders', { replace: true });
    setSearch('');
    setFromDate('');
    setToDate('');
    setOrderStatus('');
    setPaymentStatus('');
    setPaymentMethod('');
    setGatewayFilter('');
    setOrderTypeFilter('');
    setCourierFilter('');
    setSortBy('newest');
    setPage(1);

    fetchOrders(true, {
      fromDate: '',
      toDate: '',
      orderStatus: '',
      paymentStatus: '',
      paymentMethod: '',
      gatewayFilter: '',
      orderTypeFilter: '',
      courierFilter: '',
      search: '',
      sortBy: 'newest'
    });
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleSavePaymentStatus = async () => {
    if (!selectedOrder) return;
    setSavingStatus(true);
    try {
      const targetId = selectedOrder.id || selectedOrder._id;
      await api.patch(`/orders/${targetId}/payment-status`, { paymentStatus: newPaymentStatus });
      showToast(`Payment status updated to '${newPaymentStatus}'`, 'success');
      setIsPaymentStatusModalOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteOrder = (order) => {
    setOrderToDelete(order);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      const targetId = orderToDelete.id || orderToDelete._id;
      await api.delete(`/orders/${targetId}`);
      showToast(`Order #${orderToDelete.orderNo || orderToDelete.orderId} deleted successfully`, 'success');
      setIsDeleteModalOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete order', 'error');
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      showToast('Generating invoice PDF...', 'info');
      const targetId = order.id || order._id;
      const res = await api.get(`/orders/${targetId}/invoice`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${order.invoiceNo || order.orderNo || targetId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Invoice downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download invoice PDF', 'error');
    }
  };

  const handleSortColumn = (column) => {
    switch (column) {
      case 'orderNo':
      case 'orderId':
        setSortBy(prev => (prev === 'order_asc' ? 'order_desc' : 'order_asc'));
        break;
      case 'date':
        setSortBy(prev => (prev === 'newest' ? 'oldest' : 'newest'));
        break;
      case 'customer':
        setSortBy(prev => (prev === 'customer' ? 'customer_desc' : 'customer'));
        break;
      case 'amount':
        setSortBy(prev => (prev === 'amount_high' ? 'amount_low' : 'amount_high'));
        break;
      case 'status':
        setSortBy(prev => (prev === 'status_asc' ? 'status_desc' : 'status_asc'));
        break;
      default:
        break;
    }
  };

  const renderSortIndicator = (column) => {
    let active = false;
    let isAsc = false;

    if (column === 'orderNo' || column === 'orderId') {
      active = sortBy === 'order_asc' || sortBy === 'order_desc' || sortBy === 'order_id_asc' || sortBy === 'order_id_desc';
      isAsc = sortBy === 'order_asc' || sortBy === 'order_id_asc';
    } else if (column === 'date') {
      active = sortBy === 'newest' || sortBy === 'oldest' || sortBy === 'date_asc' || sortBy === 'date_desc';
      isAsc = sortBy === 'oldest' || sortBy === 'date_asc';
    } else if (column === 'customer') {
      active = sortBy === 'customer' || sortBy === 'customer_asc' || sortBy === 'customer_desc';
      isAsc = sortBy === 'customer' || sortBy === 'customer_asc';
    } else if (column === 'amount') {
      active = sortBy === 'amount_high' || sortBy === 'amount_low' || sortBy === 'total_asc' || sortBy === 'total_desc';
      isAsc = sortBy === 'amount_low' || sortBy === 'total_asc';
    } else if (column === 'status') {
      active = sortBy === 'status_asc' || sortBy === 'status_desc';
      isAsc = sortBy === 'status_asc';
    }

    if (!active) {
      return <ArrowUpDown size={12} className="text-admin-text-muted opacity-40 group-hover:opacity-100 transition-opacity ml-1 inline-block shrink-0" />;
    }

    return isAsc ? (
      <ArrowUp size={12} className="text-admin-accent ml-1 inline-block shrink-0 font-bold" />
    ) : (
      <ArrowDown size={12} className="text-admin-accent ml-1 inline-block shrink-0 font-bold" />
    );
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'Paid':
      case 'Success': return <span className="badge badge-success">Success</span>;
      case 'Failed':
      case 'Failure': return <span className="badge badge-danger">Failed</span>;
      case 'Cancelled': return <span className="badge badge-danger">Cancelled</span>;
      case 'Refunded':
      case 'Partially Refunded': return <span className="badge badge-accent">Refunded</span>;
      case 'Initiated':
      case 'Processing': return <span className="badge badge-secondary">Initiated</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  const getOrderBadge = (status) => {
    switch (status) {
      case 'Delivered':
      case 'Completed': return <span className="badge badge-success">Delivered</span>;
      case 'Shipped': return <span className="badge badge-secondary">Shipped</span>;
      case 'Processing': return <span className="badge badge-accent">Processing</span>;
      case 'Return Requested': return <span className="badge badge-accent">Return Requested</span>;
      case 'Refund Initiated': return <span className="badge badge-secondary">Refund Initiated</span>;
      case 'Cancelled': return <span className="badge badge-danger">Cancelled</span>;
      case 'Returned': return <span className="badge badge-danger">Returned</span>;
      case 'Refunded': return <span className="badge badge-danger">Refunded</span>;
      case 'Received': return <span className="badge badge-warning">Received</span>;
      default: return <span className="badge badge-warning">{status || 'Received'}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1 m-0"> Order Management</h1>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="card-minimal p-5 flex flex-col gap-4">
        {/* Search Bar & Primary Actions */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="search-box flex-1 min-w-[280px]">
            <Search size={17} className="text-admin-text-muted shrink-0 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Order No, Invoice No, Customer, Phone, Payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleApplyFilters} className="btn-primary h-10.5 px-5 flex items-center gap-1.5 text-xs">
              <Filter size={15} /> Filter
            </button>
            <button type="button" onClick={handleClearFilters} className="btn-secondary h-10.5 px-4 flex items-center gap-1.5 text-xs">
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-3 border-t border-admin-border">
          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">From Date</label>
            <input type="date" className="form-control text-xs h-9" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">To Date</label>
            <input type="date" className="form-control text-xs h-9" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">Payment Status</label>
            <select className="form-control text-xs h-9" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All Payment Statuses</option>
              {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">Order Status</label>
            <select className="form-control text-xs h-9" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="">All Order Statuses</option>
              {ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">Payment Method</label>
            <select className="form-control text-xs h-9" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">All Methods</option>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="UPI">UPI Payment</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="NetBanking">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">Gateway</label>
            <select className="form-control text-xs h-9" value={gatewayFilter} onChange={(e) => setGatewayFilter(e.target.value)}>
              <option value="">All Gateways</option>
              <option value="Razorpay">Razorpay</option>
              <option value="COD">COD System</option>
            </select>
          </div>

          <div>
            <label className="form-label text-[11px] font-bold text-admin-text-muted mb-1 block">Sort By</label>
            <select className="form-control text-xs h-9" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount (High to Low)</option>
              <option value="amount_low">Amount (Low to High)</option>
              <option value="customer">Customer Name (A-Z)</option>
              <option value="customer_desc">Customer Name (Z-A)</option>
              <option value="order_asc">Order No (Ascending)</option>
              <option value="order_desc">Order No (Descending)</option>
              <option value="status_asc">Order Status (A-Z)</option>
              <option value="status_desc">Order Status (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enterprise Data Grid */}
      <div className="card-minimal p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-admin-text-muted">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            <div>Loading orders data grid...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-admin-text-muted">
            <Package size={36} className="mx-auto mb-2 opacity-50" />
            <div className="font-bold text-base text-admin-text-primary">No orders found</div>
            <div className="text-xs mt-1">Try resetting your filter parameters</div>
          </div>
        ) : (
          <div className="data-table-container overflow-x-auto">
            <table className="data-table w-full text-xs whitespace-nowrap">
              <thead>
                <tr>
                  <th className="text-center">Actions</th>
                  <th>S.No</th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('orderNo')}
                    title="Click to sort by Order No"
                  >
                    <div className="flex items-center gap-1">
                      <span>Order No</span>
                      {renderSortIndicator('orderNo')}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('date')}
                    title="Click to sort by Date"
                  >
                    <div className="flex items-center gap-1">
                      <span>Order Date</span>
                      {renderSortIndicator('date')}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('customer')}
                    title="Click to sort by Customer Name"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer Name</span>
                      {renderSortIndicator('customer')}
                    </div>
                  </th>
                  <th>Mobile Number</th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('amount')}
                    title="Click to sort by Total Amount"
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Amount</span>
                      {renderSortIndicator('amount')}
                    </div>
                  </th>
                  <th>Payment Method</th>
                  <th>Gateway</th>
                  <th>Payment ID</th>
                  <th>Payment Status</th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('status')}
                    title="Click to sort by Order Status"
                  >
                    <div className="flex items-center gap-1">
                      <span>Order Status</span>
                      {renderSortIndicator('status')}
                    </div>
                  </th>
                  <th>Invoice No</th>
                  <th>Order Type</th>
                  <th
                    className="cursor-pointer select-none group hover:text-admin-accent transition-colors"
                    onClick={() => handleSortColumn('orderId')}
                    title="Click to sort by Order ID"
                  >
                    <div className="flex items-center gap-1">
                      <span>Order ID</span>
                      {renderSortIndicator('orderId')}
                    </div>
                  </th>
                  <th>Courier</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord, idx) => {
                  const sNo = (page - 1) * limit + idx + 1;
                  return (
                    <tr key={ord.id || ord._id || `ord-${idx}`}>
                      {/* Actions */}
                      <td className="text-center">
                        <div className="inline-flex gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(ord)}
                            className="btn-secondary py-1 px-2 text-[11px] flex items-center gap-1"
                            title="View Order Details Drawer"
                          >
                            <Eye size={13} /> View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(ord)}
                            className="btn-secondary py-1 px-2 text-[11px]"
                            title="Download Invoice PDF"
                          >
                            <Download size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord)}
                            className="btn-secondary py-1 px-2 text-[11px] text-rose-500 hover:text-rose-600"
                            title="Delete Order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                      <td>{sNo}</td>

                      <td className="font-bold text-admin-accent">
                        <button
                          type="button"
                          onClick={() => handleViewOrder(ord)}
                          className="bg-transparent border-none text-admin-accent font-bold cursor-pointer p-0 hover:underline"
                        >
                          {ord.orderNo || ord.orderId}
                        </button>
                      </td>

                      <td>{new Date(ord.createdAt || ord.orderDate).toLocaleDateString()}</td>

                      <td className="font-semibold text-admin-text-primary">
                        {ord.customerName || 'Customer'}
                      </td>

                      <td>{ord.mobile || 'N/A'}</td>

                      <td className="font-extrabold text-admin-text-primary">
                        ₹{Number(ord.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td>{ord.paymentMethod || 'COD'}</td>

                      <td>
                        <span className={`font-semibold ${ord.paymentGateway === 'Razorpay' ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {ord.paymentGateway || 'Razorpay'}
                        </span>
                      </td>

                      <td className="font-mono text-[11px]">
                        {ord.gatewayPaymentId || ord.transactionId || 'N/A'}
                      </td>

                      <td>{getPaymentBadge(ord.paymentStatus)}</td>

                      <td>{getOrderBadge(ord.orderStatus)}</td>

                      <td className="font-bold text-emerald-600 text-xs">
                        {ord.invoiceNo || 'INV-Pending'}
                      </td>

                      <td>{ord.orderType || 'Standard'}</td>

                      <td className="font-mono text-[11px] text-admin-text-muted">
                        {ord.orderId || ord._id}
                      </td>

                      <td className="font-semibold text-purple-600 dark:text-purple-400">
                        {ord.courierName || ord.courier?.courierName || 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-admin-border flex justify-between items-center flex-wrap gap-4 text-xs text-admin-text-muted">
          <div>
            Showing {orders.length} of {total} orders
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit) || 1}
            totalItems={total}
            limit={limit}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* Large Enterprise View Order Drawer */}
      <OrderDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={selectedOrder}
        onOrderUpdated={async (updatedOrder) => {
          if (updatedOrder && updatedOrder._id) {
            setSelectedOrder(updatedOrder);
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
          }
          fetchOrders();
        }}
      />

      {/* Change Payment Status Modal */}
      <Modal
        isOpen={isPaymentStatusModalOpen}
        onClose={() => setIsPaymentStatusModalOpen(false)}
        title={`Update Payment Status — ${selectedOrder?.orderNo || selectedOrder?.orderId}`}
        width="450px"
      >
        <div className="flex flex-col gap-5 py-2">
          <div>
            <label className="form-label text-xs font-bold text-admin-text-muted mb-1.5 block">
              Select Payment Status *
            </label>
            <select
              className="form-control text-xs"
              value={newPaymentStatus}
              onChange={(e) => setNewPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setIsPaymentStatusModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePaymentStatus}
              disabled={savingStatus}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Save size={14} /> {savingStatus ? 'Updating...' : 'Save Payment Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Order Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Order Deletion"
        width="450px"
      >
        <div className="flex flex-col gap-5 py-2">
          <div className="text-admin-text-primary text-sm leading-relaxed">
            Are you sure you want to delete <strong>Order #{orderToDelete?.orderNo || orderToDelete?.orderId}</strong>? This action cannot be undone.
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteOrder}
              className="btn-danger text-xs"
            >
              Delete Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderList;