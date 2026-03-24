import axios from "axios";
import { transformWooProducts, transformWooProduct } from "../utils/productTransformer";

/* =========================
   Environment Validation
========================= */

let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// Inside the Docker container network, BACKEND_URL might be defined as backend:8000
// or localhost:8000 if built with defaults. The browser cannot resolve these
// directly in many cases, so we map them to relative URLs which NGINX reverse 
// proxies to the container correctly.
if (BACKEND_URL && (BACKEND_URL.includes("backend:8000") || BACKEND_URL.includes("localhost:8000"))) {
  BACKEND_URL = "";
}

const API = `${BACKEND_URL}/api/v1`;

/* =========================
   Axios Instance
========================= */

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30000
});

/* =========================
   Response Interceptor
========================= */

api.interceptors.response.use(
  (response) => {
    // If the response follows our standard format { success, message, data }
    // we extract the data directly for easier consumption.
    if (response.data && response.data.hasOwnProperty('success')) {
      if (response.data.success) {
        return { ...response, data: response.data.data };
      } else {
        return Promise.reject(new Error(response.data.message || 'API Error'));
      }
    }
    return response;
  },
  (error) => Promise.reject(error)
);

/* =========================
   Request Interceptor
========================= */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

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
   PRODUCTS APIs
========================= */

export const productsAPI = {
  /* ---- Get All Products ---- */
  getAll: async (params = {}) => {
    try {
      const res = await api.get("/products", { params });

      const rawProducts = res.data.products || res.data || [];
      const transformedData = Array.isArray(rawProducts)
        ? transformWooProducts(rawProducts)
        : [];

      return {
        ...res,
        data: transformedData,
        products: rawProducts,
        filters: res.data.filters || {},
        pagination: res.data.pagination || {},
        sortOptions: res.data.sortOptions || [],
        appliedFilters: res.data.appliedFilters || {},
        totalProducts: res.data.totalProducts || transformedData.length
      };
    } catch (err) {
      handleError(err);
      return { data: [], products: [], filters: {}, pagination: {}, sortOptions: [], totalProducts: 0 };
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
      handleError(err);
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
      handleError(err);
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
      handleError(err);
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
      handleError(err);
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
  get: async () => {
    try {
      return await api.get("/wishlist");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  add: async (productId) => {
    try {
      return await api.post(`/wishlist/${productId}`);
    } catch (err) {
      handleError(err);
    }
  },

  remove: async (productId) => {
    try {
      return await api.delete(`/wishlist/${productId}`);
    } catch (err) {
      handleError(err);
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

  getAll: async () => {
    try {
      return await api.get("/orders/admin/all");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  getMyOrders: async () => {
    try {
      return await api.get("/orders/my");
    } catch (err) {
      handleError(err);
      return { data: [] };
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
      return await api.get(`/orders/${orderNumber}/tracking`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  cancelOrder: async (id) => {
    try {
      return await api.post(`/orders/my/${id}/cancel`);
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
      return await api.get("/coupons", { params });
    } catch (err) {
      handleError(err);
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
    }
  },

  update: async (id, data) => {
    try {
      return await api.put(`/coupons/${id}`, data);
    } catch (err) {
      handleError(err);
    }
  },

  delete: async (id) => {
    try {
      return await api.delete(`/coupons/${id}`);
    } catch (err) {
      handleError(err);
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

/* =========================
   ADMIN - ANALYTICS APIs
========================= */

export const analyticsAPI = {
  getOverview: async () => {
    try {
      return await api.get("/admin/analytics/overview");
    } catch (err) {
      handleError(err);
    }
  },

  getSales: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/sales", { params });
    } catch (err) {
      handleError(err);
    }
  },

  getProducts: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/products", { params });
    } catch (err) {
      handleError(err);
    }
  },

  getRevenue: async (params = {}) => {
    try {
      return await api.get("/admin/analytics/revenue", { params });
    } catch (err) {
      handleError(err);
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
      // Handle different response structures
      return response.data.data || response.data;
    } catch (err) {
      handleError(err);
      return { categories: [] };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/categories/${id}`);
      return response.data.data || response.data;
    } catch (err) {
      handleError(err);
      return null;
    }
  },

  getBySlug: async (slug) => {
    try {
      const response = await api.get(`/categories/slug/${slug}`);
      return response.data.data || response.data;
    } catch (err) {
      handleError(err);
      return null;
    }
  },

  create: async (data) => {
    try {
      const response = await api.post("/categories", data);
      return response.data.data || response.data;
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/categories/${id}`, data);
      return response.data.data || response.data;
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`);
      // For delete operations, return success status
      return { success: true, ...response.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

// Export all services
export default api;

// Export centralized API client
export { api as apiClient, auth, handleError } from './apiClient';

// Export admin services
export { default as adminOrderService } from './adminOrderService';
export { default as userManagementService } from './userManagementService';
export { default as tenantService } from './tenantService';
export { default as reviewService } from './reviewService';
export { default as searchService } from './searchService';
export { default as notificationService } from './notificationService';
export { default as analyticsService } from './analyticsService';

