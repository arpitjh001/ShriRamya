const express = require('express');
const validate = require('../../middlewares/validate');
const categoryValidation = require('../../validations/category.validation');
const categoryController = require('../../controllers/category.controller');
const { auth, requireRole, ensureTenantIsolation, optionalTenantIsolation, optionalAuth } = require('../../middlewares/authRBAC');

const router = express.Router();

router.route('/')
    .post(
        auth,
        requireRole('Admin', 'Editor'),
        ensureTenantIsolation,
        validate(categoryValidation.createCategory),
        categoryController.createCategory
    )
    .get(optionalAuth, optionalTenantIsolation, categoryController.getAllCategories);

router.route('/slug/:slug')
    .get(optionalAuth, optionalTenantIsolation, validate(categoryValidation.categorySlug), categoryController.getCategoryBySlug);

router.route('/:categoryId')
    .get(optionalAuth, optionalTenantIsolation, validate(categoryValidation.categoryId), categoryController.getCategoryById)
    .put(
        auth,
        requireRole('Admin', 'Editor'),
        ensureTenantIsolation,
        validate(categoryValidation.updateCategory),
        categoryController.updateCategory
    )
    .delete(
        auth,
        requireRole('Admin'),
        ensureTenantIsolation,
        validate(categoryValidation.categoryId),
        categoryController.deleteCategory
    );

// Get products by category
router.route('/:categoryId/products')
    .get(optionalAuth, optionalTenantIsolation, validate(categoryValidation.getProductsByCategory), categoryController.getProductsByCategory);

module.exports = router;
