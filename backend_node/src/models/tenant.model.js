const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, unique: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    settings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

tenantSchema.index({ domain: 1 });

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
module.exports = Tenant;
