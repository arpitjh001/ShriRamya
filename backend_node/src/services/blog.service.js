const NodeCache = require('node-cache');
const wpClient = require('../config/integrations/wordpress');

const cache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // Cache for 10 minutes

const getAllPosts = async (params = {}) => {
    const cacheKey = `posts_${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const response = await wpClient.get('/posts', { params });
    const data = response.data;

    cache.set(cacheKey, data);
    return data;
};

const getPostById = async (id) => {
    const cacheKey = `post_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const response = await wpClient.get(`/posts/${id}`);
    const data = response.data;

    cache.set(cacheKey, data);
    return data;
};

const createPost = async (data) => {
    const response = await wpClient.post('/posts', data);
    cache.flushAll(); // Clear on change
    return response.data;
};

const updatePost = async (id, data) => {
    const response = await wpClient.put(`/posts/${id}`, data);
    cache.flushAll(); // Clear on change
    return response.data;
};

const deletePost = async (id) => {
    const response = await wpClient.delete(`/posts/${id}`);
    cache.flushAll(); // Clear on change
    return response.data;
};

module.exports = {
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
};

