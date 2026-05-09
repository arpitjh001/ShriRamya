const crypto = require('crypto');
const mongoose = require('mongoose');

const config = require('../config/config');
const { Cart, Order, Product } = require('../models');
const { sendOrderConfirmation } = require('./emailService');
const { inventoryAuditService } = require('./inventory-audit.service');
const { inventoryService } = require('./inventory.service');
const RazorpayGateway = require('./payments/RazorpayGateway');
const productService = require('./product.service');
const couponService = require('./coupon.service');

const DEFAULT_COUNTRY = 'India';
const DEFAULT_SHIPPING_CHARGE = 100;
const FREE_SHIPPING_THRESHOLD = 2500;
const DEFAULT_RAZORPAY_KEY = 'rzp_test_mock_key';

class StorefrontCheckoutService {
  buildProductLookup(identifier) {
    if (identifier == null) {
      return null;
    }

    const stringIdentifier = String(identifier).trim();
    if (!stringIdentifier) {
      return null;
    }

    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      return { _id: new mongoose.Types.ObjectId(stringIdentifier) };
    }

    if (/^\d+$/.test(stringIdentifier)) {
      return { productId: Number(stringIdentifier) };
    }

    return { slug: stringIdentifier };
  }

  normalizeMap(value) {
    if (!value) return {};
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }
    if (typeof value.toObject === 'function') {
      return value.toObject();
    }
    return { ...value };
  }

  getVariantAttributes(variant = {}) {
    const attributes = this.normalizeMap(variant.attributes);
    const color = attributes.color || attributes.Color || variant.color || '';
    const size = attributes.size || attributes.Size || variant.size || '';

    return {
      ...attributes,
      color,
      size,
      Color: attributes.Color || color,
      Size: attributes.Size || size,
    };
  }

  getVariantValue(variant, key) {
    const attributes = this.getVariantAttributes(variant);
    return attributes[key] || attributes[key.toLowerCase()] || attributes[key.charAt(0).toUpperCase() + key.slice(1)] || variant?.[key] || null;
  }

  isPublished(product) {
    const status = String(product?.status || '').toLowerCase();
    return !status || status === 'published' || status === 'publish';
  }

  generateSessionId() {
    return `guest_${crypto.randomBytes(12).toString('hex')}`;
  }

  toFiniteNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  calculateShippingCharge(subtotal) {
    const numericSubtotal = this.toFiniteNumber(subtotal);
    if (numericSubtotal <= 0 || numericSubtotal >= FREE_SHIPPING_THRESHOLD) {
      return 0;
    }

    return DEFAULT_SHIPPING_CHARGE;
  }

  getRegularPrice(product, variant = null) {
    const variantPrice = this.toFiniteNumber(variant?.price);
    if (variantPrice > 0) {
      return variantPrice;
    }

    return this.toFiniteNumber(
      product?.basePrice
        ?? product?.base_price
        ?? product?.price
        ?? product?.regular_price
        ?? 0
    );
  }

  getEffectivePrice(product, variant = null) {
    const regularPrice = this.getRegularPrice(product, variant);
    const discountPrice = variant?.discountPrice === '' || variant?.discountPrice == null
      ? null
      : Number(variant.discountPrice);

    if (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= regularPrice) {
      return regularPrice;
    }

    const now = Date.now();
    const startsAt = variant?.discountStart ? new Date(variant.discountStart).getTime() : null;
    const endsAt = variant?.discountEnd ? new Date(variant.discountEnd).getTime() : null;
    const withinStart = startsAt == null || Number.isNaN(startsAt) || now >= startsAt;
    const withinEnd = endsAt == null || Number.isNaN(endsAt) || now <= endsAt;

    return withinStart && withinEnd ? discountPrice : regularPrice;
  }

  getOriginalPrice(product, variant = null, fallbackPrice = 0) {
    const regularPrice = this.getRegularPrice(product, variant);
    return regularPrice > 0 ? regularPrice : this.toFiniteNumber(fallbackPrice);
  }

  getProductImage(product, variant = null) {
    if (variant?.image) return variant.image;
    if (Array.isArray(product?.images)) {
      const firstImage = product.images.find(Boolean);
      if (firstImage) return firstImage;
    }
    return product?.thumbnail || product?.image || '/placeholder-product.png';
  }

  normalizeAddress(rawAddress = {}, fallbackEmail = '', fallbackName = '') {
    const address = rawAddress || {};
    const name = address.name
      || [address.first_name, address.last_name].filter(Boolean).join(' ').trim()
      || fallbackName
      || '';

    return {
      name,
      email: address.email || fallbackEmail || '',
      phone: address.phone || '',
      address: address.address || address.address_line1 || address.address_1 || address.street || '',
      address2: address.address2 || address.address_line2 || address.address_2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || address.postcode || '',
      country: address.country || DEFAULT_COUNTRY,
    };
  }

  toNativeAddress(address = {}, includeEmail = false) {
    const parts = String(address.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    return {
      first_name: firstName,
      last_name: lastName,
      address_1: address.address || '',
      address_2: address.address2 || '',
      city: address.city || '',
      state: address.state || '',
      postcode: address.pincode || '',
      country: address.country || DEFAULT_COUNTRY,
      phone: address.phone || '',
      ...(includeEmail ? { email: address.email || '' } : {}),
    };
  }

  normalizePaymentDetails(value) {
    if (!value) return {};
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }
    return { ...value };
  }

  async ensureCart(sessionId) {
    let cart = await Cart.findOne({ sessionId, status: 'active' });

    if (!cart) {
      cart = await Cart.create({ sessionId, status: 'active', items: [] });
    }

    return cart;
  }

  async resolveProductAndVariant({ productId, variantId, color, size }) {
    let product = null;

    if (productId) {
      const productLookup = this.buildProductLookup(productId);
      if (productLookup) {
        product = await Product.findOne(productLookup);
      }
    }

    if (!product && variantId && mongoose.Types.ObjectId.isValid(String(variantId))) {
      product = await Product.findOne({ 'variants._id': variantId });
    }

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    if (!this.isPublished(product)) {
      const error = new Error('Product is not available for purchase');
      error.statusCode = 400;
      error.code = 'PRODUCT_UNAVAILABLE';
      error.productId = product._id?.toString?.() || String(productId || '');
      error.productStatus = product.status || null;
      throw error;
    }

    let variant = null;

    if (variantId && mongoose.Types.ObjectId.isValid(String(variantId))) {
      variant = product.variants.id(String(variantId));
    }

    if (!variant && Array.isArray(product.variants) && product.variants.length > 0) {
      variant = product.variants.find((entry) => {
        const variantColor = this.getVariantValue(entry, 'color');
        const variantSize = this.getVariantValue(entry, 'size');
        const colorMatches = color ? String(variantColor).toLowerCase() === String(color).toLowerCase() : true;
        const sizeMatches = size ? String(variantSize).toLowerCase() === String(size).toLowerCase() : true;
        return colorMatches && sizeMatches;
      }) || product.variants.find((entry) => Number(entry.stock || 0) > 0) || product.variants[0];
    }

    return { product, variant: variant || null };
  }

  async serializeCart(cart) {
    if (!cart) {
      return {
        id: null,
        sessionId: null,
        items: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        itemCount: 0,
        totalItems: 0,
      };
    }

    const productIds = [...new Set(
      (cart.items || [])
        .map((item) => item.productId)
        .filter((value) => value && mongoose.Types.ObjectId.isValid(String(value)))
        .map((value) => String(value))
    )];

    const products = productIds.length > 0
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    let repairedPriceSnapshots = false;

    const items = (cart.items || []).map((item) => {
      const product = productsById.get(String(item.productId));
      if (!product) return null;

      const variant = item.variantId
        ? (product.variants || []).find((entry) => String(entry._id) === String(item.variantId))
        : null;
      const attributes = this.getVariantAttributes(variant || {});
      const computedPrice = this.getEffectivePrice(product, variant);
      const snapshotPrice = this.toFiniteNumber(item.priceSnapshot);
      const effectivePrice = snapshotPrice > 0 ? snapshotPrice : computedPrice;
      const originalPrice = this.getOriginalPrice(product, variant, effectivePrice);
      const color = attributes.color || '';
      const size = attributes.size || '';
      const productId = String(product._id);
      const variantId = variant?._id ? String(variant._id) : (item.variantId ? String(item.variantId) : null);

      if (snapshotPrice <= 0 && computedPrice > 0) {
        item.priceSnapshot = computedPrice;
        repairedPriceSnapshots = true;
      }

      return {
        id: item._id?.toString() || null,
        cartItemId: item._id?.toString() || null,
        productId,
        variantId,
        name: product.name || 'Product',
        image: this.getProductImage(product, variant),
        thumbnail: this.getProductImage(product, variant),
        price: effectivePrice,
        salePrice: effectivePrice,
        originalPrice,
        quantity: Number(item.quantity || 0) || 0,
        stock: Number(variant?.stock || 0) || 0,
        size,
        color,
        attributes,
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = this.calculateShippingCharge(subtotal);

    if (repairedPriceSnapshots && typeof cart.save === 'function') {
      try {
        await cart.save();
      } catch (error) {
        console.warn('[Cart] Failed to repair zero price snapshots:', error.message);
      }
    }

    return {
      id: cart._id?.toString() || null,
      sessionId: cart.sessionId || null,
      status: cart.status || 'active',
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      itemCount: items.length,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: cart.created_at || cart.createdAt || null,
      updatedAt: cart.updated_at || cart.updatedAt || null,
    };
  }

  async getCart(sessionId) {
    const cart = await this.ensureCart(sessionId);
    return this.serializeCart(cart);
  }

  async addToCart({ sessionId, productId, variantId, quantity = 1, size, color }) {
    const requestedQuantity = Math.max(Number(quantity) || 1, 1);
    const cart = await this.ensureCart(sessionId);
    const { product, variant } = await this.resolveProductAndVariant({ productId, variantId, size, color });

    if (Array.isArray(product.variants) && product.variants.length > 0 && !variant) {
      const error = new Error('Variant not found');
      error.statusCode = 404;
      throw error;
    }

    const existingItem = (cart.items || []).find((item) => {
      if (variant?._id) {
        return String(item.variantId) === String(variant._id);
      }
      return String(item.productId) === String(product._id) && !item.variantId;
    });

    const nextQuantity = requestedQuantity + Number(existingItem?.quantity || 0);
    const availableStock = Number(variant?.stock || 0) || 0;

    if (variant && nextQuantity > availableStock) {
      const error = new Error(`Only ${availableStock} items available`);
      error.statusCode = 409;
      error.code = 'INSUFFICIENT_STOCK';
      error.availableStock = availableStock;
      throw error;
    }

    const priceSnapshot = this.getEffectivePrice(product, variant);

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      existingItem.priceSnapshot = priceSnapshot;
      existingItem.productId = product._id;
      existingItem.variantId = variant?._id || null;
    } else {
      cart.items.push({
        productId: product._id,
        variantId: variant?._id || null,
        quantity: requestedQuantity,
        priceSnapshot,
      });
    }

    await cart.save();
    return this.serializeCart(cart);
  }

  async updateCartItem({ sessionId, itemId, quantity }) {
    const cart = await Cart.findOne({ sessionId, status: 'active' });
    if (!cart) {
      const error = new Error('Cart not found');
      error.statusCode = 404;
      throw error;
    }

    const cartItem = cart.items.id(String(itemId));
    if (!cartItem) {
      const error = new Error('Cart item not found');
      error.statusCode = 404;
      throw error;
    }

    const nextQuantity = Number(quantity || 0);
    if (nextQuantity <= 0) {
      cart.items.pull(cartItem._id);
      await cart.save();
      return this.serializeCart(cart);
    }

    const { product, variant } = await this.resolveProductAndVariant({
      productId: cartItem.productId,
      variantId: cartItem.variantId,
    });

    const availableStock = Number(variant?.stock || 0) || 0;
    if (variant && nextQuantity > availableStock) {
      const error = new Error(`Only ${availableStock} items available`);
      error.statusCode = 409;
      error.code = 'INSUFFICIENT_STOCK';
      error.availableStock = availableStock;
      throw error;
    }

    cartItem.quantity = nextQuantity;
    cartItem.priceSnapshot = this.getEffectivePrice(product, variant);
    await cart.save();

    return this.serializeCart(cart);
  }

  async removeCartItem({ sessionId, itemId }) {
    const cart = await Cart.findOne({ sessionId, status: 'active' });
    if (!cart) {
      return this.serializeCart(await this.ensureCart(sessionId));
    }

    cart.items.pull(String(itemId));
    await cart.save();
    return this.serializeCart(cart);
  }

  async clearCart(sessionId) {
    const cart = await this.ensureCart(sessionId);
    cart.items = [];
    await cart.save();
    return this.serializeCart(cart);
  }

  buildOrderId() {
    return `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  buildMockRazorpayOrderId() {
    return `order_mock_${Date.now()}${crypto.randomBytes(2).toString('hex')}`;
  }

  normalizeRequestedItems(items = []) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        productId: item?.productId || item?.id || null,
        variantId: item?.variantId || null,
        quantity: Math.max(Number(item?.quantity || 1) || 1, 1),
        size: item?.size || item?.attributes?.size || item?.attributes?.Size || null,
        color: item?.color || item?.attributes?.color || item?.attributes?.Color || null,
      }))
      .filter((item) => item.productId || item.variantId);
  }

  async createOrder(payload = {}, { user = null, tenantId = 1 } = {}) {
    const normalizedItems = this.normalizeRequestedItems(payload.items);
    if (normalizedItems.length === 0) {
      const error = new Error('Order items are required');
      error.statusCode = 400;
      throw error;
    }

    const legacyShipping = this.normalizeAddress(
      payload.shippingAddress || payload.shipping_address || {},
      payload.email || '',
      payload.name || ''
    );

    const orderItems = [];
    for (const requestedItem of normalizedItems) {
      const { product, variant } = await this.resolveProductAndVariant(requestedItem);

      if (variant && requestedItem.quantity > Number(variant.stock || 0)) {
        const availableStock = Number(variant.stock || 0) || 0;
        const error = new Error(`Only ${availableStock} items available`);
        error.statusCode = 409;
        error.code = 'INSUFFICIENT_STOCK';
        error.availableStock = availableStock;
        throw error;
      }

      const attributes = this.getVariantAttributes(variant || {});
      const price = this.getOriginalPrice(product, variant);
      const salePrice = this.getEffectivePrice(product, variant);
      const color = attributes.color || '';
      const size = attributes.size || '';

      orderItems.push({
        productId: product._id,
        variantId: variant?._id || null,
        quantity: requestedItem.quantity,
        priceSnapshot: salePrice,
        variant_attributes: attributes,
        name: product.name || 'Product',
        thumbnail: this.getProductImage(product, variant),
        price,
        salePrice,
        size,
        color,
        sku: variant?.sku || product.sku || '',
      });
    }

    const userId = mongoose.Types.ObjectId.isValid(String(user?.id || user?.userId || payload.userId || ''))
      ? new mongoose.Types.ObjectId(String(user?.id || user?.userId || payload.userId))
      : null;

    const couponCode = (payload.couponCode || payload.coupon_code || payload.coupon || '').toString().trim();
    const requestedTax = Math.max(0, Number(payload.tax || 0) || 0);
    const computedSubtotal = orderItems.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
    const subtotal = computedSubtotal;
    const shipping = this.calculateShippingCharge(subtotal);
    let requestedDiscount = 0;

    if (couponCode) {
      const couponResult = await couponService.validateAndApplyCoupon(
        couponCode,
        { subtotal, shipping_cost: shipping },
        userId ? String(userId) : null
      );
      requestedDiscount = Number(couponResult?.discount || 0) || 0;
    }

    const total = Math.max(0, subtotal - requestedDiscount + shipping + requestedTax);

    const orderId = this.buildOrderId();
    const razorpayConfigured = RazorpayGateway.isConfigured();
    const keyId = (config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || DEFAULT_RAZORPAY_KEY);
    const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();
    const nodeEnv = String(config.env || process.env.NODE_ENV || '').toLowerCase();
    const isProductionRuntime = nodeEnv === 'production' || vercelEnv === 'production';

    const forceMock = payload.forceMock === true
      || payload.mockPayment === true
      || payload.is_mock === true
      || payload.isMock === true;
    const forceReal = payload.forceRazorpay === true || payload.forceRealPayment === true;

    let isMock = false;
    const isLiveKey = keyId.startsWith('rzp_live');

    if (forceReal) {
      isMock = false;
    } else if (forceMock) {
      isMock = true;
    } else if (!razorpayConfigured) {
      if (isProductionRuntime) {
        const error = new Error('Razorpay is not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
        error.statusCode = 500;
        error.code = 'RAZORPAY_NOT_CONFIGURED';
        throw error;
      }
      isMock = true;
    } else if (isLiveKey && !isProductionRuntime) {
      console.warn('[Checkout] Live Razorpay keys detected in non-production environment. Defaulting to Mock mode for safety.');
      isMock = true;
    }

    let razorpayOrderId = isMock ? this.buildMockRazorpayOrderId() : '';
    let razorpayAmountInPaise = Math.round(total * 100);

    const order = await Order.create({
      orderId,
      userId,
      tenant_id: Number(tenantId) || 1,
      status: 'pending',
      paymentStatus: 'pending',
      payment_status: 'pending',
      paymentMethod: payload.paymentMethod || 'razorpay',
      payment_method: payload.paymentMethod || 'razorpay',
      userEmail: legacyShipping.email || '',
      userName: legacyShipping.name || '',
      currency: 'INR',
      items: orderItems,
      shippingAddress: legacyShipping,
      shipping_address: this.toNativeAddress(legacyShipping),
      billing_address: this.toNativeAddress(legacyShipping, true),
      subtotal,
      discount: requestedDiscount,
      shipping,
      tax: requestedTax,
      total,
      total_amount: total,
      couponCode: couponCode || '',
      razorpayOrderId,
      payment_details: {
        gateway: 'razorpay',
        razorpayOrderId,
        isMock,
      },
      statusHistory: [
        { status: 'pending', timestamp: new Date(), note: 'Order created' },
      ],
      stockReduced: false,
    });

    if (!isMock) {
      const shortReceipt = `rcpt_${String(order._id).slice(-12)}_${String(Date.now()).slice(-8)}`;

      try {
        const razorpayOrder = await RazorpayGateway.createPayment({
          orderId: orderId,
          orderNumber: orderId,
          userId: userId || 'guest',
          amount: total,
          currency: 'INR',
          receipt: shortReceipt,
        });

        if (razorpayOrder?.success) {
          order.razorpayOrderId = razorpayOrder.orderId;
          razorpayOrderId = razorpayOrder.orderId;
          razorpayAmountInPaise = razorpayOrder.amountInPaise || razorpayOrder.amount_in_paise || razorpayAmountInPaise;
          order.payment_details = {
            ...this.normalizePaymentDetails(order.payment_details),
            gateway: 'razorpay',
            razorpayOrderId: razorpayOrder.orderId,
            isMock: false,
          };
          await order.save();
        } else {
          console.warn('[Checkout] Razorpay createPayment failed, falling back to mock:', razorpayOrder?.error);
          isMock = true;
          razorpayOrderId = `order_mock_${Date.now()}`;
          order.razorpayOrderId = razorpayOrderId;
          order.payment_details = {
            ...this.normalizePaymentDetails(order.payment_details),
            gateway: 'razorpay',
            razorpayOrderId,
            isMock: true,
          };
          await order.save();
        }
      } catch (rzpError) {
        console.error('[Checkout] Razorpay exception, falling back to mock:', rzpError.message);
        isMock = true;
        razorpayOrderId = `order_mock_${Date.now()}`;
        order.razorpayOrderId = razorpayOrderId;
        order.payment_details = {
          ...this.normalizePaymentDetails(order.payment_details),
          gateway: 'razorpay',
          razorpayOrderId,
          isMock: true,
        };
        await order.save();
      }
    }

    return {
      order_id: orderId,
      orderId,
      razorpay_order_id: order.razorpayOrderId || razorpayOrderId,
      razorpayOrderId: order.razorpayOrderId || razorpayOrderId,
      amount: razorpayAmountInPaise,
      amount_in_paise: razorpayAmountInPaise,
      amountInPaise: razorpayAmountInPaise,
      display_amount: total,
      currency: 'INR',
      razorpay_key_id: isMock ? DEFAULT_RAZORPAY_KEY : keyId,
      key: isMock ? DEFAULT_RAZORPAY_KEY : keyId,
      is_mock: isMock,
      isMock,
      prefill: {
        name: legacyShipping.name || '',
        email: legacyShipping.email || '',
        contact: legacyShipping.phone || '',
      },
      created_order_id: order._id?.toString() || null,
    };
  }

  serializeOrder(order) {
    if (!order) return null;

    const source = typeof order.toObject === 'function'
      ? order.toObject({ flattenMaps: true })
      : order;

    const shippingAddress = source.shippingAddress || this.normalizeAddress(source.shipping_address || {}, source.userEmail || '', source.userName || '');
    const paymentDetails = this.normalizePaymentDetails(source.payment_details);
    const items = Array.isArray(source.items)
      ? source.items.map((item) => {
        const productId = item.productId?.toString ? item.productId.toString() : (item.productId || null);
        const variantId = item.variantId?.toString ? item.variantId.toString() : (item.variantId || null);
        return {
          ...item,
          productId,
          variantId,
          price: Number(item.price ?? item.priceSnapshot ?? 0) || 0,
          salePrice: Number(item.salePrice ?? item.priceSnapshot ?? item.price ?? 0) || 0,
          quantity: Number(item.quantity || 0) || 0,
          thumbnail: item.thumbnail || null,
          size: item.size || this.getVariantValue(item, 'size') || '',
          color: item.color || this.getVariantValue(item, 'color') || '',
          attributes: this.getVariantAttributes(item),
        };
      })
      : [];

    return {
      ...source,
      id: source._id?.toString?.() || source.id || null,
      userId: source.userId?.toString?.() || source.userId || null,
      orderId: source.orderId || source.id || source._id?.toString?.() || null,
      paymentStatus: source.paymentStatus || source.payment_status || 'pending',
      paymentMethod: source.paymentMethod || source.payment_method || 'razorpay',
      shippingAddress,
      subtotal: Number(source.subtotal ?? source.total_amount ?? 0) || 0,
      discount: Number(source.discount || 0) || 0,
      shipping: Number(source.shipping || 0) || 0,
      tax: Number(source.tax || 0) || 0,
      total: Number(source.total ?? source.total_amount ?? 0) || 0,
      createdAt: source.createdAt || source.created_at || null,
      updatedAt: source.updatedAt || source.updated_at || null,
      razorpayOrderId: source.razorpayOrderId || paymentDetails.razorpayOrderId || null,
      razorpayPaymentId: source.razorpayPaymentId || paymentDetails.razorpayPaymentId || null,
      statusHistory: Array.isArray(source.statusHistory) ? source.statusHistory : [],
      items,
    };
  }

  async getOrderByOrderId(orderId) {
    const order = await Order.findOne({ orderId }).lean();
    return this.serializeOrder(order);
  }

  async getOrders({ userId = null, status = null, page = 1, limit = 20, search = '', dateFrom = null, dateTo = null, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    const filter = {};

    if (userId) {
      if (mongoose.Types.ObjectId.isValid(String(userId))) {
        filter.userId = new mongoose.Types.ObjectId(String(userId));
      } else {
        filter.userEmail = String(userId);
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) filter.created_at.$gte = new Date(dateFrom);
      if (dateTo) filter.created_at.$lte = new Date(dateTo);
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * perPage;
    const sortField = sortBy === 'createdAt' ? 'created_at' : sortBy;
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(perPage).lean(),
      Order.countDocuments(filter),
    ]);

    return {
      orders: orders.map((order) => this.serializeOrder(order)),
      pagination: {
        current_page: currentPage,
        total_pages: Math.max(Math.ceil(total / perPage), 1),
        total,
      },
    };
  }

  async getOrderStats() {
    const [total, pending, confirmed, shipped, delivered, cancelled, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'confirmed' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      total,
      pending,
      confirmed,
      shipped,
      delivered,
      cancelled,
      revenue: revenueAgg[0]?.total || 0,
    };
  }

  async updateOrderStatus(orderId, { status, note = '', trackingNumber = '', trackingUrl = '' } = {}) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    order.status = status || order.status;
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: note || `Status updated to ${order.status}`,
    });

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
      order.trackingUrl = trackingUrl || order.trackingUrl || '';
    }

    await order.save();
    return this.serializeOrder(order);
  }

  /**
   * @deprecated Use orderStateMachine.reduceOrderStock(order) instead for consistency
   */
  async reduceInventoryForOrder(order) {
    const orderStateMachine = require('./orderStateMachine.service');
    await orderStateMachine.reduceOrderStock(order);
    return [];
  }

  async confirmPayment(orderId, paymentPayload = {}) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const paymentDetails = this.normalizePaymentDetails(order.payment_details);
    const isMock = paymentDetails.isMock === true
      || paymentDetails.is_mock === true
      || String(order.razorpayOrderId || '').startsWith('order_mock_');

    if (!isMock) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentPayload || {};
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        const error = new Error('Missing Razorpay payment details');
        error.statusCode = 400;
        error.code = 'PAYMENT_DETAILS_REQUIRED';
        throw error;
      }

      if (String(order.razorpayOrderId || '') && String(order.razorpayOrderId) !== String(razorpay_order_id)) {
        const error = new Error('Razorpay order id does not match this order');
        error.statusCode = 400;
        error.code = 'RAZORPAY_ORDER_MISMATCH';
        throw error;
      }

      const verification = RazorpayGateway.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!verification?.success) {
        const error = new Error(verification?.error || 'Invalid payment signature');
        error.statusCode = 400;
        error.code = 'RAZORPAY_SIGNATURE_INVALID';
        throw error;
      }

      const statusCheck = await RazorpayGateway.verifyPaymentStatus(razorpay_payment_id);
      if (!statusCheck?.success) {
        const error = new Error(statusCheck?.error || 'Payment is not captured');
        error.statusCode = 400;
        error.code = 'RAZORPAY_PAYMENT_NOT_CAPTURED';
        throw error;
      }
    }

    const orderStateMachine = require('./orderStateMachine.service');
    const { ORDER_STATUS } = require('./orderStateMachine.service');

    await orderStateMachine.transitionStatus(order._id, ORDER_STATUS.PAID, {
      userId: order.userId,
      userType: order.userId ? 'customer' : 'guest',
      metadata: { 
        razorpay_payment_id: paymentPayload.razorpay_payment_id, 
        razorpay_order_id: paymentPayload.razorpay_order_id 
      }
    });

    const paymentId = paymentPayload.razorpay_payment_id || `pay_mock_${Date.now()}`;

    order.razorpayPaymentId = paymentId;
    order.transaction_id = paymentId;
    order.payment_details = {
      ...paymentDetails,
      razorpayOrderId: paymentPayload.razorpay_order_id || order.razorpayOrderId || paymentDetails.razorpayOrderId || null,
      razorpayPaymentId: paymentId,
      razorpaySignature: paymentPayload.razorpay_signature || null,
      paymentConfirmedAt: new Date().toISOString(),
    };

    await order.save();

    sendOrderConfirmation(this.serializeOrder(order)).catch((error) => {
      console.error('Email send failed:', error.message);
    });

    return this.serializeOrder(order);
  }
}

module.exports = new StorefrontCheckoutService();
