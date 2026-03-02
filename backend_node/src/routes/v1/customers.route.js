const express = require('express');
const customerController = require('../../controllers/customer.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', auth(['admin']), customerController.getCustomers);
router.get('/:customer_id', auth(['admin']), customerController.getCustomer);
router.post('/', auth(['admin']), customerController.createCustomer);
router.put('/:customer_id', auth(['admin']), customerController.updateCustomer);
router.delete('/:customer_id', auth(['admin']), customerController.deleteCustomer);

module.exports = router;
