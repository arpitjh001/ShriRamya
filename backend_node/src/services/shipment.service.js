const mongoose = require('mongoose');
const httpStatus = require('http-status');

const config = require('../config/config');
const { Order } = require('../models');
const shipmentRepository = require('../repositories/shipment.repository');
const orderEventService = require('./events/orderEvent.service');
const xpressbeesService = require('./shipping/xpressbees.service');
const ApiError = require('../utils/ApiError');

const ACTIVE_SHIPMENT_STATUSES = ['pending', 'booked', 'shipped', 'in_transit', 'out_for_delivery', 'exception'];
const READY_TO_SHIP_ORDER_STATUSES = ['confirmed', 'paid', 'processing'];
const XPRESSBEES_PROVIDER = 'xpressbees';

const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toXpressbeesWeightGrams = (value, fallback) => {
  const numeric = toNumberOrNull(value);
  if (!numeric || numeric <= 0) {
    return fallback;
  }

  return numeric < 50 ? Math.round(numeric * 1000) : numeric;
};

const cleanObject = (value) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, entryValue]) => {
    if (entryValue == null) {
      return accumulator;
    }

    if (typeof entryValue === 'string' && !entryValue.trim()) {
      return accumulator;
    }

    accumulator[key] = entryValue;
    return accumulator;
  }, {});
};

class ShipmentService {
  getActorId(options = {}) {
    return options.userId || options.user_id || options.sub || null;
  }

  isXpressbeesCarrier(carrier = '', provider = '') {
    return [carrier, provider].some((value) => trimString(value).toLowerCase() === XPRESSBEES_PROVIDER);
  }

  async resolveOrder(orderIdentifier) {
    const rawIdentifier = orderIdentifier == null ? '' : String(orderIdentifier).trim();
    if (!rawIdentifier) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Order identifier is required');
    }

    let order = null;
    if (mongoose.Types.ObjectId.isValid(rawIdentifier)) {
      order = await Order.findById(rawIdentifier);
    }

