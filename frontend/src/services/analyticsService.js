/**
 * Analytics Service
 * Comprehensive analytics and reporting
 */

import api from './apiClient';

export const analyticsService = {
  /**
   * Get dashboard overview
   */
  trackEvent(eventName, data = {}) {
    return api.post('/analytics/events', { ...data, event_name: eventName });
  },

  getOverview(params = {}) {
    return api.get('/admin/analytics/overview', { params });
  },

  /**
   * Get visitor analytics
   */
  getVisitors(params = {}) {
    return api.get('/admin/analytics/visitors', { params });
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
   * Get cart and checkout analytics
   */
  getCart(params = {}) {
    return api.get('/admin/analytics/cart', { params });
  },

  /**
   * Get category analytics
   */
  getCategories(params = {}) {
    return api.get('/admin/analytics/categories', { params });
  },

  /**
   * Get customer analytics
   */
  getCustomers(params = {}) {
    return api.get('/admin/analytics/customers', { params });
  },

  /**
   * Get search analytics
   */
  getSearch(params = {}) {
    return api.get('/admin/analytics/search', { params });
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
