/**
 * Blog Routes (Native Multi-Tenant)
 * Blog management endpoints with RBAC
 */

const express = require('express');
const validate = require('../../middlewares/validate');
const blogValidation = require('../../validations/blog.validation');
const router = express.Router();
const blogController = require('../../controllers/blog.controller');
const { auth, requireRole, ensureTenantIsolation, optionalTenantIsolation } = require('../../middlewares/authRBAC');

/**
 * @route   GET /api/v1/blogs
 * @desc    Get all blog posts for tenant
 * @access  Public (or authenticated users)
 */
router.get('/',
    optionalTenantIsolation,
    validate(blogValidation.getPosts),
    blogController.getPosts
);

/**
 * @route   GET /api/v1/blogs/search
 * @desc    Search blog posts
 * @access  Public
 */
router.get('/search',
    optionalTenantIsolation,
    blogController.searchPosts
);

/**
 * @route   GET /api/v1/blogs/tags
 * @desc    Get all blog tags
 * @access  Public
 */
router.get('/tags',
    blogController.getTags
);

/**
 * @route   GET /api/v1/blogs/capabilities
 * @desc    Get blog editing capabilities
 * @access  Public (Guest), Authenticated (Author/Admin)
 */
router.get('/capabilities',
    blogController.getCapabilities
);

/**
 * @route   GET /api/v1/blogs/slug/:slug
 * @desc    Get blog post by slug
 * @access  Public
 */
router.get('/slug/:slug',
    optionalTenantIsolation,
    blogController.getPostBySlug
);

/**
 * @route   GET /api/v1/blogs/:id/related
 * @desc    Get related posts
 * @access  Public
 */
router.get('/:post_id/related',
    optionalTenantIsolation,
    blogController.getRelatedPosts
);

/**
 * @route   GET /api/v1/blogs/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get('/:post_id/comments',
    optionalTenantIsolation,
    blogController.getComments
);

/**
 * @route   POST /api/v1/blogs/:id/comment
 * @desc    Add a comment to a post
 * @access  Authenticated
 */
router.post('/:post_id/comment',
    auth,
    validate(blogValidation.addComment),
    blogController.addComment
);

/**
 * @route   GET /api/v1/blogs/:id
 * @desc    Get blog post by ID
 * @access  Public
 */
router.get('/:post_id',
    optionalTenantIsolation,
    validate(blogValidation.postId),
    blogController.getPost
);

/**
 * @route   POST /api/v1/blogs
 * @desc    Create a new blog post
 * @access  Private (Editor, Admin only)
 */
router.post('/',
    auth,
    requireRole('Editor', 'Admin'),
    ensureTenantIsolation,
    validate(blogValidation.createPost),
    blogController.createPost
);

/**
 * @route   PUT /api/v1/blogs/:id
 * @desc    Update a blog post
 * @access  Private (Editor, Admin only)
 */
router.put('/:post_id',
    auth,
    requireRole('Editor', 'Admin'),
    ensureTenantIsolation,
    validate(blogValidation.updatePost),
    blogController.updatePost
);

/**
 * @route   POST /api/v1/blogs/:id/publish
 * @desc    Publish a blog post
 * @access  Private (Editor, Admin only)
 */
router.post('/:post_id/publish',
    auth,
    requireRole('Editor', 'Admin'),
    ensureTenantIsolation,
    validate(blogValidation.postId),
    blogController.publishPost
);

/**
 * @route   POST /api/v1/blogs/:id/archive
 * @desc    Archive a blog post
 * @access  Private (Editor, Admin only)
 */
router.post('/:post_id/archive',
    auth,
    requireRole('Editor', 'Admin'),
    ensureTenantIsolation,
    validate(blogValidation.postId),
    blogController.archivePost
);

/**
 * @route   GET /api/v1/blogs/admin/analytics
 * @desc    Get blog analytics
 * @access  Private (Admin only)
 */
router.get('/admin/analytics',
    auth,
    requireRole('Admin'),
    ensureTenantIsolation,
    blogController.getAnalytics
);

/**
 * @route   DELETE /api/v1/blogs/:id
 * @desc    Delete a blog post
 * @access  Private (Admin only)
 */
router.delete('/:post_id',
    auth,
    requireRole('Admin'),
    ensureTenantIsolation,
    validate(blogValidation.postId),
    blogController.deletePost
);

module.exports = router;
