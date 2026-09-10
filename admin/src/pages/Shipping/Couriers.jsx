import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Pagination from '../../components/Common/Pagination';
import { Plus, Edit2, Trash2, Search, Truck, ExternalLink } from 'lucide-react';

const Couriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [formData, setFormData] = useState({
    courierName: '',
    courierCode: '',
    logo: '',
    website: '',
    trackingUrlTemplate: '',
    supportedStates: '',
    supportedCountries: 'India',
    maxWeight: 0,
    maxDimensions: '',
    codAvailable: true,
    insuranceAvailable: false,
    trackingAvailable: true,
    estimatedDeliveryDaysDomestic: 3,
    estimatedDeliveryDaysIntl: 7,
    status: 'Active',
    priority: 0
  });

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      const res = await api.get('/shipping/couriers-admin');
      setCouriers(res.data || []);
    } catch (err) {
      console.error('Failed to load couriers:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleToggleStatus = async (courier) => {
    const cId = courier._id || courier.id;
    try {
      const newStatus = courier.status === 'Active' ? 'Inactive' : 'Active';
      const res = await api.put(`/shipping/couriers-admin/${cId}`, {
        ...courier,
        status: newStatus
      });
      setCouriers(prev => prev.map(c => ((c._id || c.id) === cId ? res.data : c)));
      showToast(`Courier status updated to ${newStatus}`);
    } catch (err) {
      showToast('Failed to toggle courier status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this courier?')) return;
    try {
      await api.delete(`/shipping/couriers-admin/${id}`);
      setCouriers(prev => prev.filter(c => (c._id || c.id) !== id));
      showToast('Courier deleted successfully!');
    } catch (err) {
      showToast('Failed to delete courier.');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setLogoFile(null);
    setLogoPreview('');
    setFormData({
      courierName: '',
      courierCode: '',
      logo: '',
      website: '',
      trackingUrlTemplate: '',
      supportedStates: '',
      supportedCountries: 'India',
      maxWeight: 0,
      maxDimensions: '',
      codAvailable: true,
      insuranceAvailable: false,
      trackingAvailable: true,
      estimatedDeliveryDaysDomestic: 3,
      estimatedDeliveryDaysIntl: 7,
      status: 'Active',
      priority: 0
    });
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (courier) => {
    const cId = courier._id || courier.id;
    setEditingId(cId);
    setLogoFile(null);
    setLogoPreview(courier.logo || '');
    setFormData({
      courierName: courier.courierName || courier.name || '',
      courierCode: (courier.courierCode || courier.code || '').toUpperCase(),
      logo: courier.logo || '',
      website: courier.website || '',
      trackingUrlTemplate: courier.trackingUrlTemplate || '',
      supportedStates: Array.isArray(courier.supportedStates) ? courier.supportedStates.join(', ') : (courier.supportedStates || ''),
      supportedCountries: Array.isArray(courier.supportedCountries) ? courier.supportedCountries.join(', ') : (courier.supportedCountries || 'India'),
      maxWeight: courier.maxWeight || 0,
      maxDimensions: courier.maxDimensions || '',
      codAvailable: courier.codAvailable !== false,
      insuranceAvailable: courier.insuranceAvailable || false,
      trackingAvailable: courier.trackingAvailable !== false,
      estimatedDeliveryDaysDomestic: courier.estimatedDeliveryDaysDomestic || 3,
      estimatedDeliveryDaysIntl: courier.estimatedDeliveryDaysIntl || 7,
      status: courier.status || 'Active',
      priority: courier.priority || 0
    });
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.courierName.trim() || !formData.courierCode.trim()) {
      setError('Courier name and courier code are required.');
      return;
    }

    const data = new FormData();
    data.append('courierName', formData.courierName.trim());
    data.append('courierCode', formData.courierCode.trim().toUpperCase());
    data.append('website', formData.website || '');
    data.append('trackingUrlTemplate', formData.trackingUrlTemplate || '');
    data.append('supportedStates', formData.supportedStates || '');
    data.append('supportedCountries', formData.supportedCountries || 'India');
    data.append('maxWeight', formData.maxWeight || 0);
    data.append('maxDimensions', formData.maxDimensions || '');
    data.append('codAvailable', formData.codAvailable);
    data.append('insuranceAvailable', formData.insuranceAvailable);
    data.append('trackingAvailable', formData.trackingAvailable);
    data.append('estimatedDeliveryDaysDomestic', formData.estimatedDeliveryDaysDomestic);
    data.append('estimatedDeliveryDaysIntl', formData.estimatedDeliveryDaysIntl);
    data.append('priority', formData.priority);
    data.append('status', formData.status);
    if (logoFile) {
      data.append('logo', logoFile);
    }

    try {
      if (editingId) {
        const res = await api.put(`/shipping/couriers-admin/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCouriers(prev => prev.map(c => (c._id || c.id) === editingId ? res.data : c));
        showToast('Courier updated successfully!');
      } else {
        const res = await api.post('/shipping/couriers-admin', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCouriers(prev => [res.data, ...prev]);
        showToast('Courier created successfully!');
      }
      setIsOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save courier.');
    }
  };

  const filteredCouriers = couriers.filter(c => {
    const query = search.toLowerCase();
    const nameMatch = (c.courierName || c.name || '').toLowerCase().includes(query) ||
      (c.courierCode || c.code || '').toLowerCase().includes(query) ||
      (c.website || '').toLowerCase().includes(query);
    const statusMatch = !statusFilter || (c.status || 'Active') === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 bg-emerald-500 text-white py-3 px-6 rounded-md z-[1000] font-semibold shadow-lg text-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Courier Master</h1>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-xs font-semibold" onClick={handleOpenAdd}>
          <Plus size={15} /> Add Courier
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-minimal p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="search-box flex-1 min-w-[280px]">
          <Search size={16} className="text-admin-text-muted shrink-0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by courier name, code, website..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            className="form-control text-xs h-10 w-auto min-w-[140px] rounded"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-admin-text-muted py-8 text-xs">Loading couriers...</div>
      ) : filteredCouriers.length === 0 ? (
        <div className="text-center text-admin-text-muted py-8 text-xs">No couriers configured.</div>
      ) : (
        <div className="card-minimal p-6">
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Courier Name</th>
                  <th>Code</th>
                  <th>Website</th>
                  <th>Weight Limit</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCouriers.slice((page - 1) * limit, page * limit).map((courier, cIdx) => {
                  const cId = courier._id || courier.id || `cour-${cIdx}`;
                  const cName = courier.courierName || courier.name || 'Unnamed Courier';
                  const cCode = (courier.courierCode || courier.code || '').toUpperCase();

                  return (
                    <tr key={cId}>
                      <td className="font-semibold text-admin-text-primary">{cName}</td>
                      <td>
                        <span className="badge badge-accent">{cCode}</span>
                      </td>
                      <td className="text-xs">
                        {courier.website ? (
                          <a href={courier.website} target="_blank" rel="noreferrer" className="text-admin-accent hover:underline inline-flex items-center gap-1">
                            Visit Site <ExternalLink size={11} />
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="text-xs text-admin-text-secondary">{courier.maxWeight > 0 ? `${courier.maxWeight} kg` : 'Unlimited'}</td>
                      <td>
                        <span
                          onClick={() => handleToggleStatus(courier)}
                          title="Click to toggle status"
                          className={`badge cursor-pointer ${(courier.status || 'Active') === 'Active' ? 'badge-success' : 'badge-danger'}`}
                        >
                          {courier.status || 'Active'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="btn-secondary py-1 px-2 text-admin-accent" onClick={() => handleOpenEdit(courier)}>
                            <Edit2 size={12} />
                          </button>
                          <button className="btn-danger py-1 px-2" onClick={() => handleDelete(cId)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={Math.ceil(filteredCouriers.length / limit) || 1}
            onPageChange={(p) => setPage(p)}
            totalItems={filteredCouriers.length}
            limit={limit}
          />
        </div>
      )}

      {/* Edit / Add Modal with Symmetrical Alignment */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="card-minimal w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-0 shadow-2xl">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-admin-border">
              <h2 className="heading-2 m-0">{editingId ? 'Edit Courier' : 'Add Courier'}</h2>
            </div>
            
            {error && (
              <div className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-lg mb-4 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Row 1: Courier Name & Courier Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Courier Name *</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10"
                    value={formData.courierName}
                    onChange={(e) => { setFormData(prev => ({ ...prev, courierName: e.target.value })); setError(''); }}
                    placeholder="e.g. Blue Dart"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Courier Code *</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10 font-bold uppercase tracking-wider"
                    value={formData.courierCode}
                    onChange={(e) => { setFormData(prev => ({ ...prev, courierCode: e.target.value.toUpperCase() })); setError(''); }}
                    placeholder="e.g. BLUEDART"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Website URL & Tracking URL Template */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Website URL</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="form-label">Tracking URL Template</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10 font-mono"
                    value={formData.trackingUrlTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackingUrlTemplate: e.target.value }))}
                    placeholder="e.g. https://site.com/track?id={trackingNumber}"
                  />
                </div>
              </div>

              {/* Row 3: Supported States & Supported Countries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Supported States (Comma separated)</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10"
                    value={formData.supportedStates}
                    onChange={(e) => setFormData(prev => ({ ...prev, supportedStates: e.target.value }))}
                    placeholder="e.g. Tamil Nadu, Kerala"
                  />
                </div>
                <div>
                  <label className="form-label">Supported Countries (Comma separated)</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10"
                    value={formData.supportedCountries}
                    onChange={(e) => setFormData(prev => ({ ...prev, supportedCountries: e.target.value }))}
                    placeholder="e.g. India"
                  />
                </div>
              </div>

              {/* Row 4: Max Weight & Max Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Max Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control text-xs h-10"
                    value={formData.maxWeight}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxWeight: Number(e.target.value) }))}
                    placeholder="0 for unlimited"
                  />
                </div>
                <div>
                  <label className="form-label">Max Dimensions (L × W × H)</label>
                  <input
                    type="text"
                    className="form-control text-xs h-10"
                    value={formData.maxDimensions}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDimensions: e.target.value }))}
                    placeholder="e.g. 50×50×50 cm"
                  />
                </div>
              </div>

              {/* Row 5: Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control text-xs h-10"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-admin-border">
                <button
                  type="button"
                  className="btn-secondary text-xs py-2 px-4"
                  onClick={() => { setIsOpen(false); showToast('Courier action cancelled'); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs font-bold py-2 px-5"
                >
                  {editingId ? 'Update Courier' : 'Save Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Couriers;
