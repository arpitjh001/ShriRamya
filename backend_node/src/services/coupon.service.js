/**
 * Enhanced Coupon Service
 * Handles coupon creation, validation, and application logic
 */

const { mysqlPool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

class CouponService {
  /**
   * Create a new coupon
   */
  async createCoupon(couponData) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Validate coupon data
      this._validateCouponData(couponData);

      // Check if code already exists
      const [existing] = await connection.query(
        'SELECT id FROM coupons WHERE code = ?',
        [couponData.code]
      );

      if (existing.length > 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
      }

      // Insert coupon
      const [result] = await connection.query(
        `INSERT INTO coupons (
          code, type, value, min_cart_value, max_discount,
          usage_limit, used_count, starts_at, expires_at, status,
          applicable_products, applicable_categories, buy_x_qty, get_y_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          couponData.code,
          couponData.type || 'percentage',
          couponData.value || 0,
          couponData.min_cart_value || 0,
          couponData.max_discount || null,
          couponData.usage_limit || null,
          0,
          couponData.starts_at || null,
          couponData.expires_at || null,
          couponData.status || 'active',
          couponData.applicable_products ? JSON.stringify(couponData.applicable_products) : null,
          couponData.applicable_categories ? JSON.stringify(couponData.applicable_categories) : null,
          couponData.buy_x_qty || 1,
          couponData.get_y_qty || 1
        ]
      );

      await connection.commit();

      return this.getCouponById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id) {
    const [rows] = await mysqlPool.query('SELECT * FROM coupons WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    }

    return this._formatCoupon(rows[0]);
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code) {
    const [rows] = await mysqlPool.query('SELECT * FROM coupons WHERE code = ?', [code]);
    
    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    }

    return this._formatCoupon(rows[0]);
  }

  /**
   * Get all coupons with filters
   */
  async getAllCoupons(params = {}) {
    const {
      page = 1,
      per_page = 20,
      status,
      type,
      search
    } = params;

    const offset = (page - 1) * per_page;
    let query = 'SELECT * FROM coupons WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM coupons WHERE 1=1';
    const values = [];

    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      values.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      values.push(type);
    }

    if (search) {
      query += ' AND code LIKE ?';
      countQuery += ' AND code LIKE ?';
      values.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(parseInt(per_page), parseInt(offset));

    const [rows] = await mysqlPool.query(query, values);
    const [countResult] = await mysqlPool.query(countQuery, values.slice(0, -2));

    return {
      coupons: rows.map(coupon => this._formatCoupon(coupon)),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / per_page)
      }
    };
  }

  /**
   * Update coupon
   */
  async updateCoupon(id, updateData) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if coupon exists
      const [existing] = await connection.query('SELECT id FROM coupons WHERE id = ?', [id]);
      if (existing.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
      }

      // Check if code is being changed and if it already exists
      if (updateData.code) {
        const [codeExists] = await connection.query(
          'SELECT id FROM coupons WHERE code = ? AND id != ?',
          [updateData.code, id]
        );
        if (codeExists.length > 0) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
        }
      }

      // Build update query
      const updates = [];
      const values = [];

      const allowedFields = [
        'code', 'type', 'value', 'min_cart_value', 'max_discount',
        'usage_limit', 'starts_at', 'expires_at', 'status',
        'applicable_products', 'applicable_categories', 'buy_x_qty', 'get_y_qty'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          if (field === 'applicable_products' || field === 'applicable_categories') {
            values.push(updateData[field] ? JSON.stringify(updateData[field]) : null);
          } else {
            values.push(updateData[field]);
          }
        }
      }

      if (updates.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update');
      }

      values.push(id);
      await connection.query(
        `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      await connection.commit();

      return this.getCouponById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(id) {
    const [result] = await mysqlPool.query('DELETE FROM coupons WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
    }

    return { id, deleted: true };
  }

  /**
   * Validate and apply coupon to cart
   */
  async validateAndApplyCoupon(couponCode, cartData, userId = null) {
    const coupon = await this.getCouponByCode(couponCode);

    // Check if coupon is active
    if (coupon.status !== 'active') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not active');
    }

    // Check expiry
    const now = new Date();
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon has expired');
    }

    // Check start date
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not yet active');
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached');
    }

    // Check user-specific usage (if needed, can add user_coupon_usage table)
    if (userId) {
      const [userUsage] = await mysqlPool.query(
        'SELECT COUNT(*) as count FROM cart_coupons cc JOIN coupons c ON cc.coupon_id = c.id WHERE cc.cart_id IN (SELECT id FROM carts WHERE user_id = ?) AND c.code = ?',
        [userId, couponCode]
      );
      // Optional: Limit one use per user
      // if (userUsage[0].count > 0) {
      //   throw new ApiError(httpStatus.BAD_REQUEST, 'You have already used this coupon');
      // }
    }

    // Check minimum cart value
    const cartTotal = cartData.subtotal || 0;
    if (coupon.min_cart_value && cartTotal < coupon.min_cart_value) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Minimum cart value of ₹${coupon.min_cart_value} required`
      );
    }

    // Check product eligibility
    if (coupon.applicable_products) {
      const applicableProducts = JSON.parse(coupon.applicable_products);
      const cartProductIds = cartData.items.map(item => item.product_id);
      const hasEligibleProduct = cartProductIds.some(pid => applicableProducts.includes(pid));
      
      if (!hasEligibleProduct) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not applicable to products in your cart');
      }
    }

    // Check category eligibility
    if (coupon.applicable_categories) {
      const applicableCategories = JSON.parse(coupon.applicable_categories);
      const cartCategoryIds = cartData.items.flatMap(item => item.category_ids || []);
      const hasEligibleCategory = cartCategoryIds.some(cid => applicableCategories.includes(cid));
      
      if (!hasEligibleCategory && coupon.applicable_categories.length > 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon is not applicable to categories in your cart');
      }
    }

    // Calculate discount
    const discount = this._calculateDiscount(coupon, cartData);

    return {
      coupon: this._formatCoupon(coupon),
      discount,
      finalTotal: Math.max(0, cartTotal - discount)
    };
  }

  /**
   * Calculate discount amount
   */
  _calculateDiscount(coupon, cartData) {
    const cartTotal = cartData.subtotal || 0;
    let discount = 0;

    switch (coupon.type) {
      case 'percentage':
        discount = (cartTotal * coupon.value) / 100;
        if (coupon.max_discount) {
          discount = Math.min(discount, coupon.max_discount);
        }
        break;

      case 'flat':
        discount = Math.min(coupon.value, cartTotal);
        break;

      case 'free_shipping':
        // Free shipping discount would be calculated based on shipping cost
        discount = cartData.shipping_cost || 0;
        break;

      case 'buy_x_get_y':
        // BOGO discount calculation
        discount = this._calculateBogoDiscount(coupon, cartData);
        break;

      default:
        discount = 0;
    }

    return Math.round(discount * 100) / 100;
  }

  /**
   * Calculate BOGO discount
   */
  _calculateBogoDiscount(coupon, cartData) {
    if (!cartData.items || cartData.items.length === 0) return 0;

    const buyX = coupon.buy_x_qty || 1;
    const getY = coupon.get_y_qty || 1;
    
    // Find eligible items
    let eligibleItems = cartData.items;
    
    if (coupon.applicable_products) {
      const applicableProducts = JSON.parse(coupon.applicable_products);
      eligibleItems = eligibleItems.filter(item => applicableProducts.includes(item.product_id));
    }

    if (eligibleItems.length === 0) return 0;

    // Sort by price (lowest first for discount)
    eligibleItems.sort((a, b) => a.price - b.price);

    let discount = 0;
    let totalQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // For every X items bought, get Y items free (cheapest ones)
    const sets = Math.floor(totalQty / (buyX + getY));
    
    if (sets > 0) {
      // Get the cheapest Y items for each set
      for (let i = 0; i < sets * getY && i < eligibleItems.length; i++) {
        discount += eligibleItems[i].price;
      }
    }

    return discount;
  }

  /**
   * Apply coupon to cart
   */
  async applyCouponToCart(cartId, couponCode, userId = null) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Get cart data
      const [cartRows] = await connection.query(
        `SELECT c.*, 
                (SELECT SUM(ci.quantity * ci.price_snapshot) FROM cart_items ci WHERE ci.cart_id = c.id) as subtotal
         FROM carts c WHERE c.id = ?`,
        [cartId]
      );

      if (cartRows.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
      }

      const cartData = cartRows[0];

      // Validate coupon
      const validation = await this.validateAndApplyCoupon(couponCode, cartData, userId);

      // Remove existing coupons from cart
      await connection.query('DELETE FROM cart_coupons WHERE cart_id = ?', [cartId]);

      // Get coupon ID
      const [couponRows] = await connection.query('SELECT id FROM coupons WHERE code = ?', [couponCode]);
      const couponId = couponRows[0].id;

      // Add coupon to cart
      await connection.query(
        `INSERT INTO cart_coupons (cart_id, coupon_id, discount_amount)
         VALUES (?, ?, ?)`,
        [cartId, couponId, validation.discount]
      );

      // Increment coupon usage
      await connection.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
        [couponId]
      );

      await connection.commit();

      return validation;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove coupon from cart
   */
  async removeCouponFromCart(cartId) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      // Get coupon info before removing
      const [cartCoupons] = await connection.query(
        'SELECT coupon_id FROM cart_coupons WHERE cart_id = ?',
        [cartId]
      );

      if (cartCoupons.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No coupon applied to cart');
      }

      const couponId = cartCoupons[0].coupon_id;

      // Remove coupon from cart
      await connection.query('DELETE FROM cart_coupons WHERE cart_id = ?', [cartId]);

      // Decrement coupon usage
      await connection.query(
        'UPDATE coupons SET used_count = used_count - 1 WHERE id = ? AND used_count > 0',
        [couponId]
      );

      await connection.commit();

      return { success: true, message: 'Coupon removed from cart' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get applied coupon for cart
   */
  async getAppliedCoupon(cartId) {
    const [rows] = await mysqlPool.query(
      `SELECT cc.*, c.code, c.type, c.value
       FROM cart_coupons cc
       JOIN coupons c ON cc.coupon_id = c.id
       WHERE cc.cart_id = ?`,
      [cartId]
    );

    if (rows.length === 0) {
      return null;
    }

    return {
      coupon_id: rows[0].coupon_id,
      code: rows[0].code,
      type: rows[0].type,
      value: rows[0].value,
      discount_amount: rows[0].discount_amount,
      applied_at: rows[0].applied_at
    };
  }

  /**
   * Validate coupon data
   */
  _validateCouponData(data) {
    if (!data.code || data.code.trim().length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
    }

    if (!data.value || data.value <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon value must be greater than 0');
    }

    const validTypes = ['percentage', 'flat', 'free_shipping', 'buy_x_get_y'];
    if (data.type && !validTypes.includes(data.type)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid coupon type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (data.type === 'percentage' && data.value > 100) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Percentage discount cannot exceed 100%');
    }

    if (data.max_discount && data.max_discount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Max discount must be greater than 0');
    }

    if (data.min_cart_value && data.min_cart_value < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Minimum cart value cannot be negative');
    }
  }

  /**
   * Format coupon response
   */
  _formatCoupon(coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      min_cart_value: coupon.min_cart_value ? Number(coupon.min_cart_value) : null,
      max_discount: coupon.max_discount ? Number(coupon.max_discount) : null,
      usage_limit: coupon.usage_limit,
      used_count: coupon.used_count,
      remaining_uses: coupon.usage_limit ? coupon.usage_limit - coupon.used_count : null,
      starts_at: coupon.starts_at,
      expires_at: coupon.expires_at,
      status: coupon.status,
      applicable_products: coupon.applicable_products ? JSON.parse(coupon.applicable_products) : null,
      applicable_categories: coupon.applicable_categories ? JSON.parse(coupon.applicable_categories) : null,
      buy_x_qty: coupon.buy_x_qty,
      get_y_qty: coupon.get_y_qty,
      created_at: coupon.created_at,
      updated_at: coupon.updated_at
    };
  }
}

module.exports = new CouponService();
