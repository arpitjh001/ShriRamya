/**
 * Order Controller
 * Complete order management with Mongoose
 */

const httpStatus = require('http-status');
const { Order, User, Product, OrderEvent } = require('../models');
const orderEventService = require('../services/events/orderEvent.service');
const couponService = require('../services/coupon.service');
const analyticsService = require('../services/analytics/analytics.service');
const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { buildTenantScope, andQuery } = require('../utils/tenantScope');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}-${timestamp}`;
}

function escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            shipping_address, // Added support for frontend field name
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

            // Find specific variant if variantId provided
            const variant = item.variantId ? product.variants.id(item.variantId) : null;
            
            // Use variant price if available, fallback to product base price
            let unitPrice = variant ? (Number(variant.price) || 0) : (Number(product.basePrice || product.price) || 0);
            
            // Calculate effective sale price (ignoring complicated schedules for now for simplicity, matching CartService)
            let salePrice = unitPrice;
            if (variant && variant.discountPrice != null && variant.discountPrice > 0 && variant.discountPrice < unitPrice) {
                salePrice = Number(variant.discountPrice);
            } else if (!variant && product.salePrice != null && product.salePrice > 0 && product.salePrice < unitPrice) {
                salePrice = Number(product.salePrice);
            }
            
            const itemTotal = (item.quantity || 1) * salePrice;
            subtotal += itemTotal;

            processedItems.push({
                productId: item.productId,
                variantId: item.variantId,
                name: product.name,
                sku: variant ? (variant.sku || product.sku) : product.sku,
                thumbnail: variant?.image || product.thumbnail || (product.images && product.images[0]),
                quantity: item.quantity,
                price: unitPrice,
                salePrice: salePrice,
                priceSnapshot: salePrice, // Correctly set to the price charged
                size: item.size || variant?.size || '',
                color: item.color || variant?.color || '',
                subtotal: itemTotal,
                total: itemTotal,
                taxAmount: 0 
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

        // Handle shipping address mapping
        const resolvedShipping = shipping || shipping_address;
        const shippingToSave = {
            name: (resolvedShipping?.first_name ? `${resolvedShipping.first_name} ${resolvedShipping.last_name || ''}` : resolvedShipping?.name) || '',
            email: resolvedShipping?.email || user.email,
            phone: resolvedShipping?.phone || '',
            address: resolvedShipping?.address_1 || resolvedShipping?.address_line1 || '',
            address2: resolvedShipping?.address_2 || resolvedShipping?.address_line2 || '',
            city: resolvedShipping?.city || '',
            state: resolvedShipping?.state || '',
            pincode: resolvedShipping?.postcode || resolvedShipping?.pincode || '',
            country: resolvedShipping?.country || 'India'
        };

        const taxTotal = processedItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
        const shippingCost = subtotal > 0 ? 100 : 0;
        const grandTotal = subtotal - discountTotal + taxTotal + shippingCost;

        const order = await Order.create({
            userId,
            tenant_id: tenantId, // Match model field name
            orderId: generateOrderNumber(), // Match model field name
            status: 'pending',
            paymentStatus: 'pending',
            fulfillment_status: 'unfulfilled', // Match model field name
            items: processedItems,
            subtotal,
            discount: discountTotal,
            discountTotal,
            tax: taxTotal,
            taxTotal,
            shipping: shippingCost,
            shippingCost,
            total: grandTotal,
            total_amount: grandTotal,
            finalTotal: grandTotal,
            couponId: appliedCouponId,
            couponCode: appliedCouponCode,
            paymentMethod: paymentMethod || 'cod',
            userEmail: user.email, // Match model field name
            userName: user.name, // Match model field name
            customerEmail: user.email,
            customerPhone: user.phone || shippingToSave.phone,
            billing: shippingToSave, // Default billing to shipping for simplicity
            shippingAddress: shippingToSave,
            shipping_address: resolvedShipping, // Save raw if provided
            customerNotes
        });
        
        // Handle stock management for COD orders immediately
        if (paymentMethod === 'cod') {
            for (const item of processedItems) {
                if (item.variantId) {
                    await productService.decrementStock(item.productId, item.variantId, item.quantity);
                }
            }
        }

        // Log order created event with fail-safe
        try {
            await orderEventService.logEvent(
                order._id,
                'order_created',
                `Order ${order.orderId} created (${paymentMethod === 'cod' ? 'COD' : 'Online'})`,
                { grandTotal },
                userId,
                'customer'
            );
        } catch (eventError) {
            console.error('Failed to log order event:', eventError.message);
        }

        // Initialize Razorpay payment if payment method is not COD
        let razorpayData = null;
        if (paymentMethod !== 'cod') {
            const RazorpayGateway = require('../services/payments/RazorpayGateway');
            
            if (RazorpayGateway.isConfigured()) {
                const paymentResult = await RazorpayGateway.createPayment({
                    orderId: order._id,
                    orderNumber: order.orderId,
                    userId,
                    amount: grandTotal,
                    currency: 'INR',
                    receipt: `order_${order._id}_${Date.now()}`
                });

                if (paymentResult.success) {
                    razorpayData = {
                        razorpay_order_id: paymentResult.orderId,
                        razorpayOrderId: paymentResult.orderId,
                        amount: paymentResult.amount * 100, // Convert to paise
                        currency: paymentResult.currency,
                        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
                        key: process.env.RAZORPAY_KEY_ID
                    };
                }
            } else {
                // Mock payment for development
                razorpayData = {
                    razorpay_order_id: `order_mock_${Date.now()}`,
                    razorpayOrderId: `order_mock_${Date.now()}`,
                    amount: grandTotal * 100,
                    currency: 'INR',
                    razorpay_key_id: 'rzp_test_mock_key',
                    key: 'rzp_test_mock_key',
                    is_mock: true,
                    isMock: true
                };
            }
        }

        const responseData = {
            ...order.toObject(),
            order_id: order._id,
            orderId: order._id,
            ...(razorpayData || {})
        };

        return successResponse(res, responseData, 'Order created successfully', httpStatus.CREATED);
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

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        return res.paginatedResponse(orders, {
            page: parseInt(page),
            limit: parseInt(limit),
            total
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
        const { page = 1, limit = 20, status, tenantId, search } = req.query;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);

        const resolvedTenantId = [tenantId, req.tenantId, req.user?.tenantId, req.user?.tenant_id, 1]
            .map((value) => Number(value))
            .find((value) => Number.isFinite(value) && value > 0);

        const tenantFilter = resolvedTenantId ? buildTenantScope(resolvedTenantId) : {};
        const listFilters = [tenantFilter];

        if (status && status !== 'all') {
            listFilters.push({ status });
        }

        const normalizedSearch = typeof search === 'string' ? search.trim() : '';
        if (normalizedSearch) {
            const searchRegex = new RegExp(escapeRegex(normalizedSearch), 'i');
            listFilters.push({ $or: [
                { orderId: searchRegex },
                { userName: searchRegex },
                { userEmail: searchRegex },
                { 'shippingAddress.name': searchRegex },
                { couponCode: searchRegex }
            ] });
        }

        const listFilter = andQuery(...listFilters);

        const revenueField = { $ifNull: ['$total_amount', { $ifNull: ['$total', 0] }] };

        const [total, orders, totalCount, pendingCount, shippedCount, revenueResult, todayCount] = await Promise.all([
            Order.countDocuments(listFilter),
            Order.find(listFilter)
                .sort({ created_at: -1 })
                .skip((parsedPage - 1) * parsedLimit)
                .limit(parsedLimit),
            Order.countDocuments(tenantFilter),
            Order.countDocuments(andQuery(
                tenantFilter,
                { status: { $in: ['pending', 'pending_payment'] } }
            )),
            Order.countDocuments(andQuery(
                tenantFilter,
                { status: 'shipped' }
            )),
            Order.aggregate([
                {
                    $match: andQuery(
                        tenantFilter,
                        { status: { $nin: ['cancelled', 'payment_failed', 'refunded'] } }
                    )
                },
                { $group: { _id: null, totalRevenue: { $sum: revenueField } } }
            ]),
            // Today's orders count
            Order.countDocuments(andQuery(
                tenantFilter,
                { created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
            ))
        ]);

        const totalRevenue = revenueResult.length > 0 ? (revenueResult[0].totalRevenue || 0) : 0;

        return successResponse(
            res,
            {
                orders,
                stats: {
                    total: totalCount,
                    pending: pendingCount,
                    shipped: shippedCount,
                    totalRevenue,
                    today: todayCount || 0
                }
            },
            'Orders retrieved successfully',
            httpStatus.OK,
            {
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total,
                    totalPages: Math.max(Math.ceil(total / parsedLimit), 1)
                }
            }
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Update Order Status (Admin)
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, paymentStatus, fulfillmentStatus, internalNotes } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');

        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;
        if (internalNotes !== undefined) order.internalNotes = internalNotes;

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

/**
 * Confirm Payment (Customer)
 */
const confirmPayment = async (req, res, next) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (order.userId.toString() !== req.user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized');
        }

        // Check if it's mock payment
        const isMockPayment = razorpay_signature === 'mock_signature' || razorpay_payment_id?.includes('mock');

        if (!isMockPayment) {
            // Verify Razorpay signature
            const RazorpayGateway = require('../services/payments/RazorpayGateway');
            const verification = RazorpayGateway.verifyPayment(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );

            if (!verification.success) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment signature');
            }
        }

        // Update order status
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.paymentMethod = 'razorpay';
        order.transactionId = razorpay_payment_id;
        await order.save();

        // Decrement stock for online products upon payment confirmation
        try {
            for (const item of order.items) {
                if (item.variantId) {
                    const decremented = await productService.decrementStock(item.productId, item.variantId, item.quantity);
                    if (!decremented) {
                        console.warn(`[OrderController] Failed to decrement stock for product ${item.productId}, variant ${item.variantId}. Possibly insufficient stock.`);
                    }
                }
            }
        } catch (stockError) {
            console.error('[OrderController] Stock decrement error:', stockError.message);
        }

        await orderEventService.logEvent(
            order._id,
            'payment_confirmed',
            `Payment confirmed for order ${order.orderId}`,
            { razorpay_payment_id, razorpay_order_id },
            req.user.id,
            'customer'
        );

        return successResponse(res, order, 'Payment confirmed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getCustomerOrders,
    getOrder,
    confirmPayment,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    getOrderAnalytics
};
