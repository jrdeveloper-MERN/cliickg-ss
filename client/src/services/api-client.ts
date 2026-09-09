import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '../types/api/api.types';
import { parseAppError } from '../utils/error-handler.utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach customer JWT token safely if in browser environment
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('customer_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    const normalized = parseAppError(error);
    (error as any).appError = normalized;
    return Promise.reject(error);
  }
);

// Response Interceptor: Normalize responses & handle 401 token invalidation
apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend:up'));
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    const normalized = parseAppError(error);
    (error as any).appError = normalized;

    if (
      typeof window !== 'undefined' &&
      (normalized.type === 'NETWORK' ||
        normalized.type === 'SERVER_UNAVAILABLE' ||
        normalized.code === 'SERVICE_UNAVAILABLE' ||
        (normalized.status && normalized.status >= 502))
    ) {
      window.dispatchEvent(new CustomEvent('backend:down', { detail: normalized }));
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('customer_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
