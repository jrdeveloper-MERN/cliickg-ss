import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  RotateCcw,
  XCircle,
  Users,
  IndianRupee,
  Package,
  Calendar,
  Eye,
  TrendingUp,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import ErrorState from '../components/Common/ErrorState';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError(err.response?.data?.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-admin-text-muted py-12 text-center text-xs">
        Loading metrics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        statusCode={500}
        title="Unable to Load Dashboard Data"
        message={error}
        onRetry={fetchStats}
        retryText="Retry"
        showDashboardButton={false}
      />
    );
  }

  const { stats, recentOrders = [], recentCustomers = [] } = data || {};

  const filteredOrders = recentOrders.filter(
    (o) =>
      (o.orderId || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredCustomers = recentCustomers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  const statsList = [
    { title: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart, link: '/orders' },
    { title: 'Total Returns', value: stats?.totalReturns ?? 0, icon: RotateCcw, link: '/orders?status=Returned' },
    { title: 'Total Cancelled', value: stats?.totalCancelled ?? 0, icon: XCircle, link: '/orders?status=Cancelled' },
    { title: 'Total Customers', value: stats?.totalCustomers ?? 0, icon: Users, link: '/customers' },
    { title: 'Total Sales', value: `₹${Number(stats?.totalSales ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: IndianRupee, link: '/orders' },
    { title: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, link: '/products' },
    { title: 'Today Orders', value: stats?.todayOrders ?? 0, icon: Calendar, link: '/orders?date=today' },
    { title: 'Today Sales', value: `₹${Number(stats?.todaySales ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, link: '/orders?date=today&paymentStatus=Paid' },
    { title: 'Today Added Products', value: stats?.todayAddedProducts ?? 0, icon: Package, link: '/products?date=today' }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="heading-1">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {statsList.map((st, idx) => {
          const IconComp = st.icon;
          return (
            <div
              key={idx}
              className="bg-admin-card border border-admin-border rounded-admin-sm p-5 shadow-admin-sm hover:shadow-admin-md transition-all duration-150 cursor-pointer"
              onClick={() => navigate(st.link)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-admin-text-secondary">{st.title}</span>
                <div className="w-8 h-8 rounded-md bg-admin-subtle text-admin-accent flex items-center justify-center">
                  <IconComp size={16} />
                </div>
              </div>

              <div className="text-2xl font-bold text-admin-text-primary my-3 mb-1.5 tracking-tight">
                {st.value}
              </div>

              <div className="flex items-center justify-between mt-1">
                {st.trend ? (
                  <span className={`badge ${st.isPositive ? 'badge-success' : 'badge-danger'} text-[11px] py-0.5 px-1.5`}>
                    {st.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {st.trend}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-xs text-admin-accent font-medium">
                  View →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tables Section */}
      <div className="flex flex-col gap-6 mt-2">
        {/* Recent Orders Table */}
        <div className="bg-admin-card border border-admin-border rounded-admin-sm p-5 shadow-admin-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="heading-3">Recent Orders</h3>
              <span className="subheading">Latest 10 orders received</span>
            </div>

            <div className="search-box w-56 !h-8.5">
              <Search size={14} className="text-admin-text-muted shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Search orders..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-admin-text-muted p-6">No recent orders found</td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id || order.id}>
                      <td className="font-semibold text-admin-accent">{order.orderId}</td>
                      <td>{order.customerName}</td>
                      <td>{order.mobile}</td>
                      <td>{order.paymentMethod || 'Online'}</td>
                      <td>
                        <span className={`badge badge-${(order.orderStatus || '').toLowerCase() === 'delivered' || (order.orderStatus || '').toLowerCase() === 'active' ? 'success' : (order.orderStatus || '').toLowerCase() === 'cancelled' ? 'danger' : 'warning'}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="font-semibold">₹{Number(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost py-1 px-2 text-xs"
                          onClick={() => navigate(`/orders?id=${order._id || order.id || order.orderId}`)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customers Table */}
        <div className="bg-admin-card border border-admin-border rounded-admin-sm p-5 shadow-admin-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="heading-3">Recent Customers</h3>
              <span className="subheading">Newly registered customer accounts</span>
            </div>

            <div className="search-box w-56 !h-8.5">
              <Search size={14} className="text-admin-text-muted shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-admin-text-muted p-6">No recent customers found</td></tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust._id}>
                      <td className="font-semibold text-admin-accent">{cust.customerId}</td>
                      <td><span className="badge badge-accent">{cust.type || 'Customer'}</span></td>
                      <td>{cust.name}</td>
                      <td>{cust.phone}</td>
                      <td>{cust.email}</td>
                      <td>
                        <span className={`badge badge-${cust.status.toLowerCase() === 'active' ? 'success' : 'danger'}`}>
                          {cust.status}
                        </span>
                      </td>
                      <td>{new Date(cust.joinedDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
