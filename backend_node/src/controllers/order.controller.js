/**
 * Order Controller (Enhanced)
 * Complete order management with customer and admin APIs
 */

const httpStatus = require('http-status');
const { mysqlPool } = require('../config/db');
const orderStateMachine = require('../services/orderStateMachine.service');
const orderEventService = require('../services/events/orderEvent.service');
const shipmentService = require('../services/shipment.service');
const refundService = require('../services/refund.service');
const { successResponse } = require('../utils/response');
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

/**
 * Create Order (Customer)
 * POST /api/v1/orders
 */
const createOrder = async (req, res, next) => {
    const connection = await mysqlPool.getConnection();
    
    try {
        await connection.beginTransaction();

        const {
            items,
            billing,
            shipping,
            paymentMethod,
            customerNotes,
            couponCode
        } = req.body;

        // Validate items
        if (!items || items.length === 0) {
            throw new Error('Order items are required');
        }

        const userId = req.user.id;

        // Get user details
        const [userRows] = await connection.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        const user = userRows[0];

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            // Get product/variant details
            const [productRows] = await connection.query(
                'SELECT * FROM products WHERE id = ?',
                [item.productId]
            );

            if (productRows.length === 0) {
                throw new Error(`Product ${item.productId} not found`);
            }

            const product = productRows[0];
            let unitPrice = product.base_price || 0;

            // Get variant price if applicable
            if (item.variantId) {
                const [variantRows] = await connection.query(
                    'SELECT * FROM product_variants WHERE id = ? AND product_id = ?',
                    [item.variantId, item.productId]
                );

                if (variantRows.length > 0) {
                    const variant = variantRows[0];
                    unitPrice = variant.price || unitPrice;
                }
            }

            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                productId: item.productId,
                variantId: item.variantId || null,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                unitPrice,
                subtotal: itemTotal,
                taxAmount: itemTotal * 0.18, // 18% GST (configurable)
                discountAmount: 0,
                total: itemTotal,
                variantAttributes: item.attributes || null
            });
        }

        // Calculate totals
        const discountTotal = 0; // Apply coupon logic here
        const taxTotal = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);
        const shippingCost = subtotal > 5000 ? 0 : 100; // Free shipping above 5000
        const grandTotal = subtotal - discountTotal + taxTotal + shippingCost;

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const [orderResult] = await connection.query(
            `INSERT INTO orders 
            (user_id, order_number, status, payment_status, fulfillment_status,
             subtotal, discount_total, tax_total, shipping_cost, grand_total,
             payment_method, customer_email, customer_phone,
             billing_first_name, billing_last_name, billing_address_1, billing_address_2,
             billing_city, billing_state, billing_postcode, billing_country,
             shipping_first_name, shipping_last_name, shipping_address_1, shipping_address_2,
             shipping_city, shipping_state, shipping_postcode, shipping_country,
             customer_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                orderNumber,
                ORDER_STATUS.PENDING_PAYMENT,
                'pending',
                'unfulfilled',
                subtotal,
                discountTotal,
                taxTotal,
                shippingCost,
                grandTotal,
                paymentMethod || 'cod',
                user.email,
                user.phone || billing.phone,
                billing.firstName,
                billing.lastName,
                billing.address1,
                billing.address2 || null,
                billing.city,
                billing.state,
                billing.postcode,
                billing.country || 'IN',
                shipping.firstName,
                shipping.lastName,
                shipping.address1,
                shipping.address2 || null,
                shipping.city,
                shipping.state,
                shipping.postcode,
                shipping.country || 'IN',
                customerNotes || null
            ]
        );

        const orderId = orderResult.insertId;

        // Create order items
        for (const item of orderItems) {
            await connection.query(
                `INSERT INTO order_items 
                (order_id, product_id, variant_id, product_name, product_sku,
                 quantity, unit_price, subtotal, tax_amount, discount_amount, total,
                 variant_attributes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.productId,
                    item.variantId,
                    item.productName,
                    item.productSku,
                    item.quantity,
                    item.unitPrice,
                    item.subtotal,
                    item.taxAmount,
                    item.discountAmount,
                    item.total,
                    item.variantAttributes ? JSON.stringify(item.variantAttributes) : null
                ]
            );

            // Reserve inventory
            if (item.variantId) {
                await connection.query(
                    `INSERT INTO inventory_reservations 
                    (order_id, variant_id, quantity, status, expires_at)
                    VALUES (?, ?, ?, 'reserved', DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
                    [orderId, item.variantId, item.quantity]
                );
            }
        }

        // Log order created event
        await orderEventService.logEvent(
            orderId,
            'order_created',
            `Order ${orderNumber} created`,
            { grandTotal, itemCount: items.length },
            userId,
            'customer',
            connection
        );

        await connection.commit();

        // Get full order details
        const order = await getFullOrder(orderId);

        return successResponse(res, order, 'Order created successfully', httpStatus.CREATED);
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Get Customer Orders
 * GET /api/v1/my/orders
 */
const getCustomerOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user.id;

        const offset = (page - 1) * limit;
        let whereClause = 'user_id = ?';
        const params = [userId];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Get total count
        const [countRows] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM orders WHERE ${whereClause}`,
            params
        );
        const total = countRows[0].count;

        // Get orders
        params.push(parseInt(limit), parseInt(offset));
        const [orders] = await mysqlPool.query(
            `SELECT * FROM orders 
             WHERE ${whereClause} 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            params
        );

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
 * Get Order Details (Customer/Admin)
 * GET /api/v1/orders/:id
 */
const getOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await getFullOrder(orderId);

        // Check authorization
        if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
            const error = new Error('Not authorized to view this order');
            error.statusCode = httpStatus.FORBIDDEN;
            throw error;
        }

        return successResponse(res, order);
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel Order (Customer)
 * POST /api/v1/my/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const { reason } = req.body;
        const userId = req.user.id;

        // Get order
        const order = await orderStateMachine.getOrder(orderId);
        
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = httpStatus.NOT_FOUND;
            throw error;
        }

        // Check ownership
        if (order.user_id !== userId) {
            const error = new Error('Not authorized to cancel this order');
            error.statusCode = httpStatus.FORBIDDEN;
            throw error;
        }

        // Cancel order
        const updatedOrder = await orderStateMachine.cancelOrder(orderId, {
            userId,
            userType: 'customer',
            reason: reason || 'Customer requested cancellation'
        });

        return successResponse(res, updatedOrder, 'Order cancelled successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Orders (Admin)
 * GET /api/v1/admin/orders
 */
const getAllOrders = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            paymentStatus,
            fulfillmentStatus,
            startDate,
            endDate,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        if (paymentStatus) {
            whereClause += ' AND payment_status = ?';
            params.push(paymentStatus);
        }
        if (fulfillmentStatus) {
            whereClause += ' AND fulfillment_status = ?';
            params.push(fulfillmentStatus);
        }
        if (startDate) {
            whereClause += ' AND created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ' AND created_at <= ?';
            params.push(endDate);
        }
        if (search) {
            whereClause += ' AND (order_number LIKE ? OR customer_email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        const [countRows] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM orders WHERE ${whereClause}`,
            params
        );
        const total = countRows[0].count;

        // Get orders
        params.push(parseInt(limit), parseInt(offset));
        const [orders] = await mysqlPool.query(
            `SELECT * FROM orders 
             WHERE ${whereClause} 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            params
        );

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
 * PATCH /api/v1/admin/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status, paymentStatus, fulfillmentStatus, reason } = req.body;
        const userId = req.user.id;

        let updatedOrder;

        if (status) {
            updatedOrder = await orderStateMachine.transitionStatus(orderId, status, {
                userId,
                userType: 'admin',
                reason
            });
        } else if (paymentStatus) {
            updatedOrder = await orderStateMachine.transitionPaymentStatus(orderId, paymentStatus, {
                userId,
                userType: 'admin',
                reason
            });
        } else if (fulfillmentStatus) {
            updatedOrder = await orderStateMachine.transitionFulfillmentStatus(orderId, fulfillmentStatus, {
                userId,
                userType: 'admin',
                reason
            });
        }

        return successResponse(res, updatedOrder, 'Order status updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get Order Analytics (Admin)
 * GET /api/v1/admin/analytics/orders
 */
const getOrderAnalytics = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = startDate && endDate 
            ? `WHERE created_at BETWEEN '${startDate}' AND '${endDate}'`
            : '';

        // Total orders
        const [totalOrders] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM orders ${dateFilter}`
        );

        // Total revenue
        const [revenue] = await mysqlPool.query(
            `SELECT SUM(grand_total) as total FROM orders WHERE status != 'cancelled' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '') : ''}`
        );

        // Average order value
        const [avgOrder] = await mysqlPool.query(
            `SELECT AVG(grand_total) as avg FROM orders WHERE status != 'cancelled' ${dateFilter ? 'AND ' + dateFilter.replace('WHERE', '') : ''}`
        );

        // Orders by status
        const [byStatus] = await mysqlPool.query(
            `SELECT status, COUNT(*) as count FROM orders ${dateFilter} GROUP BY status`
        );

        // Recent orders count (last 7 days)
        const [recentOrders] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        return successResponse(res, {
            totalOrders: totalOrders[0].count,
            totalRevenue: parseFloat(revenue[0].total || 0),
            averageOrderValue: parseFloat(avgOrder[0].avg || 0),
            ordersByStatus: byStatus,
            recentOrdersCount: recentOrders[0].count,
            period: { startDate, endDate }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: Get full order details
 */
async function getFullOrder(orderId) {
    const [orders] = await mysqlPool.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
    );

    if (orders.length === 0) {
        const error = new Error('Order not found');
        error.statusCode = httpStatus.NOT_FOUND;
        throw error;
    }

    const order = orders[0];

    // Get order items
    const [items] = await mysqlPool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
    );

    // Get order events
    const events = await orderEventService.getOrderTimeline(orderId);

    // Get shipments
    const shipments = await shipmentService.getOrderShipments(orderId);

    // Get refunds
    const refunds = await refundService.getOrderRefunds(orderId);

    return {
        ...order,
        items,
        events,
        shipments,
        refunds
    };
}

module.exports = {
    createOrder,
    getCustomerOrders,
    getOrder,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    getOrderAnalytics
};
