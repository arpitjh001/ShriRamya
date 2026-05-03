const mongoose = require('mongoose');
const { Product, Category } = require('../models');
const productService = require('./product.service');
const { buildTenantScope } = require('../utils/tenantScope');
const redis = require('../config/integrations/redis');

const PUBLIC_PRODUCT_STATUS_FILTER = ['published', 'publish'];

const SORT_OPTIONS = [
  { value: 'newest', label: "What's New" },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'discount', label: 'Discount' },
  { value: 'rating', label: 'Customer Rating' },
];

class CatalogReadService {
  isAdminOrEditor(user) {
    if (!user) return false;

    const role = String(user.role || '').toLowerCase();
    const roles = Array.isArray(user.roles)
      ? user.roles.map((entry) => String(entry).toLowerCase())
      : [];

    return role === 'admin' || role === 'editor' || roles.includes('admin') || roles.includes('editor');
  }

  getTenantId(tenantId) {
    const parsedTenantId = Number(tenantId);
    return Number.isInteger(parsedTenantId) && parsedTenantId > 0 ? parsedTenantId : 1;
  }

  buildTenantScope(tenantId) {
    return buildTenantScope(tenantId);
  }

  normalizeAttributes(attributes) {
    if (!attributes) return {};
    if (attributes instanceof Map) {
      return Object.fromEntries(attributes.entries());
    }
    return { ...attributes };
  }

  getVariantAttribute(variant, key) {
    const attributes = this.normalizeAttributes(variant?.attributes);
    return (
      attributes[key] ||
      attributes[key.toLowerCase()] ||
      attributes[key.toUpperCase()] ||
      variant?.[key.toLowerCase()] ||
      variant?.[key] ||
      null
    );
  }

