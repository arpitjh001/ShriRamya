const httpStatus = require('http-status');
const { PromoBar } = require('../models');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cache.service');
const cacheInvalidationService = require('./cacheInvalidation.service');
const config = require('../config/config');
const logger = require('../utils/logger');

const DISPLAY_LOCATIONS = Object.freeze(['all', 'home', 'category', 'product', 'cart', 'checkout']);
const CACHE_PREFIX = 'promo_bar';

class PromoBarService {
  get displayLocations() {
    return DISPLAY_LOCATIONS;
  }

  normalizeLocation(location = 'all') {
    const normalizedLocation = String(location || 'all').trim().toLowerCase();
    if (!DISPLAY_LOCATIONS.includes(normalizedLocation)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid promo bar display location');
    }
    return normalizedLocation;
  }

  normalizePromoBarData(data = {}) {
    const normalized = { ...data };

    if (Object.prototype.hasOwnProperty.call(normalized, 'promoText')) {
      normalized.promoText = String(normalized.promoText || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'title')) {
      normalized.title = String(normalized.title || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'couponCode')) {
      const couponCode = String(normalized.couponCode || '').trim().toUpperCase();
      normalized.couponCode = couponCode || null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'displayLocation')) {
      normalized.displayLocation = this.normalizeLocation(normalized.displayLocation);
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'priority')) {
      normalized.priority = Number(normalized.priority);
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'startDate')) {
      normalized.startDate = normalized.startDate ? new Date(normalized.startDate) : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'endDate')) {
      normalized.endDate = normalized.endDate ? new Date(normalized.endDate) : null;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'backgroundColor')) {
      normalized.backgroundColor = String(normalized.backgroundColor || '').trim();
    }

    if (Object.prototype.hasOwnProperty.call(normalized, 'textColor')) {
      normalized.textColor = String(normalized.textColor || '').trim();
    }

    return normalized;
  }

  validatePromoBarData(data = {}, { partial = false } = {}) {
    if (!partial || Object.prototype.hasOwnProperty.call(data, 'promoText')) {
      if (!data.promoText || String(data.promoText).trim().length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Promo text is required');
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'displayLocation')) {
      this.normalizeLocation(data.displayLocation);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'priority')) {
      if (!Number.isFinite(Number(data.priority)) || Number(data.priority) < 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Priority must be a number greater than or equal to 0');
      }
    }

    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Start date is invalid');
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'End date is invalid');
    }

    if (startDate && endDate && startDate > endDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Start date must be before end date');
    }
  }

  serializePromoBar(promoBar) {
    if (!promoBar) return null;
    const source = typeof promoBar.toObject === 'function' ? promoBar.toObject() : promoBar;

    return {
      id: String(source._id || source.id),
      title: source.title || '',
      promoText: source.promoText,
      couponCode: source.couponCode ? String(source.couponCode).trim().toUpperCase() : null,
      isActive: Boolean(source.isActive),
      displayLocation: source.displayLocation || 'all',
      startDate: source.startDate || null,
      endDate: source.endDate || null,
      priority: Number(source.priority || 0),
      backgroundColor: source.backgroundColor || '',
      textColor: source.textColor || '',
      createdAt: source.createdAt || null,
      updatedAt: source.updatedAt || null,
    };
  }

  async listPromoBars(params = {}) {
    const query = {};
    const location = params.displayLocation || params.location;

    if (location && location !== 'all-locations') {
      query.displayLocation = this.normalizeLocation(location);
    }

    if (params.isActive !== undefined && params.isActive !== 'all') {
      query.isActive = params.isActive === true || params.isActive === 'true';
    }

    const promoBars = await PromoBar.find(query)
      .sort({ priority: -1, updatedAt: -1 })
      .lean();

    return promoBars.map((promoBar) => this.serializePromoBar(promoBar));
  }

  async createPromoBar(data = {}) {
    const normalized = this.normalizePromoBarData(data);
    this.validatePromoBarData(normalized);

    const promoBar = await PromoBar.create(normalized);
    await cacheInvalidationService.invalidatePromoBars();

    logger.info('Promo bar created', {
      event: 'PROMO_BAR_CREATE',
      promoBarId: String(promoBar._id),
      displayLocation: promoBar.displayLocation,
      isActive: promoBar.isActive,
      priority: promoBar.priority,
    });

    return this.serializePromoBar(promoBar);
  }

  async getPromoBarById(id) {
    const promoBar = await PromoBar.findById(id);
    if (!promoBar) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Promo bar not found');
    }
    return promoBar;
  }

  async updatePromoBar(id, data = {}) {
    const normalized = this.normalizePromoBarData(data);
    this.validatePromoBarData(normalized, { partial: true });

    const promoBar = await PromoBar.findByIdAndUpdate(
      id,
      { $set: normalized },
      { new: true, runValidators: true }
    );

    if (!promoBar) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Promo bar not found');
    }

    await cacheInvalidationService.invalidatePromoBars();

    logger.info('Promo bar updated', {
      event: 'PROMO_BAR_UPDATE',
      promoBarId: String(promoBar._id),
      displayLocation: promoBar.displayLocation,
      isActive: promoBar.isActive,
      priority: promoBar.priority,
    });

    return this.serializePromoBar(promoBar);
  }

  async togglePromoBar(id, isActive) {
    const existing = await this.getPromoBarById(id);
    const nextIsActive = typeof isActive === 'boolean' ? isActive : !existing.isActive;

    existing.isActive = nextIsActive;
    await existing.save();
    await cacheInvalidationService.invalidatePromoBars();

    logger.info('Promo bar toggled', {
      event: nextIsActive ? 'PROMO_BAR_ENABLE' : 'PROMO_BAR_DISABLE',
      promoBarId: String(existing._id),
      displayLocation: existing.displayLocation,
      isActive: nextIsActive,
    });

    return this.serializePromoBar(existing);
  }

  async deletePromoBar(id) {
    const promoBar = await PromoBar.findByIdAndDelete(id);
    if (!promoBar) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Promo bar not found');
    }

    await cacheInvalidationService.invalidatePromoBars();

    logger.info('Promo bar deleted', {
      event: 'PROMO_BAR_DELETE',
      promoBarId: String(promoBar._id),
      displayLocation: promoBar.displayLocation,
    });

    return { id, deleted: true };
  }

  getStorefrontCacheKey(location) {
    return `${CACHE_PREFIX}:${this.normalizeLocation(location)}`;
  }

  buildActiveQuery(location, now = new Date()) {
    const normalizedLocation = this.normalizeLocation(location);

    return {
      isActive: true,
      displayLocation: normalizedLocation === 'all'
        ? 'all'
        : { $in: ['all', normalizedLocation] },
      $and: [
        { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    };
  }

  async findActivePromoBar(location) {
    const now = new Date();
    const query = this.buildActiveQuery(location, now);
    const promoBar = await PromoBar.findOne(query)
      .sort({ priority: -1, updatedAt: -1 })
      .lean();

    return this.serializePromoBar(promoBar);
  }

  async getActivePromoBarForLocation(location = 'all') {
    const normalizedLocation = this.normalizeLocation(location);
    const cacheKey = this.getStorefrontCacheKey(normalizedLocation);

    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      logger.info('Promo bar cache hit', {
        event: 'PROMO_BAR_CACHE_HIT',
        cacheKey,
        location: normalizedLocation,
      });
      return cached;
    }

    logger.info('Promo bar cache miss', {
      event: 'PROMO_BAR_CACHE_MISS',
      cacheKey,
      location: normalizedLocation,
    });

    const promoBar = await this.findActivePromoBar(normalizedLocation);
    await cacheService.set(cacheKey, promoBar, config.cache.couponTtlSeconds);

    logger.info('Promo bar storefront fetch', {
      event: 'PROMO_BAR_STOREFRONT_FETCH',
      location: normalizedLocation,
      promoBarId: promoBar?.id || null,
      source: 'database',
    });

    return promoBar;
  }
}

module.exports = new PromoBarService();
module.exports.PromoBarService = PromoBarService;
module.exports.DISPLAY_LOCATIONS = DISPLAY_LOCATIONS;
