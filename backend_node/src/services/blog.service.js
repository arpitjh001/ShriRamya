/**
 * Native Blog Service (Multi-Tenant)
 * For tenant-specific blog content
 */

const { mysqlPool } = require('../config/db');
const redis = require('../config/integrations/redis');

const CACHE_TTL = 600; // 10 minutes

class BlogService {
    /**
     * Get all blog posts for a tenant
     */
    async getAllPosts(params = {}, tenantId = 1) {
        const { page = 1, perPage = 10, status = 'published', category, tag, search } = params;
        const skip = (parseInt(page) - 1) * parseInt(perPage);
        const limit = parseInt(perPage);

        let query = `
            SELECT b.*, u.name as author_name, u.email as author_email,
            (SELECT GROUP_CONCAT(cat.name) FROM categories cat
             JOIN blog_category_mapping bcm ON cat.id = bcm.category_id
             WHERE bcm.blog_id = b.id) as categories,
            (SELECT GROUP_CONCAT(t.name) FROM blog_tags t
             JOIN blog_tag_mapping btm ON t.id = btm.tag_id
             WHERE btm.blog_id = b.id) as tags
            FROM blogs b
            LEFT JOIN mysql_users u ON b.author_id = u.id
            WHERE b.tenant_id = ?
        `;
        const queryParams = [tenantId];

        if (status) {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        if (category) {
            query += ` AND b.id IN (SELECT blog_id FROM blog_category_mapping WHERE category_id = ?)`;
            queryParams.push(category);
        }

        if (tag) {
            query += ` AND b.id IN (SELECT blog_id FROM blog_tag_mapping WHERE tag_id = ?)`;
            queryParams.push(tag);
        }

        if (search) {
            query += ` AND MATCH(b.title, b.content) AGAINST(? IN NATURAL LANGUAGE MODE)`;
            queryParams.push(search);
        }

        query += ` ORDER BY b.published_at DESC, b.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, skip);

        const [posts] = await mysqlPool.query(query, queryParams);

        const [totalRows] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM blogs WHERE tenant_id = ? AND status = ?`,
            [tenantId, status]
        );

        const result = {
            posts: posts.map(p => {
                let images = [];
                if (p.images) {
                    try {
                        images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                    } catch (e) {
                        images = [];
                    }
                }
                return {
                    ...p,
                    images,
                    categories: p.categories ? p.categories.split(',') : [],
                    tags: p.tags ? p.tags.split(',') : []
                };
            }),
            pagination: {
                total: totalRows[0].count,
                current_page: parseInt(page),
                total_pages: Math.ceil(totalRows[0].count / limit),
                per_page: limit
            }
        };

        return result;
    }

    /**
     * Get a single blog post by ID
     */
    async getPostById(id, tenantId = 1) {
        const cacheKey = `blog:${tenantId}:${id}`;

        // Try cache first
        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (err) {
                console.error('[BlogService] Redis cache error:', err.message);
            }
        }

        const [posts] = await mysqlPool.query(
            `SELECT b.*, u.name as author_name, u.email as author_email
             FROM blogs b
             LEFT JOIN mysql_users u ON b.author_id = u.id
             WHERE b.id = ? AND b.tenant_id = ?`,
            [id, tenantId]
        );

        if (posts.length === 0) {
            return null;
        }

        const post = { ...posts[0] };
        if (post.images) {
            try {
                post.images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
            } catch (e) {
                post.images = [];
            }
        } else {
            post.images = [];
        }

