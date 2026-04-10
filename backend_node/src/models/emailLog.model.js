const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  templateName: String,
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
  tenantId: { type: String, default: 'default' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
