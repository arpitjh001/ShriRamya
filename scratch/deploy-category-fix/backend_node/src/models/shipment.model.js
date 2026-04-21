const mongoose = require('mongoose');

const shipmentHistorySchema = new mongoose.Schema(
  {
    status: { type: String, trim: true },
    statusCode: { type: String, trim: true },
    rawStatus: { type: String, trim: true },
    source: { type: String, trim: true, default: 'system' },
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    providerEventAt: { type: Date, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, trim: true, default: 'manual', index: true },
    carrier: { type: String, trim: true, default: 'manual', index: true },
    trackingNumber: { type: String, trim: true, default: '', index: true },
    trackingUrl: { type: String, trim: true, default: '' },
    shippingMethod: { type: String, trim: true, default: '' },
    shippingWeight: { type: Number, default: null },
    shippingDimensions: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: [
        'pending',
        'booked',
        'shipped',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'exception',
        'failed',
      ],
      default: 'pending',
      index: true,
    },
    estimatedDelivery: { type: Date, default: null },
    actualDelivery: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    latestSyncAt: { type: Date, default: null },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: null },
    labelUrl: { type: String, trim: true, default: '' },
    manifestUrl: { type: String, trim: true, default: '' },
    externalOrderId: { type: String, trim: true, default: '' },
    externalShipmentId: { type: String, trim: true, default: '' },
    externalCourierId: { type: String, trim: true, default: '' },
    paymentType: { type: String, trim: true, default: '' },
    providerMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
    history: { type: [shipmentHistorySchema], default: [] },
    tenantId: { type: Number, default: 1, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

shipmentSchema.index({ orderId: 1, created_at: -1 });

const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
