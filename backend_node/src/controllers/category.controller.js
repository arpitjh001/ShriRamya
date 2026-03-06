const httpStatus = require('http-status');
const { successResponse } = require('../utils/response');
const categoryService = require('../services/category.service');

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);
        return successResponse(res, category, 'Category created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const getCategoryById = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.categoryId);
        if (!category) {
            return res.status(httpStatus.NOT_FOUND).send({ message: 'Category not found' });
        }
        return successResponse(res, category);
    } catch (error) {
        next(error);
    }
};

const getCategoryBySlug = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryBySlug(req.params.slug);
        if (!category) {
            return res.status(httpStatus.NOT_FOUND).send({ message: 'Category not found' });
        }
        return successResponse(res, category);
    } catch (error) {
        next(error);
    }
};

const getAllCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getAllCategories();
        return successResponse(res, categories);
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.categoryId, req.body);
        if (!category) {
            return res.status(httpStatus.NOT_FOUND).send({ message: 'Category not found' });
        }
        return successResponse(res, null, 'Category updated successfully');
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const success = await categoryService.deleteCategory(req.params.categoryId);
        if (!success) {
            return res.status(httpStatus.NOT_FOUND).send({ message: 'Category not found' });
        }
        return successResponse(res, null, 'Category deleted successfully');
    } catch (error) {
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
};
