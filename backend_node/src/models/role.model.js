const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    tenantId: { type: String, default: 'shriramya' },
    isSystemRole: { type: Boolean, default: false },
    permissions: [{ type: String }] // Array of permission names
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

roleSchema.index({ name: 1, tenantId: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
