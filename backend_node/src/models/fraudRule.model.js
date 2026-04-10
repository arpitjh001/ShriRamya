const mongoose = require('mongoose');

const fraudRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['ip_blacklist', 'email_domain_blacklist', 'velocity_check', 'amount_threshold'], required: true },
  value: mongoose.Schema.Types.Mixed,
  action: { type: String, enum: ['block', 'flag', 'review'], default: 'flag' },
  isActive: { type: Boolean, default: true },
  tenantId: { type: String, default: 'default' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const FraudRule = mongoose.model('FraudRule', fraudRuleSchema);

module.exports = FraudRule;
