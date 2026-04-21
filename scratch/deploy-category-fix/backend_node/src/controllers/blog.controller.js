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
    const numericTenantId = Number(req.tenantId || req.user?.tenantId || req.user?.tenant_id || 1);
    return Number.isInteger(numericTenantId) && numericTenantId > 0 ? numericTenantId : 1;
};

/**
 * Get all blog posts for the tenant
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
 */
const getPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const post = await blogService.getPostById(req.params.post_id, tenantId);

        if (!post) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Blog post not found');
        }

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
 */
const getPostBySlug = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const post = await blogService.getPostBySlug(req.params.slug, tenantId);

        if (!post) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Blog post not found');
        }

        if (post.status === 'published') {
            await blogService.incrementViewCount(post._id || post.id, tenantId);
        }

        return successResponse(res, post);
    } catch (error) {
        next(error);
    }
};

/**
 * Get related posts
 */
const getRelatedPosts = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const related = await blogService.getRelatedPosts(req.params.post_id, 3, tenantId);
        return successResponse(res, related);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new blog post
 */
const createPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const postData = {
            ...req.body,
            authorId: req.user.id
        };

        if (!postData.title || !postData.slug) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Title and slug are required');
        }

        const result = await blogService.createPost(postData, tenantId);
        return successResponse(res, result, 'Blog post created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Update a blog post
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
 * Publish a blog post
 */
const publishPost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.updatePost(req.params.post_id, { status: 'published' }, tenantId);
        return successResponse(res, result, 'Blog post published');
    } catch (error) {
        next(error);
    }
};

/**
 * Archive a blog post
 */
const archivePost = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const result = await blogService.updatePost(req.params.post_id, { status: 'archived' }, tenantId);
        return successResponse(res, result, 'Blog post archived');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a blog post
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
 * Comments (Stubs for future implementation)
 */
const getComments = async (req, res, next) => {
    return successResponse(res, [], 'Comments retrieved');
};

const addComment = async (req, res, next) => {
    return successResponse(res, {}, 'Comment added', httpStatus.CREATED);
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

const getCategories = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const categories = await blogService.getAllCategories(tenantId);
        return successResponse(res, categories);
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

const getCapabilities = async (req, res, next) => {
    try {
        const roles = Array.isArray(req.user?.roles) ? req.user.roles.map((role) => String(role).toLowerCase()) : [];
        const primaryRole = String(req.user?.role || '').toLowerCase();
        const isAdmin = primaryRole === 'admin' || roles.includes('admin');
        const isEditor = primaryRole === 'editor' || roles.includes('editor');

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
    getRelatedPosts,
    createPost,
    updatePost,
    publishPost,
    archivePost,
    deletePost,
    getComments,
    addComment,
    getCapabilities,
    getCategories,
    searchPosts,
    getTags,
    getAnalytics,
};
