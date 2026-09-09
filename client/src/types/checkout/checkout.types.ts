import { Address } from '../auth/auth.types';
import { CartItem } from '../cart/cart.types';

export interface CalculateShippingPayload {
  address?: {
    pincode: string;
    state?: string;
    country?: string;
    city?: string;
  };
  pincode?: string;
  cartTotal?: number;
  items?: Array<{
    productId?: string;
    _id?: string;
    variantId?: string;
    quantity: number;
    sku?: string;
  }>;
  paymentMethod?: string;
  deliveryType?: string;
  packagingRuleId?: string;
}

export interface CalculateShippingResponse {
  serviceable?: boolean;
  success?: boolean;
  totalShipping?: number;
  shippingCharge?: number;
  packagingCharge?: number;
  additionalChargesTotal?: number;
  gst?: number;
  estimatedDeliveryDays?: number | null;
  estimatedDeliveryDate?: string | Date | null;
  message?: string;
  errors?: string[];
  snapshot?: any;
}

export interface PackagingOption {
  id: string;
  _id?: string;
  name: string;
  price: number;
  description?: string;
}
