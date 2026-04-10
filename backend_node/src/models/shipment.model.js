const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  trackingNumber: String,
  carrier: String,
  status: { 
    type: String, 
    enum: ['pending', 'shipped', 'out_for_delivery', 'delivered', 'failed'],
    default: 'pending'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  shippingAddress: mongoose.Schema.Types.Mixed,
  history: [{
    status: String,
    location: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  tenantId: { type: String, default: 'default' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Shipment = mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
