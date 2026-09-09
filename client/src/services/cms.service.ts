import apiClient from './api-client';
import { HeroBanner, TodayDeal, TodayDealBanner, FeaturedSection, Certificate, StorePromise, FAQ, ScrollHeading, ContactCMS } from '../types/cms/cms.types';

export const cmsService = {
  async getBanners(): Promise<HeroBanner[]> {
    try {
      const res = await apiClient.get('/cms/banners');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching hero banners:', err);
      return [];
    }
  },

  async getTodayDeals(): Promise<TodayDeal[]> {
    try {
      const res = await apiClient.get('/cms/todays-deals');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching today deals:', err);
      return [];
    }
  },

  async getTodayDealById(id: string): Promise<TodayDeal | null> {
    try {
      const res = await apiClient.get(`/cms/todays-deals/${id}`);
      return res.data?.data || res.data || null;
    } catch (err) {
      console.error(`Error fetching today deal ${id}:`, err);
      return null;
    }
  },

  async getTodayDealsBanners(): Promise<TodayDealBanner[]> {
    try {
      const res = await apiClient.get('/cms/todays-deals-banners');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching today deals banners:', err);
      return [];
    }
  },

  async getFeaturedSections(): Promise<FeaturedSection[]> {
    try {
      const res = await apiClient.get('/cms/featured-sections');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching featured sections:', err);
      return [];
    }
  },

  async getCertificates(): Promise<Certificate[]> {
    try {
      const res = await apiClient.get('/cms/certificates');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching certificates:', err);
      return [];
    }
  },

  async getStorePromises(): Promise<StorePromise[]> {
    try {
      const res = await apiClient.get('/cms/store-promises');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching store promises:', err);
      return [];
    }
  },

  async getStorePromiseBanner(): Promise<string> {
    try {
      const res = await apiClient.get('/cms/store-promises/banner');
      return res.data?.bannerUrl || '';
    } catch (err) {
      console.error('Error fetching store promise section banner:', err);
      return '';
    }
  },

  async getContact(): Promise<ContactCMS> {
    try {
      const res = await apiClient.get('/cms/contact');
      return res.data?.data || res.data || {};
    } catch (err) {
      console.error('Error fetching contact CMS:', err);
      return {};
    }
  },

  async getFaqs(): Promise<FAQ[]> {
    try {
      const res = await apiClient.get('/cms/faqs');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching CMS FAQs:', err);
      return [];
    }
  },

  async getScrollHeadings(): Promise<ScrollHeading[]> {
    try {
      const res = await apiClient.get('/cms/scroll-headings');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error('Error fetching scroll headings:', err);
      return [];
    }
  }
};

export default cmsService;
