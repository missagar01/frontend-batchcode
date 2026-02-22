import axios from 'axios';

// Backend API base URL - can be configured via environment variable
// In development, ALWAYS use empty string to use Vite proxy
// In production (Vercel), use empty string to use vercel.json rewrites
// Otherwise, use the full URL if explicitly set

// Force empty string in development to use Vite proxy unless a base URL is explicitly configured
// This prevents CORS issues by proxying through localhost when no override is provided
const isDevelopment = import.meta.env.DEV ||
  import.meta.env.MODE === 'development' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

// For S3 deployments, we MUST use the full backend URL since S3 cannot proxy API calls
// For Vercel/platforms with rewrites, use empty string to trigger proxy
// Check if we're on S3 by looking for s3-website in hostname
const isS3Deployment = typeof window !== 'undefined' &&
  (window.location.hostname.includes('s3-website') ||
    window.location.hostname.includes('s3.amazonaws.com'));

// Use backend URL for S3 deployments, otherwise use configured value
const API_BASE_URL = isS3Deployment ? envBaseUrl : (import.meta.env.PROD ? '' : (envBaseUrl || ''));


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Handle FormData
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
let redirectingToLogin = false; // Flag to prevent infinite redirect loops

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      // Only redirect if we're not already redirecting and not already on login page
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }
    // Log 500 errors with helpful message
    if (error.response?.status === 500) {
      console.error('❌ Backend Server Error (500):', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: error.response?.data?.message || 'Internal server error',
        baseURL: error.config?.baseURL || '(empty - using proxy)'
      });
    }
    // Reset redirect flag after a delay to allow for new redirects if needed
    if (error.response?.status === 401 && redirectingToLogin) {
      setTimeout(() => {
        redirectingToLogin = false;
      }, 1000);
    }
    return Promise.reject(error);
  }
);

// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
  },

  // BatchCode APIs
  BATCHCODE: {
    BASE: '/api/batchcode',
    DASHBOARD: '/api/batchcode/dashboard',
    HOT_COIL: '/api/batchcode/hot-coil',
    QC_LAB: '/api/batchcode/qc-lab-samples',
    SMS_REGISTER: '/api/batchcode/sms-register',
    RECOILER: '/api/batchcode/re-coiler',
    PIPE_MILL: '/api/batchcode/pipe-mill',
    LADDLE: '/api/batchcode/laddle-checklist',
    TUNDISH: '/api/batchcode/tundish-checklist',
    ADMIN_OVERVIEW: '/api/batchcode/admin/overview',
    ADMIN_OVERVIEW_BY_CODE: '/api/batchcode/admin/overview',
  },
};

export default api;
export { API_BASE_URL };


