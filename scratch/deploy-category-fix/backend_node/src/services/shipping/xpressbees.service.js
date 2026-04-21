const axios = require('axios');
const httpStatus = require('http-status');

const config = require('../../config/config');
const ApiError = require('../../utils/ApiError');

const AUTH_REFRESH_WINDOW_MS = 50 * 60 * 1000;

class XpressbeesService {
  constructor() {
    this.client = axios.create({
      baseURL: config.xpressbees.baseUrl,
      timeout: config.xpressbees.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.cachedToken = null;
    this.cachedAt = 0;
  }

  isConfigured() {
    return Boolean(
      config.xpressbees.enabled
      && config.xpressbees.email
      && config.xpressbees.password
    );
  }

  assertConfigured() {
    if (this.isConfigured()) {
      return;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Xpressbees is not configured. Set XPRESSBEES_ENABLED, XPRESSBEES_EMAIL, and XPRESSBEES_PASSWORD.'
    );
  }

  async createShipment(payload) {
    const response = await this.request({
      method: 'post',
      url: '/shipments2',
      data: payload,
    });

    return this.normalizeBookingResponse(response.data?.data || response.data);
  }

  async trackShipment(awbNumber) {
    const response = await this.request({
      method: 'get',
      url: `/shipments2/track/${encodeURIComponent(awbNumber)}`,
    });

    return response.data?.data || response.data;
  }

  async cancelShipment(awbNumber) {
    const response = await this.request({
      method: 'post',
      url: '/shipments2/cancel',
      data: { awb: awbNumber },
    });

    return response.data || {};
  }

  async listCouriers() {
    const response = await this.request({
      method: 'get',
      url: '/courier',
    });

    return Array.isArray(response.data?.data) ? response.data.data : [];
  }

  async checkServiceability(payload) {
    const response = await this.request({
      method: 'post',
      url: '/courier/serviceability',
      data: payload,
    });

    return Array.isArray(response.data?.data) ? response.data.data : [];
  }

  async request(requestConfig, retry = true) {
    this.assertConfigured();

    try {
      const token = await this.getToken();
      const response = await this.client.request({
        ...requestConfig,
        headers: {
          ...(requestConfig.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (response?.data?.status === false) {
        throw new ApiError(httpStatus.BAD_GATEWAY, response.data.message || 'Xpressbees request failed');
      }

      return response;
    } catch (error) {
      if (retry && error.response?.status === httpStatus.UNAUTHORIZED) {
        this.clearToken();
        return this.request(requestConfig, false);
      }

      throw this.toApiError(error);
    }
  }

  async getToken() {
    if (this.cachedToken && Date.now() - this.cachedAt < AUTH_REFRESH_WINDOW_MS) {
      return this.cachedToken;
    }

    let response;
    try {
      response = await this.client.post('/users/login', {
        email: config.xpressbees.email,
        password: config.xpressbees.password,
      });
    } catch (error) {
      throw this.toApiError(error);
    }

    const token = this.extractToken(response.data);
    if (!token) {
      throw new ApiError(httpStatus.BAD_GATEWAY, 'Xpressbees authentication succeeded without returning a token');
    }

    this.cachedToken = token;
    this.cachedAt = Date.now();
    return token;
  }

  clearToken() {
    this.cachedToken = null;
    this.cachedAt = 0;
  }

  extractToken(payload = {}) {
    return (
      payload.token
      || payload.access_token
      || payload.auth_token
      || (typeof payload.data === 'string' ? payload.data : null)
      || payload.data?.token
      || payload.data?.access_token
      || payload.data?.auth_token
      || payload.data?.authorization
      || payload.authorization
      || null
    );
  }

  normalizeBookingResponse(payload = {}) {
    const awbNumber = String(payload.awb_number || payload.awb || '').trim();

    return {
      orderId: payload.order_id || null,
      shipmentId: payload.shipment_id || null,
      awbNumber,
      courierId: payload.courier_id || null,
      courierName: payload.courier_name || 'Xpressbees',
      status: payload.status || 'booked',
      paymentType: payload.payment_type || null,
      labelUrl: payload.label || '',
      additionalInfo: payload.additional_info || '',
      trackingUrl: awbNumber ? this.buildTrackingUrl(awbNumber) : '',
      raw: payload,
    };
  }

  buildTrackingUrl(awbNumber) {
    return `https://shipment.xpressbees.com/shipping/tracking/${encodeURIComponent(awbNumber)}`;
  }

  toApiError(error) {
    if (error instanceof ApiError) {
      return error;
    }

    const statusCode = error.response?.status || httpStatus.BAD_GATEWAY;
    const message =
      error.response?.data?.message
      || error.response?.data?.error
      || error.message
      || 'Xpressbees request failed';

    return new ApiError(statusCode, message);
  }
}

module.exports = new XpressbeesService();
