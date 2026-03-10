const express = require('express');
const categoryController = require('../../controllers/category.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
    .route('/')
    .post(auth(['admin', 'editor']), categoryController.createCategory)
    .get(categoryController.getAllCategories);

router.route('/slug/:slug').get(categoryController.getCategoryBySlug);

router
    .route('/:categoryId')
    .get(categoryController.getCategoryById)
    .put(auth(['admin', 'editor']), categoryController.updateCategory)
    .delete(auth(['admin']), categoryController.deleteCategory);

// Get products by category
router.route('/:categoryId/products').get(categoryController.getProductsByCategory);

module.exports = router;
