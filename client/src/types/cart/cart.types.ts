export interface CartItem {
  id?: string;
  _id?: string;
  productId: string;
  variantId?: string | null;
  variantKey?: string | null;
  name: string;
  image: string;
  quantity: number;
  stock: number;
  selectedSize?: string | null;
  sku?: string;
  price: number;
  sellingPrice: number;
  mrp?: number;
  serverCalculatedPrice?: number;
}

export interface PromoValidatePayload {
  promoCode: string;
  cartItems: CartItem[];
  customerInfo?: {
    email?: string;
    phone?: string;
    userId?: string;
  };
}

export interface PromoValidateResponse {
  success: boolean;
  valid?: boolean;
  message?: string;
  discount?: number;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  finalPayable?: number;
  totalBeforeDiscount?: number;
  finalTotal?: number;
  promo?: any;
  promoSummary?: any;
}
