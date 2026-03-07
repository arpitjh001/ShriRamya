/**
 * Shipment Repository
 * Database operations for shipments
 */

const { mysqlPool } = require('../config/db');

class ShipmentRepository {
    /**
     * Create a new shipment
     * @param {Object} shipmentData - Shipment data
     * @returns {Promise<number>} Shipment ID
     */
    async create(shipmentData) {
        const [result] = await mysqlPool.query(
            `INSERT INTO shipments 
            (order_id, carrier, tracking_number, tracking_url, status, 
             shipping_method, shipping_weight, shipping_dimensions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shipmentData.orderId,
                shipmentData.carrier,
                shipmentData.trackingNumber || null,
                shipmentData.trackingUrl || null,
                shipmentData.status || 'pending',
                shipmentData.shippingMethod || null,
                shipmentData.shippingWeight || null,
                shipmentData.shippingDimensions || null
            ]
        );
        return result.insertId;
    }

    /**
     * Get shipment by ID
     * @param {number} id - Shipment ID
     * @returns {Promise<Object|null>}
     */
    async getById(id) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM shipments WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Get shipments by order ID
     * @param {number} orderId - Order ID
     * @returns {Promise<Object[]>}
     */
    async getByOrderId(orderId) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC',
            [orderId]
        );
        return rows;
    }

    /**
     * Get shipment by tracking number
     * @param {string} trackingNumber - Tracking number
     * @returns {Promise<Object|null>}
     */
    async getByTrackingNumber(trackingNumber) {
        const [rows] = await mysqlPool.query(
            'SELECT * FROM shipments WHERE tracking_number = ?',
            [trackingNumber]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Update shipment
     * @param {number} id - Shipment ID
     * @param {Object} updateData - Update data
     * @returns {Promise<boolean>}
     */
    async update(id, updateData) {
        const updateFields = [];
        const updateValues = [];

        if (updateData.carrier !== undefined) {
            updateFields.push('carrier = ?');
            updateValues.push(updateData.carrier);
        }
        if (updateData.trackingNumber !== undefined) {
            updateFields.push('tracking_number = ?');
            updateValues.push(updateData.trackingNumber);
        }
        if (updateData.trackingUrl !== undefined) {
            updateFields.push('tracking_url = ?');
            updateValues.push(updateData.trackingUrl);
        }
        if (updateData.status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(updateData.status);
        }
        if (updateData.shippingMethod !== undefined) {
            updateFields.push('shipping_method = ?');
            updateValues.push(updateData.shippingMethod);
        }

        // Add timestamp fields based on status
        if (updateData.status === 'shipped') {
            updateFields.push('shipped_at = NOW()');
        }
        if (updateData.status === 'delivered') {
            updateFields.push('delivered_at = NOW()');
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        const [result] = await mysqlPool.query(
            `UPDATE shipments SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        return result.affectedRows > 0;
    }

    /**
     * Update shipment status
     * @param {number} id - Shipment ID
     * @param {string} status - New status
     * @returns {Promise<boolean>}
     */
    async updateStatus(id, status) {
        return await this.update(id, { status });
    }

    /**
     * Get all shipments with pagination
     * @param {Object} options - Options (page, limit, status, carrier)
     * @returns {Promise<Object>}
     */
    async getAll(options = {}) {
        const { page = 1, limit = 20, status = null, carrier = null } = options;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        if (carrier) {
            whereClause += ' AND carrier = ?';
            params.push(carrier);
        }

        // Get total count
        const [countRows] = await mysqlPool.query(
            `SELECT COUNT(*) as count FROM shipments WHERE ${whereClause}`,
            params
        );
        const total = countRows[0].count;

        // Get shipments
        params.push(limit, offset);
        const [rows] = await mysqlPool.query(
            `SELECT * FROM shipments 
             WHERE ${whereClause} 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            params
        );

        return {
            shipments: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Delete shipment
     * @param {number} id - Shipment ID
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        const [result] = await mysqlPool.query(
            'DELETE FROM shipments WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * Create shipment item
     * @param {Object} itemData - Item data
     * @returns {Promise<number>}
     */
    async createShipmentItem(itemData) {
        const [result] = await mysqlPool.query(
            'INSERT INTO shipment_items (shipment_id, order_item_id, quantity) VALUES (?, ?, ?)',
            [itemData.shipmentId, itemData.orderItemId, itemData.quantity]
        );
        return result.insertId;
    }

    /**
     * Get shipment items
     * @param {number} shipmentId - Shipment ID
     * @returns {Promise<Object[]>}
     */
    async getShipmentItems(shipmentId) {
        const [rows] = await mysqlPool.query(
            `SELECT si.*, oi.product_name, oi.product_sku, oi.quantity as ordered_quantity
             FROM shipment_items si
             INNER JOIN order_items oi ON si.order_item_id = oi.id
             WHERE si.shipment_id = ?`,
            [shipmentId]
        );
        return rows;
    }

    /**
     * Get shipments by status
     * @param {string} status - Status
     * @returns {Promise<Object[]>}
     */
    async getByStatus(status) {
        const [rows] = await mysqlPool.query(
            `SELECT s.*, o.order_number, o.customer_email
             FROM shipments s
             INNER JOIN orders o ON s.order_id = o.id
             WHERE s.status = ?
             ORDER BY s.created_at DESC`,
            [status]
        );
        return rows;
    }

    /**
     * Get pending shipments
     * @returns {Promise<Object[]>}
     */
    async getPendingShipments() {
        return await this.getByStatus('pending');
    }

    /**
     * Get shipments ready to ship (paid orders without shipment)
     * @returns {Promise<Object[]>}
     */
    async getReadyToShip() {
        const [rows] = await mysqlPool.query(
            `SELECT o.*
             FROM orders o
             LEFT JOIN shipments s ON o.id = s.order_id
             WHERE o.payment_status = 'paid' 
             AND o.fulfillment_status = 'unfulfilled'
             AND s.id IS NULL
             ORDER BY o.created_at ASC`
        );
        return rows;
    }
}

module.exports = new ShipmentRepository();
