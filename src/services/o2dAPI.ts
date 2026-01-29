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

  // Gate Entry
  getPendingGateEntry: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.GATE_ENTRY.PENDING, { params }),
  getGateEntryHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.GATE_ENTRY.HISTORY, { params }),

  // First Weight
  getPendingFirstWeight: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.FIRST_WEIGHT.PENDING, { params }),
  getFirstWeightHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.FIRST_WEIGHT.HISTORY, { params }),

  // Load Vehicle
  getPendingLoadVehicle: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.LOAD_VEHICLE.PENDING, { params }),
  getLoadVehicleHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.LOAD_VEHICLE.HISTORY, { params }),

  // Second Weight
  getPendingSecondWeight: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.SECOND_WEIGHT.PENDING, { params }),
  getSecondWeightHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.SECOND_WEIGHT.HISTORY, { params }),

  // Invoice
  getPendingInvoices: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.INVOICE.PENDING, { params }),
  getInvoiceHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.INVOICE.HISTORY, { params }),

  // Gate Out
  getPendingGateOut: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.GATE_OUT.PENDING, { params }),
  getGateOutHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.GATE_OUT.HISTORY, { params }),
  getGateOutCustomers: () => api.get(API_ENDPOINTS.O2D.GATE_OUT.CUSTOMERS),

  // Payment
  getPendingPayments: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.PAYMENT.PENDING, { params }),
  getPaymentHistory: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.PAYMENT.HISTORY, { params }),
  getPaymentCustomers: () => api.get(API_ENDPOINTS.O2D.PAYMENT.CUSTOMERS),

  // Orders
  getPendingOrders: (params?: any) => api.get(API_ENDPOINTS.O2D.ORDERS.PENDING, { params }),
  getCompletedOrders: (params?: any) => api.get(API_ENDPOINTS.O2D.ORDERS.HISTORY, { params }),

  // Complaint Details
  createComplaint: (data: any) => api.post(API_ENDPOINTS.O2D.COMPLAINT, data),
  getComplaints: (params?: any) => api.get(API_ENDPOINTS.O2D.COMPLAINT, { params }),
  updateComplaint: (id: string | number, data: any) =>
    api.put(`${API_ENDPOINTS.O2D.COMPLAINT}/${id}`, data),
  deleteComplaint: (id: string | number) =>
    api.delete(`${API_ENDPOINTS.O2D.COMPLAINT}/${id}`),

  // Party Feedback
  createPartyFeedback: (data: any) => api.post(API_ENDPOINTS.O2D.PARTY_FEEDBACK, data),
  getPartyFeedbacks: (params?: any) => api.get(API_ENDPOINTS.O2D.PARTY_FEEDBACK, { params }),

  // Register
  register: (data: any) => api.post(API_ENDPOINTS.O2D.REGISTER, data),
  getProcessTimeline: (params?: any) =>
    api.get(API_ENDPOINTS.O2D.PROCESS.TIMELINE, { params }),

  // Size Master
  getSizeMaster: () => api.get(API_ENDPOINTS.O2D.SIZE_MASTER),

  // Enquiry (sub-route of size-master)
  createEnquiry: (data: any) => api.post(`${API_ENDPOINTS.O2D.SIZE_MASTER}/enquiry`, data),
};
