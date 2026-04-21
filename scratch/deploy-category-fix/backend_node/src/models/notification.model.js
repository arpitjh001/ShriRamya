const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'order', 'promotion'], 
    default: 'info' 
  },
  status: { 
    type: String, 
    enum: ['unread', 'read', 'archived'], 
    default: 'unread' 
  },
  actionUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
  tenantId: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
