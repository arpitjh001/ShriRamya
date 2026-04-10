const Cart = require('../models/cart.model');
const mongoose = require('mongoose');

class CartMongoRepository {
  async createCart(userId = null, sessionId = null) {
    const cart = new Cart({ userId, sessionId, status: 'active', items: [] });
    await cart.save();
    return cart._id;
  }

  async getCartByUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    return await Cart.findOne({ userId, status: 'active' }).sort({ created_at: -1 });
  }

  async getCartBySession(sessionId) {
    return await Cart.findOne({ sessionId, status: 'active' }).sort({ created_at: -1 });
  }

  async getCartById(cartId) {
    if (!mongoose.Types.ObjectId.isValid(cartId)) return null;
    return await Cart.findById(cartId);
  }

  async addItem(cartId, variantId, quantity, priceSnapshot) {
    const cart = await Cart.findById(cartId);
    if (!cart) throw new Error('Cart not found');
    
    const existingItem = cart.items.find(item => item.variantId.toString() === variantId.toString());
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.priceSnapshot = priceSnapshot;
    } else {
      cart.items.push({ variantId, quantity, priceSnapshot });
    }
    
    await cart.save();
    return cart.items[cart.items.length - 1]._id;
  }

  async updateItemQuantity(cartId, cartItemId, quantity) {
    const cart = await Cart.findById(cartId);
    if (!cart) return false;
    
    if (quantity <= 0) {
      cart.items.pull(cartItemId);
    } else {
      const item = cart.items.id(cartItemId);
      if (item) item.quantity = quantity;
    }
    
    await cart.save();
    return true;
  }

  async removeItem(cartId, cartItemId) {
    const cart = await Cart.findById(cartId);
    if (!cart) return false;
    cart.items.pull(cartItemId);
    await cart.save();
    return true;
  }

  async clearCart(cartId) {
    const cart = await Cart.findById(cartId);
    if (!cart) return false;
    cart.items = [];
    cart.appliedCoupon = null;
    await cart.save();
    return true;
  }

  async getCartWithItems(cartId) {
    if (!mongoose.Types.ObjectId.isValid(cartId)) return null;
    // Note: In real scenarios, you'd populate variant and product details here.
    // To keep it consistent with the SQL repository's complex join:
    const cart = await Cart.findById(cartId).lean();
    if (!cart) return null;
    
    // Manual mapping to match the SQL response structure if needed by services
    // For now, returning the populated cart
    return cart;
  }

  async updateCartStatus(cartId, status) {
    if (!mongoose.Types.ObjectId.isValid(cartId)) return false;
    const result = await Cart.updateOne({ _id: cartId }, { $set: { status } });
    return result.modifiedCount > 0;
  }
}

module.exports = new CartMongoRepository();
