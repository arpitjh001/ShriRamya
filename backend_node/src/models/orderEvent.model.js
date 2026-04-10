const mongoose = require('mongoose');

const orderEventSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  eventType: { type: String, required: true },
  message: String,
  payload: mongoose.Schema.Types.Mixed,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userType: { type: String, enum: ['customer', 'admin', 'system'], default: 'system' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const OrderEvent = mongoose.model('OrderEvent', orderEventSchema);

module.exports = OrderEvent;
