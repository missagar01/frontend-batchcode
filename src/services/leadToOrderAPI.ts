import api, { API_ENDPOINTS } from '../config/api.js';

export const leadToOrderAPI = {
  // Authentication
  login: (username: string, password: string) => 
    api.post(API_ENDPOINTS.LEAD_TO_ORDER.AUTH.LOGIN, { username, password }),
  verifyToken: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.AUTH.VERIFY_TOKEN),
  createUser: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.AUTH.CREATE_USER, data),
  getAuthData: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.AUTH.DATA),

  // Leads
  createLead: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.LEADS, data),
  
  // Lead Dropdowns
  getLeadDropdowns: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.LEAD_DROPDOWN),

  // Follow Up
  getPendingFollowups: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.FOLLOW_UP.PENDING),
  getHistoryFollowups: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.FOLLOW_UP.HISTORY),
  submitFollowUp: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.FOLLOW_UP.SUBMIT, data),
  getFollowUpDropdowns: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.FOLLOW_UP.DROPDOWNS),

  // User management
  listUsers: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.USERS),
  getDepartments: () => api.get(`${API_ENDPOINTS.LEAD_TO_ORDER.USERS}/departments`),
  createUserRecord: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.USERS, data),
  updateUserRecord: (id: string | number, data: any) => api.put(`${API_ENDPOINTS.LEAD_TO_ORDER.USERS}/${id}`, data),
  deleteUserRecord: (id: string | number) => api.delete(`${API_ENDPOINTS.LEAD_TO_ORDER.USERS}/${id}`),

  // Enquiry Tracker (Call Tracker)
  getPendingFMS: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.PENDING),
  getEnquiryHistory: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.HISTORY),
  getDirectEnquiryPending: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.DIRECT_PENDING),
  getEnquiryById: (type: string, id: string) => 
    api.get(`${API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.VIEW}/${type}/${id}`),
  submitEnquiryTrackerForm: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.FORM, data),
  getEnquiryTrackerDropdowns: (column: string) => 
    api.get(`${API_ENDPOINTS.LEAD_TO_ORDER.ENQUIRY_TRACKER.DROPDOWNS}/${column}`),

  // Quotation
  createQuotation: (data: any) => api.post(API_ENDPOINTS.LEAD_TO_ORDER.QUOTATION.BASE, data),
  getQuotationByNumber: (quotationNo: string) => 
    api.get(`${API_ENDPOINTS.LEAD_TO_ORDER.QUOTATION.BY_NUMBER}/${quotationNo}`),

  // Dashboard
  getDashboardMetrics: (userId?: string, isAdmin?: boolean) => 
    api.get(API_ENDPOINTS.LEAD_TO_ORDER.DASHBOARD.METRICS, { params: { userId, isAdmin } }),
  getDashboardCharts: (userId?: string, isAdmin?: boolean) => 
    api.get(API_ENDPOINTS.LEAD_TO_ORDER.DASHBOARD.CHARTS, { params: { userId, isAdmin } }),

  // Products
  getProducts: () => api.get(API_ENDPOINTS.LEAD_TO_ORDER.PRODUCTS),
};
