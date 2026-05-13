import axios from "axios";
import { transformWooProducts, transformWooProduct } from "../utils/productTransformer";
import { tokenStorage, decodeToken as decodeJwtPayload } from "../utils/tokenStorage";

import { getBackendBaseUrl } from "../utils/apiBase";

/* =========================
   Environment Validation
========================= */

const BACKEND_URL = getBackendBaseUrl();

const API = `${BACKEND_URL}/api/v1`;

/* =========================
   Axios Instance
========================= */

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30000,
  withCredentials: true // Enable sending cookies with requests
});

let isRefreshingToken = false;
let refreshQueue = [];
let csrfInitPromise = null;
let csrfTokenCache = null;

const getStoredToken = (key) => {
  if (key === 'refresh_token') return tokenStorage.getRefreshToken();
  return tokenStorage.getToken();
};

const setStoredToken = (key, value) => {
  if (key === 'refresh_token') tokenStorage.setRefreshToken(value);
  else tokenStorage.setToken(value);
};

const clearStoredTokens = () => {
  tokenStorage.removeToken();
};


// Reusing decodeToken from tokenStorage utility as decodeJwtPayload


const resolveRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
};

const refreshAccessToken = async () => {
  const refreshToken = getStoredToken('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  let csrfToken = getCsrfToken();
  if (!csrfToken) {
    const csrfResponse = await axios.get(`${API}/csrf-token`, {
      timeout: 30000,
      withCredentials: true,
    });
    csrfTokenCache = csrfResponse.data?.data?.csrf_token || csrfResponse.data?.csrf_token || csrfTokenCache;
    csrfToken = getCsrfToken();
  }

  const currentToken = getStoredToken('token');
  const decodedToken = decodeJwtPayload(currentToken);
  const userId = decodedToken?.user_id || decodedToken?.sub;
  const refreshPayload = { refresh_token: refreshToken };

  if (userId) {
    refreshPayload.user_id = userId;
  }

  const response = await axios.post(`${API}/auth/refresh`, {
    ...refreshPayload,
  }, {
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
    timeout: 30000,
    withCredentials: true,
  });

  const payload = response.data?.data || response.data || {};
  const accessToken = payload.token || payload.access_token;
  const nextRefreshToken = payload.refresh_token || payload.refreshToken;

  if (!accessToken) {
    throw new Error('Refresh response did not include an access token');
  }

  setStoredToken('token', accessToken);
  if (nextRefreshToken) {
    setStoredToken('refresh_token', nextRefreshToken);
  }

  return accessToken;
};

/* =========================
   Response Interceptor
========================= */

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.hasOwnProperty('success')) {
      if (response.data.success) {
        // Return custom object with data and meta
        return {
          ...response,
          data: response.data.data,
          meta: response.data.meta || {}
        };
      } else {
        return Promise.reject(new Error(response.data.message || 'API Error'));
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshingToken) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshingToken = true;

      try {
        const token = await refreshAccessToken();
        resolveRefreshQueue(null, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        resolveRefreshQueue(refreshError, null);
        clearStoredTokens();
        // Notify the app that authentication has failed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-failure', { 
            detail: { message: refreshError.message || 'Session expired' } 
          }));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshingToken = false;
      }
    }

    // Also handle immediate 401/403 for non-retryable requests or when refresh fails
    if (error.response?.status === 401 || error.response?.status === 403) {
      const message = error.response?.data?.message || error.message || 'Authentication failed';
      const currentUrl = typeof window !== 'undefined' ? window.location.pathname : '';
      
      if (currentUrl.includes('/admin')) {
         console.warn(`Unauthorized access to ${currentUrl}: ${message}`);
      }

      // If it's a 401, it's a clear authentication failure
      if (error.response?.status === 401) {
        clearStoredTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-failure', { 
            detail: { message } 
          }));
        }
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   Request Interceptor
========================= */

api.interceptors.request.use(
  async (config) => {
    const token = getStoredToken("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'production' && config.url.includes('/admin')) {
        console.log(`[API] Attached token for admin request: ${config.url}`);
      }
    } else {
      console.warn(`[API] MISSING token for request: ${config.url}`);
    }

    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        await initializeCsrfToken();
        csrfToken = getCsrfToken();
      }
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Get CSRF token from cookie
 */
