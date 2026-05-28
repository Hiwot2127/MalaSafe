/**
 * API Client Configuration
 * 
 * Axios instance with:
 * - HttpOnly cookie authentication
 * - Automatic token refresh
 * - Request/response interceptors
 * - Error handling
 */

import axios from 'axios';
import { API_URL } from '../constants';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent with withCredentials: true
    // No need to manually add Authorization header
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/auth/login');

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        // Try to refresh the session
        await apiClient.post('/auth/refresh');
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const currentPath = window.location.pathname;
          window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

