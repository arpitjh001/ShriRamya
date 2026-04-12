/**
 * Order Controller
 * Complete order management with Mongoose
 */

const httpStatus = require('http-status');
const { Order, User, Product, OrderEvent } = require('../models');
const orderEventService = require('../services/events/orderEvent.service');
const couponService = require('../services/coupon.service');
const analyticsService = require('../services/analytics/analytics.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}-${timestamp}`;
}

/**
 * Create Order (Customer)
 */
const createOrder = async (req, res, next) => {
    try {
        const {
            items,
            billing,
            shipping,
            paymentMethod,
            customerNotes,
            couponCode,
            tenantId = 1
        } = req.body;

        if (!items || items.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Order items are required');
        }

        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        }

        // Calculate totals
        let subtotal = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new ApiError(httpStatus.NOT_FOUND, `Product ${item.productId} not found`);
            }

            let unitPrice = product.basePrice || 0;
            
            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            processedItems.push({
                productId: item.productId,
                variantId: item.variantId,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                unitPrice,
                subtotal: itemTotal,
                taxAmount: itemTotal * 0.18,
                total: itemTotal
            });
        }

        let discountTotal = 0;
        let appliedCouponId = null;
        let appliedCouponCode = null;

        if (couponCode) {
            try {
                const couponResult = await couponService.validateAndApplyCoupon(
                    couponCode,
                    { subtotal, items: processedItems },
                    userId
                );
                discountTotal = couponResult.discount;
                appliedCouponId = couponResult.coupon._id;
                appliedCouponCode = couponResult.coupon.code;
            } catch (error) {
                console.warn('Coupon application failed:', error.message);
            }
        }

        const taxTotal = processedItems.reduce((sum, i) => sum + i.taxAmount, 0);
        const shippingCost = subtotal > 5000 ? 0 : 100;
        const grandTotal = subtotal - discountTotal + taxTotal + shippingCost;

        const order = await Order.create({
            userId,
            tenantId,
            orderNumber: generateOrderNumber(),
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            items: processedItems,
            subtotal,
            discountTotal,
            taxTotal,
            shippingCost,
            grandTotal,
            finalTotal: grandTotal,
            couponId: appliedCouponId,
            couponCode: appliedCouponCode,
            paymentMethod: paymentMethod || 'cod',
            customerEmail: user.email,
            customerPhone: user.phone || (billing ? billing.phone : ''),
            billing,
            shipping,
            customerNotes
        });

        // Log order created event
        await orderEventService.logEvent(
            order._id,
            'order_created',
            `Order ${order.orderNumber} created`,
            { grandTotal },
            userId,
            'customer'
        );

        return successResponse(res, order, 'Order created successfully', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

/**
 * Get Customer Orders
 */
const getCustomerOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const filter = { userId: req.user.id };
        if (status) filter.status = status;

        const orders = await Order.find(filter)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        return successResponse(res, {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Order Details
 */
const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized');
        }

        return successResponse(res, order);
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel Order (Customer)
 */
const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');

        if (order.userId.toString() !== req.user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized');
        }

        if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Cannot cancel order in ${order.status} status`);
        }

        order.status = 'cancelled';
        await order.save();

        await orderEventService.logEvent(
            order._id,
            'order_cancelled',
            req.body.reason || 'Cancelled by customer',
            {},
            req.user.id,
            'customer'
        );

        return successResponse(res, order, 'Order cancelled');
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Orders (Admin)
 */
const getAllOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, tenantId } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (tenantId) filter.tenantId = tenantId;

        const orders = await Order.find(filter)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        return successResponse(res, {
            orders,
            pagination: { 
                page: parseInt(page), 
                limit: parseInt(limit), 
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Order Status (Admin)
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, paymentStatus, fulfillmentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');

        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;

        await order.save();

        await orderEventService.logEvent(
            order._id,
            'order_updated',
            `Status updated to ${status || order.status}`,
            req.body,
            req.user.id,
            'admin'
        );

        return successResponse(res, order, 'Order updated');
    } catch (error) {
        next(error);
    }
};

/**
 * Get Order Analytics (Admin)
 */
const getOrderAnalytics = async (req, res, next) => {
    try {
        const tenantId = req.query.tenantId || req.user.tenant_id;
        const result = await analyticsService.getOrderAnalytics({ tenant_id: tenantId });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getCustomerOrders,
    getOrder,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    getOrderAnalytics
};
