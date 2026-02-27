/**
 * WooCommerce Headless API Client
 * Manages products, orders, customers, coupons via the backend WC proxy
 */

import api from './api';

const WC_BASE = '';

/* =========================
   PRODUCTS
========================= */

export const wcProductsAPI = {
  getAll: async (params = {}) => {
    try {
      const res = await api.get(`/products`, { params });
      return { products: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      console.error('WC Products fetch error:', err);
      return { products: [], page: 1, per_page: 20 };
    }
  },

  getById: async (id) => {
    try {
      const res = await api.get(`/products/${id}`);
      return res.data;
    } catch (err) {
      console.error('WC Product fetch error:', err);
      return null;
    }
  },

  create: async (data) => {
    const res = await api.post(`/products`, data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  },
};

/* =========================
   CATEGORIES
========================= */

export const wcCategoriesAPI = {
  getAll: async () => {
    try {
      const res = await api.get(`/products/categories`);
      return { categories: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      console.error('WC Categories fetch error:', err);
      return { categories: [] };
    }
  },

  create: async (data) => {
    const res = await api.post(`/products/categories`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/products/categories/${id}`);
    return res.data;
  },
};

/* =========================
   ORDERS
========================= */

export const wcOrdersAPI = {
  getAll: async (params = {}) => {
    try {
      const res = await api.get(`/orders`, { params });
      return { orders: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      console.error('WC Orders fetch error:', err);
      return { orders: [], page: 1 };
    }
  },

  getById: async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    } catch (err) {
      console.error('WC Order fetch error:', err);
      return null;
    }
  },

  create: async (data) => {
    const res = await api.post(`/orders`, data);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/orders/${id}/status`, { status });
    return res.data;
  },

  markPaid: async (id, transactionId) => {
    const res = await api.post(`/orders/${id}/paid`, {
      transaction_id: transactionId,
    });
    return res.data;
  },

  addNote: async (id, note) => {
    const res = await api.post(`/orders/${id}/notes`, null, {
      params: { note },
    });
    return res.data;
  },
};

/* =========================
   CUSTOMERS
========================= */

export const wcCustomersAPI = {
  getAll: async (params = {}) => {
    try {
      const res = await api.get(`/customers`, { params });
      return { customers: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      console.error('WC Customers fetch error:', err);
      return { customers: [], page: 1 };
    }
  },

  getById: async (id) => {
    try {
      const res = await api.get(`/customers/${id}`);
      return res.data;
    } catch (err) {
      console.error('WC Customer fetch error:', err);
      return null;
    }
  },

  create: async (data) => {
    const res = await api.post(`/customers`, data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },

  lookupByEmail: async (email) => {
    try {
      const res = await api.get(`/customers/lookup/${email}`);
      return res.data;
    } catch (err) {
      return null;
    }
  },
};

/* =========================
   COUPONS
========================= */

export const wcCouponsAPI = {
  getAll: async () => {
    try {
      const res = await api.get(`/coupons`);
      return { coupons: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      console.error('WC Coupons fetch error:', err);
      return { coupons: [] };
    }
  },

  create: async (data) => {
    const res = await api.post(`/coupons`, data);
    return res.data;
  },

  validate: async (code) => {
    try {
      const res = await api.get(`/coupons/validate/${code}`);
      return res.data;
    } catch (err) {
      return { valid: false, reason: 'Validation failed' };
    }
  },
};

/* =========================
   REPORTS
========================= */

export const wcReportsAPI = {
  getSales: async (period = 'month') => {
    try {
      const res = await api.get(`/reports/sales`, { params: { period } });
      return res.data;
    } catch (err) {
      console.error('WC Sales report error:', err);
      return null;
    }
  },

  getTopSellers: async (period = 'month') => {
    try {
      const res = await api.get(`/reports/top-sellers`, { params: { period } });
      return res.data;
    } catch (err) {
      console.error('WC Top sellers error:', err);
      return null;
    }
  },
};
