import apiClient from './api-client';
import { Order, CreateOrderPayload } from '../types/orders/order.types';

export const orderService = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const res = await apiClient.post('/orders', payload);
    return res.data?.data || res.data;
  },

  async getMyOrders(params?: { status?: string; page?: number; limit?: number }): Promise<{ data: Order[]; total: number }> {
    const res = await apiClient.get('/orders/my-orders', { params });
    const responseData = res.data;

    if (Array.isArray(responseData)) {
      return { data: responseData, total: responseData.length };
    }
    return {
      data: responseData?.data || responseData?.orders || [],
      total: responseData?.total || (responseData?.data ? responseData.data.length : 0),
    };
  },

  async getOrderById(id: string): Promise<Order | null> {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data?.data || res.data || null;
  },

  async cancelOrder(id: string, reason?: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post(`/orders/${id}/cancel`, { reason });
    return res.data;
  },

  async requestReturn(id: string, reason: string, comments?: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post(`/orders/${id}/return`, { reason, comments });
    return res.data;
  },

  async getReturnStatus(id: string): Promise<any> {
    const res = await apiClient.get(`/orders/${id}/return`);
    return res.data?.data || res.data;
  },

  async downloadInvoice(id: string): Promise<Blob> {
    const res = await apiClient.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    return res.data;
  }
};

export default orderService;
