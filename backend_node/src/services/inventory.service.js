const Product = require('../models/product.model');
const OfflineSale = require('../models/offlineSale.model');
const redis = require('../config/integrations/redis');
const { inventoryAuditService } = require('./inventory-audit.service');
const { buildTenantScopedQuery } = require('../utils/tenantScope');

class InventoryService {
  async clearProductListCache() {
    if (!redis) return;

    try {
      const keys = await redis.keys('api:products:list:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[InventoryService] clearProductListCache error:', error.message);
    }
  }

  normalizeAttributes(attributes) {
    if (!attributes) return {};
    if (attributes instanceof Map) {
      return Object.fromEntries(attributes.entries());
    }
    return { ...attributes };
  }

  getVariantValue(variant, key) {
    const attributes = this.normalizeAttributes(variant?.attributes);
    return attributes[key] || attributes[key.toLowerCase()] || attributes[key.charAt(0).toUpperCase() + key.slice(1)] || variant?.[key] || null;
  }

  normalizeCategories(categories = []) {
    return categories
      .map((category) => {
        if (!category) return null;
        const id = category.id || category._id;
        return {
          id: id?.toString() || null,
          _id: id?.toString() || null,
          name: category.name || '',
          slug: category.slug || '',
        };
      })
      .filter(Boolean);
  }

  getThumbnail(product, variant = null) {
    if (variant?.image) return variant.image;
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    return product.thumbnail || product.image || null;
  }

