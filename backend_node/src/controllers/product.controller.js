const httpStatus = require('http-status');
const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');

/**
 * ---------- PRODUCTS ----------
 */

const getProducts = async (req, res, next) => {
  try {
    const data = await productService.getProducts(req.query);
    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.product_id);
    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, product, 'Product created successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const addVariant = async (req, res, next) => {
  try {
    const variant = await productService.addVariant(req.params.product_id, req.body);
    return successResponse(res, variant, 'Variant added successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    const variant = await productService.updateVariant(
      req.params.product_id,
      req.params.variant_id,
      req.body
    );
    return successResponse(res, variant, 'Variant updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteVariant = async (req, res, next) => {
  try {
    const deleted = await productService.deleteVariant(req.params.product_id, req.params.variant_id);
    return successResponse(res, deleted, 'Variant deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Product-category mapping methods
const assignCategoriesToProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { categoryIds } = req.body;
    
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).send({ message: 'categoryIds must be a non-empty array' });
    }
    
    const result = await productService.assignCategoriesToProduct(product_id, categoryIds);
    return successResponse(res, result, 'Categories assigned to product successfully');
  } catch (error) {
    next(error);
  }
};

const getProductCategories = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const categories = await productService.getProductCategories(product_id);
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
};

const removeCategoryFromProduct = async (req, res, next) => {
  try {
    const { product_id, category_id } = req.params;
    const result = await productService.removeCategoryFromProduct(product_id, category_id);
    return successResponse(res, result, 'Category removed from product successfully');
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const updated = await productService.updateProduct(req.params.product_id, req.body);
    return successResponse(res, updated, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await productService.deleteProduct(req.params.product_id);
    return successResponse(res, deleted, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  assignCategoriesToProduct,
  getProductCategories,
  removeCategoryFromProduct,
};
