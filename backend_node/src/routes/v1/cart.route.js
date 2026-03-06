const express = require('express');
const cartController = require('../../controllers/cart.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(), cartController.getCart);
router.post('/', auth(), cartController.updateCart);
router.put('/', auth(), cartController.updateCart);
router.delete('/', auth(), cartController.clearCart);

module.exports = router;

