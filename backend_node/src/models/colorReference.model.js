const mongoose = require('mongoose');

const colorReferenceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, trim: true, unique: true, index: true },
  hexCode: { type: String, required: true, trim: true },
  source: { 
    type: String, 
    required: true, 
    enum: [
      'local_map', 'database_cache', 'colorhexa', 'encycolorpedia', 
      'colorkit', 'the_color_api', 'color_pizza', 'web_lookup', 
      'admin_manual', 'fallback'
    ],
    default: 'fallback'
  },
  confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
  isManualOverride: { type: Boolean, default: false },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const ColorReference = mongoose.models.ColorReference || mongoose.model('ColorReference', colorReferenceSchema);
module.exports = ColorReference;
