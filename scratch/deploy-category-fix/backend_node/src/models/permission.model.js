const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    resource: { type: String, required: true, trim: true }, // e.g., 'products', 'orders'
    action: { type: String, required: true, trim: true }   // e.g., 'create', 'read', 'update', 'delete'
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

permissionSchema.index({ resource: 1 });

const Permission = mongoose.model('Permission', permissionSchema);
module.exports = Permission;