        // Cache result
        if (redis) {
            try {
                await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(post));
            } catch (err) {
                console.error('[BlogService] Redis cache error:', err.message);
            }
        }

        return post;
    }

    /**
     * Get a single blog post by slug
     */
    async getPostBySlug(slug, tenantId = 1) {
        const [posts] = await mysqlPool.query(
            `SELECT b.*, u.name as author_name, u.email as author_email,
            (SELECT GROUP_CONCAT(cat.name) FROM categories cat
             JOIN blog_category_mapping bcm ON cat.id = bcm.category_id
             WHERE bcm.blog_id = b.id) as categories,
            (SELECT GROUP_CONCAT(t.name) FROM blog_tags t
             JOIN blog_tag_mapping btm ON t.id = btm.tag_id
             WHERE btm.blog_id = b.id) as tags
            FROM blogs b
            LEFT JOIN mysql_users u ON b.author_id = u.id
            WHERE b.slug = ? AND b.tenant_id = ?`,
            [slug, tenantId]
        );

        if (posts.length === 0) return null;

        const post = posts[0];
        let images = [];
        if (post.images) {
            try {
                images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
            } catch (e) {
                images = [];
            }
        }
        return {
            ...post,
            images,
            categories: post.categories ? post.categories.split(',') : [],
            tags: post.tags ? post.tags.split(',') : []
        };
    }

    /**
     * Get related posts
     */
    async getRelatedPosts(postId, tenantId = 1, limit = 3) {
        const [posts] = await mysqlPool.query(
            `SELECT b.id, b.title, b.slug, b.featured_image, b.published_at
             FROM blogs b
             JOIN blog_category_mapping bcm ON b.id = bcm.blog_id
             WHERE bcm.category_id IN (SELECT category_id FROM blog_category_mapping WHERE blog_id = ?)
             AND b.id != ? AND b.status = 'published' AND b.tenant_id = ?
             GROUP BY b.id
             ORDER BY b.published_at DESC
             LIMIT ?`,
            [postId, postId, tenantId, limit]
        );
        return posts;
    }

    /**
     * Tags management
     */
    async getAllTags() {
        const [tags] = await mysqlPool.query('SELECT * FROM blog_tags ORDER BY name ASC');
        return tags;
    }

    /**
     * Comments management
     */
    async addComment(blogId, commentData) {
        const { userId, comment, mysqlUserId } = commentData;
        const [result] = await mysqlPool.query(
            'INSERT INTO blog_comments (blog_id, user_id, mysql_user_id, comment) VALUES (?, ?, ?, ?)',
            [blogId, userId, mysqlUserId || null, comment]
        );
        return result.insertId;
    }

    async getComments(blogId, status = 'approved') {
        const [comments] = await mysqlPool.query(
            `SELECT c.*, u.name as author_name 
             FROM blog_comments c
             LEFT JOIN mysql_users u ON c.mysql_user_id = u.id
             WHERE c.blog_id = ? AND c.status = ?
             ORDER BY c.created_at DESC`,
            [blogId, status]
        );
        return comments;
    }

    async updateCommentStatus(commentId, status) {
        await mysqlPool.query('UPDATE blog_comments SET status = ? WHERE id = ?', [status, commentId]);
    }

    /**
     * Analytics
     */
    async getAnalytics(tenantId = 1) {
        const [topPosts] = await mysqlPool.query(
            `SELECT id, title, view_count, slug FROM blogs 
             WHERE tenant_id = ? AND status = 'published' 
             ORDER BY view_count DESC LIMIT 5`,
            [tenantId]
        );

        const [monthlyStats] = await mysqlPool.query(
            `SELECT DATE_FORMAT(published_at, '%Y-%m') as month, COUNT(*) as count, SUM(view_count) as views
             FROM blogs 
             WHERE tenant_id = ? AND status = 'published'
             GROUP BY month ORDER BY month DESC LIMIT 6`,
            [tenantId]
        );

        return { topPosts, monthlyStats };
    }

    /**
     * Create a new blog post
     */
    async createPost(data, tenantId = 1) {
        const {
            title,
            slug,
            content,
            excerpt,
            featuredImage,
            images,
            authorId,
            status = 'draft',
            publishedAt,
            seoTitle,
            seoDescription,
            metaTitle, // Backward compatibility
            metaDescription // Backward compatibility
        } = data;

        const [result] = await mysqlPool.query(
            `INSERT INTO blogs (
                tenant_id, title, slug, content, excerpt, featured_image, images,
                author_id, status, published_at, seo_title, seo_description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                title,
                slug,
                content || '',
                excerpt || '',
                featuredImage || null,
                images ? JSON.stringify(images) : null,
                authorId,
                status,
                publishedAt || (status === 'published' ? new Date() : null),
                seoTitle || metaTitle || null,
                seoDescription || metaDescription || null
            ]
        );

        await this.clearCache(tenantId);

        return this.getPostById(result.insertId, tenantId);
    }

    /**
     * Update a blog post
     */
    async updatePost(id, data, tenantId = 1) {
        // First verify the post belongs to this tenant
        const existingPost = await this.getPostById(id, tenantId);
        if (!existingPost) {
            const error = new Error('Blog post not found');
            error.statusCode = 404;
            throw error;
        }

        const fields = [];
        const values = [];

        if (data.title !== undefined) {
            fields.push('title = ?');
            values.push(data.title);
        }
        if (data.slug !== undefined) {
            fields.push('slug = ?');
            values.push(data.slug);
        }
        if (data.content !== undefined) {
            fields.push('content = ?');
            values.push(data.content);
        }
        if (data.excerpt !== undefined) {
            fields.push('excerpt = ?');
            values.push(data.excerpt);
        }
        if (data.featuredImage !== undefined) {
            fields.push('featured_image = ?');
            values.push(data.featuredImage);
        }
        if (data.images !== undefined) {
            fields.push('images = ?');
            values.push(data.images ? JSON.stringify(data.images) : null);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
            // Auto-set published_at when publishing
            if (data.status === 'published' && !existingPost.published_at) {
                fields.push('published_at = ?');
                values.push(new Date());
            }
        }
        if (data.publishedAt !== undefined) {
            fields.push('published_at = ?');
            values.push(data.publishedAt);
        }
        if (data.seoTitle !== undefined || data.metaTitle !== undefined) {
            fields.push('seo_title = ?');
            values.push(data.seoTitle || data.metaTitle);
        }
        if (data.seoDescription !== undefined || data.metaDescription !== undefined) {
            fields.push('seo_description = ?');
            values.push(data.seoDescription || data.metaDescription);
        }

        if (fields.length === 0) {
            return existingPost;
        }

        values.push(id, tenantId);
        await mysqlPool.query(
            `UPDATE blogs SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
            values
        );

        await this.clearCache(tenantId);

        return this.getPostById(id, tenantId);
    }

    /**
     * Delete a blog post
     */
    async deletePost(id, tenantId = 1) {
        const existingPost = await this.getPostById(id, tenantId);
        if (!existingPost) {
            const error = new Error('Blog post not found');
            error.statusCode = 404;
            throw error;
        }

        await mysqlPool.query(
            'DELETE FROM blogs WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );

        await this.clearCache(tenantId);

        return { id, deleted: true };
    }

    /**
     * Clear blog cache
     */
    async clearCache(tenantId) {
        if (redis) {
            try {
                const keys = await redis.keys(`blogs:${tenantId}:*`);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
                const singleKeys = await redis.keys(`blog:${tenantId}:*`);
                if (singleKeys.length > 0) {
                    await redis.del(...singleKeys);
                }
            } catch (err) {
                console.error('[BlogService] Redis cache clear error:', err.message);
            }
        }
    }

    /**
     * Increment view count
     */
    async incrementViewCount(id, tenantId = 1) {
        await mysqlPool.query(
            'UPDATE blogs SET view_count = view_count + 1 WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
    }
}

module.exports = new BlogService();
