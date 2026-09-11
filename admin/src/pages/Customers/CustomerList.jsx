import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import Modal from '../../components/Common/Modal';
import * as XLSX from 'xlsx';
import { Search, Download, Filter, RefreshCw, Plus, Edit2, Trash2, UserX, UserCheck } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry'
];

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [status, setStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  // Modal State for Edit/Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [custStatus, setCustStatus] = useState('ACTIVE');
  const [fieldErrors, setFieldErrors] = useState({});

  const { showToast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const fetchCustomers = async (resetPage = false) => {
    try {
      setLoading(true);
      const p = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      const params = { page: p, limit, status };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (search) params.search = search;

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchCustomers(true);
  };

  const handleClearFilters = () => {
    setStatus('All');
    setFromDate('');
    setToDate('');
    setSearch('');
    setTimeout(() => {
      fetchCustomers(true);
    }, 50);
  };

  const handleOpenModal = (customer = null) => {
    setFieldErrors({});
    if (customer) {
      const targetId = customer.id || customer._id;
      setEditingId(targetId);
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || customer.mobileNumber || '');
      setAddress1(customer.address1 || (customer.address || '').split(',')[0] || '');
      setAddress2(customer.address2 || '');
      setArea(customer.area || '');
      setLandmark(customer.landmark || '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setPincode(customer.pincode || '');
      setCustStatus(customer.accountStatus || (customer.status === 'Disabled' ? 'DISABLED' : 'ACTIVE'));
    } else {
      setEditingId(null);
      setName('');
      setEmail('');
      setPhone('');
      setAddress1('');
      setAddress2('');
      setArea('');
      setLandmark('');
      setCity('');
      setState('');
      setPincode('');
      setCustStatus('ACTIVE');
    }
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Customer name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!editingId) {
      if (!phone.trim()) {
        errors.phone = 'Mobile number is required.';
      } else {
        const cleanDigits = phone.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
          errors.phone = 'Please enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9).';
        }
      }
    }

    if (pincode && pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit Indian pincode.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      address1: address1.trim(),
      address2: address2.trim(),
      area: area.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      accountStatus: custStatus,
      status: custStatus === 'DISABLED' ? 'Disabled' : 'Active'
    };

    if (!editingId) {
      payload.phone = phone.trim();
    }

    try {
      if (editingId) {
        const res = await api.put(`/customers/${editingId}`, payload);
        setCustomers(customers.map(c => ((c.id || c._id) === editingId ? res.data : c)));
        showToast('Customer updated successfully');
      } else {
        const res = await api.post('/customers', payload);
        setCustomers([res.data, ...customers]);
        showToast('Customer created successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || err.appError?.userMessage || 'Failed to save customer', 'error');
    }
  };

  const handleToggleStatus = async (customer) => {
    const targetId = customer.id || customer._id;
    const isCurrentlyActive = customer.accountStatus === 'ACTIVE' || customer.status === 'Active';
    const action = isCurrentlyActive ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this customer account (${customer.name})?`)) return;

    try {
      const res = await api.patch(`/customers/${targetId}/status`);
      setCustomers(customers.map(c => ((c.id || c._id) === targetId ? res.data : c)));
      showToast(`Customer account ${action}d successfully`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDeleteCustomer = async (customer, isHard = false) => {
    const targetId = customer.id || customer._id;
    const confirmMsg = isHard
      ? `Are you sure you want to PERMANENTLY delete customer (${customer.name})? This action cannot be undone.`
      : `Are you sure you want to delete customer account (${customer.name})? This will soft-delete the record.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const url = isHard ? `/customers/${targetId}?hard=true` : `/customers/${targetId}`;
      const res = await api.delete(url);
      setCustomers(customers.filter(c => (c.id || c._id) !== targetId));
      showToast(res.data?.message || `Customer ${isHard ? 'permanently ' : ''}deleted successfully`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete customer', 'error');
    }
  };

  const handleExportXLSX = () => {
    if (customers.length === 0) {
      showToast('No customer records available to export', 'error');
      return;
    }
    const exportData = customers.map((c, idx) => ({
      'S.No': (page - 1) * limit + idx + 1,
      'Name': c.name,
      'Email': c.email,
      'Mobile': c.phone || c.mobileNumber,
      'Address': c.address || 'N/A',
      'Status': c.isDeleted ? 'Deleted' : (c.accountStatus || c.status),
      'Signup Date': new Date(c.joinedDate || c.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, `Customer_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Exported Customer XLSX report successfully');
  };

  const renderStatusBadge = (customer) => {
    if (customer.isDeleted || customer.status === 'Deleted') {
      return (
        <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 py-1 px-2.5 rounded-full text-xs font-bold">
          Deleted
        </span>
      );
    }
    const isDisabled = customer.accountStatus === 'DISABLED' || customer.status === 'Disabled';
    if (isDisabled) {
      return (
        <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 py-1 px-2.5 rounded-full text-xs font-bold">
          Disabled
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 py-1 px-2.5 rounded-full text-xs font-bold">
        Active
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Customer Management</h1>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Advanced Filters Bar */}
      <div className="card-minimal p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="form-label">Status Filter</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Active &amp; Disabled</option>
              <option value="Active">Active Only</option>
              <option value="Disabled">Disabled Only</option>
              <option value="Deleted">Deleted (Soft-Deleted)</option>
            </select>
          </div>

          <div>
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="search-box w-full sm:w-80">
            <Search size={16} className="text-admin-text-muted shrink-0 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Name, Phone, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2.5 flex-wrap">
            <button className="btn-primary flex items-center gap-1.5" onClick={handleApplyFilters}>
              <Filter size={16} /> Apply Filters
            </button>
            <button className="btn-secondary flex items-center gap-1.5" onClick={handleClearFilters}>
              <RefreshCw size={16} /> Clear All
            </button>
            <button className="btn-secondary flex items-center gap-1.5 text-emerald-600 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" onClick={handleExportXLSX}>
              <Download size={16} /> Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="card-minimal p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Status</th>
                <th>Signup Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center text-admin-text-muted p-6">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-admin-text-muted p-6">No customer accounts found</td></tr>
              ) : (
                customers.map((c, idx) => {
                  const targetId = c.id || c._id;
                  const isActive = c.accountStatus === 'ACTIVE' || c.status === 'Active';
                  return (
                    <tr key={targetId || `cust-${idx}`} className={c.isDeleted ? 'opacity-65' : 'opacity-100'}>
                      <td className="font-semibold text-admin-accent">{(page - 1) * limit + idx + 1}</td>
                      <td className="font-semibold text-admin-text-primary">{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone || c.mobileNumber}</td>
                      <td className="max-w-[240px] truncate" title={[c.address1 || c.address, c.address2, c.area, c.city, c.state, c.pincode].filter(Boolean).join(', ')}>
                        {[c.address1 || c.address, c.address2, c.area, c.city, c.state, c.pincode].filter(Boolean).join(', ') || 'N/A'}
                      </td>
                      <td>{renderStatusBadge(c)}</td>
                      <td>{new Date(c.joinedDate || c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-secondary p-1.5"
                            onClick={() => handleOpenModal(c)}
                            title="Edit Customer"
                            disabled={c.isDeleted}
                          >
                            <Edit2 size={15} className="text-blue-500" />
                          </button>

                          <button
                            type="button"
                            className={`btn-secondary p-1.5 ${isActive ? 'text-amber-600 border-amber-400' : 'text-emerald-600 border-emerald-400'
                              }`}
                            onClick={() => handleToggleStatus(c)}
                            title={isActive ? 'Disable Customer' : 'Enable Customer'}
                            disabled={c.isDeleted}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>

                          {!c.isDeleted ? (
                            <button
                              type="button"
                              className="btn-danger p-1.5"
                              onClick={() => handleDeleteCustomer(c, false)}
                              title="Soft Delete Customer"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-danger p-1.5 bg-rose-700 hover:bg-rose-800 text-white"
                              onClick={() => handleDeleteCustomer(c, true)}
                              title="Permanently Delete Customer (Hard Delete)"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={total}
          limit={limit}
        />
      </div>

      {/* Edit / Add Customer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Customer' : 'Add New Customer'}>
        <form onSubmit={handleSaveCustomer} noValidate className="flex flex-col gap-5">
          <div>
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className={`form-control ${fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Name"
            />
            {fieldErrors.name && (
              <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="text"
              className={`form-control ${fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="demo@example.com"
            />
            {fieldErrors.email && (
              <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div>
            <label className="form-label">
              Mobile / Phone Number * {editingId && <span className="text-xs text-admin-text-muted font-normal">(Read-only)</span>}
            </label>
            <input
              type="text"
              className={`form-control ${editingId ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : ''} ${fieldErrors.phone ? 'border-rose-500 focus:border-rose-500' : ''}`}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="9876543211"
              readOnly={Boolean(editingId)}
              disabled={Boolean(editingId)}
            />
            {fieldErrors.phone && (
              <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                {fieldErrors.phone}
              </span>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2 flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary Customer Profile Address</h4>

            <div>
              <label className="form-label">Address Line 1 / House / Flat No.</label>
              <input type="text" className="form-control" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="House/Flat No., Building Name..." />
            </div>

            <div>
              <label className="form-label">Address Line 2 / Street</label>
              <input type="text" className="form-control" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Street, Colony, Main Road..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Locality / Area</label>
                <input type="text" className="form-control" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Locality or Area name..." />
              </div>

              <div>
                <label className="form-label">Landmark</label>
                <input type="text" className="form-control" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark..." />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">City / District</label>
                <input type="text" className="form-control" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / District" />
              </div>

              <div>
                <label className="form-label">State</label>
                <select
                  className={`form-control ${fieldErrors.state ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: '' }));
                  }}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {fieldErrors.state && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                    {fieldErrors.state}
                  </span>
                )}
              </div>

              <div>
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.pincode ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: '' }));
                  }}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
                {fieldErrors.pincode && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                    {fieldErrors.pincode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Account Status</label>
            <select className="form-control" value={custStatus} onChange={(e) => setCustStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE (Enabled)</option>
              <option value="DISABLED">DISABLED (Access Blocked)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 mt-4">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerList;
