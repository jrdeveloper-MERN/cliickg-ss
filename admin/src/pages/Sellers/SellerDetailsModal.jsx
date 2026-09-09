import React, { useState } from 'react';
import Modal from '../../components/Common/Modal';
import sellerService from '../../services/sellerService';
import { CheckCircle2, XCircle, Ban, Edit2, Save, Building, MapPin, Calendar, AlertCircle } from 'lucide-react';

const SellerDetailsModal = ({ isOpen, onClose, seller, onRefresh, showToast }) => {
  if (!seller) return null;

  const [activeTab, setActiveTab] = useState('details');
  const [loadingAction, setLoadingAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Edit Form State
  const [businessName, setBusinessName] = useState(seller.businessName || '');
  const [sellerType, setSellerType] = useState(seller.sellerType || '');
  const [gstNumber, setGstNumber] = useState(seller.gstNumber || '');
  const [panNumber, setPanNumber] = useState(seller.panNumber || '');
  const [contactPerson, setContactPerson] = useState(seller.contactPerson || '');
  const [email, setEmail] = useState(seller.email || '');
  const [mobileNumber, setMobileNumber] = useState(seller.mobileNumber || '');
  const [businessLocation, setBusinessLocation] = useState(seller.businessLocation || '');
  const [pincode, setPincode] = useState(seller.pincode || '');
  const [productCategory, setProductCategory] = useState(seller.productCategory || '');

  const handleApprove = async () => {
    try {
      setLoadingAction(true);
      const res = await sellerService.approveSeller(seller._id || seller.id);
      if (showToast) showToast(res.message || 'Seller approved successfully', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to approve seller';
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a reason for rejecting this seller application.');
      return;
    }
    try {
      setLoadingAction(true);
      const res = await sellerService.rejectSeller(seller._id || seller.id, rejectionReason.trim());
      if (showToast) showToast(res.message || 'Seller application rejected', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reject seller';
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setLoadingAction(true);
      const res = await sellerService.updateSellerStatus(seller._id || seller.id, newStatus);
      if (showToast) showToast(res.message || `Seller status updated to ${newStatus}`, 'success');
      onRefresh();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update seller status';
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      setLoadingAction(true);
      const payload = {
        businessName,
        sellerType,
        gstNumber,
        panNumber,
        contactPerson,
        email,
        mobileNumber,
        businessLocation,
        pincode,
        productCategory,
      };
      const res = await sellerService.updateSeller(seller._id || seller.id, payload);
      if (showToast) showToast(res.message || 'Seller details updated successfully', 'success');
      onRefresh();
      setActiveTab('details');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update seller details';
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    let badgeClass = 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';

    if (s === 'APPROVED') {
      badgeClass = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    } else if (s === 'REJECTED') {
      badgeClass = 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    } else if (s === 'SUSPENDED') {
      badgeClass = 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-neutral-700';
    }

    return (
      <span className={`py-1 px-3 rounded-full text-xs font-bold border inline-block ${badgeClass}`}>
        {s}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Seller Profile: ${seller.sellerId || ''}`} width="720px">
      <div className="flex flex-col gap-5">
        {/* Header Summary Card */}
        <div className="p-4 px-5 bg-admin-subtle rounded-xl border border-admin-border flex justify-between items-center flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h2 className="text-lg font-bold m-0 text-admin-text-primary">
                {seller.businessName}
              </h2>
              {renderStatusBadge(seller.status)}
            </div>
            <div className="text-xs text-admin-text-muted">
              Seller ID: <strong className="text-admin-accent">{seller.sellerId}</strong> • Registered on{' '}
              {new Date(seller.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'edit' ? 'details' : 'edit')}
              className={`btn-secondary text-xs flex items-center gap-1.5 ${
                activeTab === 'edit' ? 'btn-primary' : ''
              }`}
            >
              <Edit2 size={15} />
              {activeTab === 'edit' ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* REJECT WORKFLOW VIEW */}
        {activeTab === 'reject' ? (
          <form onSubmit={handleRejectSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="m-0 text-base font-bold">Reject Seller Application</h3>
            </div>
            <p className="text-xs text-admin-text-muted m-0 leading-relaxed">
              Please state the reason for rejecting <strong>{seller.businessName}</strong>. This explanation will be logged for administrative auditing.
            </p>

            <textarea
              rows={4}
              className="form-control text-xs w-full p-3 resize-y"
              placeholder="e.g. Invalid PAN document format or unverified business location."
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setRejectError('');
              }}
            />
            {rejectError && <div className="text-rose-600 text-xs">{rejectError}</div>}

            <div className="flex justify-end gap-2.5 mt-2.5">
              <button type="button" className="btn-secondary text-xs" onClick={() => setActiveTab('details')}>
                Cancel
              </button>
              <button type="submit" className="btn-danger text-xs flex items-center gap-1.5" disabled={loadingAction}>
                <XCircle size={16} /> Confirm Rejection
              </button>
            </div>
          </form>
        ) : activeTab === 'edit' ? (
          /* EDITABLE PROFILE VIEW */
          <form onSubmit={handleEditSave} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold m-0 mb-1 text-admin-text-primary">Edit Business Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Business Name</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Seller Type</label>
                <select className="form-control text-xs" value={sellerType || 'Seller'} onChange={(e) => setSellerType(e.target.value)}>
                  <option value="Seller">Seller</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">GST Number</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">PAN Number</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Contact Person</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Email Address</label>
                <input
                  type="email"
                  className="form-control text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Mobile Number</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Product Category</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Business Location</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label text-xs font-semibold">Pincode</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-4">
              <button type="button" className="btn-secondary text-xs" onClick={() => setActiveTab('details')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs flex items-center gap-1.5" disabled={loadingAction}>
                <Save size={16} /> Save Changes
              </button>
            </div>
          </form>
        ) : (
          /* READ-ONLY DETAILS VIEW */
          <div className="flex flex-col gap-5">
            {/* Section 1: Business Details */}
            <div className="bg-admin-card rounded-xl p-4 border border-admin-border">
              <h4 className="text-xs font-bold text-admin-text-primary m-0 mb-3 flex items-center gap-1.5 border-b border-admin-border pb-2">
                <Building size={16} className="text-admin-accent" /> Business Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Business Name:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.businessName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Seller Type:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.sellerType}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">PAN Number:</span>
                  <span className="text-xs font-bold text-admin-accent bg-admin-subtle px-2 py-0.5 rounded w-fit">{seller.panNumber}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">GST Number:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.gstNumber || 'Not Provided'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Product Category:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.productCategory}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Agreement Accepted:</span>
                  <span className={`font-semibold ${seller.agreementAccepted ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {seller.agreementAccepted ? 'Yes (Confirmed)' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Location Details */}
            <div className="bg-admin-card rounded-xl p-4 border border-admin-border">
              <h4 className="text-xs font-bold text-admin-text-primary m-0 mb-3 flex items-center gap-1.5 border-b border-admin-border pb-2">
                <MapPin size={16} className="text-admin-accent" /> Contact &amp; Location
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Contact Person:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.contactPerson}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Email Address:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.email}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Mobile Number:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.mobileNumber}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Business Location:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.businessLocation}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Pincode:</span>
                  <span className="font-semibold text-admin-text-primary">{seller.pincode}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Audit & History Metadata */}
            <div className="bg-admin-card rounded-xl p-4 border border-admin-border">
              <h4 className="text-xs font-bold text-admin-text-primary m-0 mb-3 flex items-center gap-1.5 border-b border-admin-border pb-2">
                <Calendar size={16} className="text-admin-accent" /> Audit &amp; History
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Submitted Date:</span>
                  <span className="font-semibold text-admin-text-primary">{new Date(seller.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-admin-text-muted font-medium">Last Updated:</span>
                  <span className="font-semibold text-admin-text-primary">{new Date(seller.updatedAt).toLocaleString()}</span>
                </div>
                {seller.approvedAt && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-admin-text-muted font-medium">Approved At:</span>
                    <span className="font-semibold text-admin-text-primary">{new Date(seller.approvedAt).toLocaleString()}</span>
                  </div>
                )}
                {seller.approvedBy && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-admin-text-muted font-medium">Approved By:</span>
                    <span className="font-semibold text-admin-text-primary">{seller.approvedBy}</span>
                  </div>
                )}
                {seller.rejectedAt && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-admin-text-muted font-medium">Rejected At:</span>
                    <span className="font-semibold text-admin-text-primary">{new Date(seller.rejectedAt).toLocaleString()}</span>
                  </div>
                )}
                {seller.rejectedBy && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-admin-text-muted font-medium">Rejected By:</span>
                    <span className="font-semibold text-admin-text-primary">{seller.rejectedBy}</span>
                  </div>
                )}
                {seller.rejectionReason && (
                  <div className="col-span-full mt-1">
                    <span className="text-[11px] text-admin-text-muted font-medium">Rejection Reason:</span>
                    <div className="p-2.5 px-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-md text-xs mt-1 border border-rose-200 dark:border-rose-900">
                      {seller.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BAR AT BOTTOM */}
            <div className="flex justify-end gap-3 pt-3 border-t border-admin-border">
              {seller.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 border-none"
                    onClick={handleApprove}
                    disabled={loadingAction}
                  >
                    <CheckCircle2 size={16} /> Approve Seller
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-xs inline-flex items-center gap-1.5"
                    onClick={() => setActiveTab('reject')}
                    disabled={loadingAction}
                  >
                    <XCircle size={16} /> Reject Application
                  </button>
                </>
              )}

              {seller.status === 'APPROVED' && (
                <button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 border-none"
                  onClick={() => handleStatusChange('SUSPENDED')}
                  disabled={loadingAction}
                >
                  <Ban size={16} /> Suspend Seller Account
                </button>
              )}

              {seller.status === 'SUSPENDED' && (
                <button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 border-none"
                  onClick={() => handleStatusChange('APPROVED')}
                  disabled={loadingAction}
                >
                  <CheckCircle2 size={16} /> Reactivate Seller Account
                </button>
              )}

              {seller.status === 'REJECTED' && (
                <button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 border-none"
                  onClick={handleApprove}
                  disabled={loadingAction}
                >
                  <CheckCircle2 size={16} /> Re-evaluate &amp; Approve
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SellerDetailsModal;
