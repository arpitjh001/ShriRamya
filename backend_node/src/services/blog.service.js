const { Blog } = require('../models');
const redis = require('../config/integrations/redis');
const mongoose = require('mongoose');

const CACHE_TTL = 600; // 10 minutes

class BlogService {
    toStringId(value) {
        return value == null ? null : String(value);
    }

    calculateReadingTime(content = '') {
        const plainText = String(content).replace(/<[^>]*>/g, ' ');
        const words = plainText.trim().split(/\s+/).filter(Boolean).length;
        return Math.max(Math.ceil(words / 200), 1);
    }

    normalizePostPayload(data = {}) {
        const featuredImage = data.featuredImage || data.featured_image || data.image || '';
        const seoTitle = data.seoTitle || data.seo_title || data.meta_title || '';
        const seoDescription = data.seoDescription || data.seo_description || data.meta_description || '';
        const authorName = data.authorName || data.author_name || data.author?.name || 'Shri Ramya Team';

        return {
            ...data,
            slug: String(data.slug || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
            featuredImage,
            images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
            seoTitle,
            seoDescription,
            tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
            categories: Array.isArray(data.categories) ? data.categories.filter(Boolean) : [],
            author: data.author || {
                id: this.toStringId(data.authorId),
                name: authorName
            }
        };
    }

    formatPost(post) {
        if (!post) return post;
        const source = post.toObject ? post.toObject() : { ...post };
        const id = this.toStringId(source._id || source.id);
        const featuredImage = source.featuredImage || source.featured_image || source.image || '';
        const createdAt = source.createdAt || source.created_at || null;
        const updatedAt = source.updatedAt || source.updated_at || null;
        const publishedAt = source.publishedAt || source.published_at || null;
        const readingTime = source.readingTime || source.reading_time || this.calculateReadingTime(source.content);

        return {
            ...source,
            id,
            _id: id,
            image: featuredImage,
            featuredImage,
            featured_image: featuredImage,
            images: Array.isArray(source.images) ? source.images : [],
            seoTitle: source.seoTitle || '',
            seo_title: source.seoTitle || '',
            seoDescription: source.seoDescription || '',
            seo_description: source.seoDescription || '',
            author_name: source.author?.name || source.author_name || 'Shri Ramya Team',
            view_count: source.views || 0,
            readingTime,
            reading_time: readingTime,
            createdAt,
            created_at: createdAt,
            updatedAt,
            updated_at: updatedAt,
            publishedAt,
            published_at: publishedAt,
        };
    }

    /**
     * Get all blog posts
     */
    async getAllPosts(params = {}, tenantId = 1) {
        const { page = 1, perPage, per_page, status = 'published', category, tag, search } = params;
        const limit = parseInt(perPage || per_page || 10);
        const skip = (parseInt(page) - 1) * limit;

        const query = { tenantId: Number(tenantId) };
        if (status && status !== 'all') {
            query.status = String(status);
        }

        if (category) query.categories = String(category);
        if (tag) query.tags = String(tag);
        if (search) {
            const searchStr = String(search);
            query.$or = [
                { title: { $regex: searchStr, $options: 'i' } },
                { content: { $regex: searchStr, $options: 'i' } }
            ];
        }

        const posts = await Blog.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Blog.countDocuments(query);

        return {
            posts: posts.map((post) => this.formatPost(post)),
            pagination: {
                total,
                current_page: parseInt(page) || 1,
                total_pages: Math.ceil(total / limit) || 1,
                per_page: limit
            }
        };
    }

    async getPostById(id, tenantId) {
        const query = { _id: id };
        if (tenantId) query.tenantId = tenantId;
        const post = await Blog.findOne(query).lean();
        return this.formatPost(post);
    }

    async getPostBySlug(slug, tenantId = 1) {
        const query = { slug };
        if (tenantId) query.tenantId = tenantId;
        const post = await Blog.findOne(query).lean();
        return this.formatPost(post);
    }

    async getRelatedPosts(postId, limit = 3, tenantId = 1) {
        const post = await Blog.findById(postId);
        if (!post) return [];

        const query = {
            _id: { $ne: postId },
            categories: { $in: post.categories },
            status: 'published'
        };
        if (tenantId) query.tenantId = tenantId;

        const posts = await Blog.find(query).limit(limit).sort({ publishedAt: -1 }).lean();
        return posts.map((relatedPost) => this.formatPost(relatedPost));
    }

    async getAllTags() {
        const tags = await Blog.distinct('tags');
        return tags;
    }

    async getAllCategories() {
        const categories = await Blog.aggregate([
            { $unwind: '$categories' },
            {
                $group: {
                    _id: '$categories',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return categories.map((entry) => ({
            id: entry._id,
            name: entry._id,
            count: entry.count
        }));
    }

    async createPost(data, tenantId = 1) {
        const normalizedData = this.normalizePostPayload(data);
        const post = new Blog({
            ...normalizedData,
            tenantId: tenantId,
            publishedAt: normalizedData.status === 'published' ? new Date() : null
        });
        await post.save();
        return this.formatPost(post);
    }

    async updatePost(id, data, tenantId = 1) {
        const updateData = { ...data };

        if (data.slug != null) {
            updateData.slug = String(data.slug)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        if (data.featuredImage || data.featured_image || data.image) {
            updateData.featuredImage = data.featuredImage || data.featured_image || data.image;
        }
        if (data.seoTitle || data.seo_title || data.meta_title) {
            updateData.seoTitle = data.seoTitle || data.seo_title || data.meta_title;
        }
        if (data.seoDescription || data.seo_description || data.meta_description) {
            updateData.seoDescription = data.seoDescription || data.seo_description || data.meta_description;
        }
        if (Array.isArray(data.images)) {
            updateData.images = data.images.filter(Boolean);
        }
        if (Array.isArray(data.tags)) {
            updateData.tags = data.tags.filter(Boolean);
        }
        if (Array.isArray(data.categories)) {
            updateData.categories = data.categories.filter(Boolean);
        }

        delete updateData.featured_image;
        delete updateData.image;
        delete updateData.seo_title;
        delete updateData.meta_title;
        delete updateData.seo_description;
        delete updateData.meta_description;

        if (updateData.status === 'published') {
            const existing = await Blog.findById(id).select('publishedAt').lean();
            if (!existing?.publishedAt) {
                updateData.publishedAt = new Date();
            }
        }

        const post = await Blog.findOneAndUpdate(
            { _id: id, tenantId },
            { $set: updateData },
            { new: true }
        );
        return this.formatPost(post);
    }

    async deletePost(id, tenantId) {
        await Blog.findOneAndDelete({ _id: id, tenantId });
        return { id, deleted: true };
    }

    async incrementViewCount(id) {
        await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    async getAnalytics(tenantId = 1) {
        const query = { tenantId };
        const [totalPosts, publishedPosts, draftPosts, archivedPosts, totalViewsResult] = await Promise.all([
            Blog.countDocuments(query),
            Blog.countDocuments({ ...query, status: 'published' }),
            Blog.countDocuments({ ...query, status: 'draft' }),
            Blog.countDocuments({ ...query, status: 'archived' }),
            Blog.aggregate([
                { $match: query },
                { $group: { _id: null, totalViews: { $sum: '$views' } } }
            ])
        ]);

        return {
            total_posts: totalPosts,
            published_posts: publishedPosts,
            draft_posts: draftPosts,
            archived_posts: archivedPosts,
            total_views: totalViewsResult[0]?.totalViews || 0
        };
    }
}

module.exports = new BlogService();
