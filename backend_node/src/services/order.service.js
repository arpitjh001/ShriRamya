const httpStatus = require('http-status');
const mongoose = require('mongoose');
const wcClient = require('../config/integrations/woocommerce');
const { razorpay, verifySignature } = require('../config/integrations/razorpay');
const ApiError = require('../utils/ApiError');

const getAllOrders = async (params = {}) => {
    const response = await wcClient.get('/orders', { params });
    return response.data;
};

const getOrderById = async (orderId, userId = null) => {
    try {
        const response = await wcClient.get(`/orders/${orderId}`);
        const order = response.data;

        if (userId && order.customer_id && String(order.customer_id) !== String(userId)) {
            throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view this order");
        }

        return order;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    }
};

const createWcOrder = async (orderData) => {
    const response = await wcClient.post('/orders', orderData);
    return response.data;
};

const updateWcOrder = async (orderId, orderData) => {
    const response = await wcClient.put(`/orders/${orderId}`, orderData);
    return response.data;
};

const deleteWcOrder = async (orderId) => {
    const response = await wcClient.delete(`/orders/${orderId}`, {
        params: { force: true }
    });
    return response.data;
};

/**
 * Advanced Payment Flow Logic
 */

const createPaymentIntent = async (userId, billingInfo, shippingInfo, items) => {
    // 1. Create order in WooCommerce (pending)
    const wcOrderData = {
        status: 'pending',
        billing: billingInfo,
        shipping: shippingInfo,
        line_items: items,
        meta_data: [{ key: '_customer_user_id', value: String(userId) }]
    };

    const wcOrder = await createWcOrder(wcOrderData);

    // 2. Create Razorpay order
    const amount = Math.round(parseFloat(wcOrder.total) * 100);
    const rzOrder = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: String(wcOrder.id),
        notes: { wc_order_id: String(wcOrder.id), user_id: String(userId) }
    });

    // 3. Store Order Metadata in MongoDB
    const db = mongoose.connection.db;
    const orderRecord = {
        wc_order_id: wcOrder.id,
        rz_order_id: rzOrder.id,
        user_id: userId,
        status: 'awaiting_payment',
        total: wcOrder.total,
        created_at: new Date()
    };

    await db.collection('orders').insertOne(orderRecord);

    return {
        rz_order_id: rzOrder.id,
        wc_order_id: wcOrder.id,
        amount,
        currency: 'INR'
    };
};

const completeOrder = async (paymentId, orderId, signature) => {
    // 1. Verify Razorpay Signature
    if (!verifySignature(orderId, paymentId, signature)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment signature');
    }

    // 2. Find internal order
    const db = mongoose.connection.db;
    const order = await db.collection('orders').findOne({ rz_order_id: orderId });
    if (!order) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Order metadata not found');
    }

    // 3. Mark WooCommerce order as paid
    await updateWcOrder(order.wc_order_id, { status: 'processing', set_paid: true });

    // 4. Update internal order status
    await db.collection('orders').updateOne(
        { rz_order_id: orderId },
        { $set: { status: 'paid', rz_payment_id: paymentId, updated_at: new Date() } }
    );

    return { success: true, wc_order_id: order.wc_order_id };
};

module.exports = {
    getAllOrders,
    getOrderById,
    createWcOrder,
    updateWcOrder,
    deleteWcOrder,
    createPaymentIntent,
    completeOrder
};

