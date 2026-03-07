const categoryRepository = require('../repositories/category.sql.repository');
const NodeCache = require('node-cache');
const crypto = require('crypto');

// Cache categories for 24 hours
const categoryCache = new NodeCache({ stdTTL: 86400, checkperiod: 120 });

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
        categoryCache.del(this.CACHE_KEY); // clear cache
        return { id, ...data };
    }

    async getCategoryById(id) {
        return categoryRepository.getCategoryById(id);
    }

    async getCategoryBySlug(slug) {
        return categoryRepository.getCategoryBySlug(slug);
    }

    async getAllCategories() {
        let cached = categoryCache.get(this.CACHE_KEY);
        if (cached) {
            return cached;
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

        categoryCache.set(this.CACHE_KEY, rootCategories);
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
        categoryCache.del(this.CACHE_KEY);
        return updated;
    }

    async deleteCategory(id) {
        const deleted = await categoryRepository.deleteCategory(id);
        categoryCache.del(this.CACHE_KEY);
        return deleted;
    }

    async getProductsByCategoryId(categoryId, limit = 100) {
        return categoryRepository.getProductsByCategoryId(categoryId, limit);
    }

    async getProductsByCategorySlug(slug, limit = 100) {
        return categoryRepository.getProductsByCategorySlug(slug, limit);
    }
}

module.exports = new CategoryService();
