const httpStatus = require('http-status');
const { successResponse } = require('../utils/response');
const categoryService = require('../services/category.service');
const catalogReadService = require('../services/catalog-read.service');
const cacheInvalidationService = require('../services/cacheInvalidation.service');
const categoryFilterService = require('../services/categoryFilter.service');

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory({
            ...req.body,
            tenant_id: req.tenantId || req.user?.tenantId || 1,
        });
        await cacheInvalidationService.invalidateCategories();
        return successResponse(res, category, 'Category created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const getCategoryById = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const category = await catalogReadService.getCategory(req.params.categoryId, {
            tenantId,
            user: req.user || null,
            includeProducts: true,
        });
        if (!category) {
            const ApiError = require('../utils/ApiError');
            throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        }
        return successResponse(res, category);
    } catch (error) {
        next(error);
    }
};

const getCategoryBySlug = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const category = await catalogReadService.getCategory(req.params.slug, {
            tenantId,
            user: req.user || null,
            includeProducts: true,
        });
        if (!category) {
            const ApiError = require('../utils/ApiError');
            throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        }
        return successResponse(res, category);
    } catch (error) {
        next(error);
    }
};

const getAllCategories = async (req, res, next) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || 1;
        const categories = await catalogReadService.listCategories({
            tenantId,
            user: req.user || null,
        });

        return successResponse(res, categories);
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.categoryId, req.body);
        if (!category) {
            const ApiError = require('../utils/ApiError');
            throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        }
        await cacheInvalidationService.invalidateCategories();
        return successResponse(res, null, 'Category updated successfully');
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const success = await categoryService.deleteCategory(req.params.categoryId);
        if (!success) {
            const ApiError = require('../utils/ApiError');
            throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        }
        await cacheInvalidationService.invalidateCategories();
        return successResponse(res, null, 'Category deleted successfully');
    } catch (error) {
        next(error);
    }
};

const getProductsByCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const limit = parseInt(req.query.limit, 10) || 100;

        // Check for admin/editor status to allow viewing drafts
        const isAdminOrEditor = req.user && (
            (req.user.roles || []).some(r => ['admin', 'editor'].includes(r.toLowerCase())) ||
            ['admin', 'editor'].includes((req.user.role || '').toLowerCase())
        );

        const status = isAdminOrEditor ? (req.query.status || null) : 'published';
        const products = await categoryService.getProductsByCategoryId(categoryId, limit, status);
        return successResponse(res, products);
    } catch (error) {
        next(error);
    }
};

const getCategoryFilters = async (req, res, next) => {
    try {
        const { categorySlug } = req.params;
        const result = await categoryFilterService.getAvailableFiltersByCategory(categorySlug);
        return successResponse(res, result);
    } catch (error) {
        if (error.message === 'Category not found') {
            const ApiError = require('../utils/ApiError');
            return next(new ApiError(httpStatus.NOT_FOUND, 'Category not found'));
        }
        next(error);
    }
};

module.exports = {
    createCategory,
    getCategoryById,
    getCategoryBySlug,
    getAllCategories,
    updateCategory,
    deleteCategory,
    getProductsByCategory,
    getCategoryFilters,
};
