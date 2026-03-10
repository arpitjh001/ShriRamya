/**
 * Analytics Service
 * Comprehensive analytics and reporting
 */

import api from './apiClient';

export const analyticsService = {
  /**
   * Get dashboard overview
   */
  getOverview() {
    return api.get('/admin/analytics/overview');
  },

  /**
   * Get sales analytics
   */
  getSales(params = {}) {
    return api.get('/admin/analytics/sales', { params });
  },

  /**
   * Get product analytics
   */
  getProducts(params = {}) {
    return api.get('/admin/analytics/products', { params });
  },

  /**
   * Get revenue analytics
   */
  getRevenue(params = {}) {
    return api.get('/admin/analytics/revenue', { params });
  },

  /**
   * Get order analytics
   */
  getOrders(params = {}) {
    return api.get('/orders/admin/analytics/orders', { params });
  },

  /**
   * Get blog analytics
   */
  getBlogs() {
    return api.get('/blogs/admin/analytics');
  },

  /**
   * Get warehouse analytics
   */
  getWarehouses() {
    return api.get('/admin/warehouses');
  },

  /**
   * Get low stock alerts
   */
  getLowStockAlerts(params = {}) {
    return api.get('/admin/warehouses/inventory/low-stock', { params });
  },

  /**
   * Get fraud statistics
   */
  getFraudStatistics() {
    return api.get('/admin/fraud/statistics');
  },

  /**
   * Get flagged orders
   */
  getFlaggedOrders() {
    return api.get('/admin/fraud/flagged-orders');
  },

  /**
   * Unflag order
   */
  unflagOrder(orderId) {
    return api.post(`/admin/fraud/orders/${orderId}/unflag`);
  },
};

export default analyticsService;
