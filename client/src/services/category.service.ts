import apiClient from './api-client';
import { MainCategory, Category, SubCategory, AttributeCaption } from '../types/categories/category.types';

export const categoryService = {
  async getMainCategories(): Promise<MainCategory[]> {
    try {
      const res = await apiClient.get('/main-categories');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching main categories:', err);
      return [];
    }
  },

  async getCategories(mainCategoryId?: string): Promise<Category[]> {
    try {
      const res = await apiClient.get('/categories', { params: { mainCategoryId } });
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching categories:', err);
      return [];
    }
  },

  async getSubCategories(mainCategoryId?: string, categoryId?: string): Promise<SubCategory[]> {
    try {
      const res = await apiClient.get('/sub-categories', { params: { mainCategoryId, categoryId } });
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching subcategories:', err);
      return [];
    }
  },

  async getAttributeCaptions(): Promise<AttributeCaption[]> {
    try {
      const res = await apiClient.get('/attribute/captions');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching attribute captions:', err);
      return [];
    }
  }
};

export default categoryService;
