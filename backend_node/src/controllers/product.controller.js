const httpStatus = require('http-status');
const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts(req.query);
    return successResponse(res, products);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await productService.getCategories(req.query);
    return successResponse(res, categories);
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

const createCategory = async (req, res, next) => {
  try {
    const category = await productService.createCategory(req.body);
    return successResponse(res, category, 'Category created successfully', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getCategories,
  getProduct,
  createProduct,
  createCategory,
};
