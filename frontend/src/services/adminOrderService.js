/**
 * Admin Order Management Service
 * Handles order management, shipments, and refunds
 */

import api from './apiClient';

export const adminOrderService = {
  /**
   * Get all orders (admin)
   */
  getAllOrders(params = {}) {
    return api.get('/orders/admin/all', { params });
  },

  /**
   * Get order by ID
   */
  getOrderById(id) {
    return api.get(`/orders/${id}`);
  },

  /**
   * Update order status
   */
  updateOrderStatus(id, status) {
    return api.patch(`/orders/admin/${id}/status`, { status });
  },

  /**
   * Get all shipments
   */
  getAllShipments(params = {}) {
    return api.get('/orders/admin/shipments', { params });
  },

  /**
   * Get ready to ship orders
   */
  getReadyToShip() {
    return api.get('/orders/admin/shipments/ready-to-ship');
  },

  /**
   * Get pending shipments
   */
  getPendingShipments() {
    return api.get('/orders/admin/shipments/pending');
  },

  /**
   * Create shipment
   */
  createShipment(orderId, shipmentData) {
    return api.post(`/orders/admin/${encodeURIComponent(orderId)}/shipments`, shipmentData);
  },

  /**
   * Update shipment tracking
   */
  updateTracking(shipmentId, trackingData) {
    return api.patch(`/orders/admin/shipments/${shipmentId}/tracking`, trackingData);
  },

  /**
   * Mark shipment as shipped
   */
  markAsShipped(shipmentId) {
    return api.post(`/orders/admin/shipments/${shipmentId}/ship`);
  },

  /**
   * Mark shipment as delivered
   */
  markAsDelivered(shipmentId) {
    return api.post(`/orders/admin/shipments/${shipmentId}/deliver`);
  },

  /**
   * Delete shipment
   */
  deleteShipment(shipmentId) {
    return api.delete(`/orders/admin/shipments/${shipmentId}`);
  },

  /**
   * Get refund details
   */
  getRefund(refundId) {
    return api.get(`/orders/admin/refunds/${refundId}`);
  },

  /**
   * Approve refund
   */
  approveRefund(refundId) {
    return api.post(`/orders/admin/refunds/${refundId}/approve`);
  },

  /**
   * Process refund
   */
  processRefund(refundId) {
    return api.post(`/orders/admin/refunds/${refundId}/process`);
  },

  /**
   * Reject refund
   */
  rejectRefund(refundId) {
    return api.post(`/orders/admin/refunds/${refundId}/reject`);
  },

  /**
   * Get order analytics
   */
  getOrderAnalytics(params = {}) {
    return api.get('/orders/admin/analytics/orders', { params });
  },

  /**
   * Shiprocket: Get available couriers for a route
   */
  getShiprocketCouriers(params = {}) {
    return api.get('/orders/admin/shipping/shiprocket/couriers', { params });
  },

  /**
   * Shiprocket: Check serviceability
   */
  checkShiprocketServiceability(data) {
    return api.post('/orders/admin/shipping/shiprocket/serviceability', data);
  },

  /**
   * Sync shipment status with provider
   */
  syncShipment(shipmentId) {
    return api.post(`/orders/admin/shipments/${shipmentId}/sync`);
  },
};

export default adminOrderService;
