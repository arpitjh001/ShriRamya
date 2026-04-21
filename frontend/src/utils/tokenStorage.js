/**
 * Secure Token Storage Utility
 * Consistently uses localStorage for admin persistence
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenStorage = {
  /**
   * Get access token from localStorage
   */
  getToken: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  /**
   * Set access token in localStorage
   */
  setToken: (token) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Set refresh token in localStorage
   */
  setRefreshToken: (token) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  },

  /**
   * Remove all tokens
   */
  removeToken: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!tokenStorage.getToken();
  }
};

/**
 * Decode JWT token payload
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};
