import React, { useState, useEffect } from 'react';
import sellerService from '../../services/sellerService';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import SellerDetailsModal from './SellerDetailsModal';
import { Search, RefreshCw, Eye, CheckCircle2, Building } from 'lucide-react';

const SellerList = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [status, setStatus] = useState('ALL');
  const [sellerType, setSellerType] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchSellers();
  }, [page, status]);

  const fetchSellers = async (resetPage = false) => {
    try {
      setLoading(true);
      const p = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      const params = { page: p, limit };
      if (status && status !== 'ALL') params.status = status;
      if (sellerType) params.sellerType = sellerType;
      if (search.trim()) params.search = search.trim();

      const res = await sellerService.getSellers(params);
      setSellers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      if (showToast) showToast('Failed to load seller applications', 'error');
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSellers(true);
  };

  const handleClearFilters = () => {
    setStatus('ALL');
    setSellerType('');
    setSearch('');
    setTimeout(() => {
      fetchSellers(true);
    }, 50);
  };

  const handleOpenDetails = (seller) => {
    setSelectedSeller(seller);
    setIsModalOpen(true);
  };

  const handleQuickApprove = async (e, sellerId) => {
    e.stopPropagation();
    try {
      const res = await sellerService.approveSeller(sellerId);
      if (showToast) showToast(res.message || 'Seller approved successfully', 'success');
      fetchSellers();
    } catch (err) {
      if (showToast) showToast('Failed to approve seller', 'error');
    }
  };

  const renderStatusBadge = (s) => {
    const statusUpper = (s || 'PENDING').toUpperCase();
    let badgeClass = 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';

    if (statusUpper === 'APPROVED') {
      badgeClass = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    } else if (statusUpper === 'REJECTED') {
      badgeClass = 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    } else if (statusUpper === 'SUSPENDED') {
      badgeClass = 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-neutral-700';
    }

    return (
      <span className={`py-1 px-2.5 rounded-full text-xs font-bold border inline-block ${badgeClass}`}>
        {statusUpper}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building size={24} className="text-admin-accent" />
            <h1 className="heading-1 m-0">
              Seller Management
            </h1>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card-minimal p-4 flex flex-col gap-3.5">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatus(st);
                setPage(1);
              }}
              className={`py-1.5 px-3.5 rounded-full text-xs cursor-pointer transition-all ${status === st
                  ? 'btn-primary font-bold'
                  : 'bg-transparent text-admin-text-secondary border border-admin-border font-medium hover:bg-admin-hover'
                }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search & Action Controls */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-wrap">
          <div className="search-box flex-1 min-w-[240px]">
            <Search
              size={16}
              className="text-admin-text-muted shrink-0 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by Seller ID, Business Name, Email, Mobile, PAN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary flex items-center gap-1.5 text-xs">
            <Search size={15} /> Search
          </button>

          <button
            type="button"
            className="btn-secondary flex items-center gap-1.5 text-xs"
            onClick={handleClearFilters}
          >
            <RefreshCw size={15} /> Reset
          </button>
        </form>
      </div>

      {/* Main Sellers Data Table */}
      <div className="card-minimal p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Seller ID</th>
                <th>Business Name</th>
                <th>Type</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Category</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-admin-text-muted">
                    Loading seller applications...
                  </td>
                </tr>
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-admin-text-muted">
                    No seller records found matching the criteria.
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr
                    key={seller.id || seller._id}
                    onClick={() => handleOpenDetails(seller)}
                    className="cursor-pointer"
                  >
                    <td className="font-bold text-admin-accent">
                      {seller.sellerId}
                    </td>
                    <td className="font-semibold text-admin-text-primary">
                      {seller.businessName}
                    </td>
                    <td className="text-admin-text-secondary">{seller.sellerType}</td>
                    <td className="text-admin-text-secondary">{seller.contactPerson}</td>
                    <td className="text-admin-text-secondary">{seller.email}</td>
                    <td className="text-admin-text-secondary">{seller.mobileNumber}</td>
                    <td className="text-admin-text-secondary">{seller.productCategory}</td>
                    <td>{renderStatusBadge(seller.status)}</td>
                    <td className="text-admin-text-muted text-xs">
                      {new Date(seller.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(seller)}
                          title="View Details"
                          className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> Details
                        </button>

                        {seller.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickApprove(e, seller.id || seller._id)}
                            title="Approve Seller"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2 rounded text-xs inline-flex items-center gap-1 border-none cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={total}
          limit={limit}
        />
      </div>

      {/* Seller Details & Approval Modal */}
      {isModalOpen && (
        <SellerDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          seller={selectedSeller}
          onRefresh={fetchSellers}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default SellerList;