const getCsrfToken = () => {
  if (typeof document === 'undefined') return csrfTokenCache;
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : csrfTokenCache;
};

/**
 * Initialize CSRF token by making a GET request
 */
const initializeCsrfToken = async () => {
  if (csrfInitPromise) return csrfInitPromise;

  csrfInitPromise = (async () => {
    try {
      const response = await api.get('/csrf-token');
      csrfTokenCache = response?.data?.csrf_token || csrfTokenCache;
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error.message);
    } finally {
      csrfInitPromise = null;
    }
  })();

  return csrfInitPromise;
};

// Initialize CSRF token on module load
if (typeof window !== 'undefined') {
  initializeCsrfToken();
}

/* =========================
   Response Error Handler
========================= */

const handleError = (error) => {
  console.error("API Error:", error?.response || error.message);
  throw error;
};

/* =========================
   AUTH APIs
========================= */

export const authAPI = {
  register: async (data) => {
    try {
      return await api.post("/auth/register", data);
    } catch (err) {
      handleError(err);
    }
  },

  login: async (data) => {
    try {
      return await api.post("/auth/login", data);
    } catch (err) {
      handleError(err);
    }
  },

  getMe: async () => {
    try {
      return await api.get("/auth/me");
    } catch (err) {
      handleError(err);
    }
  },

  checkAdmin: async () => {
    try {
      return await api.get("/auth/check-admin");
    } catch (err) {
      throw err; // Let the caller handle auth errors
    }
  }
};

/* =========================
   Standardized Helpers
========================= */

const normalizePagination = (res, params = {}) => {
  // If the interceptor already mapped res.data to response.data.data, 
  // then pagination info might be in res.meta or res.data.meta
  const meta = res.meta || res.data?.meta || {};
  const paginationData = meta.pagination || res.pagination || res.data?.pagination || {};
  
  const page = paginationData.page || paginationData.current_page || params.page || 1;
  const limit = paginationData.limit || paginationData.per_page || res.data?.perPage || params.per_page || params.limit || 20;
  const total = paginationData.total || res.data?.totalProducts || res.data?.total || 0;
  const totalPages = paginationData.totalPages || paginationData.total_pages || 
                    Math.max(Math.ceil(total / limit), 1);

  return { page, limit, total, totalPages };
};

const parseNumericValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOrderStats = (rawStats, orders = [], pagination = {}) => {
  const stats = rawStats && typeof rawStats === "object" ? rawStats : {};
  const derivedRevenue = orders.reduce(
    (sum, order) => sum + parseNumericValue(order?.total_amount ?? order?.total, 0),
    0
  );
  const pendingStatuses = new Set(["pending", "pending_payment"]);

  return {
    total: parseNumericValue(
      stats.total ?? stats.totalOrders ?? pagination.total ?? orders.length,
      0
    ),
    pending: parseNumericValue(
      stats.pending ?? stats.pendingOrders ?? orders.filter((order) => pendingStatuses.has(order?.status)).length,
      0
    ),
    shipped: parseNumericValue(
      stats.shipped ?? stats.shippedOrders ?? orders.filter((order) => order?.status === "shipped").length,
      0
    ),
    totalRevenue: parseNumericValue(
      stats.totalRevenue ?? stats.revenue ?? stats.grossRevenue ?? derivedRevenue,
      0
    ),
    today: parseNumericValue(stats.today ?? stats.todayOrders, 0)
  };
};

/* =========================
   PRODUCTS APIs
========================= */

