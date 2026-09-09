import api from './api';

export const policyService = {
  /**
   * Get all policies for admin management
   */
  async getAllPolicies() {
    const res = await api.get('/admin/policies');
    return res.data;
  },

  /**
   * Get single policy by type for admin editing
   * @param {string} type - 'DELIVERY' | 'PRIVACY' | 'TERMS' | 'RETURN_REFUND'
   */
  async getPolicyByType(type) {
    const res = await api.get(`/admin/policies/${type}`);
    return res.data;
  },

  /**
   * Upsert/update policy by type
   * @param {string} type - 'DELIVERY' | 'PRIVACY' | 'TERMS' | 'RETURN_REFUND'
   * @param {Object} payload - { title, slug, contentJson, contentHtml, isPublished }
   */
  async savePolicy(type, payload) {
    const res = await api.put(`/admin/policies/${type}`, payload);
    return res.data;
  },

  /**
   * Toggle published/draft status of a policy
   * @param {string} type - 'DELIVERY' | 'PRIVACY' | 'TERMS' | 'RETURN_REFUND'
   */
  async togglePolicyStatus(type) {
    const res = await api.patch(`/admin/policies/${type}/status`);
    return res.data;
  },
};

export default policyService;
