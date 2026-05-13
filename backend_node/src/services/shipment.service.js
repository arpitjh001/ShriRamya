const mongoose = require('mongoose');
const httpStatus = require('http-status');

const config = require('../config/config');
const { Order } = require('../models');
const shipmentRepository = require('../repositories/shipment.repository');
const orderEventService = require('./events/orderEvent.service');
const shiprocketService = require('./shipping/shiprocket.service');
const ApiError = require('../utils/ApiError');

const ACTIVE_SHIPMENT_STATUSES = ['pending', 'booked', 'shipped', 'in_transit', 'out_for_delivery', 'exception'];
const READY_TO_SHIP_ORDER_STATUSES = ['confirmed', 'paid', 'processing'];
const SHIPROCKET_PROVIDER = 'shiprocket';

const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toShiprocketWeightKg = (value, fallback) => {
  const numeric = toNumberOrNull(value);
  if (!numeric || numeric <= 0) {
    return fallback;
  }

  const weightInKg = numeric > 50 ? numeric / 1000 : numeric;
  return Math.max(Number(weightInKg.toFixed(3)), 0.2);
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

const pickFirstString = (source = {}, keys = []) => {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const key of keys) {
    const value = source[key];
    if (value == null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
};

const joinName = (...parts) => parts
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join(' ')
  .trim();

const normalizeAddressCandidate = (source = {}) => {
  if (!source || typeof source !== 'object') {
    return {};
  }

  return {
    name: pickFirstString(source, ['name', 'fullName', 'full_name', 'customerName', 'customer_name'])
      || joinName(
        pickFirstString(source, ['firstName', 'first_name', 'firstname']),
        pickFirstString(source, ['lastName', 'last_name', 'lastname'])
      ),
    email: pickFirstString(source, ['email', 'customerEmail', 'customer_email']),
    phone: pickFirstString(source, [
      'phone',
      'phoneNumber',
      'phone_number',
      'mobile',
      'mobileNumber',
      'mobile_number',
      'contact',
      'contactNumber',
      'contact_number',
      'customerPhone',
      'customer_phone',
    ]),
    address: pickFirstString(source, [
      'address',
      'street',
      'address1',
      'address_1',
      'addressLine1',
      'address_line1',
      'line1',
      'line_1',
    ]),
    address2: pickFirstString(source, [
      'address2',
      'address_2',
      'addressLine2',
      'address_line2',
      'line2',
      'line_2',
      'landmark',
      'apartment',
    ]),
    city: pickFirstString(source, ['city', 'town']),
    state: pickFirstString(source, ['state', 'province', 'region']),
    pincode: pickFirstString(source, [
      'pincode',
      'pinCode',
      'pin_code',
      'postcode',
      'postCode',
      'postalCode',
      'postal_code',
      'zipCode',
      'zip_code',
      'zip',
    ]),
    country: pickFirstString(source, ['country', 'countryCode', 'country_code']),
  };
};

class ShipmentService {
  getActorId(options = {}) {
    return options.userId || options.user_id || options.sub || null;
  }

  isShiprocketCarrier(carrier = '', provider = '') {
    return [carrier, provider].some((value) => trimString(value).toLowerCase() === SHIPROCKET_PROVIDER);
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
    const sources = [
      order.shippingAddress,
      order.shipping_address,
      order.address,
      order.billingAddress,
      order.billing_address,
      {
        name: order.userName || order.customerName || order.customer_name,
        email: order.userEmail || order.customerEmail || order.customer_email,
        phone: order.userPhone || order.customerPhone || order.customer_phone,
        address: order.shipping_address_1 || order.address_1 || order.address_line1,
        address2: order.shipping_address_2 || order.address_2 || order.address_line2,
        city: order.shipping_city || order.city,
        state: order.shipping_state || order.state,
        pincode: order.shipping_postcode || order.shipping_pincode || order.postcode || order.pincode,
        country: order.shipping_country || order.country,
      },
    ];

    const normalized = sources.reduce((accumulator, source) => {
      const candidate = normalizeAddressCandidate(source);
      Object.entries(candidate).forEach(([key, value]) => {
        if (!accumulator[key] && value) {
          accumulator[key] = value;
        }
      });
      return accumulator;
    }, {});

    return {
      name: normalized.name || order.userName || order.userId?.name || '',
      email: normalized.email || order.userEmail || order.userId?.email || '',
      phone: normalized.phone || order.userPhone || order.userId?.phone || '',
      address: normalized.address || '',
      address2: normalized.address2 || '',
      city: normalized.city || '',
      state: normalized.state || '',
      pincode: normalized.pincode || '',
      country: normalized.country || 'India',
    };
  }

  normalizeShipmentStatus(status, history = []) {
    const rawStatus = trimString(status).toLowerCase();
    const latestCode = trimString(history[0]?.status_code || history[history.length - 1]?.status_code).toUpperCase();

    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'booked' || rawStatus === 'pickup_pending' || rawStatus.includes('manifest') || rawStatus.includes('pickup scheduled') || latestCode === 'PP') return 'booked';
    if (latestCode === 'DL' || rawStatus === 'delivered') return 'delivered';
    if (latestCode === 'FD' || rawStatus.includes('out for delivery')) return 'out_for_delivery';
    if (latestCode === 'EX' || rawStatus === 'exception') return 'exception';
    if (latestCode === 'RT' || latestCode === 'RT-IT' || latestCode === 'RT-DL' || rawStatus === 'rto' || rawStatus.includes('return')) return 'returned';
    if (latestCode === 'IT' || rawStatus === 'in_transit' || rawStatus.includes('transit')) return 'in_transit';
    if (rawStatus === 'shipped' || rawStatus.includes('picked up') || rawStatus === 'picked up') return 'shipped';
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

    if (trimString(provider).toLowerCase() === SHIPROCKET_PROVIDER) {
      return shiprocketService.buildTrackingUrl(trackingNumber);
    }

    return '';
  }

  normalizeShiprocketCourier(courier = {}) {
    const id = courier.courier_company_id || courier.courier_id || courier.id || '';
    const name = courier.courier_name || courier.name || courier.service_name || 'Shiprocket';
    const rate = courier.rate || courier.freight_charge || courier.total_charges || courier.freight_charges || null;

    return {
      ...courier,
      courier_id: id,
      courier_company_id: id,
      courier_name: name,
      rate,
      estimated_delivery_days: courier.estimated_delivery_days || courier.etd || courier.estimated_delivery,
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

  splitCustomerName(name = '') {
    const parts = trimString(name).split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return {
        firstName: parts[0] || 'Customer',
        lastName: '',
      };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  formatOrderDate(value) {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (entry) => String(entry).padStart(2, '0');

    return [
      safeDate.getFullYear(),
      pad(safeDate.getMonth() + 1),
      pad(safeDate.getDate()),
    ].join('-') + ` ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}`;
  }

  buildShiprocketPayload(order, shipmentData = {}) {
    const address = this.normalizeAddress(order);
    const missingAddressFields = ['name', 'address', 'city', 'state', 'pincode', 'phone'].filter((field) => !address[field]);
    if (missingAddressFields.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Order shipping address is incomplete for Shiprocket. Missing: ${missingAddressFields.join(', ')}`);
    }

    const pickupLocation = trimString(shipmentData.pickupLocation || shipmentData.pickup_location || config.shiprocket.pickupLocation);
    if (!pickupLocation) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shiprocket pickup location is required');
    }

    const dimensions = this.parseDimensions(shipmentData.shippingDimensions) || {
      length: toNumberOrNull(shipmentData.length) || config.shiprocket.defaultPackage.length,
      breadth: toNumberOrNull(shipmentData.breadth || shipmentData.width) || config.shiprocket.defaultPackage.breadth,
      height: toNumberOrNull(shipmentData.height) || config.shiprocket.defaultPackage.height,
    };
    const weight = toShiprocketWeightKg(shipmentData.shippingWeight || shipmentData.weight, config.shiprocket.defaultPackage.weight);
    const paymentType = trimString(shipmentData.paymentType)
      || trimString(shipmentData.payment_type)
      || trimString(shipmentData.order_type).toLowerCase()
      || (trimString(order.paymentMethod || order.payment_method).toLowerCase() === 'cod' ? 'cod' : 'prepaid');
    const isCod = paymentType.toLowerCase() === 'cod';
    const orderAmount = Number(order.total ?? order.total_amount ?? 0) || 0;
    const shippingCharges = Number(order.shipping || 0) || 0;
    const totalDiscount = Number(order.discount || 0) || 0;
    const orderItems = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => ({
          name: item.name || item.productName || 'Product',
          sku: item.sku || item.productSku || trimString(item.productId) || trimString(order.orderId || order._id),
          units: Number(item.quantity || 0) || 1,
          selling_price: Number(item.salePrice ?? item.price ?? item.priceSnapshot ?? item.unitPrice ?? 0)
            || (orderAmount && order.items.length ? Number((orderAmount / order.items.length).toFixed(2)) : 1),
          discount: Number(item.discount || 0) || 0,
          tax: Number(item.tax || 0) || 0,
          hsn: item.hsn || '',
        }))
      : [{
          name: 'Order Items',
          sku: trimString(order.orderId || order._id),
          units: 1,
          selling_price: orderAmount,
          discount: 0,
          tax: 0,
          hsn: '',
        }];
    const itemSubtotal = orderItems.reduce((total, item) => total + (Number(item.selling_price) || 0) * (Number(item.units) || 1), 0);
    const subTotal = Math.max(Number(order.subtotal || 0) || itemSubtotal || (orderAmount - shippingCharges) || orderAmount, 1);
    const { firstName, lastName } = this.splitCustomerName(address.name);

    return cleanObject({
      order_id: trimString(order.orderId || order._id),
      order_date: this.formatOrderDate(order.created_at || order.createdAt),
      pickup_location: pickupLocation,
      reseller_name: config.shiprocket.resellerName,
      company_name: config.shiprocket.companyName,
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: address.address,
      billing_address_2: address.address2 || '',
      billing_city: address.city,
      billing_pincode: String(address.pincode),
      billing_state: address.state,
      billing_country: address.country || 'India',
      billing_email: address.email || order.userEmail || config.shiprocket.email,
      billing_phone: String(address.phone).replace(/\D/g, '').slice(-10) || String(address.phone),
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: isCod ? 'COD' : 'Prepaid',
      shipping_charges: shippingCharges,
      giftwrap_charges: Number(shipmentData.giftwrapCharges || shipmentData.giftwrap_charges || 0) || 0,
      transaction_charges: Number(shipmentData.transactionCharges || shipmentData.transaction_charges || 0) || 0,
      total_discount: totalDiscount,
      sub_total: Number(subTotal.toFixed(2)),
      length: Math.max(Number(dimensions.length || config.shiprocket.defaultPackage.length), 0.6),
      breadth: Math.max(Number(dimensions.breadth || config.shiprocket.defaultPackage.breadth), 0.6),
      height: Math.max(Number(dimensions.height || config.shiprocket.defaultPackage.height), 0.6),
      weight,
      customer_gstin: shipmentData.customerGstin || shipmentData.customer_gstin || '',
      invoice_number: shipmentData.invoiceNumber || shipmentData.invoice_number || '',
      order_type: shipmentData.orderType || shipmentData.order_type || '',
    });
  }

  async createShipment(shipmentData, options = {}) {
    const order = await this.resolveOrder(shipmentData.orderId);
    this.ensureShippableOrder(order);

    const existingShipments = await shipmentRepository.getByOrderId(order._id);
    const hasActiveShipment = existingShipments.some((shipment) => ACTIVE_SHIPMENT_STATUSES.includes(shipment.status));
    if (shipmentData.preventMultiple !== false && hasActiveShipment) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Order already has an active shipment');
    }

    const provider = this.isShiprocketCarrier(shipmentData.carrier, shipmentData.provider) ? SHIPROCKET_PROVIDER : 'manual';
    let carrier = trimString(shipmentData.carrier) || provider;
    let trackingNumber = trimString(shipmentData.trackingNumber);
    let trackingUrl = trimString(shipmentData.trackingUrl);
    let status = trackingNumber ? 'shipped' : 'pending';
    let labelUrl = '';
    let manifestUrl = '';
    let externalOrderId = '';
    let externalShipmentId = '';
    let externalCourierId = '';
    let paymentType = '';
    let providerMetadata = null;
    let history = [];

    if (provider === SHIPROCKET_PROVIDER) {
      shiprocketService.assertConfigured();
      const bookingPayload = this.buildShiprocketPayload(order, shipmentData);
      const courierId = trimString(shipmentData.courierId || shipmentData.courier_id || shipmentData.shiprocketCourierId);
      const booking = await shiprocketService.createShipment(bookingPayload, {
        courierId,
        requestPickup: shipmentData.requestPickup !== false
          && shipmentData.request_pickup !== false
          && shipmentData.request_auto_pickup !== false
          && config.shiprocket.requestPickup,
        generateManifest: shipmentData.generateManifest !== false && config.shiprocket.generateManifest,
        generateLabel: shipmentData.generateLabel !== false && config.shiprocket.generateLabel,
        generateInvoice: shipmentData.generateInvoice !== false && config.shiprocket.generateInvoice,
      });

      carrier = booking.courierName || 'Shiprocket';
      trackingNumber = booking.awbNumber;
      trackingUrl = booking.trackingUrl || this.getShipmentTrackingUrl(provider, trackingNumber);
      status = this.normalizeShipmentStatus(booking.status);
      labelUrl = booking.labelUrl || '';
      manifestUrl = booking.manifestUrl || '';
      externalOrderId = booking.orderId ? String(booking.orderId) : '';
      externalShipmentId = booking.shipmentId ? String(booking.shipmentId) : '';
      externalCourierId = booking.courierId ? String(booking.courierId) : '';
      paymentType = booking.paymentType || bookingPayload.payment_method;
      providerMetadata = {
        bookingPayload,
        bookingResponse: booking.raw,
        invoiceUrl: booking.invoiceUrl || '',
        pickupResponse: booking.pickupResponse || null,
        manifestResponse: booking.manifestResponse || null,
        documentErrors: booking.documentErrors || [],
      };
      history = [
        this.normalizeHistoryEntry({
          status: booking.status || 'booked',
          message: 'Shipment booked with Shiprocket',
        }, SHIPROCKET_PROVIDER),
      ];
    } else if (trackingNumber) {
      history = [
        this.normalizeHistoryEntry({
          status: 'shipped',
          message: 'Tracking number added manually',
        }, 'manual'),
      ];
    }

    const parsedShipmentDimensions = this.parseDimensions(shipmentData.shippingDimensions) || cleanObject({
      length: toNumberOrNull(shipmentData.length),
      breadth: toNumberOrNull(shipmentData.breadth || shipmentData.width),
      height: toNumberOrNull(shipmentData.height),
    });
    const shippingDimensions = Object.keys(parsedShipmentDimensions).length > 0 ? parsedShipmentDimensions : null;

    const shipment = await shipmentRepository.create({
      orderId: order._id,
      provider,
      carrier,
      trackingNumber,
      trackingUrl,
      shippingMethod: trimString(shipmentData.shippingMethod),
      shippingWeight: toNumberOrNull(shipmentData.shippingWeight || shipmentData.weight),
      shippingDimensions,
      status,
      shippingAddress: this.normalizeAddress(order),
      labelUrl,
      manifestUrl,
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
      note: provider === SHIPROCKET_PROVIDER ? 'Shipment booked with Shiprocket' : 'Shipment created',
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
      message: provider === SHIPROCKET_PROVIDER ? 'Shiprocket shipment created successfully' : 'Shipment created successfully',
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
    const nextProvider = this.isShiprocketCarrier(nextCarrier, shipment.provider) ? SHIPROCKET_PROVIDER : shipment.provider || 'manual';
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
    if (trimString(shipment.provider).toLowerCase() !== SHIPROCKET_PROVIDER) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shipment is not managed by Shiprocket');
    }

    if (!shipment.trackingNumber) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Shipment has no tracking number to sync');
    }

    const tracking = await shiprocketService.trackShipment(shipment.trackingNumber);
    const shipmentTrack = Array.isArray(tracking.shipment_track) ? tracking.shipment_track[0] : {};
    const activities = Array.isArray(tracking.shipment_track_activities)
      ? tracking.shipment_track_activities
      : (Array.isArray(tracking.history) ? tracking.history : []);
    const rawStatus = tracking.current_status || shipmentTrack.current_status || tracking.status || '';
    const normalizedStatus = this.normalizeShipmentStatus(rawStatus, activities);
    const normalizedHistory = activities.length > 0
      ? activities.map((entry) => this.normalizeHistoryEntry({
          statusCode: entry.status || entry.status_code,
          rawStatus: entry.activity || entry.status || entry.message,
          description: entry.activity || entry.description || entry.message,
          location: entry.location,
          event_time: entry.date || entry.event_time,
        }, SHIPROCKET_PROVIDER))
      : [
          this.normalizeHistoryEntry({
            rawStatus,
            description: rawStatus || 'Tracking synced from Shiprocket',
          }, SHIPROCKET_PROVIDER),
        ];

    const update = {
      status: normalizedStatus,
      latestSyncAt: new Date(),
      history: normalizedHistory,
      providerMetadata: {
        ...(shipment.providerMetadata || {}),
        lastTrackingResponse: tracking,
      },
    };

    if (shipmentTrack.awb_code || tracking.awb_code || tracking.awb_number) {
      update.trackingNumber = String(shipmentTrack.awb_code || tracking.awb_code || tracking.awb_number);
    }

    update.trackingUrl = tracking.track_url || shipment.trackingUrl || this.getShipmentTrackingUrl(SHIPROCKET_PROVIDER, update.trackingNumber || shipment.trackingNumber);

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
      note: `Shipment synced from Shiprocket (${normalizedStatus})`,
    });

    if (!options.silent) {
      await orderEventService.logEvent(
        updatedShipment.orderId._id,
        'tracking_updated',
        `Shipment synced from Shiprocket (${normalizedStatus})`,
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

    if (trimString(shipment.provider).toLowerCase() === SHIPROCKET_PROVIDER && shipment.externalOrderId) {
      await shiprocketService.cancelOrder(shipment.externalOrderId);
    }

    const historyEntry = this.normalizeHistoryEntry({
      status: 'cancelled',
      message: 'Shipment cancelled',
    }, trimString(shipment.provider).toLowerCase() === SHIPROCKET_PROVIDER ? SHIPROCKET_PROVIDER : 'manual');

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
    if (options.syncProvider !== false && trimString(latestShipment.provider).toLowerCase() === SHIPROCKET_PROVIDER && latestShipment.trackingNumber) {
      try {
        const synced = await this.syncShipment(latestShipment._id, {
          silent: true,
          userType: options.userType || 'system',
          userId: this.getActorId(options),
        });
        latestShipment = await shipmentRepository.getById(synced.shipment.id);
      } catch (error) {
        // Fall back to the stored shipment state if Shiprocket is temporarily unavailable.
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

  async listShiprocketCouriers(payload = {}) {
    const serviceability = await this.checkShiprocketServiceability(payload);
    return serviceability.available_couriers;
  }

  async checkShiprocketServiceability(payload = {}) {
    const origin = trimString(payload.origin || payload.origin_pincode || payload.pickup_pincode || payload.pickup_postcode)
      || trimString(config.shiprocket.pickupPincode);
    let destination = trimString(payload.destination || payload.destination_pincode || payload.delivery_pincode || payload.delivery_postcode);
    let paymentType = trimString(payload.paymentType || payload.payment_type || payload.order_type).toLowerCase();
    const orderAmountValue = toNumberOrNull(payload.orderAmount || payload.order_amount);
    let orderAmount = orderAmountValue && orderAmountValue > 0 ? orderAmountValue : 1;
    let weight = toShiprocketWeightKg(payload.weight, config.shiprocket.defaultPackage.weight);
    let dimensions = this.parseDimensions(payload.shippingDimensions) || {
      length: toNumberOrNull(payload.length) || config.shiprocket.defaultPackage.length,
      breadth: toNumberOrNull(payload.breadth || payload.width) || config.shiprocket.defaultPackage.breadth,
      height: toNumberOrNull(payload.height) || config.shiprocket.defaultPackage.height,
    };

    const orderIdentifier = payload.orderId || payload.order_id || payload.orderMongoId || payload.order_mongo_id;
    if (orderIdentifier) {
      const order = await this.resolveOrder(orderIdentifier);
      const address = this.normalizeAddress(order);
      destination = destination || trimString(address.pincode);
      paymentType = paymentType || (trimString(order.paymentMethod || order.payment_method).toLowerCase() === 'cod' ? 'cod' : 'prepaid');
      orderAmount = orderAmount || Number(order.total ?? order.total_amount ?? 0) || 0;
      weight = weight || config.shiprocket.defaultPackage.weight;
      dimensions = dimensions || config.shiprocket.defaultPackage;
    }

    if (!origin || !destination) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Origin and destination pincodes are required for Shiprocket serviceability');
    }

    const response = await shiprocketService.checkServiceability({
      pickup_postcode: origin,
      delivery_postcode: destination,
      cod: paymentType === 'cod' ? 1 : 0,
      declared_value: orderAmount,
      weight,
      length: Number(dimensions.length || config.shiprocket.defaultPackage.length),
      breadth: Number(dimensions.breadth || config.shiprocket.defaultPackage.breadth),
      height: Number(dimensions.height || config.shiprocket.defaultPackage.height),
    });

    const courierList = response.data?.available_courier_companies
      || response.available_courier_companies
      || response.data?.couriers
      || response.couriers
      || [];
    const normalizedCouriers = courierList.map((courier) => this.normalizeShiprocketCourier(courier));

    return {
      serviceable: normalizedCouriers.length > 0,
      available_couriers: normalizedCouriers,
      couriers: normalizedCouriers,
      recommended_courier_id: response.data?.recommended_courier_company_id || response.recommended_courier_company_id || null,
      raw: response,
    };
  }

  /**
   * Handle Shiprocket Webhook
   * @param {Object} payload - Webhook payload from Shiprocket
   */
  async handleShiprocketWebhook(payload = {}) {
    const trackingNumber = trimString(payload.awb || payload.awb_code || payload.awb_number);
    if (!trackingNumber) {
      console.warn('[ShipmentService] Shiprocket webhook received without tracking number');
      return { success: false, message: 'Missing tracking number' };
    }

    const shipment = await shipmentRepository.findByTrackingNumber(trackingNumber);
    if (!shipment) {
      console.warn(`[ShipmentService] Shiprocket webhook: Shipment not found for tracking number ${trackingNumber}`);
      return { success: false, message: 'Shipment not found' };
    }

    if (trimString(shipment.provider).toLowerCase() !== SHIPROCKET_PROVIDER) {
      return { success: false, message: 'Shipment is not managed by Shiprocket' };
    }

    console.log(`[ShipmentService] Processing Shiprocket webhook for tracking ${trackingNumber}, status: ${payload.current_status || payload.shipment_status || payload.status}`);

    return this.syncShipment(shipment._id, { silent: false, userType: 'system' });
  }
}

module.exports = new ShipmentService();
