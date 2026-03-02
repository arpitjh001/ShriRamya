const express = require('express');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', validate(productValidation.getProducts), productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/:product_id', validate(productValidation.getProduct), productController.getProduct);
router.post(
    '/',
    auth(['admin']),
    validate(productValidation.createProduct),
    productController.createProduct
);
router.post(
    '/categories',
    auth(['admin']),
    validate(productValidation.createCategory),
    productController.createCategory
);
module.exports = router;
