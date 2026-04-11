const mongoose = require('mongoose');

const insiderDigestLogSchema = new mongoose.Schema(
  {
    digestKey: { type: String, required: true, trim: true },
    tenant_id: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['sent', 'skipped', 'failed'],
      default: 'skipped',
    },
    subject: { type: String, trim: true, default: '' },
    recipientCount: { type: Number, default: 0 },
    newCollectionCount: { type: Number, default: 0 },
    newProductCount: { type: Number, default: 0 },
    collectionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    notes: { type: String, trim: true, default: '' },
    error: { type: String, trim: true, default: '' },
    sentAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

insiderDigestLogSchema.index({ digestKey: 1, tenant_id: 1 }, { unique: true });

const InsiderDigestLog =
  mongoose.models.InsiderDigestLog || mongoose.model('InsiderDigestLog', insiderDigestLogSchema);

module.exports = InsiderDigestLog;
