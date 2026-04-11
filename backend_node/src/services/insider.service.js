const jwt = require('jsonwebtoken');

const config = require('../config/config');
const {
  InsiderSubscriber,
  InsiderDigestLog,
  Category,
  Product,
} = require('../models');
const {
  sendInsiderWelcomeEmail,
  sendInsiderWeeklyDigestEmail,
} = require('./emailService');

const INSIDER_INTERESTS = [
  'women-wear',
  'festive-wear',
  'jewellery',
  'home-lifestyle',
];

const publicBaseUrl = (config.publicBaseUrl || '').replace(/\/$/, '');

const normalizeTenantId = (value) => {
  const tenantId = Number(value);
  return Number.isInteger(tenantId) && tenantId > 0 ? tenantId : 1;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeFirstName = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
};

const normalizeInterests = (interests = []) => {
  const rawInterests = Array.isArray(interests)
    ? interests
    : String(interests || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  return [...new Set(rawInterests.map((entry) => String(entry).trim().toLowerCase()))]
    .filter((entry) => INSIDER_INTERESTS.includes(entry));
};

const isPublishedProduct = {
  $or: [
    { status: { $exists: false } },
    { status: 'published' },
    { status: 'publish' },
  ],
};

const toPublicUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (!publicBaseUrl) return url;
  return `${publicBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const startOfWeekUtc = (date = new Date()) => {
  const current = new Date(date);
  const day = current.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + diff);
  current.setUTCHours(0, 0, 0, 0);
  return current;
};

const getDigestKey = (date = new Date()) => startOfWeekUtc(date).toISOString().slice(0, 10);

const formatDigestSubject = ({ collections, products }) => {
  if (collections.length > 0) {
    return `Insider Circle: ${collections.length} new collection${collections.length > 1 ? 's' : ''} this week`;
  }
  return `Insider Circle: ${products.length} fresh arrival${products.length > 1 ? 's' : ''} this week`;
};

const sanitizeSubscriber = (subscriber) => ({
  id: subscriber._id?.toString?.() || null,
  email: subscriber.email,
  firstName: subscriber.firstName || '',
  interests: Array.isArray(subscriber.interests) ? subscriber.interests : [],
  status: subscriber.status,
  source: subscriber.source || 'homepage',
  createdAt: subscriber.created_at || subscriber.createdAt || null,
  lastDigestSentAt: subscriber.lastDigestSentAt || null,
});

class InsiderService {
  createUnsubscribeToken(subscriber) {
    return jwt.sign(
      {
        email: subscriber.email,
        tenant_id: normalizeTenantId(subscriber.tenant_id),
        purpose: 'insider-unsubscribe',
      },
      config.jwt.secret,
      { expiresIn: '180d' }
    );
  }

  buildUnsubscribeUrl(subscriber) {
    if (!publicBaseUrl) return '';
    const token = this.createUnsubscribeToken(subscriber);
    return `${publicBaseUrl}/api/v1/insiders/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  async subscribe(payload = {}, options = {}) {
    const email = normalizeEmail(payload.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error('Please enter a valid email address');
      error.statusCode = 400;
      throw error;
    }

    const tenantId = normalizeTenantId(options.tenantId || payload.tenantId || 1);
    const firstName = normalizeFirstName(payload.firstName || payload.name);
    const interests = normalizeInterests(payload.interests);

    let subscriber = await InsiderSubscriber.findOne({ email, tenant_id: tenantId });
    const isNewSubscriber = !subscriber;

    if (!subscriber) {
      subscriber = new InsiderSubscriber({
        email,
        firstName,
        interests,
        source: payload.source || 'homepage',
        tenant_id: tenantId,
        metadata: {
          signupPage: payload.signupPage || 'homepage',
        },
      });
    } else {
      subscriber.firstName = firstName || subscriber.firstName || '';
      subscriber.interests = interests.length > 0 ? interests : subscriber.interests || [];
      subscriber.status = 'subscribed';
      subscriber.unsubscribedAt = null;
      subscriber.source = payload.source || subscriber.source || 'homepage';
      subscriber.metadata = {
        ...(subscriber.metadata instanceof Map
          ? Object.fromEntries(subscriber.metadata.entries())
          : subscriber.metadata || {}),
        signupPage: payload.signupPage || 'homepage',
        resubscribedAt: new Date().toISOString(),
      };
    }

    await subscriber.save();

    const shouldSendWelcome = !subscriber.welcomeEmailSentAt;
    if (shouldSendWelcome) {
      sendInsiderWelcomeEmail({
        subscriber: sanitizeSubscriber(subscriber),
        unsubscribeUrl: this.buildUnsubscribeUrl(subscriber),
      })
        .then(async () => {
          subscriber.welcomeEmailSentAt = new Date();
          await subscriber.save();
        })
        .catch((error) => {
          console.error('[InsiderService] Welcome email failed:', error.message);
        });
    }

    return {
      subscriber: sanitizeSubscriber(subscriber),
      isNewSubscriber,
      welcomeEmailQueued: shouldSendWelcome,
    };
  }

  async unsubscribe(token) {
    if (!token) {
      const error = new Error('Missing unsubscribe token');
      error.statusCode = 400;
      throw error;
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      const invalidTokenError = new Error('This unsubscribe link is invalid or expired');
      invalidTokenError.statusCode = 400;
      throw invalidTokenError;
    }

    if (payload.purpose !== 'insider-unsubscribe') {
      const error = new Error('Invalid unsubscribe token');
      error.statusCode = 400;
      throw error;
    }

    const tenantId = normalizeTenantId(payload.tenant_id);
    const subscriber = await InsiderSubscriber.findOne({
      email: normalizeEmail(payload.email),
      tenant_id: tenantId,
    });

    if (!subscriber) {
      const error = new Error('Subscriber not found');
      error.statusCode = 404;
      throw error;
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    return sanitizeSubscriber(subscriber);
  }

  async getWeeklyDigestContent(tenantId = 1) {
    const lookbackStart = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

    const [collections, products] = await Promise.all([
      Category.find({
        tenant_id: tenantId,
        is_deleted: { $ne: true },
        created_at: { $gte: lookbackStart },
      })
        .sort({ created_at: -1 })
        .limit(4)
        .lean(),
      Product.find({
        tenant_id: tenantId,
        is_deleted: { $ne: true },
        created_at: { $gte: lookbackStart },
        ...isPublishedProduct,
      })
        .sort({ created_at: -1 })
        .limit(6)
        .populate('categories', 'name slug')
        .lean(),
    ]);

    return {
      since: lookbackStart,
      collections: collections.map((collection) => ({
        id: collection._id?.toString?.() || null,
        name: collection.name || 'Collection',
        slug: collection.slug || '',
        description: collection.description || 'A newly curated collection from Shri Ramya.',
        image: toPublicUrl(collection.image),
        link: `${publicBaseUrl}/category/${encodeURIComponent(collection.slug || '')}`,
      })),
      products: products.map((product) => ({
        id: product._id?.toString?.() || null,
        name: product.name || 'New arrival',
        image: toPublicUrl(product.thumbnail || product.images?.[0] || ''),
        price: Number(product.basePrice || 0) || 0,
        categories: Array.isArray(product.categories) ? product.categories : [],
        link: `${publicBaseUrl}/products/${encodeURIComponent(product.slug || product._id?.toString?.() || '')}`,
      })),
    };
  }

  async recordDigestLog(data) {
    return InsiderDigestLog.findOneAndUpdate(
      { digestKey: data.digestKey, tenant_id: data.tenant_id },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async sendWeeklyDigest(options = {}) {
    const tenantId = normalizeTenantId(options.tenantId || 1);
    const digestKey = getDigestKey(options.now ? new Date(options.now) : new Date());

    if (!options.force) {
      const existingDigest = await InsiderDigestLog.findOne({
        digestKey,
        tenant_id: tenantId,
        status: 'sent',
      }).lean();

      if (existingDigest) {
        return {
          digestKey,
          status: 'sent',
          alreadySent: true,
          recipientCount: existingDigest.recipientCount || 0,
        };
      }
    }

    const [subscribers, digestContent] = await Promise.all([
      InsiderSubscriber.find({ tenant_id: tenantId, status: 'subscribed' }).lean(),
      this.getWeeklyDigestContent(tenantId),
    ]);

    if (subscribers.length === 0) {
      await this.recordDigestLog({
        digestKey,
        tenant_id: tenantId,
        status: 'skipped',
        notes: 'No active insider subscribers',
        recipientCount: 0,
        newCollectionCount: digestContent.collections.length,
        newProductCount: digestContent.products.length,
        collectionIds: digestContent.collections.map((entry) => entry.id).filter(Boolean),
        productIds: digestContent.products.map((entry) => entry.id).filter(Boolean),
      });

      return {
        digestKey,
        status: 'skipped',
        recipientCount: 0,
        reason: 'no_subscribers',
      };
    }

    if (digestContent.collections.length === 0 && digestContent.products.length === 0) {
      await this.recordDigestLog({
        digestKey,
        tenant_id: tenantId,
        status: 'skipped',
        notes: 'No new collections or products in the last 7 days',
        recipientCount: 0,
        newCollectionCount: 0,
        newProductCount: 0,
      });

      return {
        digestKey,
        status: 'skipped',
        recipientCount: 0,
        reason: 'no_updates',
      };
    }

    const subject = formatDigestSubject(digestContent);
    const results = await Promise.allSettled(
      subscribers.map((subscriber) =>
        sendInsiderWeeklyDigestEmail({
          subscriber: sanitizeSubscriber(subscriber),
          collections: digestContent.collections,
          products: digestContent.products,
          subject,
          unsubscribeUrl: this.buildUnsubscribeUrl(subscriber),
        })
      )
    );

    const successfulSubscribers = subscribers.filter((_, index) => results[index].status === 'fulfilled');
    const failedCount = subscribers.length - successfulSubscribers.length;

    if (successfulSubscribers.length > 0) {
      await InsiderSubscriber.updateMany(
        { _id: { $in: successfulSubscribers.map((subscriber) => subscriber._id) } },
        { $set: { lastDigestSentAt: new Date() } }
      );
    }

    await this.recordDigestLog({
      digestKey,
      tenant_id: tenantId,
      status: successfulSubscribers.length > 0 ? 'sent' : 'failed',
      subject,
      recipientCount: successfulSubscribers.length,
      newCollectionCount: digestContent.collections.length,
      newProductCount: digestContent.products.length,
      collectionIds: digestContent.collections.map((entry) => entry.id).filter(Boolean),
      productIds: digestContent.products.map((entry) => entry.id).filter(Boolean),
      notes: failedCount > 0 ? `${failedCount} subscriber email(s) failed` : 'Weekly digest sent successfully',
      sentAt: successfulSubscribers.length > 0 ? new Date() : null,
      error: successfulSubscribers.length === 0 ? 'All insider digest emails failed to send' : '',
    });

    return {
      digestKey,
      status: successfulSubscribers.length > 0 ? 'sent' : 'failed',
      recipientCount: successfulSubscribers.length,
      failedCount,
      newCollectionCount: digestContent.collections.length,
      newProductCount: digestContent.products.length,
      subject,
    };
  }

  async getSummary(tenantId = 1) {
    const normalizedTenantId = normalizeTenantId(tenantId);
    const [totalSubscribers, activeSubscribers, recentSubscribers, latestDigest] = await Promise.all([
      InsiderSubscriber.countDocuments({ tenant_id: normalizedTenantId }),
      InsiderSubscriber.countDocuments({ tenant_id: normalizedTenantId, status: 'subscribed' }),
      InsiderSubscriber.find({ tenant_id: normalizedTenantId })
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),
      InsiderDigestLog.findOne({ tenant_id: normalizedTenantId }).sort({ created_at: -1 }).lean(),
    ]);

    return {
      totalSubscribers,
      activeSubscribers,
      recentSubscribers: recentSubscribers.map((subscriber) => sanitizeSubscriber(subscriber)),
      latestDigest: latestDigest
        ? {
            digestKey: latestDigest.digestKey,
            status: latestDigest.status,
            recipientCount: latestDigest.recipientCount || 0,
            sentAt: latestDigest.sentAt || null,
          }
        : null,
    };
  }
}

module.exports = {
  insiderService: new InsiderService(),
  INSIDER_INTERESTS,
};
