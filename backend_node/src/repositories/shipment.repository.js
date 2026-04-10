/**
 * Shipment Repository (MongoDB)
 */

const { Shipment } = require('../models');

class ShipmentRepository {
    /**
     * Create a new shipment
     */
    async create(shipmentData) {
        return await Shipment.create(shipmentData);
    }

    /**
     * Find shipment by ID
     */
    async findById(id) {
        return await Shipment.findById(id);
    }

    /**
     * Find shipment by order ID
     */
    async findByOrderId(orderId) {
        return await Shipment.findOne({ orderId });
    }

    /**
     * Find shipment by tracking number
     */
    async findByTrackingNumber(trackingNumber) {
        return await Shipment.findOne({ trackingNumber });
    }

    /**
     * Update shipment status
     */
    async updateStatus(id, status, location, description) {
        const update = {
            $set: { status },
            $push: {
                history: {
                    status,
                    location,
                    description,
                    timestamp: new Date()
                }
            }
        };

        if (status === 'delivered') {
            update.$set.actualDelivery = new Date();
        }

        return await Shipment.findByIdAndUpdate(id, update, { new: true });
    }

    /**
     * List shipments with filters
     */
    async list(filter = {}, options = {}) {
        const { limit = 20, page = 1 } = options;
        const skip = (page - 1) * limit;

        const shipments = await Shipment.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const count = await Shipment.countDocuments(filter);

        return {
            shipments,
            total: count,
            pages: Math.ceil(count / limit)
        };
    }
}

module.exports = new ShipmentRepository();
