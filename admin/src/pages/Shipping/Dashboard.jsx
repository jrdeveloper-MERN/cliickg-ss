import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Truck,
  FileText,
  Compass,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/shipping/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-admin-text-muted py-12 text-center text-xs">
        Loading logistics dashboard stats...
      </div>
    );
  }

  const statsList = [
    { title: 'Total Delivery Zones', value: stats?.totalZones ?? 0, icon: MapPin, link: '/shipping/zones' },
    { title: 'Total Couriers', value: stats?.totalCouriers ?? stats?.activeCouriers ?? 0, icon: Truck, link: '/shipping/couriers' },
    { title: 'Active Shipping Rules', value: stats?.activeRules ?? stats?.activeChargeRules ?? 0, icon: FileText, link: '/shipping/charges' },
    { title: 'Serviceable Pincodes', value: stats?.serviceablePincodesCount ?? 0, icon: Compass, link: '/shipping/zones' },
    { title: 'Restricted Pincodes', value: stats?.restrictedPincodesCount ?? stats?.exclusivePincodesCount ?? 0, icon: AlertTriangle, link: '/shipping/zones' },
    { title: 'International Zones', value: stats?.internationalZonesCount ?? 0, icon: Compass, link: '/shipping/zones' },
    { title: "Today's Shipping Orders", value: stats?.todayOrders ?? 0, icon: Clock, link: '/orders' },
    { title: 'Average Shipping Cost', value: `₹${stats?.avgShippingCharge ?? 0}`, icon: TrendingUp, link: '/orders' }
  ];

  const operationalList = [
    { title: 'Pending Shipments', value: stats?.pendingShipments || 0, color: 'text-amber-500', label: 'Needs processing' },
    { title: 'Delivered Today', value: stats?.deliveredToday || 0, color: 'text-emerald-500', label: 'Delivered' },
    { title: 'Failed/Returned', value: stats?.failedDeliveries || 0, color: 'text-rose-500', label: 'Returned to origin' },
    { title: 'Restricted/Cancelled', value: stats?.restrictedOrders || 0, color: 'text-slate-500', label: 'Blocked orders' },
    { title: 'COD Shipments', value: stats?.codOrders || 0, color: 'text-blue-500', label: 'Cash on delivery orders' }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Logistics &amp; Shipping Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={() => navigate('/shipping/zones')}>
            <Plus size={14} /> Add Zone
          </button>
          <button className="btn-secondary flex items-center gap-1.5 text-xs" onClick={() => navigate('/shipping/charges')}>
            <Settings size={14} /> Charges
          </button>
        </div>
      </div>

      {/* Core Logistics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statsList.map((st, idx) => {
          const IconComp = st.icon;
          return (
            <div
              key={idx}
              className="card-minimal cursor-pointer p-5 hover:border-admin-accent transition-colors"
              onClick={() => navigate(st.link)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-admin-text-secondary">{st.title}</span>
                <div className="w-8 h-8 rounded-md bg-admin-subtle text-admin-accent flex items-center justify-center">
                  <IconComp size={16} />
                </div>
              </div>

              <div className="text-2xl font-bold text-admin-text-primary my-3 tracking-tight">
                {st.value}
              </div>

              <div className="flex justify-end text-[11px] text-admin-accent font-medium">
                Manage →
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Logistics Status */}
      <div className="card-minimal p-5">
        <h3 className="heading-3 mb-4">Shipping Order Analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {operationalList.map((op, idx) => (
            <div key={idx} className="bg-admin-subtle border border-admin-border rounded-lg p-4 text-center">
              <span className="text-xs text-admin-text-secondary">{op.title}</span>
              <div className={`text-2xl font-bold my-2 ${op.color}`}>
                {op.value}
              </div>
              <span className="text-[11px] text-admin-text-muted">{op.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
