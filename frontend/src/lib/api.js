import axios from "axios";
import { transformWooProducts, transformWooProduct } from "./productTransformer";

/* =========================
   Environment Validation
========================= */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error("REACT_APP_BACKEND_URL is not defined");
}

const API = `${BACKEND_URL}/api`;

/* =========================
   Axios Instance
========================= */

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 15000
});

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

      const safeData = Array.isArray(res.data)
        ? transformWooProducts(res.data)
        : [];

      return { ...res, data: safeData };
    } catch (err) {
      handleError(err);
      return { data: [] };
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

      const safeData = Array.isArray(res.data)
        ? transformWooProducts(res.data)
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
      const res = await api.get("/cart", {
        params: { session_id: sessionId }
      });
      return { data: res.data };
    } catch (err) {
      handleError(err);
      return { data: { items: [] } };
    }
  },

  add: async (data, sessionId) => {
    try {
      const res = await api.post("/cart", data, {
        params: { session_id: sessionId }
      });
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  updateQuantity: async (productId, quantity, sessionId, variation = null) => {
    try {
      const params = { quantity, session_id: sessionId };
      if (variation) {
        params.variation = JSON.stringify(variation);
      }
      const res = await api.patch(`/cart/item/${productId}`, null, {
        params
      });
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  remove: async (productId, sessionId, variation = null) => {
    try {
      const params = { session_id: sessionId };
      if (variation) {
        params.variation = JSON.stringify(variation);
      }
      const res = await api.delete(`/cart/item/${productId}`, {
        params
      });
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  clear: async (sessionId) => {
    try {
      const res = await api.delete("/cart", {
        params: { session_id: sessionId }
      });
      return { data: res.data };
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
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
      return await api.post("/orders/create", data);
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
      return await api.get("/orders");
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
      return await api.get(`/orders/track/${orderNumber}`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  }
};

/* =========================
   BLOG APIs
========================= */

export const blogAPI = {
  getPosts: async (params) => {
    try {
      return await api.get("/wp/posts", { params });
    } catch (err) {
      handleError(err);
      return { data: { posts: [], pagination: {} } };
    }
  },

  getPostById: async (postId) => {
    try {
      return await api.get(`/wp/posts/${postId}`);
    } catch (err) {
      handleError(err);
      return { data: null };
    }
  },

  getCategories: async () => {
    try {
      return await api.get("/wp/categories");
    } catch (err) {
      handleError(err);
      return { data: [] };
    }
  },

  getCapabilities: async () => {
    try {
      return await api.get("/wp/capabilities");
    } catch (err) {
      handleError(err);
      return { data: { capabilities: {} } };
    }
  },

  updatePost: async (postId, data) => {
    try {
      return await api.put(`/wp/posts/${postId}`, data);
    } catch (err) {
      handleError(err);
      throw err;
    }
  },

  uploadMedia: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Let axios automatically set the multipart/form-data boundary
      return await api.post("/wp/media", formData);
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
};

export default api;
