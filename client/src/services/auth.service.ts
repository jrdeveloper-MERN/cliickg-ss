import apiClient from './api-client';
import { SendOtpPayload, VerifyOtpPayload, AuthResponse, User, Customer } from '../types/auth/auth.types';

export const authService = {
  async sendOtp(payload: SendOtpPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/send-otp', payload);
    return res.data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/verify-otp', payload);
    const body = res.data;
    if (body && body.data) {
      return {
        ...body,
        token: body.token || body.data.token,
        user: body.user || body.data.user,
        customer: body.customer || body.data.customer,
      };
    }
    return body;
  },

  async resendOtp(payload: Omit<SendOtpPayload, 'email'>): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/resend-otp', payload);
    return res.data;
  },

  async getMe(): Promise<{ user: User; customer?: Customer; cartSummary?: any; wishlistCount?: number; addressCount?: number; recentOrdersCount?: number }> {
    const res = await apiClient.get('/auth/me');
    const data = res.data?.data || res.data;
    return data;
  },

  async updateCustomerProfile(customerId: string, profileData: Partial<Customer>): Promise<Customer> {
    const targetUrl = customerId ? `/customers/${customerId}` : '/customers/me';
    const res = await apiClient.put(targetUrl, profileData);
    return res.data?.data || res.data;
  },

  async getCustomerMe(): Promise<Customer> {
    const res = await apiClient.get('/customers/me');
    return res.data?.data || res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }
};

export default authService;
