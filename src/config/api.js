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

  // Lead-to-Order APIs
  LEAD_TO_ORDER: {
    BASE: '/api/lead-to-order',
    AUTH: {
      LOGIN: '/api/lead-to-order/auth/login',
      VERIFY_TOKEN: '/api/lead-to-order/auth/verify-token',
      CREATE_USER: '/api/lead-to-order/auth/create-user',
      DATA: '/api/lead-to-order/auth/data',
    },
    LEADS: '/api/lead-to-order/leads',
    LEAD_DROPDOWN: '/api/lead-to-order/lead-dropdown',
    FOLLOW_UP: {
      PENDING: '/api/lead-to-order/follow-up/pending',
      HISTORY: '/api/lead-to-order/follow-up/history',
      SUBMIT: '/api/lead-to-order/follow-up/followup',
      DROPDOWNS: '/api/lead-to-order/follow-up/dropdowns',
    },
    ENQUIRY_TRACKER: {
      PENDING: '/api/lead-to-order/enquiry-tracker/pending',
      HISTORY: '/api/lead-to-order/enquiry-tracker/history',
      DIRECT_PENDING: '/api/lead-to-order/enquiry-tracker/direct-pending',
      VIEW: '/api/lead-to-order/enquiry-tracker/view',
      FORM: '/api/lead-to-order/enquiry-tracker/form',
      DROPDOWNS: '/api/lead-to-order/enquiry-tracker/dropdowns',
    },
    QUOTATION: {
      BASE: '/api/lead-to-order/quotations/quotation',
      BY_NUMBER: '/api/lead-to-order/quotations/quotation',
    },
    DASHBOARD: {
      METRICS: '/api/lead-to-order/dashboard/metrics',
      CHARTS: '/api/lead-to-order/dashboard/charts',
    },
    USERS: '/api/lead-to-order/users',
    PRODUCTS: '/api/lead-to-order/products',
    ENQUIRY_TO_ORDER: {
      DROPDOWNS: '/api/lead-to-order/enquiry-to-order/dropdowns',
      SUBMIT: '/api/lead-to-order/enquiry-to-order',
    },
  },

  // O2D APIs
  O2D: {
    BASE: '/api/o2d',
    AUTH: {
      LOGIN: '/api/o2d/auth/login',
      USERS: '/api/o2d/auth/users',
      PERMISSIONS: '/api/o2d/auth/users/permissions',
    },
    DASHBOARD: {
      SUMMARY: '/api/o2d/dashboard/summary',
      METRICS: '/api/o2d/dashboard/metrics',
    },
    GATE_ENTRY: {
      PENDING: '/api/o2d/gate-entry/pending',
      HISTORY: '/api/o2d/gate-entry/history',
    },
    GATE_OUT: {
      PENDING: '/api/o2d/gate-out/pending',
      HISTORY: '/api/o2d/gate-out/history',
      CUSTOMERS: '/api/o2d/gate-out/customers',
    },
    ORDERS: {
      PENDING: '/api/o2d/orders/pending',
      HISTORY: '/api/o2d/orders/history',
    },
    COMPLAINT: '/api/o2d/complaint',
    PARTY_FEEDBACK: '/api/o2d/party-feedback',
    REGISTER: '/api/o2d/register',
    PROCESS: {
      TIMELINE: '/api/o2d/process/timeline',
    },
    SIZE_MASTER: {
      BASE: '/api/o2d/size-master',
      REPORT_CURRENT_MONTH: '/api/o2d/size-master/report/current-month',
    },
    CLIENT: '/api/o2d/client',
    FOLLOWUP: '/api/o2d/followup',
  },
};

export default api;
export { API_BASE_URL };


