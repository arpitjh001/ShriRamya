const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const promoBarValidation = require('../../validations/promoBar.validation');
const promoBarController = require('../../controllers/promoBar.controller');
const { apiLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

router.use(apiLimiter);
router.use(auth(['admin']));

router.get('/', validate(promoBarValidation.listPromoBars), promoBarController.getPromoBars);
router.post('/', validate(promoBarValidation.createPromoBar), promoBarController.createPromoBar);
router.put('/:id', validate(promoBarValidation.updatePromoBar), promoBarController.updatePromoBar);
router.patch('/:id/toggle', validate(promoBarValidation.togglePromoBar), promoBarController.togglePromoBar);
router.delete('/:id', validate(promoBarValidation.promoBarId), promoBarController.deletePromoBar);

module.exports = router;
