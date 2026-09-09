import apiClient from './api-client';
import { PromoValidatePayload, PromoValidateResponse } from '../types/cart/cart.types';
import { getErrorMessage } from '../utils/error-handler.utils';

export const promotionService = {
  async getAvailablePromos(cartContext?: { subtotal?: number; cartItems?: any[]; pincode?: string; paymentMethod?: string }): Promise<any[]> {
    try {
      const res = await apiClient.post('/promotions/available', cartContext || {});
      return res.data?.data || res.data || [];
    } catch (err) {
      console.warn('Failed to fetch available promos:', err);
      return [];
    }
  },

  async getActivePromos(): Promise<any[]> {
    try {
      const res = await apiClient.get('/promotions/active');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.warn('Failed to fetch active promos:', err);
      return [];
    }
  },

  async validatePromoCode(payload: any): Promise<PromoValidateResponse> {
    try {
      const code = payload.code || payload.promoCode || '';
      const subtotal = payload.subtotal || (payload.cartItems || []).reduce((sum: number, item: any) => sum + (item.sellingPrice || item.price || 0) * (item.quantity || 1), 0) || 0;
      const userId = payload.userId || payload.customerInfo?.userId || undefined;

      const res = await apiClient.post('/promotions/validate', {
        code,
        subtotal,
        cartItems: payload.cartItems || [],
        paymentMethod: payload.paymentMethod,
        pincode: payload.pincode,
        userId,
        customerInfo: payload.customerInfo,
      });

      const data = res.data || {};
      const valid = data.valid !== false && data.success !== false;
      const discount = Number(data.discountAmount || data.discount || 0);

      return {
        success: valid,
        valid,
        discount,
        discountAmount: discount,
        discountType: data.discountType,
        discountValue: Number(data.discountValue || 0),
        finalPayable: Number(data.finalPayable || 0),
        message: data.message || (valid ? `Promo Code '${code}' applied successfully!` : 'Invalid Promo Code'),
        promo: data.promoSummary || data.promo,
        promoSummary: data.promoSummary,
      };
    } catch (err: any) {
      console.error('Promo validation error:', err);
      return {
        success: false,
        valid: false,
        discount: 0,
        discountAmount: 0,
        message: getErrorMessage(err),
      };
    }
  }
};

export default promotionService;
