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

            let unitPrice = product.basePrice || product.price || 0;
            let salePrice = product.salePrice || unitPrice;
            
            const itemTotal = (item.quantity || 1) * (salePrice || unitPrice);
            subtotal += itemTotal;

            processedItems.push({
                productId: item.productId,
                variantId: item.variantId,
                name: product.name,
                sku: product.sku,
                thumbnail: product.thumbnail || (product.images && product.images[0]),
                quantity: item.quantity,
                price: unitPrice,
                salePrice: salePrice,
                priceSnapshot: salePrice || unitPrice, // Mapping mandatory field
                size: item.size || '',
                color: item.color || '',
                subtotal: itemTotal,
                total: itemTotal,
                taxAmount: 0 // Explicitly set to 0 to avoid NaN
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
        // Standardized shipping logic: Free above 1000, else 100
        const shippingCost = subtotal > 1000 ? 0 : 100;
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

        // Log order created event with fail-safe
        try {
            await orderEventService.logEvent(
                order._id,
                'order_created',
                `Order ${order.orderId} created`,
                { grandTotal },
                userId,
                'customer'
            );
        } catch (eventError) {
            console.error('Failed to log order event:', eventError.message);
        }

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

        const revenueField = {
            $ifNull: [
                '$total',
                {
                    $ifNull: [
                        '$total_amount',
                        {
                            $ifNull: [
                                '$grandTotal',
                                { $ifNull: ['$finalTotal', 0] }
                            ]
                        }
                    ]
                }
            ]
        };

        const [total, orders, totalCount, pendingCount, shippedCount, revenueResult] = await Promise.all([
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
            ])
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        return successResponse(
            res,
            {
                orders,
                stats: {
                    total: totalCount,
                    pending: pendingCount,
                    shipped: shippedCount,
                    totalRevenue
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

module.exports = {
    createOrder,
    getCustomerOrders,
    getOrder,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    getOrderAnalytics
};
