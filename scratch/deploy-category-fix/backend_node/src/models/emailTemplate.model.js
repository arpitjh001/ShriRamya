const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  bodyHtml: { type: String, required: true },
  bodyText: String,
  variables: [String],
  isActive: { type: Boolean, default: true },
  tenantId: { type: String, default: 'default' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

module.exports = EmailTemplate;
