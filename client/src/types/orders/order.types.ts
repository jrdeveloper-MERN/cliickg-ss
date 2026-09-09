import { CartItem } from '../cart/cart.types';
import { Address } from '../auth/auth.types';

export interface OrderItem {
  id?: string;
  _id?: string;
  productId?: string;
  productName?: string;
  name?: string;
  image?: string;
  quantity: number;
  price: number;
  sellingPrice?: number;
  size?: string;
  sku?: string;
}

export interface Order {
  id: string;
  _id?: string;
  orderId?: string;
  orderNo?: string;
  orderNumber?: string;
  orderDate?: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: 'razorpay' | 'cod' | string;
  paymentStatus: 'pending' | 'paid' | 'failed' | string;
  orderStatus: 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | string;
  subtotal: number;
  shippingCharge?: number;
  discount?: number;
  totalAmount: number;
  total?: number;
  trackingNumber?: string;
  courierName?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
}

export interface CreateOrderPayload {
  items: CartItem[];
  shippingAddressId?: string;
  shippingAddress?: Address;
  paymentMethod: string;
  paymentDetails?: any;
  promoCode?: string;
}