  getProductTotalStock(product) {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.reduce((sum, variant) => sum + (Number(variant.stock || 0) || 0), 0);
    }
    return Number(product.stock || 0) || 0;
  }

  mapInventoryItem(product, variant = null) {
    const categories = this.normalizeCategories(product.categories || []);
    const categoryNames = categories.map((category) => category.name).join(', ') || product.categoryName || '';
    const price = Number(variant?.price || product.basePrice || product.price || 0) || 0;
    const stock = Number(variant?.stock ?? product.stock ?? 0) || 0;
    const lowStockThreshold = Number(variant?.lowStockThreshold || 5) || 5;
    const color = variant ? (this.getVariantValue(variant, 'color') || '') : '';
    const size = variant ? (this.getVariantValue(variant, 'size') || '') : '';
    const productId = product._id?.toString() || String(product.productId || '');
    const variantId = variant?._id?.toString() || product._id?.toString() || null;

    return {
      id: variantId,
      variantId,
      productId,
      product_id: productId,
      productName: product.name || '',
      product_name: product.name || '',
      sku: variant?.sku || product.sku || '',
      thumbnail: this.getThumbnail(product, variant),
      categories,
      categoryNames,
      categoryName: categoryNames,
      color,
      size,
      price,
      stock,
      stock_level: stock,
      stock_quantity: stock,
      lowStockThreshold,
      low_stock_threshold: lowStockThreshold,
      stockStatus: stock === 0 ? 'out_of_stock' : stock <= lowStockThreshold ? 'low_stock' : 'in_stock',
      stock_status: stock === 0 ? 'out_of_stock' : stock <= lowStockThreshold ? 'low_stock' : 'in_stock',
      isLowStock: stock > 0 && stock <= lowStockThreshold,
      isOutOfStock: stock === 0,
      lastSaleChannel: variant?.lastSaleChannel || null,
      soldOffline: variant?.lastSaleChannel === 'offline',
      soldOfflineAt: variant?.soldOfflineAt || null,
      offlineSoldQuantity: Number(variant?.offlineSoldQuantity || 0) || 0,
      productTotalStock: this.getProductTotalStock(product),
      product_total_stock: this.getProductTotalStock(product),
    };
  }

  async getAllInventoryItems(tenantId = 1) {
    const products = await Product.find(buildTenantScopedQuery(tenantId, {
      is_deleted: { $ne: true },
    })).populate('categories').lean();
    const items = [];

    products.forEach((product) => {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          items.push(this.mapInventoryItem(product, variant));
        });
        return;
      }

      items.push(this.mapInventoryItem(product));
    });

    return items;
  }

  async getLowStockItems(threshold = 10, tenantId = 1) {
    try {
      const inventoryItems = await this.getAllInventoryItems(tenantId);
      return inventoryItems.filter((item) => item.stock <= Math.max(item.lowStockThreshold || 0, threshold));
    } catch (error) {
      console.error('[InventoryService] getLowStockItems error:', error.message);
      throw error;
    }
  }

  async getStockLevels(query = {}, tenantId = 1) {
    try {
      const page = Math.max(parseInt(query.page || 1, 10), 1);
      const limit = Math.max(parseInt(query.limit || 20, 10), 1);
      const search = (query.search || query.q || '').toLowerCase().trim();
      const statusFilter = query.status || '';

      const products = await Product.find(buildTenantScopedQuery(tenantId, {
        is_deleted: { $ne: true },
      })).populate('categories').lean();

      let allItems = [];
      products.forEach((product) => {
        if (Array.isArray(product.variants) && product.variants.length > 0) {
          product.variants.forEach((variant) => {
            allItems.push(this.mapInventoryItem(product, variant));
          });
        } else {
          allItems.push(this.mapInventoryItem(product));
        }
      });

      // Apply Search
      if (search) {
        allItems = allItems.filter(item => 
          item.productName.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search) ||
          item.categoryNames.toLowerCase().includes(search) ||
          item.color.toLowerCase().includes(search) ||
          item.size.toLowerCase().includes(search)
        );
      }

      // Apply Status Filter
      if (statusFilter) {
        allItems = allItems.filter(item => item.stockStatus === statusFilter);
      }

      const total = allItems.length;
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const stockAlerts = allItems
        .filter((item) => item.isLowStock || item.isOutOfStock)
        .sort((left, right) => left.stock - right.stock);
      
      // Calculate Stats based on all filtered items
      const stats = {
        totalVariants: allItems.length,
        totalProducts: new Set(allItems.map(item => item.productId)).size,
        lowStock: allItems.filter(item => item.isLowStock).length,
        outOfStock: allItems.filter(item => item.stock === 0).length,
        totalValue: allItems.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0),
        stockAlerts,
      };

      const startIndex = (page - 1) * limit;
      const paginatedItems = allItems.slice(startIndex, startIndex + limit);

      return {
        items: paginatedItems,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          current_page: page,
          total_pages: totalPages,
          per_page: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('[InventoryService] getStockLevels error:', error.message);
      throw error;
    }
  }

  async updateStockLevel(id, stockLevel, lowStockThreshold = 5, tenantId = 1) {
    try {
      let product = await Product.findOneAndUpdate(
        buildTenantScopedQuery(tenantId, { 'variants._id': id }),
        {
          $set: {
            'variants.$.stock': stockLevel,
            'variants.$.lowStockThreshold': lowStockThreshold,
          },
        },
        { new: true }
      ).populate('categories').lean();

      if (product) {
        const variant = (product.variants || []).find((entry) => entry._id?.toString() === id.toString());
        return this.mapInventoryItem(product, variant);
      }

      product = await Product.findOneAndUpdate(
        buildTenantScopedQuery(tenantId, { _id: id }),
        { $set: { stock: stockLevel } },
        { new: true }
      ).populate('categories').lean();

      if (product) {
        return this.mapInventoryItem(product);
      }

      throw new Error('Item not found');
    } catch (error) {
      console.error('[InventoryService] updateStockLevel error:', error.message);
      throw error;
    }
  }

  async recordOfflineSale(data, tenantId = 1) {
    const variantId = data.variantId || data.id;
    const quantity = Number(data.quantity || 1) || 1;
    const salePrice = data.salePrice == null || data.salePrice === ''
      ? null
      : Number(data.salePrice);

    if (!variantId) {
      const error = new Error('variantId is required');
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      const error = new Error('quantity must be a whole number greater than 0');
      error.statusCode = 400;
      throw error;
    }

    if (salePrice != null && (Number.isNaN(salePrice) || salePrice < 0)) {
      const error = new Error('salePrice must be a positive number');
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findOne(buildTenantScopedQuery(tenantId, {
      'variants._id': variantId,
      is_deleted: { $ne: true },
    }));

    if (!product) {
      const error = new Error('Variant not found');
      error.statusCode = 404;
      throw error;
    }

    const variant = product.variants.id(variantId);
    const oldStock = Number(variant?.stock || 0) || 0;

    if (oldStock < quantity) {
      const error = new Error(`Insufficient stock. Available: ${oldStock}`);
      error.statusCode = 409;
      throw error;
    }

    const soldAt = data.soldAt ? new Date(data.soldAt) : new Date();
    if (Number.isNaN(soldAt.getTime())) {
      const error = new Error('soldAt must be a valid date');
      error.statusCode = 400;
      throw error;
    }

    variant.stock = oldStock - quantity;
    variant.lastSaleChannel = 'offline';
    variant.soldOfflineAt = soldAt;
    variant.offlineSoldQuantity = (Number(variant.offlineSoldQuantity || 0) || 0) + quantity;

    await product.save();

    const referenceId = `offline-${product._id}-${variant._id}-${soldAt.getTime()}`;
    const noteParts = [
      `Sold offline: ${quantity} unit(s)`,
      salePrice == null ? null : `sale price Rs.${salePrice}`,
      data.paymentMethod ? `payment: ${data.paymentMethod}` : null,
      data.customerName ? `customer: ${data.customerName}` : null,
      data.notes || null,
    ].filter(Boolean);

    await inventoryAuditService.logInventoryChange({
      variantId,
      productId: product._id,
      changeType: 'sale',
      oldStockLevel: oldStock,
      newStockLevel: variant.stock,
      quantityChanged: -quantity,
      referenceType: 'offline_sale',
      referenceId,
      userId: data.userId || null,
      notes: noteParts.join(' | '),
    });

    // Record in OfflineSale collection for analytics
    try {
      await OfflineSale.create({
        tenant_id: Number(tenantId) || 1,
        productId: product._id,
        variantId,
        quantity,
        salePrice,
        paymentMethod: data.paymentMethod || 'cash',
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        notes: data.notes || null,
        soldAt,
        recordedBy: data.userId || null,
        store_location: data.store_location || null
      });
    } catch (err) {
      console.error('Error recording offline sale:', err.message);
      // Don't fail the entire operation if offline sale record fails
    }

    await this.clearProductListCache();

    const refreshed = await Product.findById(product._id).populate('categories').lean();
    const refreshedVariant = (refreshed.variants || []).find((entry) => entry._id?.toString() === variantId.toString());

    return {
      item: this.mapInventoryItem(refreshed, refreshedVariant),
      sale: {
        referenceId,
        productId: product._id.toString(),
        variantId: variantId.toString(),
        quantity,
        salePrice,
        paymentMethod: data.paymentMethod || null,
        soldAt: soldAt.toISOString(),
        oldStockLevel: oldStock,
        newStockLevel: variant.stock,
        markedBy: data.userId || null,
      },
    };
  }
}

module.exports = {
  InventoryService,
  inventoryService: new InventoryService(),
};
