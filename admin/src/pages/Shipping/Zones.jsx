import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, Search, Check, X, ShieldAlert, Globe, MapPin } from 'lucide-react';

const Zones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    zoneName: '',
    zoneType: 'Domestic',
    country: 'India',
    state: '',
    district: '',
    pincodes: '',
    exclusivePincodes: '',
    status: 'Active',
    description: '',
    serviceable: true,
  });

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await api.get('/shipping/zones');
      setZones(res.data || []);
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleToggleStatus = async (zone) => {
    const zId = zone._id || zone.id;
    try {
      const res = await api.patch(`/shipping/zones/${zId}/status`);
      setZones(prev => prev.map(z => ((z._id || z.id) === zId ? res.data : z)));
      showToast('Zone status toggled successfully!');
    } catch (err) {
      showToast('Failed to toggle status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      await api.delete(`/shipping/zones/${id}`);
      setZones(prev => prev.filter(z => (z._id || z.id) !== id));
      showToast('Zone deleted successfully!');
    } catch (err) {
      showToast('Failed to delete zone.');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      zoneName: '',
      zoneType: 'Domestic',
      country: 'India',
      state: '',
      district: '',
      pincodes: '',
      exclusivePincodes: '',
      status: 'Active',
      description: '',
      serviceable: true,
    });
    setError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (zone) => {
    const zId = zone._id || zone.id;
    const zState = zone.state || (Array.isArray(zone.states) ? zone.states.join(', ') : zone.states) || '';
    const zType = (zone.zoneType || zone.type || 'Domestic') === 'International' ? 'International' : 'Domestic';
    
    setEditingId(zId);
    setFormData({
      zoneName: zone.zoneName || zone.name || '',
      zoneType: zType,
      country: zone.country || (zType === 'Domestic' ? 'India' : ''),
      state: zState,
      district: zone.district || '',
      pincodes: Array.isArray(zone.pincodes) ? zone.pincodes.join(', ') : (zone.pincodes || ''),
      exclusivePincodes: Array.isArray(zone.exclusivePincodes) ? zone.exclusivePincodes.join(', ') : (zone.exclusivePincodes || ''),
      status: zone.status || 'Active',
      description: zone.description || '',
      serviceable: zone.serviceable !== false,
    });
    setError('');
    setIsOpen(true);
  };

  const validatePincodeList = (rawString, fieldName = 'Pincodes') => {
    if (!rawString || !rawString.trim()) {
      return { valid: false, message: `${fieldName} is required. Please enter at least one valid numeric pincode.` };
    }
    const items = rawString.split(',').map(p => p.trim()).filter(Boolean);
    if (items.length === 0) {
      return { valid: false, message: `${fieldName} is required. Please enter at least one valid numeric pincode.` };
    }
    for (const item of items) {
      if (!/^\d+$/.test(item)) {
        return { 
          valid: false, 
          message: `${fieldName} must contain numbers only separated by commas. Invalid entry found: '${item}'` 
        };
      }
    }
    return { valid: true, items };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Zone Name Validation
    if (!formData.zoneName.trim()) {
      setError('Zone Name is required.');
      return;
    }

    // 2. Zone Type Validation
    if (!formData.zoneType) {
      setError('Zone Type is required.');
      return;
    }

    // 3. Conditional State/Country Validation
    if (formData.zoneType === 'Domestic' && !formData.state.trim()) {
      setError('State / Union Territory is required for Domestic zones.');
      return;
    }

    if (formData.zoneType === 'International' && !formData.country.trim()) {
      setError('Country is required for International zones.');
      return;
    }

    // 4. Strict Numeric Pincode Validation for Inclusive Pincodes
    const incValidation = validatePincodeList(formData.pincodes, 'Inclusive Pincodes');
    if (!incValidation.valid) {
      setError(incValidation.message);
      return;
    }

    // 5. Strict Numeric Pincode Validation for Exclusive Pincodes (if provided)
    let excPincodesList = [];
    if (formData.exclusivePincodes && formData.exclusivePincodes.trim()) {
      const excValidation = validatePincodeList(formData.exclusivePincodes, 'Exclusive Blocklist Pincodes');
      if (!excValidation.valid) {
        setError(excValidation.message);
        return;
      }
      excPincodesList = excValidation.items;
    }

    const payload = {
      ...formData,
      country: formData.zoneType === 'Domestic' ? (formData.country || 'India') : formData.country,
      pincodes: incValidation.items,
      exclusivePincodes: excPincodesList
    };

    try {
      if (editingId) {
        const res = await api.put(`/shipping/zones/${editingId}`, payload);
        setZones(prev => prev.map(z => ((z._id || z.id) === editingId ? res.data : z)));
        showToast('Zone updated successfully!');
      } else {
        const res = await api.post('/shipping/zones', payload);
        setZones(prev => [res.data, ...prev]);
        showToast('Zone created successfully!');
      }
      setIsOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save zone.');
    }
  };

  // Filtered List
  const filteredZones = zones.filter(zone => {
    const query = search.toLowerCase();
    const nameMatch = (zone.zoneName || zone.name || '').toLowerCase().includes(query) ||
      (zone.state || (Array.isArray(zone.states) ? zone.states.join(' ') : '') || '').toLowerCase().includes(query) ||
      (zone.district || '').toLowerCase().includes(query) ||
      (zone.country || '').toLowerCase().includes(query);
    const typeMatch = !typeFilter || (zone.zoneType || zone.type) === typeFilter;
    const statusMatch = !statusFilter || (zone.status || 'Active') === statusFilter;
    return nameMatch && typeMatch && statusMatch;
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
          <h1 className="heading-1">Delivery Zones</h1>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-xs font-semibold" onClick={handleOpenAdd}>
          <Plus size={15} /> Add Zone
        </button>
      </div>

      {/* Filter & Search Toolbar with Integrated Search Container */}
      <div className="card-minimal p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="search-box flex-1 min-w-[280px]">
          <Search size={16} className="text-admin-text-muted shrink-0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by zone name, state, district, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <select
            className="form-control text-xs h-10 w-auto min-w-[150px] rounded"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Zone Types</option>
            <option value="Domestic">Domestic</option>
            <option value="International">International</option>
          </select>

          <select
            className="form-control text-xs h-10 w-auto min-w-[140px] rounded"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="text-center text-admin-text-muted py-8 text-xs">Loading delivery zones...</div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center text-admin-text-muted py-8 text-xs">No delivery zones found.</div>
      ) : (
        <div className="card-minimal p-6">
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone Name</th>
                  <th>Type</th>
                  <th>State / Country</th>
                  <th>Inclusive Pincodes</th>
                  <th>Exclusive Blocklist</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map(zone => {
                  const zId = zone._id || zone.id;
                  const zName = zone.zoneName || zone.name || 'Unnamed Zone';
                  const zType = (zone.zoneType || zone.type || 'Domestic') === 'International' ? 'International' : 'Domestic';
                  const zLocation = zType === 'Domestic' 
                    ? (zone.state || (Array.isArray(zone.states) ? zone.states.join(', ') : zone.states) || 'India')
                    : (zone.country || 'International');
                  const incPincodes = Array.isArray(zone.pincodes) ? zone.pincodes.join(', ') : (zone.pincodes || '-');
                  const excPincodes = Array.isArray(zone.exclusivePincodes) ? zone.exclusivePincodes.join(', ') : (zone.exclusivePincodes || 'None');

                  return (
                    <tr key={zId}>
                      <td className="font-semibold text-admin-text-primary">{zName}</td>
                      <td>
                        <span className={`badge ${zType === 'Domestic' ? 'badge-accent' : 'badge-secondary'}`}>
                          {zType}
                        </span>
                      </td>
                      <td className="text-xs text-admin-text-secondary">
                        <div className="flex items-center gap-1.5">
                          {zType === 'Domestic' ? <MapPin size={13} className="text-admin-accent shrink-0" /> : <Globe size={13} className="text-amber-500 shrink-0" />}
                          <span>{zLocation}</span>
                        </div>
                      </td>
                      <td className="text-xs text-admin-text-secondary max-w-[220px] truncate" title={incPincodes}>
                        {incPincodes}
                      </td>
                      <td className="text-xs text-rose-500 max-w-[160px] truncate" title={excPincodes}>
                        {excPincodes !== 'None' && <ShieldAlert size={12} className="inline mr-1" />}
                        {excPincodes}
                      </td>
                      <td>
                        <span
                          onClick={() => handleToggleStatus(zone)}
                          title="Click to toggle status"
                          className={`badge cursor-pointer ${(zone.status || 'Active') === 'Active' ? 'badge-success' : 'badge-danger'}`}
                        >
                          {zone.status || 'Active'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button className="btn-secondary py-1 px-2 text-admin-accent" onClick={() => handleOpenEdit(zone)}>
                            <Edit2 size={12} />
                          </button>
                          <button className="btn-danger py-1 px-2" onClick={() => handleDelete(zId)}>
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
        </div>
      )}

      {/* Edit / Add Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="card-minimal w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 m-0 shadow-2xl">
            <h2 className="heading-2 mb-4">{editingId ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</h2>
            
            {error && (
              <div className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-lg mb-4 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="form-label">Zone Name *</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={formData.zoneName}
                    onChange={(e) => { setFormData(prev => ({ ...prev, zoneName: e.target.value })); setError(''); }}
                    placeholder="e.g. Tamil Nadu Metro Zone"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Zone Type *</label>
                  <select
                    className="form-control text-xs"
                    value={formData.zoneType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        zoneType: newType,
                        country: newType === 'Domestic' ? 'India' : (prev.country === 'India' ? '' : prev.country)
                      }));
                      setError('');
                    }}
                    required
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="International">International</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs based on Zone Type (Clean layout without grey box or redundant headers) */}
              {formData.zoneType === 'Domestic' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="form-label">State / Union Territory *</label>
                    <input
                      type="text"
                      className="form-control text-xs"
                      value={formData.state}
                      onChange={(e) => { setFormData(prev => ({ ...prev, state: e.target.value })); setError(''); }}
                      placeholder="e.g. Tamil Nadu"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">District (Optional)</label>
                    <input
                      type="text"
                      className="form-control text-xs"
                      value={formData.district}
                      onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="e.g. Chennai"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="form-label">Country *</label>
                    <input
                      type="text"
                      className="form-control text-xs"
                      value={formData.country}
                      onChange={(e) => { setFormData(prev => ({ ...prev, country: e.target.value })); setError(''); }}
                      placeholder="e.g. United States, Singapore, UAE"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">State / Province / Region (Optional)</label>
                    <input
                      type="text"
                      className="form-control text-xs"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. California, Dubai, London"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">
                  Inclusive Pincodes / Postal Codes *
                  <span className="font-normal text-rose-500 text-[11px] ml-1.5">(Numbers Only, comma separated)</span>
                </label>
                <textarea
                  className="form-control text-xs font-mono"
                  rows={3}
                  value={formData.pincodes}
                  onChange={(e) => { setFormData(prev => ({ ...prev, pincodes: e.target.value })); setError(''); }}
                  placeholder="e.g. 600001, 600002, 600028"
                  required
                />
                <p className="text-[11px] text-admin-text-muted mt-1">Enter serviceable numeric postal codes separated by commas.</p>
              </div>

              <div>
                <label className="form-label">
                  Exclusive / Blocked Pincodes
                  <span className="font-normal text-rose-500 text-[11px] ml-1.5">(Numbers Only, Optional Blocklist)</span>
                </label>
                <textarea
                  className="form-control text-xs font-mono"
                  rows={2}
                  value={formData.exclusivePincodes}
                  onChange={(e) => { setFormData(prev => ({ ...prev, exclusivePincodes: e.target.value })); setError(''); }}
                  placeholder="e.g. 600048, 600099"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control text-xs"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Description (Optional)</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Internal notes about this zone"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-admin-border">
                <button type="button" className="btn-secondary text-xs" onClick={() => { setIsOpen(false); showToast('Zone action cancelled'); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-bold">
                  {editingId ? 'Update Zone' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Zones;
