const Order = require('../models/order.model');
const mongoose = require('mongoose');

class OrderMongoRepository {
  async createOrder(data) {
    const order = new Order(data);
    await order.save();
    return order._id;
  }

  async getOrder(orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
    return await Order.findById(orderId).populate('items.productId');
  }

  async listOrders(filter = {}, options = {}, tenantId = 1) {
    const skip = (options.page - 1) * options.perPage;
    const limit = options.perPage;
    const query = { tenant_id: tenantId };
    if (filter.status) query.status = filter.status;
    if (filter.userId) query.userId = filter.userId;
    
    const orders = await Order.find(query).skip(skip).limit(limit).sort({ created_at: -1 });
    const total = await Order.countDocuments(query);
    return { orders, total, page: options.page, perPage: options.perPage };
  }

  async updateOrderStatus(orderId, status, historyEntry) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) return false;
    const update = { $set: { status } };
    if (historyEntry) update.$push = { status_history: historyEntry };
    
    const result = await Order.updateOne({ _id: orderId }, update);
    return result.modifiedCount > 0;
  }
}

module.exports = new OrderMongoRepository();
