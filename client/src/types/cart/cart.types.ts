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
  offerPrice?: number;
  taxableAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  finalPrice?: number;
  itemFinalPrice?: number;
  lineTaxableSubtotal?: number;
  lineGstTotal?: number;
  lineTotal?: number;
  gstMode?: string;
  taxMode?: string;
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