  toStringId(value) {
    if (value == null) return null;
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return value.toString();
    }
    return String(value);
  }

  normalizeCategory(category, productCount = 0) {
    if (!category) return null;

    const source = typeof category.toObject === 'function'
      ? category.toObject({ flattenMaps: true })
      : category;

    const id = this.toStringId(source.id || source._id);
    const parentId = this.toStringId(source.parentId || source.parent_id);

    return {
      id,
      _id: id,
      name: source.name || source.slug || '',
      slug: source.slug || '',
      description: source.description || '',
      image: source.image || null,
      parentId,
      parent_id: parentId,
      product_count: Number(productCount || source.product_count || source.count || 0),
    };
  }

  getExplicitSalePrice(product) {
    const salePriceValue = product.salePrice ?? product.sale_price ?? null;
    if (salePriceValue === null || salePriceValue === '') return null;

    const parsedSalePrice = Number(salePriceValue);
    return Number.isFinite(parsedSalePrice) ? parsedSalePrice : null;
  }

  getVariantPricing(variants) {
    const variantPrices = variants
      .map((variant) => Number(variant.price || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const variantEffectivePrices = variants
      .map((variant) => Number(variant.effectivePrice || variant.discountPrice || variant.price || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    return {
      minVariantPrice: variantPrices.length > 0 ? Math.min(...variantPrices) : null,
      minVariantEffectivePrice: variantEffectivePrices.length > 0 ? Math.min(...variantEffectivePrices) : null,
    };
  }

  computePricing(product) {
    const basePrice = Number(product.basePrice ?? product.base_price ?? product.price ?? product.regular_price ?? 0) || 0;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const { minVariantPrice, minVariantEffectivePrice } = this.getVariantPricing(variants);

    const regularPrice = minVariantPrice && minVariantPrice > 0 ? minVariantPrice : basePrice;
    const explicitSalePrice = this.getExplicitSalePrice(product);

    let salePrice = null;
    if (minVariantEffectivePrice && minVariantEffectivePrice > 0 && minVariantEffectivePrice < regularPrice) {
      salePrice = minVariantEffectivePrice;
    } else if (explicitSalePrice && explicitSalePrice > 0 && explicitSalePrice < regularPrice) {
      salePrice = explicitSalePrice;
    }

    return { regularPrice, salePrice };
  }

  getTotalStock(product) {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.reduce((sum, variant) => sum + (Number(variant.stock || 0) || 0), 0);
    }

    return Number(product.stock ?? product.stock_quantity ?? 0) || 0;
  }

  normalizeImages(product) {
    const images = Array.isArray(product.images)
      ? product.images.map((image) => {
        if (typeof image === 'string') return image;
        if (image && typeof image === 'object') return image.src || image.url || null;
        return null;
      }).filter(Boolean)
      : [];

    if (images.length > 0) {
      return images;
    }

    if (product.image) {
      return [product.image];
    }

    const firstVariantImage = Array.isArray(product.variants)
      ? product.variants.find((variant) => variant.image)?.image
      : null;

    return firstVariantImage ? [firstVariantImage] : [];
  }

  normalizeVariants(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];

    return variants.map((variant) => {
      const source = typeof variant.toObject === 'function'
        ? variant.toObject({ flattenMaps: true })
        : variant;

      const attributes = this.normalizeAttributes(source.attributes);
      const color = this.getVariantAttribute(source, 'color') || source.color || null;
      const size = this.getVariantAttribute(source, 'size') || source.size || null;

      return {
        ...source,
        id: this.toStringId(source.id || source._id),
        _id: this.toStringId(source._id || source.id),
        sku: source.sku || '',
        price: Number(source.price || 0) || 0,
        discountPrice: source.discountPrice == null || source.discountPrice === ''
          ? null
          : (Number(source.discountPrice) || null),
        effectivePrice: Number(source.effectivePrice || source.discountPrice || source.price || 0) || 0,
        stock: Number(source.stock ?? source.stock_quantity ?? 0) || 0,
        stock_quantity: Number(source.stock ?? source.stock_quantity ?? 0) || 0,
        lowStockThreshold: Number(source.lowStockThreshold || 5) || 5,
        color,
        size,
        attributes: {
          ...attributes,
          color,
          size,
          Color: attributes.Color || color || '',
          Size: attributes.Size || size || '',
        },
        image: source.image || null,
      };
    });
  }

  mapProduct(product) {
    const formattedProduct = productService.formatProductForResponse(product);
    const categories = Array.isArray(formattedProduct.categories)
      ? formattedProduct.categories.map((category) => this.normalizeCategory(category)).filter(Boolean)
      : [];
    const variants = this.normalizeVariants(formattedProduct);
    const images = this.normalizeImages({ ...formattedProduct, variants });
    const { regularPrice, salePrice } = this.computePricing({ ...formattedProduct, variants });
    const totalStock = this.getTotalStock({ ...formattedProduct, variants });
    const categoryName = categories.length > 0
      ? categories.map(c => c.name).join(', ')
      : (formattedProduct.categoryName || formattedProduct.category || null);
    const categorySlug = categories[0]?.slug || formattedProduct.categorySlug || null;
    const thumbnail = formattedProduct.thumbnail || images[0] || null;

    return {
      ...formattedProduct,
      id: this.toStringId(formattedProduct.id || formattedProduct._id || formattedProduct.productId),
      _id: this.toStringId(formattedProduct._id || formattedProduct.id || formattedProduct.productId),
      productId: formattedProduct.productId ?? formattedProduct.id ?? formattedProduct._id,
      status: this.getProductStatus(formattedProduct),
      categoryId: this.toStringId(formattedProduct.categoryId || categories[0]?.id),
      categories,
      categoryName,
      categorySlug,
      images,
      thumbnail,
      image: formattedProduct.image || thumbnail,
      variants,
      price: regularPrice,
      salePrice,
      sale_price: salePrice,
      stock_quantity: totalStock,
      stock: totalStock,
      totalStock,
      in_stock: totalStock > 0,
      rating: Number(formattedProduct.rating || 0) || 0,
      fabric: formattedProduct.fabric || null,
      occasion: formattedProduct.occasion || null,
      color: formattedProduct.color || variants[0]?.color || null,
      sizes: Array.isArray(formattedProduct.sizes)
        ? formattedProduct.sizes
        : [...new Set(variants.map((variant) => variant.size).filter(Boolean))],
      created_at: formattedProduct.created_at || formattedProduct.createdAt || null,
      updated_at: formattedProduct.updated_at || formattedProduct.updatedAt || null,
      sku: formattedProduct.sku || variants[0]?.sku || 'N/A',
    };
  }

  getProductStatus(product) {
    const normalizedStatus = productService.normalizeProductStatus(product?.status);
    return String(normalizedStatus || 'published').toLowerCase();
  }

  isVisibleProduct(product, user) {
    if (this.isAdminOrEditor(user)) return true;
    return PUBLIC_PRODUCT_STATUS_FILTER.includes(this.getProductStatus(product));
  }

  async getBaseProducts({ tenantId, user }) {
    const isAdmin = this.isAdminOrEditor(user);
    const cacheKey = `catalog:base_products:${tenantId}:${isAdmin ? 'admin' : 'public'}`;

    if (redis && redis.get) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('[CatalogReadService] Redis read error:', err.message);
      }
    }

    const baseQuery = {
      is_deleted: { $ne: true },
      ...this.buildTenantScope(tenantId),
    };

    const rawProducts = await Product.find(baseQuery)
      .populate('categories')
      .sort({ created_at: -1 })
      .lean();

    const result = rawProducts
      .map((product) => this.mapProduct(product))
      .filter((product) => this.isVisibleProduct(product, user));

    if (redis && redis.set) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 300 }); // Cache for 5 minutes
      } catch (err) {
        console.error('[CatalogReadService] Redis write error:', err.message);
      }
    }

    return result;
  }

  normalizeListValue(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }

    if (value == null || value === '') {
      return [];
    }

    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  getProductColors(product) {
    const variantColors = Array.isArray(product.variants)
      ? product.variants.map((variant) => variant.color).filter(Boolean)
      : [];

    return [...new Set([
      ...(product.color ? [product.color] : []),
      ...variantColors,
    ].map((entry) => String(entry)))];
  }

  getProductSizes(product) {
    const variantSizes = Array.isArray(product.variants)
      ? product.variants.map((variant) => variant.size).filter(Boolean)
      : [];
    const topLevelSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];

    return [...new Set([...topLevelSizes, ...variantSizes].map((entry) => String(entry)))];
  }

  getDiscountPercent(product) {
    const regularPrice = Number(product.price || 0) || 0;
    const salePrice = Number(product.salePrice || product.sale_price || 0) || 0;

    if (!salePrice || !regularPrice || salePrice >= regularPrice) {
      return Number(product.discount || 0) || 0;
    }

    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  getProductStats(products) {
    const productList = Array.isArray(products) ? products : [];

    return {
      total: productList.length,
      published: productList.filter((product) => ['published', 'publish'].includes(this.getProductStatus(product))).length,
      draft: productList.filter((product) => this.getProductStatus(product) === 'draft').length,
      outOfStock: productList.filter((product) => Number(product.stock_quantity ?? product.stock ?? 0) <= 0).length,
    };
  }

  filterByCategory(products, categoryFilters) {
    if (categoryFilters.length === 0) return products;
    if (categoryFilters.includes('most-desired')) return products;

    return products.filter((product) => {
      const categoryIds = new Set([
        ...(product.categoryId ? [String(product.categoryId)] : []),
        ...(product.categories || []).map((category) => String(category.id || category._id)),
      ]);
      const categorySlugs = new Set([
        ...(product.categorySlug ? [String(product.categorySlug)] : []),
        ...(product.categories || []).map((category) => String(category.slug || '')),
      ]);

      return categoryFilters.some((categoryFilter) => categoryIds.has(categoryFilter) || categorySlugs.has(categoryFilter));
    });
  }

  applyFilters(products, query = {}) {
    const categoryFilters = this.normalizeListValue(query.category);
    const colorFilters = this.normalizeListValue(query.color).map((entry) => entry.toLowerCase());
    const sizeFilters = this.normalizeListValue(query.size).map((entry) => entry.toLowerCase());
    const fabricFilters = this.normalizeListValue(query.fabric).map((entry) => entry.toLowerCase());
    const occasionFilters = this.normalizeListValue(query.occasion).map((entry) => entry.toLowerCase());
    const workFilters = this.normalizeListValue(query.work).map((entry) => entry.toLowerCase());
    const brandFilters = this.normalizeListValue(query.brand).map((entry) => entry.toLowerCase());
    const searchQuery = String(query.search || query.q || '').trim().toLowerCase();
    const minPrice = query.min_price ?? query.minPrice ?? query.price_min ?? query.priceMin;
    const maxPrice = query.max_price ?? query.maxPrice ?? query.price_max ?? query.priceMax;
    const discount = query.discount != null ? Number(query.discount) : null;
    const rating = query.rating != null ? Number(query.rating) : null;
    const inStock = query.in_stock === true || query.in_stock === 'true';
    const categoryIdFilter = query.category_id ? [String(query.category_id)] : [];
    const statusFilters = this.normalizeListValue(query.status).map((entry) => {
      const normalizedStatus = productService.normalizeProductStatus(entry);
      return String(normalizedStatus || entry).toLowerCase();
    });

    let filteredProducts = [...products];

    if (statusFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => {
        const status = this.getProductStatus(product);
        return statusFilters.includes(status) || (statusFilters.includes('published') && status === 'publish');
      });
    }

    if (categoryFilters.length > 0 || categoryIdFilter.length > 0) {
      filteredProducts = this.filterByCategory(filteredProducts, [...categoryFilters, ...categoryIdFilter]);
    }

    if (searchQuery) {
      filteredProducts = filteredProducts.filter((product) => {
        const haystack = [
          product.name,
          product.description,
          product.sku,
          product.fabric,
          product.occasion,
          product.categoryName,
          ...(product.categories || []).filter(Boolean).map((category) => category.name),
          ...(product.variants || []).filter(Boolean).map((variant) => variant.sku),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchQuery);
      });
    }

    if (colorFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => {
        const productColors = this.getProductColors(product).map((entry) => entry.toLowerCase());
        return colorFilters.some((entry) => productColors.includes(entry));
      });
    }

    if (sizeFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => {
        const productSizes = this.getProductSizes(product).map((entry) => entry.toLowerCase());
        return sizeFilters.some((entry) => productSizes.includes(entry));
      });
    }

    if (fabricFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => fabricFilters.includes(String(product.fabric || '').toLowerCase()));
    }

    if (occasionFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => occasionFilters.includes(String(product.occasion || '').toLowerCase()));
    }

    if (workFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => workFilters.includes(String(product.work || '').toLowerCase()));
    }

    if (brandFilters.length > 0) {
      filteredProducts = filteredProducts.filter((product) => brandFilters.includes(String(product.brand || '').toLowerCase()));
    }

    if (minPrice != null && minPrice !== '') {
      const parsedMinPrice = Number(minPrice);
      filteredProducts = filteredProducts.filter((product) => {
        const currentPrice = Number(product.salePrice || product.price || 0) || 0;
        return currentPrice >= parsedMinPrice;
      });
    }

    if (maxPrice != null && maxPrice !== '') {
      const parsedMaxPrice = Number(maxPrice);
      filteredProducts = filteredProducts.filter((product) => {
        const currentPrice = Number(product.salePrice || product.price || 0) || 0;
        return currentPrice <= parsedMaxPrice;
      });
    }

    if (discount != null && !Number.isNaN(discount)) {
      filteredProducts = filteredProducts.filter((product) => this.getDiscountPercent(product) >= discount);
    }

    if (rating != null && !Number.isNaN(rating)) {
      filteredProducts = filteredProducts.filter((product) => Number(product.rating || 0) >= rating);
    }

    if (query.featured === true || query.featured === 'true') {
      filteredProducts = filteredProducts.filter((product) => product.isFeatured === true);
    }

    if (query.isNew === true || query.isNew === 'true') {
      filteredProducts = filteredProducts.filter((product) => product.isNew === true);
    }

    if (query.isTrending === true || query.isTrending === 'true') {
      filteredProducts = filteredProducts.filter((product) => product.isTrending === true);
    }

    if (inStock) {
      filteredProducts = filteredProducts.filter((product) => Number(product.stock_quantity || 0) > 0);
    }

    return filteredProducts;
  }

  sortProducts(products, sort = 'newest', categoryFilters = []) {
    const sortedProducts = [...products];
    const effectiveSort = categoryFilters.includes('most-desired') ? 'rating' : sort || 'newest';

    sortedProducts.sort((leftProduct, rightProduct) => {
      if (effectiveSort === 'price_low') {
        return (Number(leftProduct.salePrice || leftProduct.price || 0) || 0) - (Number(rightProduct.salePrice || rightProduct.price || 0) || 0);
      }

      if (effectiveSort === 'price_high') {
        return (Number(rightProduct.salePrice || rightProduct.price || 0) || 0) - (Number(leftProduct.salePrice || leftProduct.price || 0) || 0);
      }

      if (effectiveSort === 'discount') {
        return this.getDiscountPercent(rightProduct) - this.getDiscountPercent(leftProduct);
      }

      if (effectiveSort === 'rating' || effectiveSort === 'popularity') {
        return (Number(rightProduct.rating || 0) || 0) - (Number(leftProduct.rating || 0) || 0);
      }

      if (effectiveSort === 'name_asc') {
        return String(leftProduct.name || '').localeCompare(String(rightProduct.name || ''));
      }

      const leftDate = new Date(leftProduct.created_at || leftProduct.createdAt || 0).getTime() || 0;
      const rightDate = new Date(rightProduct.created_at || rightProduct.createdAt || 0).getTime() || 0;
      return rightDate - leftDate;
    });

    return sortedProducts;
  }

  incrementCounter(map, value) {
    if (!value) return;
    map[value] = (map[value] || 0) + 1;
  }

  buildFilterMetadata(products) {
    const metadata = {
      sizes: {},
      colors: {},
      fabrics: {},
      occasions: {},
      patterns: {},
      styles: {},
      neckTypes: {},
      sleeveTypes: {},
      priceRange: { min: 0, max: 0 },
      discountRanges: {},
    };

    if (!Array.isArray(products) || products.length === 0) {
      return metadata;
    }

    const prices = [];
    products.forEach((product) => {
      this.getProductSizes(product).forEach((size) => this.incrementCounter(metadata.sizes, size));
      this.getProductColors(product).forEach((color) => this.incrementCounter(metadata.colors, color));
      this.incrementCounter(metadata.fabrics, product.fabric);
      this.incrementCounter(metadata.occasions, product.occasion);

      const price = Number(product.salePrice || product.price || 0) || 0;
      if (price > 0) {
        prices.push(price);
      }

      const discountPercent = this.getDiscountPercent(product);
      if (discountPercent >= 10) this.incrementCounter(metadata.discountRanges, '10');
      if (discountPercent >= 20) this.incrementCounter(metadata.discountRanges, '20');
      if (discountPercent >= 30) this.incrementCounter(metadata.discountRanges, '30');
      if (discountPercent >= 40) this.incrementCounter(metadata.discountRanges, '40');
      if (discountPercent >= 50) this.incrementCounter(metadata.discountRanges, '50');
    });

    metadata.priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 100000,
    };

    return metadata;
  }

  async listProducts(query = {}, { tenantId = 1, user = null } = {}) {
    const visibleProducts = await this.getBaseProducts({ tenantId, user });
    const filterMetadata = this.buildFilterMetadata(visibleProducts);
    const filteredProducts = this.applyFilters(visibleProducts, query);
    const stats = this.getProductStats(filteredProducts);
    const categoryFilters = this.normalizeListValue(query.category);
    const sortedProducts = this.sortProducts(filteredProducts, query.sort, categoryFilters);

    const currentPage = Math.max(parseInt(query.page || 1, 10) || 1, 1);
    const perPage = Math.max(parseInt(query.per_page || query.limit || 20, 10) || 20, 1);
    const totalProducts = sortedProducts.length;
    const totalPages = Math.max(Math.ceil(totalProducts / perPage), 1);
    const startIndex = (currentPage - 1) * perPage;
    const paginatedProducts = sortedProducts.slice(startIndex, startIndex + perPage);

    return {
      products: paginatedProducts,
      pagination: {
        current_page: currentPage,
        total_pages: totalPages,
        total: totalProducts,
        per_page: perPage,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
      filters: filterMetadata,
      stats,
      sortOptions: SORT_OPTIONS,
      appliedFilters: { ...query },
      totalProducts,
      page: currentPage,
      perPage,
      total: totalProducts,
    };
  }

  async getProduct(identifier, { tenantId = 1, user = null } = {}) {
    const lookup = {};
    const stringIdentifier = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      lookup._id = stringIdentifier;
    } else if (/^\d+$/.test(stringIdentifier)) {
      lookup.productId = Number(stringIdentifier);
    } else {
      lookup.slug = stringIdentifier;
    }

    const product = await Product.findOne({
      ...lookup,
      is_deleted: { $ne: true },
      ...this.buildTenantScope(tenantId),
    }).populate('categories').lean();
    if (!product) {
      return null;
    }

    const mappedProduct = this.mapProduct(product);
    if (!this.isVisibleProduct(mappedProduct, user)) {
      return null;
    }

    let relatedProducts = [];
    const firstCategoryId = mappedProduct.categories?.[0]?.id || mappedProduct.categoryId || null;

    if (firstCategoryId) {
      const baseProducts = await this.getBaseProducts({ tenantId, user });
      relatedProducts = baseProducts
        .filter((candidate) => candidate.id !== mappedProduct.id)
        .filter((candidate) => {
          const candidateCategoryIds = new Set([
            ...(candidate.categoryId ? [String(candidate.categoryId)] : []),
            ...(candidate.categories || []).map((category) => String(category.id || category._id)),
          ]);
          return candidateCategoryIds.has(String(firstCategoryId));
        })
        .slice(0, 4);
    }

    return {
      ...mappedProduct,
      relatedProducts,
    };
  }

  async getCategoryDocument(identifier, tenantId = 1) {
    const query = {
      is_deleted: { $ne: true },
      ...this.buildTenantScope(tenantId),
    };
    const stringIdentifier = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(stringIdentifier)) {
      query._id = stringIdentifier;
    } else {
      query.slug = stringIdentifier.toLowerCase();
    }

    return Category.findOne(query).lean();
  }

  async getCategoryCounts({ tenantId = 1, user = null } = {}) {
    const products = await this.getBaseProducts({ tenantId, user });
    const counts = new Map();

    products.forEach((product) => {
      const categoryIds = new Set([
        ...(product.categoryId ? [String(product.categoryId)] : []),
        ...(product.categories || []).map((category) => String(category.id || category._id)),
      ]);

      categoryIds.forEach((categoryId) => {
        counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
      });
    });

    return counts;
  }

  async listCategories({ tenantId = 1, user = null } = {}) {
    const categoryCounts = await this.getCategoryCounts({ tenantId, user });
    const categories = await Category.find({
      is_deleted: { $ne: true },
      ...this.buildTenantScope(tenantId),
    })
      .sort({ menu_order: 1, name: 1 })
      .lean();

    return categories.map((category) => {
      const id = this.toStringId(category._id);
      return this.normalizeCategory(category, categoryCounts.get(id) || 0);
    });
  }

  async getCategory(identifier, { tenantId = 1, user = null, includeProducts = false } = {}) {
    const category = await this.getCategoryDocument(identifier, tenantId);
    if (!category) {
      return null;
    }

    const categoryId = this.toStringId(category._id);
    const categoryCounts = await this.getCategoryCounts({ tenantId, user });
    const normalizedCategory = this.normalizeCategory(category, categoryCounts.get(categoryId) || 0);

    if (!includeProducts) {
      return normalizedCategory;
    }

    const products = (await this.getBaseProducts({ tenantId, user }))
      .filter((product) => {
        const categoryIds = new Set([
          ...(product.categoryId ? [String(product.categoryId)] : []),
          ...(product.categories || []).map((entry) => String(entry.id || entry._id)),
        ]);

        return categoryIds.has(categoryId);
      });

    return {
      ...normalizedCategory,
      products,
    };
  }
}

module.exports = new CatalogReadService();
