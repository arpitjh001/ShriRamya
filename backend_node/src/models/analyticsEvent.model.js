const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema(
  {
    tenant_id: { type: Number, default: 1, index: true },
    event_name: { type: String, required: true, trim: true, index: true },
    user_id: { type: String, default: null, index: true },
    session_id: { type: String, required: true, trim: true, index: true },
    visitor_id: { type: String, required: true, trim: true, index: true },
    product_id: { type: String, default: null, trim: true, index: true },
    category_id: { type: String, default: null, trim: true, index: true },
    order_id: { type: String, default: null, trim: true, index: true },
    cart_id: { type: String, default: null, trim: true },
    search_query: { type: String, default: null, trim: true },
    path: { type: String, default: '/', trim: true },
    page_title: { type: String, default: '', trim: true },
    device_type: { type: String, enum: ['mobile', 'desktop', 'tablet', 'unknown'], default: 'unknown' },
    browser: { type: String, default: 'Unknown', trim: true },
    referrer: { type: String, default: '', trim: true },
    traffic_source: { type: String, enum: ['direct', 'search', 'social', 'referral'], default: 'direct' },
    utm_source: { type: String, default: null, trim: true },
    utm_medium: { type: String, default: null, trim: true },
    utm_campaign: { type: String, default: null, trim: true },
    ip_address_hash: { type: String, default: null, trim: true },
    country: { type: String, default: null, trim: true },
    country_code: { type: String, default: null, trim: true },
    region: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: 'inserted_at', updatedAt: 'updated_at' },
    collection: 'analytics_events',
  }
);

analyticsEventSchema.index({ tenant_id: 1, created_at: -1 });
analyticsEventSchema.index({ tenant_id: 1, event_name: 1, created_at: -1 });
analyticsEventSchema.index({ tenant_id: 1, product_id: 1, event_name: 1, created_at: -1 });
analyticsEventSchema.index({ tenant_id: 1, category_id: 1, event_name: 1, created_at: -1 });
analyticsEventSchema.index({ tenant_id: 1, session_id: 1, created_at: -1 });

module.exports = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema);
