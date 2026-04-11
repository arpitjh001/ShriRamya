const mongoose = require('mongoose');

const insiderSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    firstName: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed'],
      default: 'subscribed',
    },
    interests: [{ type: String, trim: true }],
    source: { type: String, trim: true, default: 'homepage' },
    tenant_id: { type: Number, default: 1 },
    welcomeEmailSentAt: { type: Date, default: null },
    lastDigestSentAt: { type: Date, default: null },
    unsubscribedAt: { type: Date, default: null },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

insiderSubscriberSchema.index({ email: 1, tenant_id: 1 }, { unique: true });
insiderSubscriberSchema.index({ status: 1, tenant_id: 1 });

const InsiderSubscriber =
  mongoose.models.InsiderSubscriber || mongoose.model('InsiderSubscriber', insiderSubscriberSchema);

module.exports = InsiderSubscriber;
