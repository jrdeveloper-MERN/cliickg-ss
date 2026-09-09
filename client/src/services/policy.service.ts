import apiClient from './api-client';
import { Policy, PolicyType } from '../types/policy/policy.types';

export const policyService = {
  /**
   * Get single published policy by type or slug
   * @param typeOrSlug - e.g. 'DELIVERY', 'privacy-policy', etc.
   */
  async getPolicy(typeOrSlug: string): Promise<Policy | null> {
    try {
      const res = await apiClient.get<Policy>(`/policies/${typeOrSlug}`);
      return res.data;
    } catch (err: any) {
      console.error(`Error fetching policy '${typeOrSlug}':`, err?.message);
      return null;
    }
  },

  /**
   * Get list of all published policies
   */
  async getAllPublishedPolicies(): Promise<Policy[]> {
    try {
      const res = await apiClient.get<Policy[]>('/policies');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      console.error('Error fetching published policies:', err?.message);
      return [];
    }
  },

  /**
   * Convenience helpers for specific policies
   */
  async getDeliveryPolicy(): Promise<Policy | null> {
    return this.getPolicy('DELIVERY');
  },

  async getPrivacyPolicy(): Promise<Policy | null> {
    return this.getPolicy('PRIVACY');
  },

  async getTermsPolicy(): Promise<Policy | null> {
    return this.getPolicy('TERMS');
  },

  async getReturnRefundPolicy(): Promise<Policy | null> {
    return this.getPolicy('RETURN_REFUND');
  },
};

export default policyService;
