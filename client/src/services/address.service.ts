import apiClient from './api-client';
import { Address } from '../types/auth/auth.types';

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    try {
      const res = await apiClient.get('/addresses');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching addresses:', err);
      return [];
    }
  },

  async createAddress(addressData: Omit<Address, 'id' | '_id'>): Promise<Address> {
    const res = await apiClient.post('/addresses', addressData);
    return res.data?.data || res.data;
  },

  async updateAddress(id: string, addressData: Partial<Address>): Promise<Address> {
    const res = await apiClient.put(`/addresses/${id}`, addressData);
    return res.data?.data || res.data;
  },

  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete(`/addresses/${id}`);
  },

  async setDefaultAddress(id: string): Promise<Address> {
    const res = await apiClient.patch(`/addresses/${id}/default`);
    return res.data?.data || res.data;
  }
};

export default addressService;
