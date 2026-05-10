const mongoose = require('mongoose');

const visitorRegionDailySchema = new mongoose.Schema(
  {
    tenantId: { type: Number, default: 1, index: true },
    date: { type: String, required: true, index: true },
    visitorHash: { type: String, required: true },
    countryCode: { type: String, default: 'XX', index: true },
    country: { type: String, default: 'Unknown' },
    regionCode: { type: String, default: 'Unknown', index: true },
    region: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown', index: true },
    pageviews: { type: Number, default: 0 },
    paths: { type: [String], default: [] },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    userAgentHash: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

visitorRegionDailySchema.index({ tenantId: 1, date: 1, visitorHash: 1 }, { unique: true });
visitorRegionDailySchema.index({ tenantId: 1, date: 1, countryCode: 1, regionCode: 1 });

module.exports = mongoose.models.VisitorRegionDaily || mongoose.model('VisitorRegionDaily', visitorRegionDailySchema);
