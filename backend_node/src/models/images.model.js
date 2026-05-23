const mongoose = require('mongoose');

/**
 * Image Model
 * Stores optimized image data and metadata directly in MongoDB
 * Use for serverless environments where filesystem storage is not persistent
 */

const imageSchema = new mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    category: {
      type: String,
      default: 'products',
      enum: ['products', 'categories', 'banners', 'blogs', 'avatars', 'journal', 'original_only', 'other']
    },
    originalName: String,
    
    // Image data stored as base64 strings
    images: {
      thumbnail: String,      // base64 encoded thumbnail (300x300)
      medium: String,          // base64 encoded medium (800x800)
      large: String,           // base64 encoded large (1600x1600)
      original: String         // base64 encoded original
    },
    
    // Image URLs for serving
    urls: {
      thumbnail: String,
      medium: String,
      large: String,
      original: String
    },
    
    // Metadata
    metadata: {
      format: {
        type: String,
        enum: ['webp', 'jpeg', 'png', 'gif'],
        default: 'webp'
      },
      sizes: [String],
      width: Number,
      height: Number,
      fileSize: Number
    },
    
    // Tracking
    tenantId: {
      type: Number,
      default: 1
    },
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'images'
  }
);

// TTL index: automatically delete after 90 days if not referenced
imageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Image', imageSchema);
