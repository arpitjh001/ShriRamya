const express = require('express');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');
const auth = require('../../middlewares/auth');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);

/**
 * ---------- PRODUCTS ----------
 */
router.get('/', validate(productValidation.getProducts), productController.getProducts);
router.get('/categories', (req, res) => res.redirect(301, '/api/v1/categories'));
router.get('/:product_id', validate(productValidation.getProduct), productController.getProduct);
router.post('/', auth(['admin']), validate(productValidation.createProduct), productController.createProduct);
router.post('/:product_id/variants', auth(['admin']), validate(productValidation.addVariant), productController.addVariant);
router.put('/:product_id/variants/:variant_id', auth(['admin']), validate(productValidation.updateVariant), productController.updateVariant);
router.delete('/:product_id/variants/:variant_id', auth(['admin']), validate(productValidation.deleteVariant), productController.deleteVariant);
router.put('/:product_id', auth(['admin']), validate(productValidation.updateProduct), productController.updateProduct);
router.delete('/:product_id', auth(['admin']), productController.deleteProduct);

module.exports = router;
