import apiClient from './api-client';
import { CartItem } from '../types/cart/cart.types';

export const cartService = {
  async getCart(): Promise<CartItem[]> {
    try {
      const res = await apiClient.get('/cart');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error loading cart:', err);
      return [];
    }
  },

  async syncCart(items: CartItem[]): Promise<CartItem[]> {
    try {
      const res = await apiClient.post('/cart', { items });
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error syncing cart:', err);
      return items;
    }
  }
};

export default cartService;
