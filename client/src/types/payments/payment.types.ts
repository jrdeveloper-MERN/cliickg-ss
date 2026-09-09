export interface PaymentGateway {
  id: string;
  _id?: string;
  name: string;
  code: 'razorpay' | 'cod' | string;
  isEnabled: boolean;
  isDefault?: boolean;
  apiKey?: string;
  mode?: string;
}

export interface CreatePaymentOrderPayload {
  gateway?: string;
  requestedGateway?: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface VerifyPaymentPayload {
  gateway: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}
