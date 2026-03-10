/**
 * Centralized API Client
 * ShriRamya Ecommerce Platform
 * 
 * Features:
 * - Axios instance with base configuration
 * - JWT token management
 * - Automatic token refresh
 * - Global error handling
 * - Request/response interceptors
 */

import axios from 'axios';

// Configuration
let API_BASE_URL = process.env.REACT_APP_BACKEND_URL
  ? process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')
  : '';

// When running behind nginx in Docker, the browser can't resolve container
// hostnames like `backend:8000`. Use relative URLs instead.
if (API_BASE_URL && (API_BASE_URL.includes('backend:8000') || API_BASE_URL.includes('localhost:8000'))) {
  API_BASE_URL = '';
}

const API_VERSION = '/api/v1';

// Token storage keys
// NOTE: The rest of the frontend currently stores the JWT under `token`.
// We keep backward-compat reads for `access_token` to avoid breaking existing sessions.
const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Refresh token threshold (refresh 5 minutes before expiry)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Token Manager
 */
const tokenManager = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getTokenExpiry() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  setTokenExpiry(expiry) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  },

  isTokenExpired() {
    const expiry = this.getTokenExpiry();
    if (!expiry) return true;
    return Date.now() >= (expiry - REFRESH_THRESHOLD_MS);
  },

  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  // Decode JWT to get expiry
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[TokenManager] Failed to decode token:', error);
      return null;
    }
  }
};

/**
 * Create Axios Instance
 */
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // For cookie-based refresh token
});

/**
 * Request Interceptor
 * - Attach JWT token
 * - Add device ID header
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add device ID for device binding
    let deviceId = sessionStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('device_id', deviceId);
    }
    config.headers['X-Device-ID'] = deviceId;

    return config;
  },
  (error) => {
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - Handle token refresh
 * - Global error handling
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Handle standard response format { success, message, data }
    if (response.data && response.data.hasOwnProperty('success')) {
      if (response.data.success) {
        return { ...response, data: response.data.data };
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token
        const refreshToken = tokenManager.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${API_BASE_URL}${API_VERSION}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true }
        );

        const { access_token } = response.data.data || response.data;
        
        if (access_token) {
          tokenManager.setToken(access_token);
          
          // Update expiry from decoded token
          const decoded = tokenManager.decodeToken(access_token);
          if (decoded?.exp) {
            tokenManager.setTokenExpiry(decoded.exp * 1000);
          }

          processQueue(null, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenManager.clearTokens();
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth:logout', { 
          detail: { reason: 'token_expired' } 
        }));
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'An unexpected error occurred';

    console.error('[API Client] Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: errorMessage
    });

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
      config: error.config
    });
  }
);

/**
 * API Client Methods
 */
export const api = {
  // GET request
  get(url, config = {}) {
    return apiClient.get(url, config);
  },

  // POST request
  post(url, data = {}, config = {}) {
    return apiClient.post(url, data, config);
  },

  // PUT request
  put(url, data = {}, config = {}) {
    return apiClient.put(url, data, config);
  },

  // PATCH request
  patch(url, data = {}, config = {}) {
    return apiClient.patch(url, data, config);
  },

  // DELETE request
  delete(url, config = {}) {
    return apiClient.delete(url, config);
  },

  // Upload file (multipart/form-data)
  upload(url, formData, config = {}) {
    return apiClient.post(url, formData, {
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Download file
  download(url, config = {}) {
    return apiClient.get(url, {
      ...config,
      responseType: 'blob',
    });
  },
};

/**
 * Authentication Helper Methods
 */
export const auth = {
  setTokens(accessToken, refreshToken, decodedToken) {
    tokenManager.setToken(accessToken);
    tokenManager.setRefreshToken(refreshToken);
    
    if (decodedToken?.exp) {
      tokenManager.setTokenExpiry(decodedToken.exp * 1000);
    }
  },

  clearTokens() {
    tokenManager.clearTokens();
  },

  isAuthenticated() {
    const token = tokenManager.getToken();
    if (!token) return false;
    return !tokenManager.isTokenExpired();
  },

  getToken() {
    return tokenManager.getToken();
  },

  getUserFromToken() {
    const token = tokenManager.getToken();
    if (!token) return null;
    return tokenManager.decodeToken(token);
  },

  // Listen for logout events
  onLogout(callback) {
    window.addEventListener('auth:logout', callback);
    return () => window.removeEventListener('auth:logout', callback);
  },
};

/**
 * Error Handler
 */
export const handleError = (error) => {
  console.error('[API Client] Handled error:', error);
  
  const errorObj = new Error(error.message || 'API Error');
  errorObj.status = error.status;
  errorObj.data = error.data;
  
  throw errorObj;
};

// Export default
export default api;
