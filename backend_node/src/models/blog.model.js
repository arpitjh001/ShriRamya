const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true, index: true },
  content: String,
  excerpt: String,
  author: { id: String, name: String },
  categories: [String],
  tags: [String],
  status: { type: String, default: 'draft', enum: ['draft', 'review', 'published', 'archived'] },
  featuredImage: String,
  images: [String],
  seoTitle: String,
  seoDescription: String,
  views: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  publishedAt: Date,
}, { timestamps: true });

const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
module.exports = Blog;
