/**
 * Native Blog Controller (Multi-Tenant)
 * For tenant-specific blog content management
 */

const httpStatus = require('http-status');
const blogService = require('../services/blog.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');

/**
 * Get tenant ID from request
 */
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 1;
};

/**
 * Get author ID from request user
 */
const getAuthorId = async (req) => {
    // For now, use user ID - in production, map to mysql_users table
    const { UserRoleService } = require('../models/rbac.model');
    try {
        // Try to get mysql_user_id from user_roles mapping
        const userId = req.user?.id || req.user?.userId;
        // For simplicity, we'll use a default admin user or create mapping
        // In production, this should query mysql_users table
        const [rows] = await require('../config/db').mysqlPool.query(
            'SELECT id FROM mysql_users WHERE mongo_user_id = ?',
            [userId]
        );
        return rows[0]?.id || 1; // Default to first user if not found
    } catch (error) {
        console.error('[BlogController] Error getting author ID:', error.message);
        return 1;
    }
};

/**
 * Get all blog posts for the tenant
 * GET /api/v1/blogs
 */
const getPosts = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const posts = await blogService.getAllPosts(req.query, tenantId);
        return successResponse(res, posts);
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single blog post by ID
 * GET /api/v1/blogs/:id
 */
const getPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const post = await blogService.getPostById(req.params.post_id, tenantId);

        if (!post) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'Blog post not found'));
        }

        // Increment view count for published posts
        if (post.status === 'published') {
            await blogService.incrementViewCount(req.params.post_id, tenantId);
        }

        return successResponse(res, post);
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single blog post by slug
 * GET /api/v1/blogs/slug/:slug
 */
const getPostBySlug = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const post = await blogService.getPostBySlug(req.params.slug, tenantId);

        if (!post) {
            return next(new ApiError(httpStatus.NOT_FOUND, 'Blog post not found'));
        }

        // Increment view count for published posts
        if (post.status === 'published') {
            await blogService.incrementViewCount(post.id, tenantId);
        }

        return successResponse(res, post);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new blog post
 * POST /api/v1/blogs
 * Requires: Editor or Admin role
 */
const createPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const authorId = await getAuthorId(req);

        const postData = {
            ...req.body,
            authorId
        };

        // Validate required fields
        if (!postData.title) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Title is required'));
        }
        if (!postData.slug) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Slug is required'));
        }

        const result = await blogService.createPost(postData, tenantId);
        return successResponse(res, result, 'Blog post created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Update a blog post
 * PUT /api/v1/blogs/:id
 * Requires: Editor or Admin role
 */
const updatePost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.updatePost(req.params.post_id, req.body, tenantId);
        return successResponse(res, result, 'Blog post updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a blog post
 * DELETE /api/v1/blogs/:id
 * Requires: Admin role only
 */
const deletePost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.deletePost(req.params.post_id, tenantId);
        return successResponse(res, result, 'Blog post deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Advanced CMS Features
 */

const searchPosts = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const results = await blogService.getAllPosts({ search: req.query.q, ...req.query }, tenantId);
        return successResponse(res, results);
    } catch (error) {
        next(error);
    }
};

const getTags = async (req, res, next) => {
    try {
        const tags = await blogService.getAllTags();
        return successResponse(res, tags);
    } catch (error) {
        next(error);
    }
};

const publishPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.updatePost(req.params.post_id, { status: 'published' }, tenantId);
        return successResponse(res, result, 'Blog post published successfully');
    } catch (error) {
        next(error);
    }
};

const archivePost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.updatePost(req.params.post_id, { status: 'archived' }, tenantId);
        return successResponse(res, result, 'Blog post archived successfully');
    } catch (error) {
        next(error);
    }
};

const getRelatedPosts = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const posts = await blogService.getRelatedPosts(req.params.post_id, tenantId);
        return successResponse(res, posts);
    } catch (error) {
        next(error);
    }
};

const addComment = async (req, res, next) => {
    try {
        const commentData = {
            userId: req.user?.id,
            comment: req.body.comment,
            mysqlUserId: await getAuthorId(req)
        };
        const commentId = await blogService.addComment(req.params.post_id, commentData);
        return successResponse(res, { commentId }, 'Comment submitted for moderation', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const getComments = async (req, res, next) => {
    try {
        const comments = await blogService.getComments(req.params.post_id);
        return successResponse(res, comments);
    } catch (error) {
        next(error);
    }
};

const getAnalytics = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const stats = await blogService.getAnalytics(tenantId);
        return successResponse(res, stats);
    } catch (error) {
        next(error);
    }
};

/**
 * Get user blog capabilities (WordPress integration)
 * GET /api/v1/blog/capabilities
 */
const getCapabilities = async (req, res, next) => {
    try {
        const userRoles = (req.user?.roles || []).map(r => r.toLowerCase());
        const isAdmin = userRoles.includes('admin');
        const isEditor = userRoles.includes('editor');

        return successResponse(res, {
            capabilities: {
                edit_posts: isAdmin || isEditor,
                publish_posts: isAdmin || isEditor,
                edit_others_posts: isAdmin,
                delete_posts: isAdmin
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPosts,
    getPost,
    getPostBySlug,
    createPost,
    updatePost,
    deletePost,
    getCapabilities,
    searchPosts,
    getTags,
    publishPost,
    archivePost,
    getRelatedPosts,
    addComment,
    getComments,
    getAnalytics,
};
