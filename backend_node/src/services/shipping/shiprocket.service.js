const axios = require('axios');
const httpStatus = require('http-status');

const config = require('../../config/config');
const ApiError = require('../../utils/ApiError');

const AUTH_REFRESH_WINDOW_MS = 9 * 24 * 60 * 60 * 1000;

const cleanObject = (value) => Object.entries(value || {}).reduce((accumulator, [key, entryValue]) => {
  if (entryValue === undefined || entryValue === null || entryValue === '') {
    return accumulator;
  }

  accumulator[key] = entryValue;
  return accumulator;
}, {});

class ShiprocketService {
  constructor() {
    this.client = axios.create({
      baseURL: config.shiprocket.baseUrl,
      timeout: config.shiprocket.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.cachedToken = null;
    this.cachedAt = 0;
  }

  isConfigured() {
    return Boolean(
      config.shiprocket.enabled
      && config.shiprocket.email
      && config.shiprocket.password
    );
  }

  assertConfigured() {
    if (this.isConfigured()) {
      return;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Shiprocket is not configured. Set SHIPROCKET_ENABLED, SHIPROCKET_EMAIL, and SHIPROCKET_PASSWORD.'
    );
  }

  async createShipment(payload, options = {}) {
    const createOrderResponse = await this.createOrder(payload);
    const orderData = this.extractOrderData(createOrderResponse);
    const shipmentId = orderData.shipment_id || orderData.shipmentId;

    if (!shipmentId) {
      throw new ApiError(httpStatus.BAD_GATEWAY, 'Shiprocket order was created without returning a shipment id');
    }

    const awbResponse = await this.assignAwb({
      shipmentId,
      courierId: options.courierId || payload.courier_id,
    });
    const awbData = this.extractAwbData(awbResponse);

    const documentErrors = [];
    const documents = {};
    let pickupResponse = null;
    let manifestResponse = null;

    if (options.requestPickup !== false) {
      pickupResponse = await this.safeDocumentCall(
        () => this.requestPickup(shipmentId),
        'pickup',
        documentErrors
      );
    }

    if (options.generateManifest !== false) {
      manifestResponse = await this.safeDocumentCall(
        () => this.generateManifest(shipmentId),
        'manifest',
        documentErrors
      );

      const printedManifest = await this.safeDocumentCall(
        () => this.printManifest(orderData.order_id),
        'manifest_print',
        documentErrors
      );
      documents.manifestUrl = this.extractFirstUrl(printedManifest, ['manifest_url', 'manifestUrl']);
    }

    if (options.generateLabel !== false) {
      const labelResponse = await this.safeDocumentCall(
        () => this.generateLabel(shipmentId),
        'label',
        documentErrors
      );
      documents.labelUrl = this.extractFirstUrl(labelResponse, ['label_url', 'labelUrl', 'label']);
    }

    if (options.generateInvoice !== false) {
      const invoiceResponse = await this.safeDocumentCall(
        () => this.generateInvoice(orderData.order_id),
        'invoice',
        documentErrors
      );
      documents.invoiceUrl = this.extractFirstUrl(invoiceResponse, ['invoice_url', 'invoiceUrl']);
    }

    return this.normalizeBookingResponse({
      orderData,
      awbData,
      pickupResponse,
      manifestResponse,
      documents,
      documentErrors,
      raw: {
        createOrderResponse,
        awbResponse,
        pickupResponse,
        manifestResponse,
      },
    });
  }

  async createOrder(payload) {
    const response = await this.request({
      method: 'post',
      url: '/orders/create/adhoc',
      data: payload,
    });

    return response.data || {};
  }

  async assignAwb({ shipmentId, courierId, status }) {
    const response = await this.request({
      method: 'post',
      url: '/courier/assign/awb',
      data: cleanObject({
        shipment_id: shipmentId,
        courier_id: courierId,
        status,
      }),
    });

    const payload = response.data || {};
    if (payload.awb_assign_status === 0 || payload.awb_assign_status === false) {
      throw new ApiError(httpStatus.BAD_GATEWAY, this.extractMessage(payload) || 'Shiprocket AWB assignment failed');
    }

    return payload;
  }

  async requestPickup(shipmentId, options = {}) {
    const response = await this.request({
      method: 'post',
      url: '/courier/generate/pickup',
      data: cleanObject({
        shipment_id: [shipmentId],
        pickup_date: options.pickupDate ? [options.pickupDate] : undefined,
        status: options.status,
      }),
    });

    return response.data || {};
  }

  async generateManifest(shipmentId) {
    const response = await this.request({
      method: 'post',
      url: '/manifests/generate',
      data: {
        shipment_id: [shipmentId],
      },
    });

    return response.data || {};
  }

  async printManifest(orderId) {
    const response = await this.request({
      method: 'post',
      url: '/manifests/print',
      data: {
        order_ids: [orderId],
      },
    });

    return response.data || {};
  }

  async generateLabel(shipmentId) {
    const response = await this.request({
      method: 'post',
      url: '/courier/generate/label',
      data: {
        shipment_id: [shipmentId],
      },
    });

    return response.data || {};
  }

  async generateInvoice(orderId) {
    const response = await this.request({
      method: 'post',
      url: '/orders/print/invoice',
      data: {
        ids: [String(orderId)],
      },
    });

    return response.data || {};
  }

  async checkServiceability(params = {}) {
    const response = await this.request({
      method: 'get',
      url: '/courier/serviceability/',
      params,
    });

    return response.data || {};
  }

  async trackShipment(awbNumber) {
    const response = await this.request({
      method: 'get',
      url: `/courier/track/awb/${encodeURIComponent(awbNumber)}`,
    });

    return response.data?.tracking_data || response.data || {};
  }

  async cancelOrder(orderIds) {
    const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
    const response = await this.request({
      method: 'post',
      url: '/orders/cancel',
      data: {
        ids,
      },
    });

    return response.data || {};
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

      if (this.isApplicationError(response.data)) {
        throw new ApiError(httpStatus.BAD_GATEWAY, this.extractMessage(response.data) || 'Shiprocket request failed');
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
      response = await this.client.post('/auth/login', {
        email: config.shiprocket.email,
        password: config.shiprocket.password,
      });
    } catch (error) {
      throw this.toApiError(error);
    }

    const token = this.extractToken(response.data);
    if (!token) {
      throw new ApiError(httpStatus.BAD_GATEWAY, 'Shiprocket authentication succeeded without returning a token');
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
      || payload.data?.token
      || payload.data?.access_token
      || null
    );
  }

  extractOrderData(payload = {}) {
    return payload.data || payload.response?.data || payload;
  }

  extractAwbData(payload = {}) {
    return payload.response?.data || payload.data || payload;
  }

  extractFirstUrl(payload = {}, keys = []) {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    for (const key of keys) {
      const value = payload[key] || payload.data?.[key] || payload.response?.data?.[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  async safeDocumentCall(fn, label, errors) {
    try {
      return await fn();
    } catch (error) {
      errors.push({
        step: label,
        message: error.message || 'Shiprocket document step failed',
      });
      return null;
    }
  }

  normalizeBookingResponse({ orderData = {}, awbData = {}, pickupResponse = null, manifestResponse = null, documents = {}, documentErrors = [], raw = {} }) {
    const awbNumber = String(
      awbData.awb_code
      || awbData.awb
      || orderData.awb_code
      || ''
    ).trim();
    const orderId = orderData.order_id || awbData.order_id || null;
    const shipmentId = orderData.shipment_id || awbData.shipment_id || null;

    return {
      orderId,
      shipmentId,
      awbNumber,
      courierId: awbData.courier_company_id || orderData.courier_company_id || null,
      courierName: awbData.courier_name || orderData.courier_name || 'Shiprocket',
      status: awbNumber ? 'booked' : (orderData.status || 'pending'),
      paymentType: orderData.payment_method || null,
      labelUrl: documents.labelUrl || '',
      manifestUrl: documents.manifestUrl || '',
      invoiceUrl: documents.invoiceUrl || '',
      pickupResponse,
      manifestResponse,
      documentErrors,
      trackingUrl: awbNumber ? this.buildTrackingUrl(awbNumber) : '',
      raw,
    };
  }

  buildTrackingUrl(awbNumber) {
    return `https://shiprocket.co/tracking/${encodeURIComponent(awbNumber)}`;
  }

  isApplicationError(payload) {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    if (payload.success === false || payload.status === false) {
      return true;
    }

    const numericStatus = Number(payload.status);
    return Number.isFinite(numericStatus) && numericStatus >= 400;
  }

  extractMessage(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    return (
      payload.message
      || payload.error
      || payload.response?.message
      || payload.response?.data?.message
      || payload.errors?.join?.(', ')
      || ''
    );
  }

  toApiError(error) {
    if (error instanceof ApiError) {
      return error;
    }

    const statusCode = error.response?.status || httpStatus.BAD_GATEWAY;
    const message =
      this.extractMessage(error.response?.data)
      || error.message
      || 'Shiprocket request failed';

    return new ApiError(statusCode, message);
  }
}

module.exports = new ShiprocketService();
