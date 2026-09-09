import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, HelpCircle, Package, Truck } from 'lucide-react';

const Charges = () => {
  const [activeTab, setActiveTab] = useState('charges'); // 'charges' | 'packaging'
  const [charges, setCharges] = useState([]);
  const [zones, setZones] = useState([]);
  const [packagingRules, setPackagingRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delivery Charges Modal State
  const [isChargeOpen, setIsChargeOpen] = useState(false);
  const [editingChargeId, setEditingChargeId] = useState(null);

  // Packaging Modal State
  const [isPkgOpen, setIsPkgOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState(null);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Delivery Charge Form
  const [chargeFormData, setChargeFormData] = useState({
    name: '',
    zoneId: '',
    pricingMethod: 'FLAT',
    baseCharge: 0,
    perKgCharge: 0,
    perItemCharge: 0,
    minWeight: 0,
    maxWeight: 0,
    minQuantity: 0,
    maxQuantity: 0,
    status: 'Active',
    // Delivery Types configurations
    deliveryTypes: {
      Standard: { enabled: true, additionalCharge: 0, estimatedDays: 3 },
      Express: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
      SameDay: { enabled: false, additionalCharge: 0, estimatedDays: 0 },
      NextDay: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
      Scheduled: { enabled: false, additionalCharge: 0, estimatedDays: 3 }
    }
  });

  // Packaging Rule Form
  const [pkgFormData, setPkgFormData] = useState({
    name: '',
    description: '',
    baseAmount: 0,
    gstRate: 0,
    status: 'Active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [chargesRes, zonesRes, pkgRes] = await Promise.all([
        api.get('/shipping/charges').catch(() => ({ data: [] })),
        api.get('/shipping/zones').catch(() => ({ data: [] })),
        api.get('/shipping/packaging').catch(() => ({ data: [] }))
      ]);
      setCharges(chargesRes.data || []);
      setZones(zonesRes.data || []);
      setPackagingRules(pkgRes.data?.data || pkgRes.data || []);
    } catch (err) {
      console.error('Failed to load shipping data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // --- CHARGES HANDLERS ---
  const handleDeleteCharge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery charge rule?')) return;
    try {
      await api.delete(`/shipping/charges/${id}`);
      setCharges(prev => prev.filter(c => (c._id || c.id) !== id));
      showToast('Rule deleted successfully!');
    } catch (err) {
      showToast('Failed to delete rule.');
    }
  };

  const handleOpenAddCharge = () => {
    setEditingChargeId(null);
    setChargeFormData({
      name: '',
      zoneId: '',
      pricingMethod: 'FLAT',
      baseCharge: 0,
      perKgCharge: 0,
      perItemCharge: 0,
      minWeight: 0,
      maxWeight: 0,
      minQuantity: 0,
      maxQuantity: 0,
      status: 'Active',
      deliveryTypes: {
        Standard: { enabled: true, additionalCharge: 0, estimatedDays: 3 },
        Express: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
        SameDay: { enabled: false, additionalCharge: 0, estimatedDays: 0 },
        NextDay: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
        Scheduled: { enabled: false, additionalCharge: 0, estimatedDays: 3 }
      }
    });
    setError('');
    setIsChargeOpen(true);
  };

  const handleOpenEditCharge = (rule) => {
    const rId = rule._id || rule.id;
    setEditingChargeId(rId);

    const initialDeliveryTypes = {
      Standard: { enabled: true, additionalCharge: 0, estimatedDays: 3 },
      Express: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
      SameDay: { enabled: false, additionalCharge: 0, estimatedDays: 0 },
      NextDay: { enabled: false, additionalCharge: 0, estimatedDays: 1 },
      Scheduled: { enabled: false, additionalCharge: 0, estimatedDays: 3 }
    };

    const rawTypes = typeof rule.deliveryTypes === 'string' ? JSON.parse(rule.deliveryTypes) : rule.deliveryTypes;
    const mergedDeliveryTypes = {
      Standard: { ...initialDeliveryTypes.Standard, ...(rawTypes?.Standard || {}) },
      Express: { ...initialDeliveryTypes.Express, ...(rawTypes?.Express || {}) },
      SameDay: { ...initialDeliveryTypes.SameDay, ...(rawTypes?.SameDay || {}) },
      NextDay: { ...initialDeliveryTypes.NextDay, ...(rawTypes?.NextDay || {}) },
      Scheduled: { ...initialDeliveryTypes.Scheduled, ...(rawTypes?.Scheduled || {}) }
    };

    setChargeFormData({
      name: rule.name || '',
      zoneId: rule.zoneId?._id || rule.zoneId?.id || rule.zone?.id || rule.zone?._id || (typeof rule.zoneId === 'string' ? rule.zoneId : ''),
      pricingMethod: rule.pricingMethod || 'FLAT',
      baseCharge: Number(rule.baseCharge || 0),
      perKgCharge: Number(rule.perKgCharge || 0),
      perItemCharge: Number(rule.perItemCharge || 0),
      minWeight: Number(rule.minWeight || 0),
      maxWeight: Number(rule.maxWeight || 0),
      minQuantity: Number(rule.minQuantity || 0),
      maxQuantity: Number(rule.maxQuantity || 0),
      status: rule.status || 'Active',
      deliveryTypes: mergedDeliveryTypes
    });
    setError('');
    setIsChargeOpen(true);
  };

  const handleSubmitCharge = async (e) => {
    e.preventDefault();
    if (!chargeFormData.zoneId) {
      setError('Please select a Delivery Zone.');
      return;
    }

    const selectedZone = zones.find(z => (z._id || z.id) === chargeFormData.zoneId);
    const zoneNameStr = selectedZone ? (selectedZone.zoneName || selectedZone.name || 'Zone Charge') : 'Delivery Charge';
    const payload = {
      ...chargeFormData,
      name: chargeFormData.name || `${zoneNameStr} Charge`
    };

    try {
      if (editingChargeId) {
        const res = await api.put(`/shipping/charges/${editingChargeId}`, payload);
        setCharges(prev => prev.map(c => ((c._id || c.id) === editingChargeId ? res.data : c)));
        showToast('Delivery charge rule updated!');
      } else {
        const res = await api.post('/shipping/charges', payload);
        setCharges(prev => [res.data, ...prev]);
        showToast('Delivery charge rule created!');
      }
      setIsChargeOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save rule.');
    }
  };

  // --- PACKAGING HANDLERS ---
  const handleDeletePkg = async (id) => {
    if (!window.confirm('Are you sure you want to delete this packaging rule?')) return;
    try {
      await api.delete(`/shipping/packaging/${id}`);
      setPackagingRules(prev => prev.filter(p => (p._id || p.id) !== id));
      showToast('Packaging rule deleted!');
    } catch (err) {
      showToast('Failed to delete packaging rule.');
    }
  };

  const handleOpenAddPkg = () => {
    setEditingPkgId(null);
    setPkgFormData({
      name: '',
      description: '',
      baseAmount: 0,
      gstRate: 0,
      status: 'Active',
    });
    setError('');
    setIsPkgOpen(true);
  };

  const handleOpenEditPkg = (pkg) => {
    const pId = pkg._id || pkg.id;
    setEditingPkgId(pId);
    setPkgFormData({
      name: pkg.name || '',
      description: pkg.description || pkg.boxSize || '',
      baseAmount: Number(pkg.baseAmount ?? pkg.charge ?? 50),
      gstRate: Number(pkg.gstRate ?? 18),
      status: pkg.status || 'Active',
    });
    setError('');
    setIsPkgOpen(true);
  };

  const handleSubmitPkg = async (e) => {
    e.preventDefault();
    if (!pkgFormData.name) {
      setError('Packaging Name is required.');
      return;
    }

    const payload = {
      ...pkgFormData,
      charge: pkgFormData.baseAmount,
      boxSize: pkgFormData.description
    };

    try {
      if (editingPkgId) {
        const res = await api.put(`/shipping/packaging/${editingPkgId}`, payload);
        setPackagingRules(prev => prev.map(p => ((p._id || p.id) === editingPkgId ? res.data : p)));
        showToast('Packaging option updated!');
      } else {
        const res = await api.post('/shipping/packaging', payload);
        setPackagingRules(prev => [res.data, ...prev]);
        showToast('Packaging option created!');
      }
      setIsPkgOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save packaging option.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 bg-emerald-500 text-white py-3 px-6 rounded-md z-[1000] font-semibold shadow-lg text-xs">
          {toast}
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Delivery Charges &amp; Options</h1>
        </div>
        <div>
          {activeTab === 'charges' ? (
            <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={handleOpenAddCharge}>
              <Plus size={14} /> Add Delivery Charge
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-1.5 text-xs" onClick={handleOpenAddPkg}>
              <Plus size={14} /> Add Packaging Option
            </button>
          )}
        </div>
      </div>

      {/* Top Level Navigation Tabs */}
      <div className="flex gap-3 border-b-2 border-admin-border pb-0.5">
        <button
          onClick={() => setActiveTab('charges')}
          className={`py-2.5 px-5 font-bold text-sm bg-transparent cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'charges' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-admin-text-secondary hover:text-admin-text-primary'
          }`}
        >
          <Truck size={16} /> Delivery Charges
        </button>

        <button
          onClick={() => setActiveTab('packaging')}
          className={`py-2.5 px-5 font-bold text-sm bg-transparent cursor-pointer flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'packaging' ? 'border-admin-accent text-admin-accent' : 'border-transparent text-admin-text-secondary hover:text-admin-text-primary'
          }`}
        >
          <Package size={16} /> Packaging Options
        </button>
      </div>

      {/* TAB 1: DELIVERY CHARGES */}
      {activeTab === 'charges' && (
        <>
          {loading ? (
            <div className="text-center text-admin-text-muted py-8 text-xs">Loading delivery charges...</div>
          ) : charges.length === 0 ? (
            <div className="text-center text-admin-text-muted py-8 text-xs">No delivery charge rules defined yet. Click "Add Delivery Charge" to create one.</div>
          ) : (
            <div className="card-minimal p-6">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Delivery Zone</th>
                      <th>Pricing Method</th>
                      <th>Rate Summary</th>
                      <th>Active Delivery Types</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map(rule => {
                      const rId = rule._id || rule.id;
                      const zoneName = rule.zone?.name || rule.zoneId?.name || rule.zoneId?.zoneName || 'Global / All Zones';
                      const method = rule.pricingMethod || 'FLAT';

                      let rateSummary = `₹${rule.baseCharge || 0}`;
                      if (method === 'PER_KG') {
                        rateSummary = `Base: ₹${rule.baseCharge || 0} + ₹${rule.perKgCharge || 0}/kg`;
                        if (rule.maxWeight > 0) rateSummary += ` (${rule.minWeight || 0}-${rule.maxWeight} kg)`;
                      } else if (method === 'PER_ITEM') {
                        rateSummary = `₹${rule.perItemCharge || 0} / item`;
                        if (rule.maxQuantity > 0) rateSummary += ` (${rule.minQuantity || 0}-${rule.maxQuantity} qty)`;
                      }

                      const activeDeliveryTypes = rule.deliveryTypes
                        ? Object.entries(rule.deliveryTypes)
                          .filter(([_, cfg]) => cfg?.enabled)
                          .map(([type, cfg]) => `${type} (+₹${cfg?.additionalCharge || cfg?.baseCharge || 0})`)
                          .join(', ')
                        : 'Standard, Express';

                      return (
                        <tr key={rId}>
                          <td className="font-semibold text-admin-text-primary">{rule.name}</td>
                          <td className="text-xs text-admin-text-secondary">{zoneName}</td>
                          <td>
                            <span className={`badge ${method === 'FLAT' ? 'badge-accent' : method === 'PER_KG' ? 'badge-warning' : 'badge-success'}`}>
                              {method}
                            </span>
                          </td>
                          <td className="text-xs font-medium text-admin-text-primary">
                            {rateSummary}
                          </td>
                          <td className="text-xs text-admin-text-secondary max-w-[200px] truncate" title={activeDeliveryTypes}>
                            {activeDeliveryTypes || 'Standard'}
                          </td>
                          <td>
                            <span className={`badge ${(rule.status || 'Active') === 'Active' ? 'badge-success' : 'badge-danger'}`}>{rule.status || 'Active'}</span>
                          </td>
                          <td className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button className="btn-secondary py-1 px-2 text-admin-accent" onClick={() => handleOpenEditCharge(rule)}>
                                <Edit2 size={12} />
                              </button>
                              <button className="btn-danger py-1 px-2" onClick={() => handleDeleteCharge(rId)}>
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
        </>
      )}

      {/* TAB 2: PACKAGING OPTIONS */}
      {activeTab === 'packaging' && (
        <>
          {loading ? (
            <div className="text-center text-admin-text-muted py-8 text-xs">Loading packaging rules...</div>
          ) : packagingRules.length === 0 ? (
            <div className="text-center text-admin-text-muted py-8 text-xs">No packaging options configured. Click "Add Packaging Option" to create one.</div>
          ) : (
            <div className="card-minimal p-6">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Option Name</th>
                      <th>Description</th>
                      <th>Base Amount</th>
                      <th>GST Rate (%)</th>
                      <th>Total Price</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packagingRules.map(pkg => {
                      const pId = pkg._id || pkg.id;
                      const base = Number(pkg.baseAmount ?? pkg.charge ?? 0);
                      const gst = Number(pkg.gstRate ?? 18);
                      const total = (base + (base * gst / 100)).toFixed(2);

                      return (
                        <tr key={pId}>
                          <td className="font-semibold text-admin-text-primary">{pkg.name}</td>
                          <td className="text-xs text-admin-text-secondary">{pkg.description || pkg.boxSize || 'N/A'}</td>
                          <td className="font-semibold text-xs text-admin-text-primary">₹{base.toFixed(2)}</td>
                          <td className="text-xs text-admin-text-secondary">{gst}%</td>
                          <td className="font-bold text-xs text-admin-accent">₹{total}</td>
                          <td>
                            <span className={`badge ${(pkg.status || 'Active') === 'Active' ? 'badge-success' : 'badge-danger'}`}>{pkg.status || 'Active'}</span>
                          </td>
                          <td className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button className="btn-secondary py-1 px-2 text-admin-accent" onClick={() => handleOpenEditPkg(pkg)}>
                                <Edit2 size={12} />
                              </button>
                              <button className="btn-danger py-1 px-2" onClick={() => handleDeletePkg(pId)}>
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
        </>
      )}

      {/* DELIVERY CHARGE MODAL */}
      {isChargeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="card-minimal w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-0">
            <h2 className="heading-2 mb-4">{editingChargeId ? 'Edit Delivery Charge Rule' : 'Create Delivery Charge Rule'}</h2>

            {error && <div className="text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded mb-3 text-xs">{error}</div>}

            <form onSubmit={handleSubmitCharge} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Select Delivery Zone *</label>
                  <select
                    className="form-control text-xs"
                    value={chargeFormData.zoneId}
                    onChange={(e) => setChargeFormData(prev => ({ ...prev, zoneId: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Delivery Zone --</option>
                    {zones.map(z => {
                      const zId = z._id || z.id;
                      const zName = z.zoneName || z.name || 'Unnamed Zone';
                      return (
                        <option key={zId} value={zId}>{zName}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="form-label">Pricing Method *</label>
                  <select
                    className="form-control text-xs"
                    value={chargeFormData.pricingMethod}
                    onChange={(e) => setChargeFormData(prev => ({ ...prev, pricingMethod: e.target.value }))}
                    required
                  >
                    <option value="FLAT">FLAT (Fixed Shipping Fee)</option>
                    <option value="PER_KG">PER_KG (Base Fee + Rate per KG)</option>
                    <option value="PER_ITEM">PER_ITEM (Rate per Item Quantity)</option>
                  </select>
                </div>
              </div>

              {/* Fetched Zone Pincodes Details Box */}
              {chargeFormData.zoneId && (() => {
                const selZone = zones.find(z => (z._id || z.id) === chargeFormData.zoneId);
                if (!selZone) return null;
                const incPincodes = Array.isArray(selZone.pincodes) ? selZone.pincodes.join(', ') : (selZone.pincodes || 'All / State level');
                const excPincodes = Array.isArray(selZone.exclusivePincodes) ? selZone.exclusivePincodes.join(', ') : (selZone.exclusivePincodes || 'None');
                return (
                  <div className="bg-admin-subtle border border-admin-border rounded-md p-3 text-xs">
                    <div className="font-bold text-admin-text-primary mb-1">
                      Connected Zone Location Details ({selZone.zoneName || selZone.name})
                    </div>
                    <div className="text-emerald-600 mb-0.5">
                      <strong>Inclusive Pincodes (Applies to):</strong> {incPincodes || 'All Pincodes in ' + (selZone.state || 'State')}
                    </div>
                    {excPincodes && excPincodes !== 'None' && (
                      <div className="text-rose-500">
                        <strong>Exclusive Pincodes (Blocked):</strong> {excPincodes}
                      </div>
                    )}
                  </div>
                );
              })()}

              {chargeFormData.pricingMethod === 'FLAT' && (
                <div>
                  <label className="form-label">Base Charge (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control text-xs"
                    value={chargeFormData.baseCharge}
                    onChange={(e) => setChargeFormData(prev => ({ ...prev, baseCharge: Number(e.target.value) }))}
                    required
                  />
                </div>
              )}

              {chargeFormData.pricingMethod === 'PER_KG' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Base Charge (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control text-xs"
                      value={chargeFormData.baseCharge}
                      onChange={(e) => setChargeFormData(prev => ({ ...prev, baseCharge: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Per KG Charge (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control text-xs"
                      value={chargeFormData.perKgCharge}
                      onChange={(e) => setChargeFormData(prev => ({ ...prev, perKgCharge: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
              )}

              {chargeFormData.pricingMethod === 'PER_ITEM' && (
                <div>
                  <label className="form-label">Per Item Charge (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control text-xs"
                    value={chargeFormData.perItemCharge}
                    onChange={(e) => setChargeFormData(prev => ({ ...prev, perItemCharge: Number(e.target.value) }))}
                    required
                  />
                </div>
              )}

              {/* Delivery Options Configuration Grid */}
              <div className="border border-admin-border rounded-md p-4 bg-admin-subtle">
                <h4 className="text-xs font-bold border-b border-admin-border pb-1.5 mb-3 text-admin-text-primary">
                  Delivery Options Configuration (Standard, Express, Same Day, Next Day, Scheduled)
                </h4>

                <div className="flex flex-col gap-2.5">
                  {['Standard', 'Express', 'SameDay', 'NextDay', 'Scheduled'].map(type => {
                    const cfg = chargeFormData.deliveryTypes?.[type] || { enabled: false, additionalCharge: 0, estimatedDays: 1 };
                    return (
                      <div key={type} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                        <span className="font-semibold text-xs text-admin-text-primary">
                          {type === 'SameDay' ? 'Same Day' : type === 'NextDay' ? 'Next Day' : type}
                        </span>

                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setChargeFormData(prev => ({
                                ...prev,
                                deliveryTypes: {
                                  ...prev.deliveryTypes,
                                  [type]: { ...cfg, enabled: isChecked }
                                }
                              }));
                            }}
                          />
                          Enabled
                        </label>

                        <div>
                          <label className="text-[10px] block text-admin-text-muted">Additional Charge (₹)</label>
                          <input
                            type="number"
                            className="form-control text-xs"
                            value={cfg.additionalCharge || 0}
                            disabled={!cfg.enabled}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setChargeFormData(prev => ({
                                ...prev,
                                deliveryTypes: {
                                  ...prev.deliveryTypes,
                                  [type]: { ...cfg, additionalCharge: val }
                                }
                              }));
                            }}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] block text-admin-text-muted">Est. Days</label>
                          <input
                            type="number"
                            className="form-control text-xs"
                            value={cfg.estimatedDays || 0}
                            disabled={!cfg.enabled}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setChargeFormData(prev => ({
                                ...prev,
                                deliveryTypes: {
                                  ...prev.deliveryTypes,
                                  [type]: { ...cfg, estimatedDays: val }
                                }
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  className="form-control text-xs"
                  value={chargeFormData.status}
                  onChange={(e) => setChargeFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-secondary text-xs" onClick={() => { setIsChargeOpen(false); showToast('Rule action cancelled', 'warn'); }}>Cancel</button>
                <button type="submit" className="btn-primary text-xs">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKAGING MODAL */}
      {isPkgOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="card-minimal w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-0">
            <h2 className="heading-2 mb-4">{editingPkgId ? 'Edit Packaging Option' : 'Create Packaging Option'}</h2>

            {error && <div className="text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded mb-3 text-xs">{error}</div>}

            <form onSubmit={handleSubmitPkg} className="flex flex-col gap-4">
              <div>
                <label className="form-label">Packaging Name *</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={pkgFormData.name}
                  onChange={(e) => setPkgFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Premium Velvet Gift Box"
                  required
                />
              </div>

              <div>
                <label className="form-label">Description / Size</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={pkgFormData.description}
                  onChange={(e) => setPkgFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Includes ribbon and satin pouch"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Base Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control text-xs"
                    value={pkgFormData.baseAmount}
                    onChange={(e) => setPkgFormData(prev => ({ ...prev, baseAmount: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">GST Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control text-xs"
                    value={pkgFormData.gstRate}
                    onChange={(e) => setPkgFormData(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  className="form-control text-xs"
                  value={pkgFormData.status}
                  onChange={(e) => setPkgFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-secondary text-xs" onClick={() => { setIsPkgOpen(false); showToast('Packaging action cancelled', 'warn'); }}>Cancel</button>
                <button type="submit" className="btn-primary text-xs">Save Packaging Option</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charges;