    if (!order) {
      order = await Order.findOne({ orderId: rawIdentifier });
    }

    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }

    return order;
  }

  async resolveShipment(shipmentId) {
    const shipment = await shipmentRepository.getById(shipmentId);
    if (!shipment) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');
    }

    return shipment;
  }

  normalizeAddress(order) {
    const primary = order.shippingAddress || {};
    if (primary.address || primary.city || primary.pincode) {
      return {
        name: primary.name || order.userName || '',
        email: primary.email || order.userEmail || '',
        phone: primary.phone || '',
        address: primary.address || '',
        address2: primary.address2 || '',
        city: primary.city || '',
        state: primary.state || '',
        pincode: primary.pincode || '',
        country: primary.country || 'India',
      };
    }

    const legacy = order.shipping_address || {};
    return {
      name: [legacy.first_name, legacy.last_name].filter(Boolean).join(' ').trim() || order.userName || '',
      email: legacy.email || order.userEmail || '',
      phone: legacy.phone || '',
      address: legacy.address_1 || '',
      address2: legacy.address_2 || '',
      city: legacy.city || '',
      state: legacy.state || '',
      pincode: legacy.postcode || '',
      country: legacy.country || 'India',
    };
  }

  normalizeShipmentStatus(status, history = []) {
    const rawStatus = trimString(status).toLowerCase();
    const latestCode = trimString(history[0]?.status_code || history[history.length - 1]?.status_code).toUpperCase();

    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'booked' || rawStatus === 'pickup_pending' || latestCode === 'PP') return 'booked';
    if (latestCode === 'DL' || rawStatus === 'delivered') return 'delivered';
    if (latestCode === 'FD' || rawStatus.includes('out for delivery')) return 'out_for_delivery';
    if (latestCode === 'EX' || rawStatus === 'exception') return 'exception';
    if (latestCode === 'RT' || latestCode === 'RT-IT' || latestCode === 'RT-DL' || rawStatus === 'rto' || rawStatus.includes('return')) return 'returned';
    if (latestCode === 'IT' || rawStatus === 'in_transit' || rawStatus.includes('transit')) return 'in_transit';
    if (rawStatus === 'shipped') return 'shipped';
    return 'pending';
  }

  normalizeHistoryEntry(entry = {}, source = 'system') {
    const providerEventAt = entry.event_time ? new Date(entry.event_time) : null;
    const safeProviderDate = providerEventAt && !Number.isNaN(providerEventAt.getTime()) ? providerEventAt : null;

    return {
      status: this.normalizeShipmentStatus(entry.rawStatus || entry.status || entry.message, [entry]),
      statusCode: trimString(entry.statusCode || entry.status_code).toUpperCase(),
      rawStatus: trimString(entry.rawStatus || entry.status || entry.message),
      source,
      location: trimString(entry.location),
      description: trimString(entry.description || entry.message),
      providerEventAt: safeProviderDate,
      timestamp: safeProviderDate || new Date(),
    };
  }

  parseDimensions(dimensions) {
    if (!dimensions) {
      return null;
    }

    if (typeof dimensions === 'object') {
      const parsed = {
        length: toNumberOrNull(dimensions.length),
        breadth: toNumberOrNull(dimensions.breadth || dimensions.width),
        height: toNumberOrNull(dimensions.height),
      };

      if (parsed.length && parsed.breadth && parsed.height) {
        return parsed;
      }

      return null;
    }

    const match = String(dimensions).match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }

    return {
      length: Number(match[1]),
      breadth: Number(match[2]),
      height: Number(match[3]),
    };
  }

  getShipmentTrackingUrl(provider, trackingNumber) {
    if (!trackingNumber) {
      return '';
    }

    if (trimString(provider).toLowerCase() === XPRESSBEES_PROVIDER) {
      return xpressbeesService.buildTrackingUrl(trackingNumber);
    }

    return '';
  }

  normalizeXpressbeesCourier(courier = {}) {
    const id = courier.courier_id || courier.id || courier.service_id || '';
    const name = courier.courier_name || courier.name || courier.service_name || 'Xpressbees';
    const rate = courier.rate || courier.total_charges || courier.freight_charges || null;

    return {
      ...courier,
      courier_id: id,
      courier_name: name,
      rate,
    };
  }

  serializeShipment(shipmentDocument) {
    if (!shipmentDocument) {
      return null;
    }

    const shipment = typeof shipmentDocument.toObject === 'function'
      ? shipmentDocument.toObject({ flattenMaps: true })
      : shipmentDocument;

    const order = shipment.orderId && typeof shipment.orderId === 'object' ? shipment.orderId : null;
    const address = shipment.shippingAddress || (order ? this.normalizeAddress(order) : null);

    return {
      id: shipment._id?.toString?.() || shipment.id || null,
      orderMongoId: order?._id?.toString?.() || shipment.orderId?.toString?.() || null,
      orderId: order?.orderId || order?._id?.toString?.() || shipment.orderId?.toString?.() || null,
      carrier: shipment.carrier,
      provider: shipment.provider || 'manual',
      trackingNumber: shipment.trackingNumber || '',
      trackingUrl: shipment.trackingUrl || this.getShipmentTrackingUrl(shipment.provider, shipment.trackingNumber),
      shippingMethod: shipment.shippingMethod || '',
      shippingWeight: shipment.shippingWeight,
      shippingDimensions: shipment.shippingDimensions || null,
      status: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery || null,
      actualDelivery: shipment.actualDelivery || null,
      shippedAt: shipment.shippedAt || null,
      latestSyncAt: shipment.latestSyncAt || null,
      labelUrl: shipment.labelUrl || '',
      manifestUrl: shipment.manifestUrl || '',
      externalOrderId: shipment.externalOrderId || '',
      externalShipmentId: shipment.externalShipmentId || '',
      externalCourierId: shipment.externalCourierId || '',
      paymentType: shipment.paymentType || '',
      shippingAddress: address,
      history: Array.isArray(shipment.history) ? shipment.history : [],
      providerMetadata: shipment.providerMetadata || null,
      createdAt: shipment.created_at || shipment.createdAt || null,
      updatedAt: shipment.updated_at || shipment.updatedAt || null,
      order: order ? {
        id: order._id?.toString?.() || null,
        orderId: order.orderId || order._id?.toString?.() || null,
        status: order.status,
        paymentStatus: order.paymentStatus || order.payment_status || 'pending',
        total: Number(order.total ?? order.total_amount ?? 0) || 0,
        customerName: order.userName || address?.name || '',
        customerEmail: order.userEmail || address?.email || '',
      } : null,
      items: Array.isArray(order?.items)
        ? order.items.map((item) => ({
            productId: item.productId?.toString?.() || item.productId || null,
            variantId: item.variantId?.toString?.() || item.variantId || null,
            name: item.name || item.productName || 'Product',
            sku: item.sku || item.productSku || '',
            quantity: Number(item.quantity || 0) || 0,
            price: Number(item.salePrice ?? item.price ?? item.priceSnapshot ?? item.unitPrice ?? 0) || 0,
          }))
        : [],
    };
  }

  async applyOrderTracking(order, { trackingNumber = '', trackingUrl = '', shipmentStatus = '', note = '' } = {}) {
    let shouldSave = false;
    const safeTrackingNumber = trimString(trackingNumber);
    const safeTrackingUrl = trimString(trackingUrl);
    const safeStatus = trimString(shipmentStatus);
    const nextStatusHistory = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];

    if (safeTrackingNumber && order.trackingNumber !== safeTrackingNumber) {
      order.trackingNumber = safeTrackingNumber;
      shouldSave = true;
    }

    if (safeTrackingUrl && order.trackingUrl !== safeTrackingUrl) {
      order.trackingUrl = safeTrackingUrl;
      shouldSave = true;
    }

    if (order.fulfillment_status && ['pending', 'booked'].includes(safeStatus) && order.fulfillment_status !== 'processing') {
      order.fulfillment_status = 'processing';
      shouldSave = true;
    }

    let nextOrderStatus = null;
    if (['shipped', 'in_transit', 'out_for_delivery'].includes(safeStatus) && !['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      nextOrderStatus = 'shipped';
      order.fulfillment_status = 'shipped';
      if (!order.shipped_at) {
        order.shipped_at = new Date();
      }
    } else if (safeStatus === 'delivered' && !['delivered', 'cancelled'].includes(order.status)) {
      nextOrderStatus = 'delivered';
      order.fulfillment_status = 'delivered';
      if (!order.delivered_at) {
        order.delivered_at = new Date();
      }
      if (!order.shipped_at) {
        order.shipped_at = new Date();
      }
    } else if (['pending', 'booked'].includes(safeStatus) && order.status === 'paid') {
      nextOrderStatus = 'processing';
      order.fulfillment_status = 'processing';
    }

    if (nextOrderStatus && order.status !== nextOrderStatus) {
      order.status = nextOrderStatus;
      nextStatusHistory.push({
        status: nextOrderStatus,
        timestamp: new Date(),
        note: note || `Shipment status updated to ${safeStatus || nextOrderStatus}`,
      });
      order.statusHistory = nextStatusHistory;
      shouldSave = true;
    }

    if (shouldSave) {
      await order.save();
    }
  }

  ensureShippableOrder(order) {
    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }

    if (['cancelled', 'delivered', 'refunded'].includes(order.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Order cannot be shipped in ${order.status} status`);
    }
  }

  buildPickupPayload(overrides = {}) {
    const pickup = cleanObject({
      ...cleanObject(config.xpressbees.pickup),
      ...cleanObject(overrides),
    });

    const requiredFields = ['warehouse_name', 'name', 'address', 'city', 'state', 'pincode', 'phone'];
    const missingFields = requiredFields.filter((field) => !pickup[field]);
    if (missingFields.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Xpressbees pickup details are incomplete. Missing: ${missingFields.join(', ')}`);
    }

    return pickup;
  }

  buildRtoPayload(overrides = {}) {
    const merged = cleanObject({
      ...cleanObject(config.xpressbees.rto),
      ...cleanObject(overrides),
    });

    return Object.keys(merged).length > 0 ? merged : null;
  }

  buildXpressbeesPayload(order, shipmentData = {}) {
    const address = this.normalizeAddress(order);
    const missingAddressFields = ['name', 'address', 'city', 'state', 'pincode', 'phone'].filter((field) => !address[field]);
    if (missingAddressFields.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Order shipping address is incomplete for Xpressbees. Missing: ${missingAddressFields.join(', ')}`);
    }

    const pickup = this.buildPickupPayload(shipmentData.pickup);
    const rto = this.buildRtoPayload(shipmentData.rto);
    const dimensions = this.parseDimensions(shipmentData.shippingDimensions) || {
      length: toNumberOrNull(shipmentData.length) || config.xpressbees.defaultPackage.length,
      breadth: toNumberOrNull(shipmentData.breadth || shipmentData.width) || config.xpressbees.defaultPackage.breadth,
      height: toNumberOrNull(shipmentData.height) || config.xpressbees.defaultPackage.height,
    };
    const weight = toXpressbeesWeightGrams(shipmentData.shippingWeight || shipmentData.weight, config.xpressbees.defaultPackage.weight);
    const paymentType = trimString(shipmentData.paymentType)
      || trimString(shipmentData.payment_type)
      || trimString(shipmentData.order_type).toLowerCase()
      || (trimString(order.paymentMethod || order.payment_method).toLowerCase() === 'cod' ? 'cod' : 'prepaid');
    const orderAmount = Number(order.total ?? order.total_amount ?? 0) || 0;
    const orderItems = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => ({
          name: item.name || item.productName || 'Product',
          qty: String(Number(item.quantity || 0) || 1),
          price: String(Number(item.salePrice ?? item.price ?? item.priceSnapshot ?? item.unitPrice ?? 0) || 0),
          sku: item.sku || item.productSku || '',
        }))
      : [{ name: 'Order Items', qty: '1', price: String(orderAmount), sku: trimString(order.orderId || order._id) }];

    const payload = {
      order_number: trimString(order.orderId || order._id),
      payment_type: paymentType,
      order_amount: orderAmount,
      collectable_amount: paymentType === 'cod' ? orderAmount : 0,
      shipping_charges: Number(order.shipping || 0) || 0,
      discount: Number(order.discount || 0) || 0,
      cod_charges: paymentType === 'cod' ? Number(shipmentData.codCharges || 0) || 0 : 0,
      package_weight: weight,
      package_length: Number(dimensions.length || 10),
      package_breadth: Number(dimensions.breadth || 10),
      package_height: Number(dimensions.height || 10),
      request_auto_pickup: shipmentData.requestAutoPickup === false || shipmentData.request_auto_pickup === false ? 'no' : config.xpressbees.requestAutoPickup,
      consignee: {
        name: address.name,
        address: address.address,
        address_2: address.address2 || '',
        city: address.city,
        state: address.state,
        pincode: String(address.pincode),
        phone: String(address.phone),
      },
      pickup,
      order_items: orderItems,
    };

    const courierId = trimString(shipmentData.courierId || shipmentData.courier_id || shipmentData.xpressbeesCourierId);
    if (courierId) {
      payload.courier_id = courierId;
    }

    payload.is_rto_different = rto ? 'yes' : 'no';
    if (rto) {
      payload.rto = rto;
    }

    return payload;
  }

  async createShipment(shipmentData, options = {}) {
    const order = await this.resolveOrder(shipmentData.orderId);
    this.ensureShippableOrder(order);

    const existingShipments = await shipmentRepository.getByOrderId(order._id);
    const hasActiveShipment = existingShipments.some((shipment) => ACTIVE_SHIPMENT_STATUSES.includes(shipment.status));
    if (shipmentData.preventMultiple !== false && hasActiveShipment) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Order already has an active shipment');
    }

    const provider = this.isXpressbeesCarrier(shipmentData.carrier, shipmentData.provider) ? XPRESSBEES_PROVIDER : 'manual';
    let carrier = trimString(shipmentData.carrier) || provider;
    let trackingNumber = trimString(shipmentData.trackingNumber);
    let trackingUrl = trimString(shipmentData.trackingUrl);
    let status = trackingNumber ? 'shipped' : 'pending';
    let labelUrl = '';
    let externalOrderId = '';
    let externalShipmentId = '';
    let externalCourierId = '';
    let paymentType = '';
    let providerMetadata = null;
    let history = [];

    if (provider === XPRESSBEES_PROVIDER) {
      xpressbeesService.assertConfigured();
      const bookingPayload = this.buildXpressbeesPayload(order, shipmentData);
      const booking = await xpressbeesService.createShipment(bookingPayload);

      carrier = booking.courierName || 'Xpressbees';
      trackingNumber = booking.awbNumber;
      trackingUrl = booking.trackingUrl || this.getShipmentTrackingUrl(provider, trackingNumber);
      status = this.normalizeShipmentStatus(booking.status);
      labelUrl = booking.labelUrl || '';
      externalOrderId = booking.orderId ? String(booking.orderId) : '';
      externalShipmentId = booking.shipmentId ? String(booking.shipmentId) : '';
      externalCourierId = booking.courierId ? String(booking.courierId) : '';
      paymentType = booking.paymentType || bookingPayload.payment_type;
      providerMetadata = {
        additionalInfo: booking.additionalInfo || '',
        bookingPayload,
        bookingResponse: booking.raw,
      };
      history = [
        this.normalizeHistoryEntry({
          status: booking.status || 'booked',
          message: 'Shipment booked with Xpressbees',
        }, XPRESSBEES_PROVIDER),
      ];
    } else if (trackingNumber) {
      history = [
        this.normalizeHistoryEntry({
          status: 'shipped',
          message: 'Tracking number added manually',
        }, 'manual'),
      ];
    }

    const shipment = await shipmentRepository.create({
      orderId: order._id,
      provider,
      carrier,
      trackingNumber,
      trackingUrl,
      shippingMethod: trimString(shipmentData.shippingMethod),
      shippingWeight: toNumberOrNull(shipmentData.shippingWeight),
      shippingDimensions: shipmentData.shippingDimensions || null,
      status,
      shippingAddress: this.normalizeAddress(order),
      labelUrl,
      externalOrderId,
      externalShipmentId,
      externalCourierId,
      paymentType,
      providerMetadata,
      history,
      tenantId: Number(order.tenant_id || order.tenantId || 1) || 1,
    });

    await this.applyOrderTracking(order, {
      trackingNumber,
      trackingUrl,
      shipmentStatus: status,
      note: provider === XPRESSBEES_PROVIDER ? 'Shipment booked with Xpressbees' : 'Shipment created',
    });

    await orderEventService.logEvent(
      order._id,
      'shipment_created',
      `Shipment created for order ${order.orderId || order._id}`,
      {
        shipmentId: shipment._id?.toString?.(),
        provider,
        carrier,
        trackingNumber,
      },
      this.getActorId(options),
      options.userType || 'admin'
    );

    const createdShipment = await shipmentRepository.getById(shipment._id);
    return {
      success: true,
      shipment: this.serializeShipment(createdShipment),
      message: provider === XPRESSBEES_PROVIDER ? 'Xpressbees shipment created successfully' : 'Shipment created successfully',
    };
  }

  async getShipment(id) {
    const shipment = await this.resolveShipment(id);
    return this.serializeShipment(shipment);
  }

  async getOrderShipments(orderIdentifier) {
    const order = await this.resolveOrder(orderIdentifier);
    const shipments = await shipmentRepository.getByOrderId(order._id);
    return shipments.map((shipment) => this.serializeShipment(shipment));
  }

  async updateTracking(id, trackingData, options = {}) {
    const shipment = await this.resolveShipment(id);
    const order = shipment.orderId;
    const nextCarrier = trimString(trackingData.carrier) || shipment.carrier;
    const nextTrackingNumber = trimString(trackingData.trackingNumber) || shipment.trackingNumber;
    const nextProvider = this.isXpressbeesCarrier(nextCarrier, shipment.provider) ? XPRESSBEES_PROVIDER : shipment.provider || 'manual';
    const nextTrackingUrl = trimString(trackingData.trackingUrl)
      || shipment.trackingUrl
      || this.getShipmentTrackingUrl(nextProvider, nextTrackingNumber);

    const historyEntry = this.normalizeHistoryEntry({
      status: nextTrackingNumber ? 'shipped' : shipment.status,
      message: 'Tracking updated manually',
    }, 'manual');

    const updatedShipment = await shipmentRepository.update(id, {
      carrier: nextCarrier,
      provider: nextProvider,
      trackingNumber: nextTrackingNumber,
      trackingUrl: nextTrackingUrl,
      status: nextTrackingNumber && shipment.status === 'pending' ? 'shipped' : shipment.status,
      $push: {
        history: historyEntry,
      },
    });

    await this.applyOrderTracking(order, {
      trackingNumber: nextTrackingNumber,
      trackingUrl: nextTrackingUrl,
      shipmentStatus: updatedShipment.status,
      note: 'Tracking updated manually',
    });

    await orderEventService.logEvent(
      order._id,
      'tracking_updated',
      `Tracking information updated for shipment ${shipment._id}`,
      {
        shipmentId: shipment._id?.toString?.(),
        trackingNumber: nextTrackingNumber,
        carrier: nextCarrier,
      },
      this.getActorId(options),
      options.userType || 'admin'
    );

    return {
      success: true,
      shipment: this.serializeShipment(updatedShipment),
      message: 'Tracking information updated',
    };
  }

  async markAsShipped(id, options = {}) {
    const shipment = await this.resolveShipment(id);
    const order = shipment.orderId;
    const historyEntry = this.normalizeHistoryEntry({
      status: 'shipped',
      message: 'Shipment marked as shipped manually',
    }, 'manual');

    const updatedShipment = await shipmentRepository.update(id, {
      status: 'shipped',
      shippedAt: shipment.shippedAt || new Date(),
      $push: {
        history: historyEntry,
      },
    });

    await this.applyOrderTracking(order, {
      trackingNumber: updatedShipment.trackingNumber,
      trackingUrl: updatedShipment.trackingUrl,
      shipmentStatus: 'shipped',
      note: 'Shipment marked as shipped',
    });

    await orderEventService.logEvent(
      order._id,
      'order_shipped',
      `Order shipped via ${updatedShipment.carrier}`,
      {
        shipmentId: updatedShipment._id?.toString?.(),
        trackingNumber: updatedShipment.trackingNumber,
      },
      this.getActorId(options),
      options.userType || 'admin'
    );

    return {
      success: true,
      shipment: this.serializeShipment(updatedShipment),
      message: 'Shipment marked as shipped',
    };
  }

  async markAsDelivered(id, options = {}) {
    const shipment = await this.resolveShipment(id);
    const order = shipment.orderId;
    const historyEntry = this.normalizeHistoryEntry({
      status: 'delivered',
      message: 'Shipment marked as delivered manually',
    }, 'manual');

    const updatedShipment = await shipmentRepository.update(id, {
      status: 'delivered',
      actualDelivery: new Date(),
      shippedAt: shipment.shippedAt || new Date(),
      $push: {
        history: historyEntry,
      },
    });

    await this.applyOrderTracking(order, {
      trackingNumber: updatedShipment.trackingNumber,
      trackingUrl: updatedShipment.trackingUrl,
      shipmentStatus: 'delivered',
      note: 'Shipment delivered',
    });

    await orderEventService.logEvent(
      order._id,
      'order_delivered',
      'Order delivered successfully',
      {
        shipmentId: updatedShipment._id?.toString?.(),
        trackingNumber: updatedShipment.trackingNumber,
      },
      this.getActorId(options),
      options.userType || 'admin'
    );

    return {
      success: true,
      shipment: this.serializeShipment(updatedShipment),
      message: 'Shipment marked as delivered',
    };
  }

  async syncShipment(id, options = {}) {
    const shipment = await this.resolveShipment(id);
    if (trimString(shipment.provider).toLowerCase() !== XPRESSBEES_PROVIDER) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shipment is not managed by Xpressbees');
    }

    if (!shipment.trackingNumber) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shipment has no tracking number to sync');
    }

    const tracking = await xpressbeesService.trackShipment(shipment.trackingNumber);
    const normalizedStatus = this.normalizeShipmentStatus(tracking.status, tracking.history || []);
    const normalizedHistory = Array.isArray(tracking.history)
      ? tracking.history.map((entry) => this.normalizeHistoryEntry(entry, XPRESSBEES_PROVIDER))
      : shipment.history;

    const update = {
      status: normalizedStatus,
      latestSyncAt: new Date(),
      history: normalizedHistory,
      providerMetadata: {
        ...(shipment.providerMetadata || {}),
        lastTrackingResponse: tracking,
      },
    };

    if (tracking.awb_number) {
      update.trackingNumber = String(tracking.awb_number);
    }

    update.trackingUrl = shipment.trackingUrl || this.getShipmentTrackingUrl(XPRESSBEES_PROVIDER, update.trackingNumber || shipment.trackingNumber);

    if (normalizedStatus === 'delivered') {
      update.actualDelivery = new Date();
    }

    if (['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'exception'].includes(normalizedStatus)) {
      update.shippedAt = shipment.shippedAt || new Date();
    }

    const updatedShipment = await shipmentRepository.update(id, update);

    await this.applyOrderTracking(updatedShipment.orderId, {
      trackingNumber: updatedShipment.trackingNumber,
      trackingUrl: updatedShipment.trackingUrl,
      shipmentStatus: normalizedStatus,
      note: `Shipment synced from Xpressbees (${normalizedStatus})`,
    });

    if (!options.silent) {
      await orderEventService.logEvent(
        updatedShipment.orderId._id,
        'tracking_updated',
        `Shipment synced from Xpressbees (${normalizedStatus})`,
        {
          shipmentId: updatedShipment._id?.toString?.(),
          trackingNumber: updatedShipment.trackingNumber,
          status: normalizedStatus,
        },
        this.getActorId(options),
        options.userType || 'admin'
      );
    }

    return {
      success: true,
      shipment: this.serializeShipment(updatedShipment),
      message: 'Shipment synced successfully',
    };
  }

  async cancelShipment(id, options = {}) {
    const shipment = await this.resolveShipment(id);
    if (['delivered', 'returned'].includes(shipment.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Cannot cancel shipment in ${shipment.status} status`);
    }

    if (trimString(shipment.provider).toLowerCase() === XPRESSBEES_PROVIDER && shipment.trackingNumber) {
      await xpressbeesService.cancelShipment(shipment.trackingNumber);
    }

    const historyEntry = this.normalizeHistoryEntry({
      status: 'cancelled',
      message: 'Shipment cancelled',
    }, trimString(shipment.provider).toLowerCase() === XPRESSBEES_PROVIDER ? XPRESSBEES_PROVIDER : 'manual');

    const updatedShipment = await shipmentRepository.update(id, {
      status: 'cancelled',
      latestSyncAt: new Date(),
      $push: {
        history: historyEntry,
      },
    });

    await orderEventService.logEvent(
      updatedShipment.orderId._id,
      'shipment_cancelled',
      'Shipment cancelled',
      {
        shipmentId: updatedShipment._id?.toString?.(),
        trackingNumber: updatedShipment.trackingNumber,
      },
      this.getActorId(options),
      options.userType || 'admin'
    );

    return {
      success: true,
      shipment: this.serializeShipment(updatedShipment),
      message: 'Shipment cancelled successfully',
    };
  }

  async getOrderTracking(orderIdentifier, options = {}) {
    const order = await this.resolveOrder(orderIdentifier);
    const shipments = await shipmentRepository.getByOrderId(order._id);

    if (shipments.length === 0) {
      if (order.trackingNumber) {
        return {
          hasShipment: false,
          shipment: {
            orderId: order.orderId || order._id?.toString?.(),
            carrier: '',
            trackingNumber: order.trackingNumber,
            trackingUrl: order.trackingUrl || '',
            status: order.status,
            history: Array.isArray(order.statusHistory) ? order.statusHistory : [],
          },
          message: 'Order has tracking information but no shipment record',
        };
      }

      return {
        hasShipment: false,
        message: 'No shipment created for this order yet',
      };
    }

    let latestShipment = shipments[0];
    if (options.syncProvider !== false && trimString(latestShipment.provider).toLowerCase() === XPRESSBEES_PROVIDER && latestShipment.trackingNumber) {
      try {
        const synced = await this.syncShipment(latestShipment._id, {
          silent: true,
          userType: options.userType || 'system',
          userId: this.getActorId(options),
        });
        latestShipment = await shipmentRepository.getById(synced.shipment.id);
      } catch (error) {
        // Fall back to the stored shipment state if Xpressbees is temporarily unavailable.
      }
    }

    return {
      hasShipment: true,
      shipment: this.serializeShipment(latestShipment),
      order: {
        id: order._id?.toString?.(),
        orderId: order.orderId || order._id?.toString?.(),
        status: order.status,
      },
    };
  }

  async getAllShipments(options = {}) {
    const filter = {};
    if (trimString(options.status)) {
      filter.status = trimString(options.status);
    }

    if (trimString(options.carrier)) {
      filter.carrier = new RegExp(`^${trimString(options.carrier)}$`, 'i');
    }

    if (trimString(options.provider)) {
      filter.provider = trimString(options.provider).toLowerCase();
    }

    const result = await shipmentRepository.list(filter, options);
    return {
      shipments: result.shipments.map((shipment) => this.serializeShipment(shipment)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getReadyToShip() {
    const orders = await Order.find({ status: { $in: READY_TO_SHIP_ORDER_STATUSES } })
      .sort({ created_at: -1 })
      .lean();

    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((order) => order._id);
    const shipments = await shipmentRepository.list(
      {
        orderId: { $in: orderIds },
        status: { $in: ACTIVE_SHIPMENT_STATUSES },
      },
      { page: 1, limit: Math.max(orderIds.length, 1) }
    );

    const activeOrderIds = new Set(shipments.shipments.map((shipment) => shipment.orderId?._id?.toString?.() || shipment.orderId?.toString?.()));

    return orders
      .filter((order) => !activeOrderIds.has(order._id.toString()))
      .map((order) => ({
        id: order._id.toString(),
        orderId: order.orderId || order._id.toString(),
        status: order.status,
        paymentStatus: order.paymentStatus || order.payment_status || 'pending',
        total: Number(order.total ?? order.total_amount ?? 0) || 0,
        customerName: order.userName || this.normalizeAddress(order).name || '',
        shippingAddress: this.normalizeAddress(order),
        createdAt: order.created_at || order.createdAt || null,
      }));
  }

  async getPendingShipments() {
    const result = await shipmentRepository.list(
      { status: { $nin: ['delivered', 'cancelled', 'returned'] } },
      { page: 1, limit: 100 }
    );

    return result.shipments.map((shipment) => this.serializeShipment(shipment));
  }

  async deleteShipment(id, options = {}) {
    const shipment = await this.resolveShipment(id);
    if (!['pending', 'booked', 'cancelled'].includes(shipment.status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete shipment that has already moved beyond booking');
    }

    await shipmentRepository.delete(id);

    await orderEventService.logEvent(
      shipment.orderId._id,
      'shipment_deleted',
      'Shipment deleted',
      { shipmentId: shipment._id?.toString?.() },
      this.getActorId(options),
      options.userType || 'admin'
    );

    return {
      success: true,
      message: 'Shipment deleted successfully',
    };
  }

  async listXpressbeesCouriers() {
    const couriers = await xpressbeesService.listCouriers();
    return couriers.map((courier) => this.normalizeXpressbeesCourier(courier));
  }

  async checkXpressbeesServiceability(payload = {}) {
    const origin = trimString(payload.origin || payload.origin_pincode || payload.pickup_pincode) || trimString(config.xpressbees.pickup.pincode);
    let destination = trimString(payload.destination || payload.destination_pincode || payload.delivery_pincode);
    let paymentType = trimString(payload.paymentType || payload.payment_type || payload.order_type).toLowerCase();
    const orderAmountValue = toNumberOrNull(payload.orderAmount || payload.order_amount);
    let orderAmount = orderAmountValue && orderAmountValue > 0 ? orderAmountValue : 1;
    let weight = toXpressbeesWeightGrams(payload.weight, config.xpressbees.defaultPackage.weight);
    let dimensions = this.parseDimensions(payload.shippingDimensions) || {
      length: toNumberOrNull(payload.length) || config.xpressbees.defaultPackage.length,
      breadth: toNumberOrNull(payload.breadth || payload.width) || config.xpressbees.defaultPackage.breadth,
      height: toNumberOrNull(payload.height) || config.xpressbees.defaultPackage.height,
    };

    if (payload.orderId) {
      const order = await this.resolveOrder(payload.orderId);
      const address = this.normalizeAddress(order);
      destination = destination || trimString(address.pincode);
      paymentType = paymentType || (trimString(order.paymentMethod || order.payment_method).toLowerCase() === 'cod' ? 'cod' : 'prepaid');
      orderAmount = orderAmount || Number(order.total ?? order.total_amount ?? 0) || 0;
      weight = weight || config.xpressbees.defaultPackage.weight;
      dimensions = dimensions || config.xpressbees.defaultPackage;
    }

    if (!origin || !destination) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Origin and destination pincodes are required for Xpressbees serviceability');
    }

    const couriers = await xpressbeesService.checkServiceability({
      origin,
      destination,
      payment_type: paymentType || 'prepaid',
      order_amount: orderAmount,
      weight,
      length: Number(dimensions.length || config.xpressbees.defaultPackage.length),
      breadth: Number(dimensions.breadth || config.xpressbees.defaultPackage.breadth),
      height: Number(dimensions.height || config.xpressbees.defaultPackage.height),
    });

    const normalizedCouriers = couriers.map((courier) => this.normalizeXpressbeesCourier(courier));

    return {
      serviceable: normalizedCouriers.length > 0,
      available_couriers: normalizedCouriers,
      couriers: normalizedCouriers,
    };
  }
}

module.exports = new ShipmentService();