export const productsAPI = {
  /* ---- Get All Products ---- */
  getAll: async (params = {}) => {
    try {
      const requestParams = {
        ...params,
        per_page: params.per_page || params.limit,
      };
      const res = await api.get("/products", { params: requestParams });

      // Handle both standard paginated response and old wrapper format
      const rawProducts = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.products || res.data?.items || []);
      
      const pagination = normalizePagination(res, requestParams);

      const filters = res.meta?.filters || res.data?.filters || res.data?.filterMetadata || {};

      return {
        ...res,
        data: transformWooProducts(rawProducts),
        products: rawProducts,
        filters,
        pagination,
        stats: res.meta?.stats || res.data?.stats || null,
        sortOptions: res.meta?.sortOptions || res.data?.sortOptions || [],
        appliedFilters: res.meta?.appliedFilters || res.data?.appliedFilters || {},
        totalProducts: pagination.total
      };
    } catch (err) {
      handleError(err);
      return { data: [], products: [], filters: {}, pagination: {}, sortOptions: [], totalProducts: 0, stats: null };
    }
  },

  /* ---- Create Product ---- */
  create: async (data) => {
    try {
      return await api.post("/products", data);
    } catch (err) {
      handleError(err);
    }
  },

  clone: async (id) => {
    try {
      return await api.post(`/products/${id}/clone`);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  /* ---- Update Product ---- */
  update: async (id, data) => {
    try {
      return await api.put(`/products/${id}`, data);
    } catch (err) {
      handleError(err);
    }
  },

  /* ---- Delete Product ---- */
  delete: async (id) => {
    try {
      return await api.delete(`/products/${id}`);
    } catch (err) {
      handleError(err);
    }
  },

  bulkDelete: async (ids) => {
    try {
      return await api.post("/products/bulk-delete", { ids });
    } catch (err) {
      handleError(err);
    }
  },

  /* ---- Get Single Product ---- */
  getById: async (id) => {
    try {
      const res = await api.get(`/products/${id}`);

      return {
        ...res,
        data: transformWooProduct(res.data)
      };
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  /* ---- Variant Matrix ---- */
  getVariantMatrix: async (id) => {
    try {
      const res = await api.get(`/products/${id}/variants/matrix`);
      return res;
    } catch (err) {
      console.warn("Variant matrix unavailable:", err?.response?.data || err.message);
      return { data: { variants: [] } };
    }
  },

  getVariantStock: async (id, color, size) => {
    try {
      const res = await api.get(`/products/${id}/variants/stock`, {
        params: { color, size }
      });
      return res;
    } catch (err) {
      console.warn("Variant stock unavailable:", err?.response?.data || err.message);
      return { data: null };
    }
  },

  validateVariantStock: async (id, color, size, quantity = 1) => {
    try {
      const res = await api.get(`/products/${id}/variants/validate-stock`, {
        params: { color, size, quantity }
      });
      return res;
    } catch (err) {
      console.warn("Variant validation unavailable:", err?.response?.data || err.message);
      return { data: { valid: false } };
    }
  },

  /* ---- Categories ---- */
  getCategories: async () => {
    try {
      return await api.get("/categories");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  /* ---- Recommendations ---- */
  getRecommendations: async (id) => {
    try {
      const res = await api.get(`/recommendations/${id}`);

      const rawProducts = res.data.products || res.data;
      const safeData = Array.isArray(rawProducts)
        ? transformWooProducts(rawProducts)
        : [];

      return { ...res, data: safeData };
    } catch (err) {
      console.warn("Recommendations unavailable:", err?.response?.data || err.message);
      return { data: [] };
    }
  }
};

/* =========================
   CART APIs
========================= */

export const cartAPI = {
  get: async (sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.get("/cart", config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      return { data: { items: [] } };
    }
  },

  add: async (data, sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.post("/cart/add", data, config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  updateQuantity: async (cartItemId, quantity, sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.put(`/cart/item/${cartItemId}`, { quantity }, config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  remove: async (cartItemId, sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.delete(`/cart/item/${cartItemId}`, config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  clear: async (sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.delete("/cart", config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  // Coupon methods
  applyCoupon: async (couponCode, sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.post("/cart/coupon/apply", { couponCode }, config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  removeCoupon: async (sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.delete("/cart/coupon/remove", config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getAppliedCoupon: async (sessionId) => {
    try {
      const config = {};
      if (sessionId) {
        config.headers = { 'x-session-id': sessionId };
      }
      const res = await api.get("/cart/coupon", config);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },
};

/* =========================
   WISHLIST APIs
========================= */

export const wishlistAPI = {
  get: async (params = {}) => {
    try {
      return await api.get("/wishlist", { params });
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  add: async (productId) => {
    try {
      const response = await api.post(`/wishlist/${encodeURIComponent(productId)}`, {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlist:changed'));
      }
      return response;
    } catch (err) {
      handleError(err);
    }
  },

  remove: async (productId) => {
    try {
      const response = await api.delete(`/wishlist/${encodeURIComponent(productId)}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlist:changed'));
      }
      return response;
    } catch (err) {
      handleError(err);
    }
  },

  check: async (productId) => {
    try {
      return await api.get(`/wishlist/check/${encodeURIComponent(productId)}`);
    } catch (err) {
      handleError(err);
      return { data: { inWishlist: false } };
    }
  }
};

/* =========================
   ORDERS APIs
========================= */

export const ordersAPI = {
  create: async (data) => {
    try {
      return await api.post("/orders", data);
    } catch (err) {
      handleError(err);
    }
  },

  confirmPayment: async (orderId, data) => {
    try {
      return await api.post(`/orders/${orderId}/payment`, data);
    } catch (err) {
      handleError(err);
    }
  },

  getAll: async (params = {}) => {
    try {
      let res;

      try {
        res = await api.get("/admin/orders", { params });
      } catch (primaryError) {
        const status = primaryError?.response?.status;
        if (status === 401 || status === 403) {
          throw primaryError;
        }
        res = await api.get("/orders/admin/all", { params });
      }
      
      // After interceptor, res.data is already the 'data' part of the response
      const orders = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      const pagination = normalizePagination(res, params);
      const meta = res.meta || {};
      const stats = normalizeOrderStats(res.data?.stats || meta.stats || null, orders, pagination);
      
      return {
        orders,
        pagination,
        stats,
        success: true
      };
    } catch (err) {
      handleError(err);
      return { orders: [], pagination: {}, stats: {} };
    }
  },

  updateStatus: async (orderId, data) => {
    try {
      return await api.patch(`/orders/admin/${orderId}/status`, data);
    } catch (err) {
      handleError(err);
    }
  },

  getMyOrders: async (params = {}) => {
    try {
      const res = await api.get("/orders/my", { params });
      const orders = res.data?.orders || res.orders || res.data || [];
      const pagination = res.meta?.pagination || res.pagination || {};

      return {
        ...res,
        orders,
        pagination,
        data: res.data
      };
    } catch (err) {
      handleError(err);
      return { orders: [], pagination: {}, data: [] };
    }
  },

  getById: async (id) => {
    try {
      return await api.get(`/orders/${id}`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  track: async (orderNumber) => {
    try {
      return await api.get(`/orders/${encodeURIComponent(orderNumber)}/tracking`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  cancelOrder: async (id) => {
    try {
      return await api.post(`/orders/my/${encodeURIComponent(id)}/cancel`, {
        reason: 'Cancelled by customer',
      });
    } catch (err) {
      handleError(err);
    }
  },

  getShipments: async (id) => {
    try {
      return await api.get(`/orders/${id}/shipments`);
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  requestRefund: async (id, data) => {
    try {
      return await api.post(`/orders/${id}/refunds`, data);
    } catch (err) {
      handleError(err);
    }
  },

  getRefunds: async (id) => {
    try {
      return await api.get(`/orders/${id}/refunds`);
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  }
};

/* =========================
   INSIDER APIs
========================= */

export const insiderAPI = {
  subscribe: async (data) => {
    try {
      return await api.post("/insiders/subscribe", data);
    } catch (err) {
      handleError(err);
    }
  },

  getOptions: async () => {
    try {
      return await api.get("/insiders/options");
    } catch (err) {
      handleError(err);
      return { data: { interests: [] } };
    }
  }
};

/* =========================
   BLOG APIs
========================= */

export const blogAPI = {
  api,  // Expose the axios instance for direct API calls (e.g., image upload)
  getPosts: async (params) => {
    try {
      return await api.get("/blogs", { params });
    } catch (err) {
      handleError(err);
      return { data: { posts: [], pagination: {} } };
    }
  },

  getPostBySlug: async (slug) => {
    try {
      return await api.get(`/blogs/slug/${slug}`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  getPostById: async (postId) => {
    try {
      return await api.get(`/blogs/${postId}`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  getCategories: async () => {
    try {
      return await api.get("/blogs/categories");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  getTags: async () => {
    try {
      return await api.get("/blogs/tags");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  getRelatedPosts: async (postId) => {
    try {
      return await api.get(`/blogs/${postId}/related`);
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  getComments: async (postId) => {
    try {
      return await api.get(`/blogs/${postId}/comments`);
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  addComment: async (postId, comment) => {
    try {
      return await api.post(`/blogs/${postId}/comment`, { comment });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getAnalytics: async () => {
    try {
      return await api.get("/blogs/admin/analytics");
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  getCapabilities: async () => {
    try {
      return await api.get("/blogs/capabilities");
    } catch (err) {
      handleError(err);
      return { data: { capabilities: {} } };
    }
  },

  createPost: async (data) => {
    try {
      return await api.post("/blogs", data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  updatePost: async (postId, data) => {
    try {
      return await api.put(`/blogs/${postId}`, data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  publishPost: async (postId) => {
    try {
      return await api.post(`/blogs/${postId}/publish`);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  archivePost: async (postId) => {
    try {
      return await api.post(`/blogs/${postId}/archive`);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  deletePost: async (postId) => {
    try {
      return await api.delete(`/blogs/${postId}`);
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

/* =========================
   ADMIN - COUPONS APIs
========================= */

export const couponsAPI = {
  getAll: async (params = {}) => {
    try {
      const res = await api.get("/coupons", { params });
      const rawCoupons = res.data?.coupons || res.coupons || res.data || [];
      const coupons = Array.isArray(rawCoupons) ? rawCoupons : [];
      const pagination = normalizePagination(res, params);
      const stats = res.meta?.stats || res.data?.stats || null;

      return {
        ...res,
        coupons,
        pagination,
        stats,
        data: {
          coupons,
          stats,
          pagination,
        }
      };
    } catch (err) {
      handleError(err);
      return { coupons: [], pagination: {}, stats: null, data: { coupons: [], stats: null, pagination: {} } };
    }
  },

  getById: async (id) => {
    try {
      return await api.get(`/coupons/${id}`);
    } catch (err) {
      handleError(err);
    }
  },

  create: async (data) => {
    try {
      return await api.post("/coupons", data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      return await api.put(`/coupons/${id}`, data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  delete: async (id) => {
    try {
      return await api.delete(`/coupons/${id}`);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  // Customer-facing validation
  validateCoupon: async (code) => {
    try {
      const res = await api.get(`/coupons/validate/${encodeURIComponent(code)}`);
      return { data: res.data };
    } catch (err) {
      handleError(err);
      return { data: { valid: false, message: 'Invalid coupon code' } };
    }
  },
};

/* =========================
   ADMIN - WAREHOUSE APIs
========================= */

export const warehouseAPI = {
  getAll: async () => {
    try {
      return await api.get("/admin/warehouses");
    } catch (err) {
      handleError(err);
    }
  },

  getLowStockAlerts: async (params = {}) => {
    try {
      return await api.get("/admin/inventory/low-stock", { params });
    } catch (err) {
      handleError(err);
    }
  }
};

export const inventoryAPI = {
  getStockLevels: async (params = {}) => {
    try {
      const res = await api.get("/admin/inventory/stock-levels", { params });
      
      // After interceptor, res.data is already the 'data' part of the response
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const pagination = normalizePagination(res, params);
      const meta = res.meta || {};

      return {
        items,
        pagination,
        stats: meta.stats || null
      };
    } catch (err) {
      handleError(err);
      return { items: [], pagination: {} };
    }
  },

  getLowStockItems: async (params = {}) => {
    try {
      const response = await api.get("/admin/inventory/low-stock", { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      handleError(err);
      return [];
    }
  },

  updateStockLevel: async (variantId, data) => {
    try {
      return await api.put(`/admin/inventory/${variantId}`, data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  recordOfflineSale: async (data) => {
    try {
      return await api.post("/admin/inventory/offline-sale", data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

/* =========================
   ADMIN - ANALYTICS APIs
========================= */

export const analyticsAPI = {
  getOverview: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/overview", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getSales: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/sales", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getProducts: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/products", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getRevenue: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/revenue", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getTopCustomers: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/customers", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  getVisitorRegions: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/visitors/regions", { params });
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

/* =========================
   UPLOAD APIs
========================= */

export const uploadAPI = {
  uploadImage: async (formData) => {
    try {
      return await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    } catch (err) {
      handleError(err);
    }
  },

  uploadImages: async (formData) => {
    try {
      return await api.post("/upload/images", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    } catch (err) {
      handleError(err);
    }
  }
};

/* =========================
   SEARCH APIs
========================= */

export const searchAPI = {
  search: async (params = {}) => {
    try {
      return await api.get("/search", { params });
    } catch (err) {
      handleError(err);
    }
  },

  getSuggestions: async (query, limit = 10) => {
    try {
      return await api.get("/search/suggestions", { params: { q: query, limit } });
    } catch (err) {
      handleError(err);
    }
  }
};

/* =========================
   REVIEWS APIs
========================= */

export const reviewsAPI = {
  getProductReviews: async (productId, params = {}) => {
    try {
      return await api.get(`/products/${productId}/reviews`, { params });
    } catch (err) {
      handleError(err);
    }
  },

  createReview: async (productId, data) => {
    try {
      return await api.post(`/products/${productId}/reviews`, data);
    } catch (err) {
      handleError(err);
    }
  },

  getUserReviews: async (userId, params = {}) => {
    try {
      return await api.get(`/users/${userId}/reviews`, { params });
    } catch (err) {
      handleError(err);
    }
  }
};

/* =========================
   RECOMMENDATIONS APIs
========================= */

export const recommendationsAPI = {
  getProductRecommendations: async (productId, params = {}) => {
    try {
      return await api.get(`/recommendations/${productId}`, { params });
    } catch (err) {
      handleError(err);
    }
  },

  getPersonalized: async (params = {}) => {
    try {
      return await api.get("/recommendations/personal", { params });
    } catch (err) {
      handleError(err);
    }
  }
};

/* =========================
   CATEGORIES APIs
========================= */

export const categoriesAPI = {
  getAll: async () => {
    try {
      const response = await api.get("/categories");
      return Array.isArray(response.data) ? response.data : (response.data.categories || []);
    } catch (err) {
      handleError(err);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/categories/${encodeURIComponent(id)}`);
      return response.data || null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      handleError(err);
      return null;
    }
  },

  getBySlug: async (slug) => {
    try {
      const response = await api.get(`/categories/slug/${encodeURIComponent(slug)}`);
      return response.data || null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      handleError(err);
      return null;
    }
  },

  create: async (data) => {
    try {
      const response = await api.post("/categories", data);
      return response.data || null;
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/categories/${encodeURIComponent(id)}`, data);
      return response.data || null;
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/categories/${encodeURIComponent(id)}`);
      // For delete operations, return success status
      return { success: true, ...(response.data || {}) };
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

/* =========================
   USERS APIs
========================= */

export const usersAPI = {
  getProfile: async (userId) => {
    try {
      return await api.get("/users/profile", { params: { userId } });
    } catch (err) {
      handleError(err);
    }
  },

  updateProfile: async (data) => {
    try {
      return await api.put("/users/profile", data);
    } catch (err) {
      handleError(err);
    }
  }
};

// Export all services
export default api;

// Export centralized API client
export { api as apiClient, authAPI as auth, handleError };

// Export admin services
export { default as adminOrderService } from './adminOrderService';
export { default as userManagementService } from './userManagementService';
export { default as tenantService } from './tenantService';
export { default as reviewService } from './reviewService';
export { default as searchService } from './searchService';
export { default as notificationService } from './notificationService';
export { default as analyticsService } from './analyticsService';
