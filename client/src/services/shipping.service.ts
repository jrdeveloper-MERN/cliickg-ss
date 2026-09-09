import apiClient from './api-client';
import { CalculateShippingPayload, CalculateShippingResponse, PackagingOption } from '../types/checkout/checkout.types';
import { getErrorMessage } from '../utils/error-handler.utils';

export const shippingService = {
  async calculateShipping(payload: CalculateShippingPayload): Promise<CalculateShippingResponse> {
    try {
      const normalizedPayload = {
        address: payload.address || { pincode: payload.pincode || '' },
        items: payload.items || [],
        packagingRuleId: payload.packagingRuleId || undefined,
        paymentMethod: payload.paymentMethod || 'Online',
        deliveryType: payload.deliveryType || 'Standard',
      };
      const res = await apiClient.post('/shipping/calculate', normalizedPayload);
      const data = res.data;
      return {
        ...data,
        success: data.serviceable !== false,
        shippingCharge: data.totalShipping || 0,
      };
    } catch (err: any) {
      console.error('Failed to calculate shipping:', err);
      return {
        serviceable: false,
        success: false,
        totalShipping: 0,
        shippingCharge: 0,
        message: getErrorMessage(err),
        errors: err.response?.data?.errors || ['CALCULATION_FAILED'],
      };
    }
  },

  async getPackagingRules(): Promise<PackagingOption[]> {
    try {
      const res = await apiClient.get('/shipping/packaging');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Failed to load packaging options:', err);
      return [];
    }
  }
};

export default shippingService;
