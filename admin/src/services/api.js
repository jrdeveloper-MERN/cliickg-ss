import axios from 'axios';
import { parseAppError } from '../utils/errorHandler';

const ensureIdFields = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    data.forEach((item) => ensureIdFields(item));
  } else {
    if (data.id && !data._id) {
      data._id = data.id;
    } else if (data._id && !data.id) {
      data.id = data._id;
    }
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object' && key !== 'headers' && key !== 'config') {
        ensureIdFields(data[key]);
      }
    }
  }
  return data;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      ensureIdFields(response.data);
    }
    return response;
  },
  (error) => {
    // Attach normalized client-like AppError to the error object
    const parsed = parseAppError(error);
    error.appError = parsed;

    // 401 Unauthorized - Expired admin session
    if (parsed.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 500 Server Error or Offline (port 5001 down) - trigger dynamic full-window error
    if (parsed.status >= 500 || parsed.type === 'SERVER_UNAVAILABLE') {
      window.dispatchEvent(
        new CustomEvent('app:server-error', {
          detail: parsed.userMessage || 'Backend server is offline or returned 500 (port 5001).',
        })
      );
    }

    return Promise.reject(error);
  }
);

export const getImageUrl = (path) => {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.includes('localhost:5000')) {
    return trimmed.replace('http://localhost:5000', '');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  return `/uploads/${trimmed.replace(/^\//, '')}`;
};

export default api;
