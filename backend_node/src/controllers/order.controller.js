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
const orderStateMachine = require('../services/orderStateMachine.service');
const { ORDER_STATUS } = require('../services/orderStateMachine.service');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}-${timestamp}`;
}

function buildRazorpayReceipt(order) {
    const orderIdPart = String(order?._id || '').slice(-12);
    const timePart = String(Date.now()).slice(-8);
    return `rcpt_${orderIdPart}_${timePart}`;
}

function escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SHIPPING_CHARGE = 100;
const FREE_SHIPPING_THRESHOLD = 2500;

function calculateShippingCharge(subtotal) {
    const numericSubtotal = Number(subtotal || 0);
    if (numericSubtotal <= 0 || numericSubtotal >= FREE_SHIPPING_THRESHOLD) {
        return 0;
    }

    return SHIPPING_CHARGE;
}

/**
 * Create Order (Customer) - Supports Guest Checkout
 */
const createOrder = async (req, res, next) => {
    try {
        const {
            items,
            billing,
            shipping,
            shipping_address,
            paymentMethod,
            customerNotes,
            couponCode,
            tenantId = 1
        } = req.body;

        if (!items || items.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Order items are required');
        }

        // Authentication is now optional (Guest Checkout support)
        const userId = req.user ? req.user.id : null;
        const user = userId ? await User.findById(userId) : null;

        // Calculate totals
        let subtotal = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                throw new ApiError(httpStatus.NOT_FOUND, `Product ${item.productId} not found`);
            }

            const variant = item.variantId ? product.variants.id(item.variantId) : null;
            let unitPrice = variant ? (Number(variant.price) || 0) : (Number(product.basePrice || product.price) || 0);
            
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
                priceSnapshot: salePrice,
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
            email: resolvedShipping?.email || user?.email || '',
            phone: resolvedShipping?.phone || '',
            address: resolvedShipping?.address_1 || resolvedShipping?.address_line1 || '',
            address2: resolvedShipping?.address_2 || resolvedShipping?.address_line2 || '',
            city: resolvedShipping?.city || '',
            state: resolvedShipping?.state || '',
            pincode: resolvedShipping?.postcode || resolvedShipping?.pincode || '',
            country: resolvedShipping?.country || 'India'
        };

        const taxTotal = processedItems.reduce((sum, i) => sum + (i.taxAmount || 0), 0);
        const shippingCost = calculateShippingCharge(subtotal);
        const grandTotal = Math.round((subtotal - discountTotal + taxTotal + shippingCost) * 100) / 100;

        const normalizedPaymentMethod = paymentMethod || 'cod';
        const isOnlinePayment = normalizedPaymentMethod !== 'cod';

        const order = await Order.create({
            userId,
            tenant_id: tenantId,
            orderId: generateOrderNumber(),
            status: isOnlinePayment ? ORDER_STATUS.PENDING_PAYMENT : ORDER_STATUS.PENDING,
            paymentStatus: 'pending',
            fulfillment_status: 'unfulfilled',
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
            paymentMethod: normalizedPaymentMethod,
            userEmail: user?.email || shippingToSave.email,
            userName: user?.name || shippingToSave.name,
            customerEmail: user?.email || shippingToSave.email,
            customerPhone: user?.phone || shippingToSave.phone,
            billing: shippingToSave,
            shippingAddress: shippingToSave,
            shipping_address: resolvedShipping,
            customerNotes
        });
        
        if (normalizedPaymentMethod === 'cod') {
            try {
                // Use OrderStateMachine to handle PAID status and stock reduction for COD
                await orderStateMachine.transitionStatus(order._id, ORDER_STATUS.PAID, {
                    userId,
                    userType: userId ? 'customer' : 'guest',
                    reason: 'COD order creation'
                });
            } catch (stockError) {
                console.error('[OrderController] COD stock reduction failed:', stockError.message);
                // Optionally handle insufficient stock for COD here if not caught earlier
            }
        }

        try {
            await orderEventService.logEvent(
                order._id,
                'order_created',
                `Order ${order.orderId} created (${normalizedPaymentMethod === 'cod' ? 'COD' : 'Online'})`,
                { grandTotal },
                userId,
                userId ? 'customer' : 'guest'
            );
        } catch (eventError) {
            console.error('Failed to log order event:', eventError.message);
        }

        let razorpayData = null;
        if (normalizedPaymentMethod !== 'cod') {
            const RazorpayGateway = require('../services/payments/RazorpayGateway');
            const isProductionRuntime = String(config.env || process.env.NODE_ENV || '').toLowerCase() === 'production'
                || String(process.env.VERCEL_ENV || '').toLowerCase() === 'production';
            const razorpayKeyId = config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
            
            if (RazorpayGateway.isConfigured()) {
                try {
                    const paymentResult = await RazorpayGateway.createPayment({
                        orderId: order._id,
                        orderNumber: order.orderId,
                        userId,
                        amount: grandTotal,
                        currency: 'INR',
                        receipt: buildRazorpayReceipt(order)
                    });

                    if (paymentResult.success) {
                        razorpayData = {
                            razorpay_order_id: paymentResult.orderId,
                            razorpayOrderId: paymentResult.orderId,
                            amount: paymentResult.amountInPaise || paymentResult.amount_in_paise || Math.round(paymentResult.amount * 100),
                            amount_in_paise: paymentResult.amountInPaise || paymentResult.amount_in_paise || Math.round(paymentResult.amount * 100),
                            amountInPaise: paymentResult.amountInPaise || paymentResult.amount_in_paise || Math.round(paymentResult.amount * 100),
                            display_amount: paymentResult.amount,
                            currency: paymentResult.currency,
                            razorpay_key_id: razorpayKeyId,
                            key: razorpayKeyId
                        };
                    } else {
                        console.warn('[OrderController] Razorpay createPayment returned failure:', paymentResult.error);
                        if (isProductionRuntime) {
                            throw new ApiError(httpStatus.BAD_GATEWAY, paymentResult.error || 'Unable to initialize Razorpay payment');
                        }
                        // Fall back to mock payment
                        razorpayData = {
                            razorpay_order_id: `order_mock_${Date.now()}`,
                            razorpayOrderId: `order_mock_${Date.now()}`,
                            amount: Math.round(grandTotal * 100),
                            amount_in_paise: Math.round(grandTotal * 100),
                            amountInPaise: Math.round(grandTotal * 100),
                            display_amount: grandTotal,
                            currency: 'INR',
                            razorpay_key_id: 'rzp_test_mock_key',
                            key: 'rzp_test_mock_key',
                            is_mock: true,
                            isMock: true
                        };
                    }
                } catch (rzpError) {
                    console.error('[OrderController] Razorpay payment error:', rzpError.message);
                    if (isProductionRuntime) {
                        throw rzpError;
                    }
                    // Fall back to mock payment on any exception
                    razorpayData = {
                        razorpay_order_id: `order_mock_${Date.now()}`,
                        razorpayOrderId: `order_mock_${Date.now()}`,
                        amount: Math.round(grandTotal * 100),
                        amount_in_paise: Math.round(grandTotal * 100),
                        amountInPaise: Math.round(grandTotal * 100),
                        display_amount: grandTotal,
                        currency: 'INR',
                        razorpay_key_id: 'rzp_test_mock_key',
                        key: 'rzp_test_mock_key',
                        is_mock: true,
                        isMock: true
                    };
                }
            } else {
                if (isProductionRuntime) {
                    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Razorpay is not configured on the server');
                }
                razorpayData = {
                    razorpay_order_id: `order_mock_${Date.now()}`,
                    razorpayOrderId: `order_mock_${Date.now()}`,
                    amount: Math.round(grandTotal * 100),
                    amount_in_paise: Math.round(grandTotal * 100),
                    amountInPaise: Math.round(grandTotal * 100),
                    display_amount: grandTotal,
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

        if (req.user.role !== 'admin' && order.userId?.toString() !== req.user.id) {
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
        const { id } = req.params;
        let order;

        // Try lookup by Mongoose _id first, then by human-readable orderId
        if (require('mongoose').Types.ObjectId.isValid(id)) {
            order = await Order.findById(id);
        }
        
        if (!order) {
            order = await Order.findOne({ orderId: id });
        }

        if (!order) {
            console.warn(`[OrderController] Order not found for cancellation: ${id}`);
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        // Standardize user ID for comparison
        const currentUserId = (req.user.id || req.user._id || req.user.sub)?.toString();
        const orderUserId = order.userId?.toString();

        if (orderUserId !== currentUserId) {
            console.warn(`[OrderController] Unauthorized cancellation attempt. Order user: ${orderUserId}, Request user: ${currentUserId}`);
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only cancel your own orders');
        }

        const allowedStatuses = ['pending', 'confirmed', 'pending_payment', 'payment_failed', 'processing', 'paid'];
        if (!allowedStatuses.includes(order.status)) {
            console.warn(`[OrderController] Status mismatch for cancellation. Status: ${order.status}`);
            throw new ApiError(httpStatus.BAD_REQUEST, `Order in status '${order.status}' cannot be cancelled`);
        }

        // Use OrderStateMachine for cancellation and stock restoration
        await orderStateMachine.cancelOrder(order._id, {
            userId: currentUserId,
            userType: 'customer',
            reason: req.body?.reason || 'Cancelled by customer'
        });

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

        if (status && status !== order.status) {
            await orderStateMachine.transitionStatus(order._id, status, {
                userId: req.user.id,
                userType: 'admin',
                reason: internalNotes || `Status updated to ${status}`
            });
        }

        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;
        if (internalNotes !== undefined) order.internalNotes = internalNotes;

        await order.save();

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

        // Authorization check only if order has a userId
        if (order.userId && order.userId.toString() !== req.user?.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized');
        }

        const isMockPayment = razorpay_signature === 'mock_signature' || razorpay_payment_id?.includes('mock');

        if (!isMockPayment) {
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

        // Use OrderStateMachine to handle PAID status and atomic stock reduction
        await orderStateMachine.transitionStatus(order._id, ORDER_STATUS.PAID, {
            userId: req.user?.id || null,
            userType: req.user ? 'customer' : 'guest',
            metadata: { razorpay_payment_id, razorpay_order_id }
        });

        await orderEventService.logEvent(
            order._id,
            'payment_confirmed',
            `Payment confirmed for order ${order.orderId}`,
            { razorpay_payment_id, razorpay_order_id },
            req.user?.id || null,
            req.user ? 'customer' : 'guest'
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
