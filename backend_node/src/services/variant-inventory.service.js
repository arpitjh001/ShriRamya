const mongoose = require('mongoose');
const Product = require('../models/product.model');

class VariantInventoryService {
  buildProductQuery(identifier) {
    const stringIdentifier = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      return { _id: stringIdentifier };
    }

    if (/^\d+$/.test(stringIdentifier)) {
      return { productId: Number(stringIdentifier) };
    }

    return { slug: stringIdentifier };
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

  normalizeVariant(product, variant) {
    const attributes = this.normalizeAttributes(variant?.attributes);
    const color = this.getVariantValue(variant, 'color') || '';
    const size = this.getVariantValue(variant, 'size') || '';
    const stock = Number(variant?.stock ?? 0) || 0;
    const lowStockThreshold = Number(variant?.lowStockThreshold ?? 5) || 5;
    const productImages = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];

    return {
      id: variant?._id?.toString() || null,
      _id: variant?._id?.toString() || null,
      variantId: variant?._id?.toString() || null,
      productId: product?._id?.toString() || String(product?.productId || ''),
      product_id: product?._id?.toString() || String(product?.productId || ''),
      productName: product?.name || '',
      product_name: product?.name || '',
      sku: variant?.sku || product?.sku || '',
      price: Number(variant?.price || product?.basePrice || product?.price || 0) || 0,
      stock,
      stock_level: stock,
      stock_quantity: stock,
      lowStockThreshold,
      low_stock_threshold: lowStockThreshold,
      stockStatus: stock === 0 ? 'out_of_stock' : stock <= lowStockThreshold ? 'low_stock' : 'in_stock',
      stock_status: stock === 0 ? 'out_of_stock' : stock <= lowStockThreshold ? 'low_stock' : 'in_stock',
      isOutOfStock: stock === 0,
      isLowStock: stock > 0 && stock <= lowStockThreshold,
      color,
      size,
      colorName: variant?.colorName || color || '',
      hexCode: variant?.hexCode || '#CCCCCC',
      image: variant?.image || productImages[0] || product?.thumbnail || null,
      attributes: {
        ...attributes,
        color,
        size,
        colorName: variant?.colorName || color || '',
        hexCode: variant?.hexCode || '#CCCCCC',
        Color: attributes.Color || color || '',
        Size: attributes.Size || size || '',
      },
    };
  }

  async findProduct(identifier) {
    return Product.findOne(this.buildProductQuery(identifier));
  }

  async findProductLean(identifier) {
    return Product.findOne(this.buildProductQuery(identifier)).populate('categories').lean();
  }

  async calculateTotalStock(productId) {
    try {
      const product = await this.findProduct(productId);
      if (!product) return 0;
      return (product.variants || []).reduce((sum, variant) => sum + (Number(variant.stock || 0) || 0), 0);
    } catch (error) {
      console.error('[VariantInventoryService] calculateTotalStock error:', error.message);
      throw error;
    }
  }

  async getVariantMatrix(productId) {
    try {
      const product = await this.findProduct(productId);
      if (!product) return [];

      return (product.variants || []).map((variant) => this.normalizeVariant(product, variant));
    } catch (error) {
      console.error('[VariantInventoryService] getVariantMatrix error:', error.message);
      throw error;
    }
  }

  async getAvailableColors(productId) {
    const matrix = await this.getVariantMatrix(productId);
    return [...new Set(matrix.map((variant) => variant.color).filter(Boolean))];
  }

  async getAvailableSizes(productId, color = null) {
    const matrix = await this.getVariantMatrix(productId);
    return [...new Set(
      matrix
        .filter((variant) => !color || variant.color === color)
        .map((variant) => variant.size)
        .filter(Boolean)
    )];
  }

  async getVariantStock(productId, color, size) {
    try {
      const matrix = await this.getVariantMatrix(productId);
      const variant = matrix.find((entry) => entry.color === color && entry.size === size);

      if (!variant) {
        return { found: false, stock: 0, isOutOfStock: true, message: 'Variant not found' };
      }

      return {
        found: true,
        variantId: variant.variantId,
        stock: variant.stock,
        lowStockThreshold: variant.lowStockThreshold,
        isOutOfStock: variant.isOutOfStock,
        isLowStock: variant.isLowStock,
        message: variant.isOutOfStock
          ? 'Out of stock'
          : (variant.isLowStock ? `Only ${variant.stock} pieces left` : 'In stock'),
      };
    } catch (error) {
      console.error('[VariantInventoryService] getVariantStock error:', error.message);
      throw error;
    }
  }

  async validateStockAvailability(productId, color, size, quantity = 1) {
    const stockInfo = await this.getVariantStock(productId, color, size);
    const requestedQuantity = Number(quantity || 1) || 1;

    return {
      valid: stockInfo.found && stockInfo.stock >= requestedQuantity,
      requestedQuantity,
      availableStock: stockInfo.stock || 0,
      isOutOfStock: stockInfo.isOutOfStock || false,
      isLowStock: stockInfo.isLowStock || false,
      variantId: stockInfo.variantId || null,
      message: stockInfo.found
        ? (stockInfo.stock >= requestedQuantity
          ? 'Stock available'
          : `Only ${stockInfo.stock} items available`)
        : 'Variant not found',
    };
  }

  async reduceStock(variantId, quantity) {
    try {
      const product = await Product.findOne({ 'variants._id': variantId });
      if (!product) return { success: false, error: 'Variant not found' };

      const variant = product.variants.id(variantId);
      if (!variant) return { success: false, error: 'Variant not found' };
      if ((variant.stock || 0) < quantity) {
        return { success: false, error: 'Insufficient stock', currentStock: variant.stock || 0 };
      }

      variant.stock = (variant.stock || 0) - quantity;
      await product.save();

      return { success: true, newStock: variant.stock || 0 };
    } catch (error) {
      console.error('[VariantInventoryService] reduceStock error:', error.message);
      throw error;
    }
  }

  async syncVariantMatrix(productId, variants = []) {
    try {
      const product = await this.findProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const colorResolverService = require('./colorResolver.service');
      const normalizedVariants = [];

      for (const variant of variants) {
        const attributes = this.normalizeAttributes(variant.attributes);
        const color = variant.color || attributes.color || attributes.Color || '';
        const size = variant.size || attributes.size || attributes.Size || '';
        
        let colorName = variant.colorName || color || '';
        let hexCode = variant.hexCode || '';

        if (color && !hexCode) {
          try {
            const resolved = await colorResolverService.resolveColorName(color);
            hexCode = resolved.hexCode;
            colorName = color;
          } catch (err) {
            console.error(`[VariantInventory] Failed to resolve color during matrix sync "${color}":`, err.message);
            hexCode = '#CCCCCC';
          }
        } else if (!hexCode) {
          hexCode = '#CCCCCC';
        }

        const normalizedVariant = {
          sku: variant.sku || product.sku || '',
          price: Number(variant.price || product.basePrice || 0) || 0,
          discountPrice: variant.discountPrice === '' || variant.discountPrice == null
            ? null
            : (Number(variant.discountPrice) || null),
          stock: Number(variant.stock ?? variant.stock_quantity ?? 0) || 0,
          lowStockThreshold: Number(variant.lowStockThreshold || 5) || 5,
          image: variant.image || null,
          color,
          size,
          colorName,
          hexCode,
          attributes: {
            ...attributes,
            color,
            size,
            colorName,
            hexCode,
          },
        };

        const variantId = variant.id || variant._id || null;
        if (variantId && mongoose.Types.ObjectId.isValid(String(variantId))) {
          normalizedVariant._id = new mongoose.Types.ObjectId(String(variantId));
        }

        normalizedVariants.push(normalizedVariant);
      }

      product.variants = normalizedVariants;
      await product.save();
      return this.getVariantMatrix(productId);
    } catch (error) {
      console.error('[VariantInventoryService] syncVariantMatrix error:', error.message);
      throw error;
    }
  }

  async updateStockLevel(variantId, newStockLevel) {
    try {
      const product = await Product.findOne({ 'variants._id': variantId });
      if (!product) throw new Error('Variant not found');

      const variant = product.variants.id(variantId);
      if (!variant) throw new Error('Variant not found');

      variant.stock = Number(newStockLevel || 0) || 0;
      await product.save();

      const normalizedVariant = this.normalizeVariant(product, variant);
      return {
        variantId: normalizedVariant.variantId,
        productId: normalizedVariant.productId,
        productName: normalizedVariant.productName,
        sku: normalizedVariant.sku,
        color: normalizedVariant.color,
        size: normalizedVariant.size,
        stock: normalizedVariant.stock,
        stockLevel: normalizedVariant.stock,
        lowStockThreshold: normalizedVariant.lowStockThreshold,
        stockStatus: normalizedVariant.stockStatus,
      };
    } catch (error) {
      console.error('[VariantInventoryService] updateStockLevel error:', error.message);
      throw error;
    }
  }

  async getLowStockVariants(threshold = 5) {
    try {
      const products = await Product.find({
        is_deleted: { $ne: true },
        'variants.0': { $exists: true },
      }).lean();

      const lowStockVariants = [];
      products.forEach((product) => {
        (product.variants || []).forEach((variant) => {
          const normalizedVariant = this.normalizeVariant(product, variant);
          const effectiveThreshold = normalizedVariant.lowStockThreshold || threshold;
          if (normalizedVariant.stock <= effectiveThreshold) {
            lowStockVariants.push(normalizedVariant);
          }
        });
      });

      return lowStockVariants;
    } catch (error) {
      console.error('[VariantInventoryService] getLowStockVariants error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  VariantInventoryService,
  variantInventoryService: new VariantInventoryService(),
};
