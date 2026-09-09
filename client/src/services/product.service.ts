import apiClient from './api-client';
import { Product, ProductQuery } from '../types/products/product.types';

export const productService = {
  async getProducts(params?: ProductQuery): Promise<{ data: Product[]; total: number }> {
    const res = await apiClient.get('/products', { params });
    const responseData = res.data;

    if (Array.isArray(responseData)) {
      return { data: responseData, total: responseData.length };
    }
    return {
      data: responseData?.data || responseData?.products || [],
      total: responseData?.total || responseData?.count || (responseData?.data ? responseData.data.length : 0),
    };
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const res = await apiClient.get(`/products/${id}`);
      return res.data?.data || res.data || null;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      return null;
    }
  }
};

export default productService;
