import apiClient from './api-client';
import { PaymentGateway, CreatePaymentOrderPayload, VerifyPaymentPayload } from '../types/payments/payment.types';

export const paymentService = {
  async getActiveGateways(): Promise<PaymentGateway[]> {
    try {
      const res = await apiClient.get('/payments/active-gateways');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Failed to fetch active payment gateways:', err);
      return [];
    }
  },

  async createPaymentOrder(payload: CreatePaymentOrderPayload): Promise<any> {
    try {
      const res = await apiClient.post('/payments/create-order', payload);
      return res.data;
    } catch (err: any) {
      console.error('Failed to create payment order:', err);
      throw err.response?.data || { message: 'Failed to create payment order' };
    }
  },

  async verifyPayment(verificationData: VerifyPaymentPayload): Promise<any> {
    try {
      const res = await apiClient.post('/payments/verify', verificationData);
      return res.data;
    } catch (err: any) {
      console.error('Failed to verify payment:', err);
      throw err.response?.data || { message: 'Payment verification failed' };
    }
  },

  async getPaymentStatus(orderId: string): Promise<any> {
    try {
      const res = await apiClient.get(`/payments/order/${orderId}/status`);
      return res.data;
    } catch (err: any) {
      console.error('Failed to fetch payment status:', err);
      throw err.response?.data || { message: 'Failed to fetch payment status' };
    }
  },

  async recordPaymentFailure(payload: { orderId: string; reason: string; errorCode?: string; errorMessage?: string; gatewayOrderId?: string; gatewayPaymentId?: string; rawError?: any }): Promise<any> {
    try {
      const res = await apiClient.post('/payments/record-failure', payload);
      return res.data;
    } catch (err: any) {
      console.error('Failed to record payment failure:', err);
      return null;
    }
  }
};

export default paymentService;
