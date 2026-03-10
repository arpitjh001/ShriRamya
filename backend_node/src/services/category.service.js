const categoryRepository = require('../repositories/category.sql.repository');
const redis = require('../config/integrations/redis');
const crypto = require('crypto');

// Cache categories for 24 hours using Redis
const CACHE_TTL = 86400; // 24 hours in seconds

class CategoryService {
    constructor() {
        this.CACHE_KEY = 'all_categories';
    }

    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async createCategory(data) {
        if (!data.slug && data.name) {
            data.slug = this.generateSlug(data.name);
        }

        // check if slug exists
        let existing = await categoryRepository.getCategoryBySlug(data.slug);
        if (existing) {
            data.slug = `${data.slug}-${crypto.randomBytes(2).toString('hex')}`;
        }

        const id = await categoryRepository.createCategory(data);
        await this.clearCache(); // clear cache
        return { id, ...data };
    }

    async getCategoryById(id) {
        return categoryRepository.getCategoryById(id);
    }

    async getCategoryBySlug(slug) {
        return categoryRepository.getCategoryBySlug(slug);
    }

    async getAllCategories() {
        // Try Redis cache first
        if (redis && redis.get) {
            try {
                const cached = await redis.get(this.CACHE_KEY);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }

        const categories = await categoryRepository.getAllCategories();
        // Build tree
        const map = new Map();
        categories.forEach((item) => {
            map.set(item.id, { ...item, children: [] });
        });
        const rootCategories = [];
        categories.forEach((item) => {
            const node = map.get(item.id);
            if (item.parent_id) {
                const parent = map.get(item.parent_id);
                if (parent) {
                    parent.children.push(node);
                } else {
                    rootCategories.push(node);
                }
            } else {
                rootCategories.push(node);
            }
        });

        // Cache in Redis
        if (redis && redis.set) {
            try {
                await redis.set(this.CACHE_KEY, JSON.stringify(rootCategories), { ex: CACHE_TTL });
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }

        return rootCategories;
    }

    async updateCategory(id, data) {
        if (data.name && !data.slug) {
            data.slug = this.generateSlug(data.name);
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && existing.id !== Number(id)) {
                data.slug = `${data.slug}-${crypto.randomBytes(2).toString('hex')}`;
            }
        } else if (data.slug) {
            let existing = await categoryRepository.getCategoryBySlug(data.slug);
            if (existing && existing.id !== Number(id)) {
                throw new Error('Slug already exists');
            }
        }

        const updated = await categoryRepository.updateCategory(id, data);
        await this.clearCache();
        return updated;
    }

    async deleteCategory(id) {
        const deleted = await categoryRepository.deleteCategory(id);
        await this.clearCache();
        return deleted;
    }

    async clearCache() {
        if (redis && redis.del) {
            try {
                await redis.del(this.CACHE_KEY);
            } catch (err) {
                console.error('Redis cache error:', err.message);
            }
        }
    }

    async getProductsByCategoryId(categoryId, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategoryId(categoryId, limit, status);
    }

    async getProductsByCategorySlug(slug, limit = 100, status = 'published') {
        return categoryRepository.getProductsByCategorySlug(slug, limit, status);
    }
}

module.exports = new CategoryService();
