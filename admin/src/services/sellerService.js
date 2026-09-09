import api from './api';

export const sellerService = {
  // Get paginated list of seller applications with filters (page, limit, search, status, sellerType)
  async getSellers(params = {}) {
    const res = await api.get('/sellers', { params });
    return res.data;
  },

  // Get seller details by ID or sellerId
  async getSeller(id) {
    const res = await api.get(`/sellers/${id}`);
    return res.data;
  },

  // Approve seller application
  async approveSeller(id) {
    const res = await api.patch(`/sellers/${id}/approve`);
    return res.data;
  },

  // Reject seller application with mandatory reason
  async rejectSeller(id, rejectionReason) {
    const res = await api.patch(`/sellers/${id}/reject`, { rejectionReason });
    return res.data;
  },

  // Update seller account status (PENDING, APPROVED, REJECTED, SUSPENDED)
  async updateSellerStatus(id, status) {
    const res = await api.patch(`/sellers/${id}/status`, { status });
    return res.data;
  },

  // Update editable seller business details
  async updateSeller(id, payload) {
    const res = await api.patch(`/sellers/${id}`, payload);
    return res.data;
  },
};

export default sellerService;
