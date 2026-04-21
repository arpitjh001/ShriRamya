const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  reason: String,
  transactionId: String,
  paymentMethod: String,
  refundItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    amount: Number
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Refund = mongoose.model('Refund', refundSchema);

module.exports = Refund;
