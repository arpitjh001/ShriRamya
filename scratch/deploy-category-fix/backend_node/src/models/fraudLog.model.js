const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: String,
  ruleMatched: String,
  actionTaken: String,
  score: Number,
  metadata: mongoose.Schema.Types.Mixed,
  tenantId: { type: String, default: 'default' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const FraudLog = mongoose.model('FraudLog', fraudLogSchema);

module.exports = FraudLog;
