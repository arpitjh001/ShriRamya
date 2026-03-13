const express = require('express');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const categoryController = require('../../controllers/category.controller');
const auth = require('../../middlewares/auth');
const { optionalTenantIsolation } = require('../../middlewares/authRBAC');

const router = express.Router();

router.route('/')
    .post(
        auth,
        validate(categoryValidation.createCategory),
        categoryController.createCategory
    )
    .get(optionalTenantIsolation, categoryController.getAllCategories);

router.route('/slug/:slug')
    .get(validate(categoryValidation.categorySlug), categoryController.getCategoryBySlug);

router.route('/:categoryId')
    .get(validate(categoryValidation.categoryId), categoryController.getCategoryById)
    .put(
        auth,
        validate(categoryValidation.updateCategory),
        categoryController.updateCategory
    )
    .delete(
        auth,
        validate(categoryValidation.categoryId),
        categoryController.deleteCategory
    );

// Get products by category
router.route('/:categoryId/products')
    .get(validate(categoryValidation.categoryId), categoryController.getProductsByCategory);

module.exports = router;
