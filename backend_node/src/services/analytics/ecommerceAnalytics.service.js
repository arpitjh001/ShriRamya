const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  AnalyticsEvent,
  Product,
  Order,
  User,
  Category,
  OfflineSale,
  VisitorRegionDaily,
} = require('../../models');
const redis = require('../../config/integrations/redis');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const { buildTenantScope, buildTenantScopedQuery, normalizeTenantId } = require('../../utils/tenantScope');

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const REVENUE_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
const PAID_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];
const CANCELLED_STATUSES = ['cancelled'];
const REFUNDED_STATUSES = ['refunded'];
const EVENT_QUEUE_KEY = 'analytics:events:recent';
const EVENT_QUEUE_MAX = 1000;
const MEMORY_QUEUE_MAX = 250;
const memoryEventQueue = [];

const EVENT_NAMES = new Set([
  'page_view',
  'product_view',
  'category_view',
  'add_to_cart',
  'remove_from_cart',
  'checkout_started',
  'payment_initiated',
  'payment_success',
  'payment_failed',
  'order_created',
  'product_search',
  'coupon_applied',
  'coupon_failed',
  'wishlist_added',
]);

const pad = (value) => String(value).padStart(2, '0');

const getDatePartsInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  } catch {
    return {
      year: String(date.getUTCFullYear()),
      month: pad(date.getUTCMonth() + 1),
      day: pad(date.getUTCDate()),
    };
  }
};

