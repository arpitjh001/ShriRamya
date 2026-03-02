const httpStatus = require('http-status');
const orderService = require('../services/order.service');
const { successResponse } = require('../utils/response');

const getOrders = async (req, res, next) => {
    try {
        const params = req.query || {};
        if (req.user.role !== 'admin') {
            params.customer = req.user.id;
        }
        const orders = await orderService.getAllOrders(params);
        return successResponse(res, orders);
    } catch (error) {
        next(error);
    }
};

const getOrder = async (req, res, next) => {
    try {
        const userId = req.user.role !== 'admin' ? req.user.id : null;
        const order = await orderService.getOrderById(req.params.order_id, userId);
        return successResponse(res, order);
    } catch (error) {
        next(error);
    }
};

const createOrder = async (req, res, next) => {
    try {
        const orderData = req.body;
        if (req.user.role !== 'admin') {
            orderData.customer_id = req.user.id;
        }
        const result = await orderService.createWcOrder(orderData);
        return successResponse(res, result, "Order created successfully", httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const createPaymentIntent = async (req, res, next) => {
    try {
        const { billing_info, shipping_info, items } = req.body;
        const result = await orderService.createPaymentIntent(req.user.id, billing_info, shipping_info, items);
        return successResponse(res, result, "Payment intent created successfully");
    } catch (error) {
        next(error);
    }
};

const completeOrder = async (req, res, next) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const result = await orderService.completeOrder(razorpay_payment_id, razorpay_order_id, razorpay_signature);
        return successResponse(res, result, "Order completed successfully");
    } catch (error) {
        next(error);
    }
};

const updateOrder = async (req, res, next) => {
    try {
        const result = await orderService.updateWcOrder(req.params.order_id, req.body);
        return successResponse(res, result, "Order updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteOrder = async (req, res, next) => {
    try {
        const result = await orderService.deleteWcOrder(req.params.order_id);
        return successResponse(res, result, "Order deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrders,
    getOrder,
    createOrder,
    createPaymentIntent,
    completeOrder,
    updateOrder,
    deleteOrder,
};
