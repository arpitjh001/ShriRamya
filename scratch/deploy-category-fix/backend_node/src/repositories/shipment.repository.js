const mongoose = require('mongoose');

const { Shipment } = require('../models');

class ShipmentRepository {
  async create(shipmentData) {
    return Shipment.create(shipmentData);
  }

  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return null;
    }

    return Shipment.findById(id).populate('orderId');
  }

  async getByOrderId(orderId) {
    if (!mongoose.Types.ObjectId.isValid(String(orderId))) {
      return [];
    }

    return Shipment.find({ orderId }).sort({ created_at: -1 }).populate('orderId');
  }

  async findByTrackingNumber(trackingNumber) {
    return Shipment.findOne({ trackingNumber }).populate('orderId');
  }

  async update(id, update) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return null;
    }

    const hasOperators = Object.keys(update || {}).some((key) => key.startsWith('$'));
    const normalizedUpdate = !hasOperators
      ? update
      : Object.entries(update || {}).reduce((accumulator, [key, value]) => {
          if (key.startsWith('$')) {
            accumulator[key] = value;
          } else {
            accumulator.$set = {
              ...(accumulator.$set || {}),
              [key]: value,
            };
          }

          return accumulator;
        }, {});

    return Shipment.findByIdAndUpdate(id, normalizedUpdate, { new: true }).populate('orderId');
  }

  async updateStatus(id, status, historyEntry = null) {
    const update = {
      $set: {
        status,
      },
    };

    if (historyEntry) {
      update.$push = {
        history: historyEntry,
      };
    }

    if (status === 'delivered') {
      update.$set.actualDelivery = new Date();
    }

    if (['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'exception'].includes(status)) {
      update.$set.shippedAt = new Date();
    }

    return this.update(id, update);
  }

  async list(filter = {}, options = {}) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.max(Number(options.limit) || 20, 1);
    const skip = (page - 1) * limit;

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId'),
      Shipment.countDocuments(filter),
    ]);

    return {
      shipments,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return null;
    }

    return Shipment.findByIdAndDelete(id);
  }
}

module.exports = new ShipmentRepository();