const getDateKey = (date, timezone = DEFAULT_TIMEZONE) => {
  const parts = getDatePartsInTimezone(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const dateOnlyToUtc = (dateKey, boundary = 'start', timezone = DEFAULT_TIMEZONE) => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  if (timezone === DEFAULT_TIMEZONE) {
    const time = boundary === 'end' ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${year}-${pad(month)}-${pad(day)}T${time}+05:30`);
  }

  return boundary === 'end'
    ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const parseRangeDate = (value, boundary, timezone = DEFAULT_TIMEZONE) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return dateOnlyToUtc(value, boundary, timezone);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDefaultRange = (timezone = DEFAULT_TIMEZONE) => {
  const todayKey = getDateKey(new Date(), timezone);
  const todayStart = dateOnlyToUtc(todayKey, 'start', timezone);
  const to = dateOnlyToUtc(todayKey, 'end', timezone);
  const from = new Date(todayStart);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from, to };
};

const normalizeRange = (params = {}) => {
  const timezone = params.timezone || DEFAULT_TIMEZONE;
  const rawFrom = params.from || params.start_date;
  const rawTo = params.to || params.end_date;
  const defaults = getDefaultRange(timezone);
  const from = rawFrom ? parseRangeDate(rawFrom, 'start', timezone) : defaults.from;
  const to = rawTo ? parseRangeDate(rawTo, 'end', timezone) : defaults.to;

  if (!from || !to) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date range. Use YYYY-MM-DD for from and to.');
  }

  if (from > to) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'from date must not be greater than to date');
  }

  const durationMs = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs + 1);

  return {
    from,
    to,
    previousFrom,
    previousTo,
    timezone,
    fromKey: getDateKey(from, timezone),
    toKey: getDateKey(to, timezone),
  };
};

const getOrderRevenueExpression = () => ({
  $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }],
});

const getOrderItemUnitPriceExpression = () => ({
  $let: {
    vars: {
      snapshot: { $ifNull: ['$items.priceSnapshot', 0] },
      price: { $ifNull: ['$items.price', 0] },
      salePrice: { $ifNull: ['$items.salePrice', 0] },
    },
    in: {
      $cond: [
        { $gt: ['$$snapshot', 0] },
        '$$snapshot',
        {
          $cond: [{ $gt: ['$$price', 0] }, '$$price', '$$salePrice'],
        },
      ],
    },
  },
});

const getOrderItemRevenueExpression = () => ({
  $multiply: [{ $ifNull: ['$items.quantity', 1] }, getOrderItemUnitPriceExpression()],
});

const getOfflineRevenueExpression = () => ({
  $multiply: [{ $ifNull: ['$quantity', 1] }, { $ifNull: ['$salePrice', 0] }],
});

const percent = (numerator, denominator) => (
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0
);

const comparePeriods = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getClientIp = (req) => {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (forwardedFor) return String(forwardedFor).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const hashValue = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const sanitizeString = (value, limit = 250) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, limit) : null;
};

const sanitizePath = (value) => {
  const rawPath = sanitizeString(value, 300) || '/';
  try {
    const parsed = rawPath.startsWith('http') ? new URL(rawPath) : null;
    const path = parsed ? `${parsed.pathname}${parsed.search}` : rawPath;
    return (path.startsWith('/') ? path : `/${path}`).slice(0, 300);
  } catch {
    return '/';
  }
};

const detectDevice = (userAgent = '') => {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
  if (/mobi|android|iphone|phone/i.test(userAgent)) return 'mobile';
  if (userAgent) return 'desktop';
  return 'unknown';
};

const detectBrowser = (userAgent = '') => {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/opr\//i.test(userAgent)) return 'Opera';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  return 'Unknown';
};

const trafficSourceFrom = ({ referrer, utm_source }) => {
  if (utm_source) {
    if (/facebook|instagram|pinterest|twitter|x|youtube|linkedin/i.test(utm_source)) return 'social';
    if (/google|bing|yahoo|duckduckgo/i.test(utm_source)) return 'search';
    return 'referral';
  }

  const value = String(referrer || '');
  if (!value) return 'direct';
  if (/google|bing|yahoo|duckduckgo/i.test(value)) return 'search';
  if (/facebook|instagram|pinterest|twitter|youtube|linkedin/i.test(value)) return 'social';
  return 'referral';
};

const decodeHeader = (value, fallback = null) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  try {
    return decodeURIComponent(String(raw));
  } catch {
    return String(raw);
  }
};

const toObjectIdList = (values = []) => values
  .map((value) => String(value || '').trim())
  .filter((value) => mongoose.Types.ObjectId.isValid(value))
  .map((value) => new mongoose.Types.ObjectId(value));

const numberValue = (value) => Number(value || 0);

class EcommerceAnalyticsService {
  normalizeRange(params = {}) {
    return normalizeRange(params);
  }

  buildEvent(req, payload = {}) {
    const body = { ...payload };
    if (typeof body.metadata === 'string') {
      try {
        body.metadata = JSON.parse(body.metadata);
      } catch {
        body.metadata = {};
      }
    }

    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    const eventName = sanitizeString(body.event_name || body.eventName || body.name, 80) || 'page_view';
    if (!EVENT_NAMES.has(eventName)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported analytics event');
    }

    const userAgent = req.headers?.['user-agent'] || body.user_agent || '';
    const referrer = sanitizeString(body.referrer || req.headers?.referer || '', 500) || '';
    const ip = getClientIp(req);
    const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || 'shriramya-analytics';
    const visitorId = sanitizeString(body.visitor_id || body.visitorId, 120)
      || hashValue(`${ip}:${userAgent}:${secret}`).slice(0, 40);
    const sessionId = sanitizeString(body.session_id || body.sessionId, 120)
      || hashValue(`${visitorId}:${getDateKey(new Date())}`).slice(0, 40);
    const utmSource = sanitizeString(body.utm_source || metadata.utm_source, 100);

    return {
      tenant_id: normalizeTenantId(body.tenant_id || body.tenantId || 1),
      event_name: eventName,
      user_id: sanitizeString(body.user_id || body.userId || req.user?._id || null, 80),
      session_id: sessionId,
      visitor_id: visitorId,
      product_id: sanitizeString(body.product_id || body.productId || metadata.product_id || metadata.productId, 80),
      category_id: sanitizeString(body.category_id || body.categoryId || metadata.category_id || metadata.categoryId, 80),
      order_id: sanitizeString(body.order_id || body.orderId || metadata.order_id || metadata.orderId, 80),
      cart_id: sanitizeString(body.cart_id || body.cartId || metadata.cart_id || metadata.cartId, 80),
      search_query: sanitizeString(body.search_query || body.searchQuery || metadata.search_query || metadata.query, 150),
      path: sanitizePath(body.path || body.pathname || metadata.path),
      page_title: sanitizeString(body.title || body.page_title || body.pageTitle, 180) || '',
      device_type: ['mobile', 'desktop', 'tablet'].includes(body.device_type || body.deviceType)
        ? (body.device_type || body.deviceType)
        : detectDevice(userAgent),
      browser: sanitizeString(body.browser, 80) || detectBrowser(userAgent),
      referrer,
      traffic_source: trafficSourceFrom({ referrer, utm_source: utmSource }),
      utm_source: utmSource,
      utm_medium: sanitizeString(body.utm_medium || metadata.utm_medium, 100),
      utm_campaign: sanitizeString(body.utm_campaign || metadata.utm_campaign, 100),
      ip_address_hash: hashValue(`${ip}:${secret}`),
      country: sanitizeString(body.country || decodeHeader(req.headers?.['x-vercel-ip-country'], null), 80),
      country_code: sanitizeString(body.country_code || body.countryCode || decodeHeader(req.headers?.['x-vercel-ip-country'], null), 8),
      region: sanitizeString(body.region || decodeHeader(req.headers?.['x-vercel-ip-country-region'], null), 80),
      city: sanitizeString(body.city || decodeHeader(req.headers?.['x-vercel-ip-city'], null), 80),
      metadata,
      created_at: body.created_at ? new Date(body.created_at) : new Date(),
    };
  }

  async mirrorToRedis(event) {
    try {
      const client = await redis.ensureConnected();
      if (!client) return false;
      await client.lpush(EVENT_QUEUE_KEY, JSON.stringify(event));
      await client.ltrim(EVENT_QUEUE_KEY, 0, EVENT_QUEUE_MAX - 1);
      return true;
    } catch (error) {
      redis.markCommandFailure?.(error, 'LPUSH');
      return false;
    }
  }

  async persistEvent(event) {
    await this.mirrorToRedis(event);
    try {
      await AnalyticsEvent.create(event);
      return true;
    } catch (error) {
      memoryEventQueue.push(event);
      if (memoryEventQueue.length > MEMORY_QUEUE_MAX) memoryEventQueue.shift();
      console.warn('[Analytics] Event persisted to memory fallback:', error.message);
      return false;
    }
  }

  enqueueEvent(req, payload = {}) {
    const event = this.buildEvent(req, payload);
    setImmediate(() => {
      this.persistEvent(event).catch((error) => {
        console.warn('[Analytics] Event logging failed:', error.message);
      });
    });
    return { accepted: true, event_name: event.event_name };
  }

  eventMatch(range, tenantId, eventNames = null) {
    return {
      tenant_id: tenantId,
      created_at: { $gte: range.from, $lte: range.to },
      ...(eventNames ? { event_name: { $in: eventNames } } : {}),
    };
  }

  orderMatch(range, tenantId, statuses = null) {
    return {
      ...buildTenantScope(tenantId),
      created_at: { $gte: range.from, $lte: range.to },
      ...(statuses ? { status: { $in: statuses } } : {}),
    };
  }

  dateGroup(timezone) {
    return { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone } };
  }

  async getOverview(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const previousRange = { ...range, from: range.previousFrom, to: range.previousTo };

    const [current, previous, visitors, previousVisitors, cart, previousCart] = await Promise.all([
      this.getSalesSummary(range, tenantId),
      this.getSalesSummary(previousRange, tenantId),
      this.getVisitorSummary(range, tenantId),
      this.getVisitorSummary(previousRange, tenantId),
      this.getCartSummary(range, tenantId),
      this.getCartSummary(previousRange, tenantId),
    ]);

    const conversionRate = percent(current.paidOrders, visitors.uniqueVisitors);
    const previousConversionRate = percent(previous.paidOrders, previousVisitors.uniqueVisitors);

    return {
      range: this.serializeRange(range),
      cards: {
        totalRevenue: {
          value: current.totalRevenue,
          previous: previous.totalRevenue,
          change: comparePeriods(current.totalRevenue, previous.totalRevenue),
        },
        totalOrders: {
          value: current.totalOrders,
          previous: previous.totalOrders,
          change: comparePeriods(current.totalOrders, previous.totalOrders),
        },
        totalVisitors: {
          value: visitors.uniqueVisitors,
          previous: previousVisitors.uniqueVisitors,
          change: comparePeriods(visitors.uniqueVisitors, previousVisitors.uniqueVisitors),
        },
        conversionRate: {
          value: conversionRate,
          previous: previousConversionRate,
          change: comparePeriods(conversionRate, previousConversionRate),
        },
        averageOrderValue: {
          value: current.averageOrderValue,
          previous: previous.averageOrderValue,
          change: comparePeriods(current.averageOrderValue, previous.averageOrderValue),
        },
        cartAbandonmentRate: {
          value: cart.cartAbandonmentRate,
          previous: previousCart.cartAbandonmentRate,
          change: comparePeriods(cart.cartAbandonmentRate, previousCart.cartAbandonmentRate),
        },
      },
      summary: {
        ...current,
        ...visitors,
        cartAbandonmentRate: cart.cartAbandonmentRate,
        checkoutAbandonmentRate: cart.checkoutAbandonmentRate,
      },
    };
  }

  serializeRange(range) {
    return {
      from: range.fromKey || getDateKey(range.from, range.timezone),
      to: range.toKey || getDateKey(range.to, range.timezone),
      timezone: range.timezone,
      startDate: range.from,
      endDate: range.to,
    };
  }

  async getSalesSummary(range, tenantId) {
    const tenantFilter = buildTenantScope(tenantId);
    const [orders, offline] = await Promise.all([
      Order.aggregate([
        { $match: { ...tenantFilter, created_at: { $gte: range.from, $lte: range.to } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            paidOrders: { $sum: { $cond: [{ $in: ['$status', PAID_STATUSES] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $in: ['$status', CANCELLED_STATUSES] }, 1, 0] } },
            refundedOrders: { $sum: { $cond: [{ $in: ['$status', REFUNDED_STATUSES] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $in: ['$status', PAID_STATUSES] }, getOrderRevenueExpression(), 0] } },
          },
        },
      ]),
      OfflineSale.aggregate([
        { $match: { ...tenantFilter, soldAt: { $gte: range.from, $lte: range.to } } },
        { $group: { _id: null, offlineOrders: { $sum: 1 }, offlineRevenue: { $sum: getOfflineRevenueExpression() } } },
      ]),
    ]);

    const online = orders[0] || {};
    const offlineRow = offline[0] || {};
    const paidOrders = numberValue(online.paidOrders) + numberValue(offlineRow.offlineOrders);
    const totalRevenue = numberValue(online.totalRevenue) + numberValue(offlineRow.offlineRevenue);

    return {
      totalRevenue,
      totalOrders: numberValue(online.totalOrders) + numberValue(offlineRow.offlineOrders),
      paidOrders,
      cancelledOrders: numberValue(online.cancelledOrders),
      refundedOrders: numberValue(online.refundedOrders),
      averageOrderValue: paidOrders > 0 ? totalRevenue / paidOrders : 0,
      onlineRevenue: numberValue(online.totalRevenue),
      offlineRevenue: numberValue(offlineRow.offlineRevenue),
      onlineOrders: numberValue(online.paidOrders),
      offlineOrders: numberValue(offlineRow.offlineOrders),
    };
  }

  async getVisitorSummary(range, tenantId) {
    const match = this.eventMatch(range, tenantId);
    const summaryRows = await AnalyticsEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          pageViews: { $sum: { $cond: [{ $eq: ['$event_name', 'page_view'] }, 1, 0] } },
          visitors: { $addToSet: '$visitor_id' },
          sessions: { $addToSet: '$session_id' },
        },
      },
      {
        $project: {
          _id: 0,
          pageViews: 1,
          uniqueVisitors: { $size: '$visitors' },
          sessions: { $size: '$sessions' },
        },
      },
    ]);

    const summary = summaryRows[0] || { pageViews: 0, uniqueVisitors: 0, sessions: 0 };
    const newVisitorRows = await AnalyticsEvent.aggregate([
      { $match: { tenant_id: tenantId } },
      { $group: { _id: '$visitor_id', firstSeenAt: { $min: '$created_at' } } },
      { $match: { firstSeenAt: { $gte: range.from, $lte: range.to } } },
      { $count: 'newVisitors' },
    ]);
    const newVisitors = newVisitorRows[0]?.newVisitors || 0;

    return {
      uniqueVisitors: summary.uniqueVisitors,
      totalVisitors: summary.uniqueVisitors,
      pageViews: summary.pageViews,
      sessions: summary.sessions,
      newVisitors,
      returningVisitors: Math.max(summary.uniqueVisitors - newVisitors, 0),
    };
  }

  async getVisitorAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const match = this.eventMatch(range, tenantId);
    const pageViewMatch = this.eventMatch(range, tenantId, ['page_view']);

    const [
      summary,
      daily,
      devices,
      browsers,
      sources,
      topPages,
      locations,
    ] = await Promise.all([
      this.getVisitorSummary(range, tenantId),
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: this.dateGroup(range.timezone),
            visitors: { $addToSet: '$visitor_id' },
            sessions: { $addToSet: '$session_id' },
            pageViews: { $sum: { $cond: [{ $eq: ['$event_name', 'page_view'] }, 1, 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            visitors: { $size: '$visitors' },
            sessions: { $size: '$sessions' },
            pageViews: 1,
          },
        },
        { $sort: { date: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: '$device_type', visitors: { $addToSet: '$visitor_id' }, pageViews: { $sum: 1 } } },
        { $project: { _id: 0, device: { $ifNull: ['$_id', 'unknown'] }, visitors: { $size: '$visitors' }, pageViews: 1 } },
        { $sort: { visitors: -1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: '$browser', visitors: { $addToSet: '$visitor_id' }, pageViews: { $sum: 1 } } },
        { $project: { _id: 0, browser: { $ifNull: ['$_id', 'Unknown'] }, visitors: { $size: '$visitors' }, pageViews: 1 } },
        { $sort: { visitors: -1 } },
        { $limit: 8 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: '$traffic_source', visitors: { $addToSet: '$visitor_id' }, pageViews: { $sum: 1 } } },
        { $project: { _id: 0, source: { $ifNull: ['$_id', 'direct'] }, visitors: { $size: '$visitors' }, pageViews: 1 } },
        { $sort: { visitors: -1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: pageViewMatch },
        { $group: { _id: '$path', pageViews: { $sum: 1 }, visitors: { $addToSet: '$visitor_id' }, title: { $last: '$page_title' } } },
        { $project: { _id: 0, path: '$_id', title: 1, pageViews: 1, visitors: { $size: '$visitors' } } },
        { $sort: { pageViews: -1 } },
        { $limit: 10 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: { country: '$country', region: '$region', city: '$city' },
            visitors: { $addToSet: '$visitor_id' },
            pageViews: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            country: { $ifNull: ['$_id.country', 'Unknown'] },
            region: { $ifNull: ['$_id.region', 'Unknown'] },
            city: { $ifNull: ['$_id.city', 'Unknown'] },
            visitors: { $size: '$visitors' },
            pageViews: 1,
          },
        },
        { $sort: { visitors: -1, pageViews: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return { range: this.serializeRange(range), summary, daily, devices, browsers, sources, topPages, locations };
  }

  async getSalesAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const tenantFilter = buildTenantScope(tenantId);
    const orderDateMatch = { created_at: { $gte: range.from, $lte: range.to } };
    const paidDateMatch = { ...orderDateMatch, status: { $in: PAID_STATUSES } };

    const [summary, revenueByDate, revenueByPaymentMethod, orderStatusRows, categoryRows] = await Promise.all([
      this.getSalesSummary(range, tenantId),
      Order.aggregate([
        { $match: { ...tenantFilter, ...paidDateMatch } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: range.timezone } },
            revenue: { $sum: getOrderRevenueExpression() },
            orders: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
        { $sort: { date: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...tenantFilter, ...paidDateMatch } },
        { $group: { _id: '$payment_method', totalRevenue: { $sum: getOrderRevenueExpression() }, orders: { $sum: 1 } } },
        { $project: { _id: 0, method: { $ifNull: ['$_id', 'unknown'] }, totalRevenue: 1, orders: 1 } },
        { $sort: { totalRevenue: -1 } },
      ]),
      Order.aggregate([
        { $match: { ...tenantFilter, ...orderDateMatch } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),
      this.getRevenueByCategory(range, tenantId),
    ]);

    return {
      range: this.serializeRange(range),
      summary,
      revenueByDate,
      revenueByCategory: categoryRows,
      revenueByPaymentMethod,
      orderStatuses: orderStatusRows,
      data: revenueByDate.map((row) => ({ period: row.date, totalRevenue: row.revenue, orderCount: row.orders })),
    };
  }

  async getRevenueByCategory(range, tenantId) {
    const tenantFilter = buildTenantScope(tenantId);
    const salesRows = await Order.aggregate([
      { $match: { ...tenantFilter, status: { $in: PAID_STATUSES }, created_at: { $gte: range.from, $lte: range.to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          revenue: { $sum: getOrderItemRevenueExpression() },
          purchases: { $sum: { $ifNull: ['$items.quantity', 1] } },
        },
      },
    ]);

    const productIds = salesRows.map((row) => row._id).filter(Boolean);
    const productDocs = productIds.length
      ? await Product.find({ ...buildTenantScopedQuery(tenantId, {}), _id: { $in: productIds } })
        .populate('categories', 'name slug')
        .populate('categoryId', 'name slug')
        .select('name categories categoryId')
        .lean()
      : [];

    const productMap = new Map(productDocs.map((product) => [String(product._id), product]));
    const categoryMap = new Map();

    salesRows.forEach((row) => {
      const product = productMap.get(String(row._id));
      const categories = [
        ...(Array.isArray(product?.categories) ? product.categories : []),
        product?.categoryId,
      ].filter(Boolean);

      const targets = categories.length ? categories : [{ _id: 'uncategorized', name: 'Uncategorized', slug: 'uncategorized' }];
      targets.forEach((category) => {
        const key = String(category._id || category.slug || category.name);
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            categoryId: key,
            name: category.name || 'Uncategorized',
            slug: category.slug || key,
            revenue: 0,
            purchases: 0,
          });
        }
        const stats = categoryMap.get(key);
        stats.revenue += numberValue(row.revenue);
        stats.purchases += numberValue(row.purchases);
      });
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  async getProductAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 20, 1), 100);
    const eventRows = await AnalyticsEvent.aggregate([
      { $match: this.eventMatch(range, tenantId, ['product_view', 'add_to_cart', 'remove_from_cart']) },
      {
        $group: {
          _id: '$product_id',
          views: { $sum: { $cond: [{ $eq: ['$event_name', 'product_view'] }, 1, 0] } },
          addToCart: { $sum: { $cond: [{ $eq: ['$event_name', 'add_to_cart'] }, 1, 0] } },
          removedFromCart: { $sum: { $cond: [{ $eq: ['$event_name', 'remove_from_cart'] }, 1, 0] } },
        },
      },
    ]);

    const purchaseRows = await Order.aggregate([
      { $match: this.orderMatch(range, tenantId, PAID_STATUSES) },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          purchases: { $sum: { $ifNull: ['$items.quantity', 1] } },
          revenue: { $sum: getOrderItemRevenueExpression() },
        },
      },
    ]);

    const stats = new Map();
    const ensure = (id) => {
      const key = String(id || '');
      if (!key) return null;
      if (!stats.has(key)) {
        stats.set(key, { productId: key, name: 'Unknown product', views: 0, addToCart: 0, removedFromCart: 0, purchases: 0, revenue: 0 });
      }
      return stats.get(key);
    };

    eventRows.forEach((row) => {
      const item = ensure(row._id);
      if (!item) return;
      item.views += numberValue(row.views);
      item.addToCart += numberValue(row.addToCart);
      item.removedFromCart += numberValue(row.removedFromCart);
    });

    purchaseRows.forEach((row) => {
      const item = ensure(row._id);
      if (!item) return;
      item.purchases += numberValue(row.purchases);
      item.revenue += numberValue(row.revenue);
    });

    await this.decorateProducts(stats, tenantId);

    const products = Array.from(stats.values())
      .map((item) => ({ ...item, conversionRate: percent(item.purchases, item.views) }))
      .sort((a, b) => (b.views + b.revenue) - (a.views + a.revenue))
      .slice(0, limit);

    return { range: this.serializeRange(range), products };
  }

  async decorateProducts(stats, tenantId) {
    const ids = Array.from(stats.keys());
    if (!ids.length) return;

    const objectIds = toObjectIdList(ids);
    const numericIds = ids.map((id) => Number(id)).filter(Number.isFinite);
    const queryParts = [];
    if (objectIds.length) queryParts.push({ _id: { $in: objectIds } });
    if (numericIds.length) queryParts.push({ productId: { $in: numericIds } });
    queryParts.push({ slug: { $in: ids } });

    const products = await Product.find({
      ...buildTenantScopedQuery(tenantId, {}),
      $or: queryParts,
    }).select('name slug sku productId').lean();

    products.forEach((product) => {
      const keys = [String(product._id), String(product.productId || ''), product.slug].filter(Boolean);
      keys.forEach((key) => {
        const item = stats.get(key);
        if (!item) return;
        item.productId = String(product._id);
        item.name = product.name || item.name;
        item.slug = product.slug || null;
        item.sku = product.sku || '';
      });
    });
  }

  async getCartAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const summary = await this.getCartSummary(range, tenantId);
    const daily = await AnalyticsEvent.aggregate([
      { $match: this.eventMatch(range, tenantId, ['add_to_cart', 'checkout_started', 'payment_initiated', 'payment_success', 'payment_failed']) },
      {
        $group: {
          _id: this.dateGroup(range.timezone),
          addToCart: { $sum: { $cond: [{ $eq: ['$event_name', 'add_to_cart'] }, 1, 0] } },
          checkoutStarted: { $sum: { $cond: [{ $eq: ['$event_name', 'checkout_started'] }, 1, 0] } },
          paymentInitiated: { $sum: { $cond: [{ $eq: ['$event_name', 'payment_initiated'] }, 1, 0] } },
          paymentSuccess: { $sum: { $cond: [{ $eq: ['$event_name', 'payment_success'] }, 1, 0] } },
          paymentFailed: { $sum: { $cond: [{ $eq: ['$event_name', 'payment_failed'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, date: '$_id', addToCart: 1, checkoutStarted: 1, paymentInitiated: 1, paymentSuccess: 1, paymentFailed: 1 } },
      { $sort: { date: 1 } },
    ]);

    return { range: this.serializeRange(range), summary, funnel: this.checkoutFunnel(summary), daily };
  }

  async getCartSummary(range, tenantId) {
    const rows = await AnalyticsEvent.aggregate([
      { $match: this.eventMatch(range, tenantId, ['product_view', 'add_to_cart', 'remove_from_cart', 'checkout_started', 'payment_initiated', 'payment_success', 'payment_failed']) },
      { $group: { _id: '$event_name', count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const productViews = counts.product_view || 0;
    const addToCart = counts.add_to_cart || 0;
    const checkoutStarted = counts.checkout_started || 0;
    const paymentSuccess = counts.payment_success || 0;

    return {
      productViews,
      addToCart,
      removedFromCart: counts.remove_from_cart || 0,
      checkoutStarted,
      paymentInitiated: counts.payment_initiated || 0,
      paymentSuccess,
      paymentFailed: counts.payment_failed || 0,
      cartAbandonmentRate: percent(Math.max(addToCart - checkoutStarted, 0), addToCart),
      checkoutAbandonmentRate: percent(Math.max(checkoutStarted - paymentSuccess, 0), checkoutStarted),
    };
  }

  checkoutFunnel(summary) {
    return [
      { step: 'Product View', count: summary.productViews || 0 },
      { step: 'Add to Cart', count: summary.addToCart || 0 },
      { step: 'Checkout Started', count: summary.checkoutStarted || 0 },
      { step: 'Payment Initiated', count: summary.paymentInitiated || 0 },
      { step: 'Payment Success', count: summary.paymentSuccess || 0 },
    ];
  }

  async getCategoryAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const [visitedRows, revenueRows] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: this.eventMatch(range, tenantId, ['category_view']) },
        { $group: { _id: '$category_id', visits: { $sum: 1 }, visitors: { $addToSet: '$visitor_id' } } },
        { $project: { _id: 0, categoryId: '$_id', visits: 1, visitors: { $size: '$visitors' } } },
        { $sort: { visits: -1 } },
        { $limit: 20 },
      ]),
      this.getRevenueByCategory(range, tenantId),
    ]);

    const stats = new Map();
    const ensure = (id, fallback = {}) => {
      const key = String(id || fallback.slug || fallback.name || 'uncategorized');
      if (!stats.has(key)) {
        stats.set(key, { categoryId: key, name: fallback.name || key, slug: fallback.slug || key, visits: 0, visitors: 0, purchases: 0, revenue: 0 });
      }
      return stats.get(key);
    };

    visitedRows.forEach((row) => Object.assign(ensure(row.categoryId), { visits: row.visits, visitors: row.visitors }));
    revenueRows.forEach((row) => {
      const item = ensure(row.categoryId, row);
      item.name = row.name || item.name;
      item.slug = row.slug || item.slug;
      item.purchases += numberValue(row.purchases);
      item.revenue += numberValue(row.revenue);
    });

    await this.decorateCategories(stats, tenantId);

    const categories = Array.from(stats.values())
      .map((item) => ({ ...item, conversionRate: percent(item.purchases, item.visits) }))
      .sort((a, b) => (b.revenue + b.visits) - (a.revenue + a.visits));

    return {
      range: this.serializeRange(range),
      mostVisited: categories.slice().sort((a, b) => b.visits - a.visits).slice(0, 10),
      bestSelling: categories.slice().sort((a, b) => b.purchases - a.purchases).slice(0, 10),
      revenueByCategory: categories.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      categories,
    };
  }

  async decorateCategories(stats, tenantId) {
    const ids = Array.from(stats.keys());
    const objectIds = toObjectIdList(ids);
    const queryParts = [{ slug: { $in: ids } }];
    if (objectIds.length) queryParts.push({ _id: { $in: objectIds } });
    const categories = await Category.find({
      ...buildTenantScopedQuery(tenantId, {}),
      $or: queryParts,
    }).select('name slug').lean();

    categories.forEach((category) => {
      [String(category._id), category.slug].filter(Boolean).forEach((key) => {
        const item = stats.get(key);
        if (!item) return;
        item.categoryId = String(category._id);
        item.name = category.name;
        item.slug = category.slug;
      });
    });
  }

  async getCustomerAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const tenantFilter = buildTenantScope(tenantId);

    const [customerRows, registeredUsers, newCustomers, topCustomers] = await Promise.all([
      Order.aggregate([
        { $match: { ...tenantFilter, status: { $in: PAID_STATUSES }, created_at: { $gte: range.from, $lte: range.to } } },
        {
          $addFields: {
            customerKey: {
              $ifNull: [
                { $toString: '$userId' },
                { $ifNull: ['$userEmail', { $ifNull: ['$billing_address.email', '$shippingAddress.email'] }] },
              ],
            },
          },
        },
        { $match: { customerKey: { $nin: [null, ''] } } },
        { $group: { _id: '$customerKey', orderCount: { $sum: 1 }, revenue: { $sum: getOrderRevenueExpression() }, userId: { $first: '$userId' }, email: { $first: '$userEmail' }, name: { $first: '$userName' } } },
      ]),
      User.countDocuments({ ...buildTenantScopedQuery(tenantId, {}), role: { $in: ['user', 'customer'] }, is_active: { $ne: false } }),
      User.countDocuments({ ...buildTenantScopedQuery(tenantId, {}), created_at: { $gte: range.from, $lte: range.to }, role: { $in: ['user', 'customer'] } }),
      this.getTopCustomers(params),
    ]);

    const totalCustomers = customerRows.length;
    const returningCustomers = customerRows.filter((row) => row.orderCount > 1).length;
    const guestUsers = customerRows.filter((row) => !row.userId).length;

    return {
      range: this.serializeRange(range),
      summary: {
        newCustomers,
        returningCustomers,
        registeredUsers,
        guestUsers,
        repeatPurchaseRate: percent(returningCustomers, totalCustomers),
      },
      topCustomers: topCustomers.customers || [],
      customers: customerRows,
    };
  }

  async getTopCustomers(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 100);
    const tenantFilter = buildTenantScope(tenantId);

    const customers = await Order.aggregate([
      { $match: { ...tenantFilter, status: { $in: PAID_STATUSES }, created_at: { $gte: range.from, $lte: range.to } } },
      {
        $addFields: {
          customerEmail: { $ifNull: ['$userEmail', { $ifNull: ['$billing_address.email', '$shippingAddress.email'] }] },
          customerName: {
            $ifNull: [
              '$userName',
              {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ['$billing_address.first_name', ''] },
                      ' ',
                      { $ifNull: ['$billing_address.last_name', ''] },
                    ],
                  },
                },
              },
            ],
          },
          customerKey: { $ifNull: [{ $toString: '$userId' }, { $ifNull: ['$userEmail', '$billing_address.email'] }] },
        },
      },
      { $match: { customerKey: { $nin: [null, ''] } } },
      { $group: { _id: '$customerKey', userId: { $first: '$userId' }, name: { $first: '$customerName' }, email: { $first: '$customerEmail' }, orderCount: { $sum: 1 }, totalSpent: { $sum: getOrderRevenueExpression() }, lastOrder: { $max: '$created_at' } } },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
      { $project: { _id: 0, id: '$_id', userId: 1, name: 1, email: 1, orderCount: 1, totalSpent: 1, lastOrder: 1 } },
    ]);

    return { range: this.serializeRange(range), customers };
  }

  async getSearchAnalytics(params = {}) {
    const tenantId = normalizeTenantId(params.tenant_id || 1);
    const range = normalizeRange(params);
    const rows = await AnalyticsEvent.aggregate([
      { $match: this.eventMatch(range, tenantId, ['product_search']) },
      {
        $group: {
          _id: '$search_query',
          searches: { $sum: 1 },
          noResultSearches: {
            $sum: {
              $cond: [
                { $lte: [{ $ifNull: ['$metadata.result_count', '$metadata.resultCount'] }, 0] },
                1,
                0,
              ],
            },
          },
          productClicks: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$metadata.product_clicks', '$metadata.productClicks'] }, 0] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$metadata.purchases', 0] }, 0] }, 1, 0] } },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      {
        $project: {
          _id: 0,
          keyword: '$_id',
          searches: 1,
          noResultSearches: 1,
          searchToProductClickRate: { $cond: [{ $gt: ['$searches', 0] }, { $multiply: [{ $divide: ['$productClicks', '$searches'] }, 100] }, 0] },
          searchToPurchaseRate: { $cond: [{ $gt: ['$searches', 0] }, { $multiply: [{ $divide: ['$purchases', '$searches'] }, 100] }, 0] },
        },
      },
      { $sort: { searches: -1 } },
      { $limit: 25 },
    ]);

    return {
      range: this.serializeRange(range),
      summary: {
        totalSearches: rows.reduce((sum, row) => sum + row.searches, 0),
        noResultSearches: rows.reduce((sum, row) => sum + row.noResultSearches, 0),
      },
      keywords: rows.map((row) => ({
        ...row,
        searchToProductClickRate: Number(row.searchToProductClickRate || 0).toFixed(2),
        searchToPurchaseRate: Number(row.searchToPurchaseRate || 0).toFixed(2),
      })),
    };
  }

  async getRevenueAnalytics(params = {}) {
    const sales = await this.getSalesAnalytics(params);
    return {
      range: sales.range,
      metrics: {
        totalOrders: sales.summary.totalOrders,
        grossRevenue: sales.summary.totalRevenue,
        refunds: 0,
        netRevenue: sales.summary.totalRevenue,
        avgOrderValue: sales.summary.averageOrderValue,
        onlineRevenue: sales.summary.onlineRevenue,
        offlineRevenue: sales.summary.offlineRevenue,
        onlineOrders: sales.summary.onlineOrders,
        offlineOrders: sales.summary.offlineOrders,
      },
      byPaymentMethod: sales.revenueByPaymentMethod,
      dailyTrend: sales.revenueByDate,
    };
  }
}

module.exports = new EcommerceAnalyticsService();
