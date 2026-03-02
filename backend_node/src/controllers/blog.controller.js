const blogService = require('../services/blog.service');
const { successResponse } = require('../utils/response');

const getPosts = async (req, res, next) => {
    try {
        const posts = await blogService.getAllPosts(req.query);
        return successResponse(res, posts);
    } catch (error) {
        next(error);
    }
};

const getPost = async (req, res, next) => {
    try {
        const post = await blogService.getPostById(req.params.post_id);
        return successResponse(res, post);
    } catch (error) {
        next(error);
    }
};

const createPost = async (req, res, next) => {
    try {
        const result = await blogService.createPost(req.body);
        return successResponse(res, result, "Post created successfully");
    } catch (error) {
        next(error);
    }
};

const updatePost = async (req, res, next) => {
    try {
        const result = await blogService.updatePost(req.params.post_id, req.body);
        return successResponse(res, result, "Post updated successfully");
    } catch (error) {
        next(error);
    }
};

const deletePost = async (req, res, next) => {
    try {
        const result = await blogService.deletePost(req.params.post_id);
        return successResponse(res, result, "Post deleted successfully");
    } catch (error) {
        next(error);
    }
};

const getCapabilities = async (req, res, next) => {
    try {
        // Admin user as verified by auth middleware
        return successResponse(res, {
            capabilities: {
                edit_posts: true,
                publish_posts: true,
                edit_others_posts: true,
                delete_posts: true
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getCapabilities,
};
