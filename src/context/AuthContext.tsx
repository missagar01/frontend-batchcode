"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import api, { API_ENDPOINTS } from "../config/api.js";

interface User {
  id: string | number;
  username: string;
  user_name?: string;
  employee_id?: string;
  role?: string;
  email_id?: string;
  number?: string;
  department?: string;
  userType?: string;
  access?: string[];
  user_access?: string | null;
  page_access?: string | null;
  system_access?: string | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  getAuthHeaders: () => { Authorization: string; 'Content-Type': string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearAuthStorage = () => {
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const decodeToken = (token: string) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(base64);
    return JSON.parse(decodedPayload);
  } catch (err) {
    console.error('Failed to decode token', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (storedToken) {
          const decoded = decodeToken(storedToken);
          if (decoded) {
            const userAccess = decoded?.user_access || null;
            const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : null;
            
            // Helper to normalize "NULL" strings to actual null
            const normalizeValue = (value: unknown): string | null => {
              if (value === null || value === undefined) return null;
              if (typeof value === 'string' && (value.toUpperCase() === 'NULL' || value.trim() === '')) return null;
              return typeof value === 'string' ? value : String(value);
            };

            const parsedUser: User = {
              id: decoded?.id || decoded?.sub || null,
              employee_id: normalizeValue(decoded?.employee_id),
              username: decoded?.username || decoded?.user_name || '',
              user_name: decoded?.user_name || decoded?.username || '',
              role: decoded?.role || 'user',
              userType: decoded?.userType || decoded?.role || 'user',
              email_id: normalizeValue(decoded?.email_id),
              number: normalizeValue(decoded?.number),
              department: normalizeValue(decoded?.department),
              access: accessArray || decoded?.access || null,
              user_access: normalizeValue(userAccess || decoded?.user_access),
              page_access: normalizeValue(decoded?.page_access),
              system_access: normalizeValue(decoded?.system_access),
            };
            setToken(storedToken);
            setUser(parsedUser);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } else {
            setToken(null);
            setUser(null);
            clearAuthStorage();
            delete api.defaults.headers.common['Authorization'];
            redirectToLogin();
          }
        } else {
          setToken(null);
          setUser(null);
          clearAuthStorage();
          delete api.defaults.headers.common['Authorization'];
          redirectToLogin();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setToken(null);
        setUser(null);
        clearAuthStorage();
        delete api.defaults.headers.common['Authorization'];
        redirectToLogin();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      setLoading(true);

      // Use unified auth endpoint - Backend expects user_name, not username
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        user_name: username.trim(),
        password: password,
      });

      const payload = response.data || {};
      
      // Backend response structure: { success: true, data: { user: {...}, token: "..." } }
      const apiUser = payload.data?.user || payload.user || {};
      const authToken = payload.data?.token || payload.token || payload.access_token;

      if (!authToken) {
        throw new Error('No token received from server');
      }

      // Decode token to get user info
      const decoded = decodeToken(authToken);
      
      // Helper to normalize "NULL" strings to actual null
      const normalizeValue = (value: unknown): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string' && (value.toUpperCase() === 'NULL' || value.trim() === '')) return null;
        return typeof value === 'string' ? value : String(value);
      };

      // Parse user_access from user object if available
      const userAccess = normalizeValue(apiUser.user_access || decoded?.user_access);
      const pageAccess = normalizeValue(apiUser.page_access || decoded?.page_access);
      const systemAccess = normalizeValue(apiUser.system_access || decoded?.system_access);
      const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : null;

      const userData: User = {
        id: apiUser.id || decoded?.id || decoded?.sub || String(apiUser.id) || null,
        employee_id: normalizeValue(apiUser.employee_id || decoded?.employee_id),
        username: apiUser.username || apiUser.user_name || decoded?.username || username,
        user_name: apiUser.user_name || apiUser.username || decoded?.user_name || username,
        role: apiUser.role || decoded?.role || 'user',
        userType: apiUser.userType || apiUser.role || decoded?.role || 'user',
        email_id: normalizeValue(apiUser.email_id || decoded?.email_id),
        number: normalizeValue(apiUser.number || decoded?.number),
        department: normalizeValue(apiUser.department || decoded?.department),
        access: accessArray || apiUser.access || decoded?.access || null,
        user_access: userAccess,
        page_access: pageAccess,
        system_access: systemAccess,
      };

      setToken(authToken);
      setUser(userData);
      sessionStorage.setItem('token', authToken);
      localStorage.setItem('token', authToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      return {
        success: true,
        user: userData,
      };
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string }; statusText?: string; status?: number } };
        if (axiosError.response?.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (axiosError.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.response?.statusText || 'Login failed';
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Login failed';
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      await api.post(API_ENDPOINTS.AUTH.LOGOUT).catch(() => {
        // Continue with logout even if API call fails
        console.log('Logout API call failed, continuing with local logout');
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      setToken(null);
      setUser(null);
      clearAuthStorage();
      delete api.defaults.headers.common['Authorization'];
      // Use window.location for navigation outside Router context
      redirectToLogin();
    }
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
