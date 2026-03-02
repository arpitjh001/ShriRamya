const express = require('express');
const blogController = require('../../controllers/blog.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/posts', blogController.getPosts);
router.get('/posts/:post_id', blogController.getPost);
router.post('/posts', auth(['admin']), blogController.createPost);
router.put('/posts/:post_id', auth(['admin']), blogController.updatePost);
router.delete('/posts/:post_id', auth(['admin']), blogController.deletePost);
router.get('/capabilities', auth(['admin']), blogController.getCapabilities);

module.exports = router;
