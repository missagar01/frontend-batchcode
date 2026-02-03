import api, { API_ENDPOINTS } from '../config/api.js';

export const o2dAPI = {
  // Authentication
  login: (username: string, password: string) =>
    api.post(API_ENDPOINTS.O2D.AUTH.LOGIN, { username, password }),
  getUsers: () => api.get(API_ENDPOINTS.O2D.AUTH.USERS),
  getPermissions: () => api.get(API_ENDPOINTS.O2D.AUTH.PERMISSIONS),

  // Dashboard
  getDashboardSummary: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.DASHBOARD.SUMMARY, { params }),
  getDeliveryStats: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.DASHBOARD.DELIVERY_STATS, { params }),

  // Orders
  getPendingOrders: (params?: any) => api.get(API_ENDPOINTS.O2D.ORDERS.PENDING, { params }),
  getCompletedOrders: (params?: any) => api.get(API_ENDPOINTS.O2D.ORDERS.HISTORY, { params }),

  // Process (Pending Vehicles)
  getProcessTimeline: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.PROCESS.TIMELINE, { params }),

  // Size Master
  getSizeMaster: () => api.get(API_ENDPOINTS.O2D.SIZE_MASTER.BASE),
  getCurrentMonthEnquiryReport: (month?: string) => api.get(API_ENDPOINTS.O2D.SIZE_MASTER.REPORT_CURRENT_MONTH, { params: { month } }),

  // Enquiry (sub-route of size-master)
  createEnquiry: (data: any) => api.post(`${API_ENDPOINTS.O2D.SIZE_MASTER.BASE}/enquiry`, data),

  // Clients
  getClients: () => api.get(API_ENDPOINTS.O2D.CLIENT),
  getClient: (id: string) => api.get(`${API_ENDPOINTS.O2D.CLIENT}/${id}`),
  createClient: (data: any) => api.post(API_ENDPOINTS.O2D.CLIENT, data),
  updateClient: (id: string, data: any) => api.put(`${API_ENDPOINTS.O2D.CLIENT}/${id}`, data),
  deleteClient: (id: string) => api.delete(`${API_ENDPOINTS.O2D.CLIENT}/${id}`),
  getMarketingUsers: () => api.get(`${API_ENDPOINTS.O2D.CLIENT}/marketing-users`),

  // Followups
  getFollowups: () => api.get(API_ENDPOINTS.O2D.FOLLOWUP),
  getFollowup: (id: string) => api.get(`${API_ENDPOINTS.O2D.FOLLOWUP}/${id}`),
  createFollowup: (data: any) => api.post(API_ENDPOINTS.O2D.FOLLOWUP, data),
  updateFollowup: (id: string, data: any) => api.put(`${API_ENDPOINTS.O2D.FOLLOWUP}/${id}`, data),
  deleteFollowup: (id: string) => api.delete(`${API_ENDPOINTS.O2D.FOLLOWUP}/${id}`),
  getSalesPerformance: (params?: any) => api.get(`${API_ENDPOINTS.O2D.FOLLOWUP}/performance`, { params }),
  getFollowupStats: (params?: any) => api.get(`${API_ENDPOINTS.O2D.FOLLOWUP}/stats`, { params }),

  // Additional Client Stats
  getClientCount: () => api.get(`${API_ENDPOINTS.O2D.CLIENT}/count`),
};

