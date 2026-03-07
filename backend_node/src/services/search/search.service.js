/**
 * Advanced Product Search Service
 * Implements FULLTEXT search with filters for category, attributes, price range
 */

const { mysqlPool } = require('../../config/db');
const redis = require('../../config/integrations/redis');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

class SearchService {
  /**
   * Search products with advanced filters
   * GET /api/v1/search?q=saree&color=red&price_min=1000&category=clothing
   */
  async searchProducts(queryParams) {
    const {
      q,
      category,
      color,
      size,
      fabric,
      price_min,
      price_max,
      min_rating,
      in_stock,
      sort = 'relevance',
      page = 1,
      per_page = 20
    } = queryParams;

    const offset = (page - 1) * per_page;
    const cacheKey = this._buildCacheKey(queryParams);

    // Try cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    // Build search query
    let query = `
      SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.status,
        p.base_price,
        (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id) as min_price,
        (SELECT MAX(pv.price) FROM product_variants pv WHERE pv.product_id = p.id) as max_price,
        (SELECT SUM(vi.stock_level) FROM variant_inventory vi
         JOIN product_variants pv ON vi.variant_id = pv.id WHERE pv.product_id = p.id) as total_stock,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as avg_rating,
        (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as review_count,
        si.sku,
        si.category_names,
        si.attribute_names,
        MATCH(si.search_vector) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
      FROM products p
      INNER JOIN search_index si ON p.id = si.product_id
      WHERE p.status = 'published'
    `;

    const values = [q || ''];

    // Add filters
    const filterValues = [];

    // Category filter
    if (category) {
      query += ` AND JSON_SEARCH(si.category_names, 'one', ?) IS NOT NULL`;
      filterValues.push(category);
    }

    // Attribute filters (color, size, fabric)
    if (color) {
      query += ` AND JSON_SEARCH(si.attribute_names, 'one', ?, NULL, '$.color') IS NOT NULL`;
      filterValues.push(color);
    }

    if (size) {
      query += ` AND JSON_SEARCH(si.attribute_names, 'one', ?, NULL, '$.size') IS NOT NULL`;
      filterValues.push(size);
    }

    if (fabric) {
      query += ` AND JSON_SEARCH(si.attribute_names, 'one', ?, NULL, '$.fabric') IS NOT NULL`;
      filterValues.push(fabric);
    }

    // Price range filter
    if (price_min) {
      query += ` AND (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id) >= ?`;
      filterValues.push(parseFloat(price_min));
    }

    if (price_max) {
      query += ` AND (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id) <= ?`;
      filterValues.push(parseFloat(price_max));
    }

    // Rating filter
    if (min_rating) {
      query += ` AND (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) >= ?`;
      filterValues.push(parseFloat(min_rating));
    }

    // In stock filter
    if (in_stock === 'true') {
      query += ` AND (SELECT SUM(vi.stock_level) FROM variant_inventory vi 
                      JOIN product_variants pv ON vi.variant_id = pv.id 
                      WHERE pv.product_id = p.id) > 0`;
    }

    // Combine values
    values.push(...filterValues);

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY min_price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY min_price DESC`;
        break;
      case 'rating':
        query += ` ORDER BY avg_rating DESC, review_count DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'relevance':
      default:
        query += ` ORDER BY relevance_score DESC`;
        break;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    values.push(parseInt(per_page), parseInt(offset));

    // Get results
    const [rows] = await mysqlPool.query(query, values);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      INNER JOIN search_index si ON p.id = si.product_id
      WHERE p.status = 'published'
      ${category ? 'AND JSON_SEARCH(si.category_names, \'one\', ?) IS NOT NULL' : ''}
    `;
    
    const countValues = category ? [category] : [];
    const [countResult] = await mysqlPool.query(countQuery, countValues);
    const total = countResult[0].total;

    const result = {
      query: q,
      filters: {
        category,
        color,
        size,
        fabric,
        price_min: price_min ? parseFloat(price_min) : null,
        price_max: price_max ? parseFloat(price_max) : null,
        min_rating: min_rating ? parseFloat(min_rating) : null,
        in_stock: in_stock === 'true'
      },
      products: rows.map(product => this._formatProductSearchResult(product)),
      pagination: {
        page: parseInt(page),
        perPage: parseInt(per_page),
        total,
        totalPages: Math.ceil(total / per_page)
      }
    };

    // Cache result
    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 minutes TTL
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Search by SKU
   */
  async searchBySku(sku) {
    const [rows] = await mysqlPool.query(
      `SELECT p.*, si.sku
       FROM products p
       INNER JOIN search_index si ON p.id = si.product_id
       WHERE si.sku = ? AND p.status = 'published'`,
      [sku]
    );

    if (rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    return this._formatProductSearchResult(rows[0]);
  }

  /**
   * Autocomplete/suggestions
   */
  async getSuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    const cacheKey = `search:suggestions:${query.toLowerCase()}`;
    
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    const [rows] = await mysqlPool.query(
      `SELECT DISTINCT p.name, p.slug, si.sku
       FROM products p
       INNER JOIN search_index si ON p.id = si.product_id
       WHERE p.status = 'published'
         AND (p.name LIKE ? OR si.sku LIKE ?)
       ORDER BY p.name ASC
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    );

    const suggestions = rows.map(row => ({
      text: row.name,
      type: 'product',
      slug: row.slug,
      sku: row.sku
    }));

    const result = { suggestions };

    if (redis) {
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour TTL
      } catch (err) {
        console.error('Redis cache error:', err.message);
      }
    }

    return result;
  }

  /**
   * Get search filters (for faceted search)
   */
  async getSearchFilters(queryParams) {
    const { q, category } = queryParams;

    // Get available categories
    const [categories] = await mysqlPool.query(
      `SELECT DISTINCT JSON_EXTRACT(si.category_names, '$[*]') as cats
       FROM search_index si
       JOIN products p ON si.product_id = p.id
       WHERE p.status = 'published'`
    );

    // Get available colors
    const [colors] = await mysqlPool.query(
      `SELECT DISTINCT JSON_EXTRACT(si.attribute_names, '$.color') as color
       FROM search_index si
       JOIN products p ON si.product_id = p.id
       WHERE p.status = 'published'
         AND JSON_EXTRACT(si.attribute_names, '$.color') IS NOT NULL`
    );

    // Get price range
    const [priceRange] = await mysqlPool.query(
      `SELECT 
         MIN(p.basePrice) as min_price,
         MAX(p.basePrice) as max_price
       FROM products p
       WHERE p.status = 'published'`
    );

    return {
      categories: this._extractUniqueValues(categories, 'cats'),
      colors: this._extractUniqueValues(colors, 'color'),
      priceRange: {
        min: priceRange[0].min_price || 0,
        max: priceRange[0].max_price || 0
      }
    };
  }

  /**
   * Update search index for a product
   * Called when product is created/updated
   */
  async updateSearchIndex(productId) {
    const [productRows] = await mysqlPool.query(
      `SELECT p.*, 
              GROUP_CONCAT(DISTINCT c.name) as category_names,
              GROUP_CONCAT(DISTINCT c.slug) as category_slugs
       FROM products p
       LEFT JOIN product_categories pc ON p.id = pc.product_id
       LEFT JOIN categories c ON pc.category_id = c.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [productId]
    );

    if (productRows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const product = productRows[0];

    // Get variants
    const [variants] = await mysqlPool.query(
      `SELECT sku, attributes FROM product_variants WHERE product_id = ?`,
      [productId]
    );

    // Build search vector
    const searchParts = [
      product.name,
      product.description || '',
      product.sku || '',
      product.category_names || '',
      ...(variants || []).map(v => v.sku || '')
    ];

    const searchVector = searchParts.join(' ').toLowerCase();

    // Build category names JSON
    const categoryNames = product.category_names 
      ? JSON.stringify(product.category_names.split(',').filter(Boolean))
      : '[]';

    // Build attributes JSON from variants
    const attributes = {};
    for (const variant of variants || []) {
      if (variant.attributes) {
        const attrs = typeof variant.attributes === 'string' 
          ? JSON.parse(variant.attributes) 
          : variant.attributes;
        
        for (const [key, value] of Object.entries(attrs)) {
          if (!attributes[key]) {
            attributes[key] = [];
          }
          if (!attributes[key].includes(value)) {
            attributes[key].push(value);
          }
        }
      }
    }

    const attributeNames = JSON.stringify(attributes);

    // Get first variant SKU
    const sku = variants && variants.length > 0 ? variants[0].sku : null;

    // Get total stock
    const [stockRows] = await mysqlPool.query(
      `SELECT SUM(vi.stock_level) as total_stock
       FROM variant_inventory vi
       JOIN product_variants pv ON vi.variant_id = pv.id
       WHERE pv.product_id = ?`,
      [productId]
    );
    const totalStock = stockRows[0].total_stock || 0;

    // Upsert search index
    await mysqlPool.query(
      `INSERT INTO search_index 
        (product_id, title, description, sku, category_names, attribute_names, price, stock, status, search_vector)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        sku = VALUES(sku),
        category_names = VALUES(category_names),
        attribute_names = VALUES(attribute_names),
        price = VALUES(price),
        stock = VALUES(stock),
        status = VALUES(status),
        search_vector = VALUES(search_vector)`,
      [
        productId,
        product.name,
        product.description || '',
        sku,
        categoryNames,
        attributeNames,
        product.basePrice || 0,
        totalStock,
        product.status,
        searchVector
      ]
    );

    // Invalidate search cache
    if (redis) {
      try {
        await redis.del('search:*');
      } catch (err) {
        console.error('Redis cache invalidation error:', err.message);
      }
    }

    return { success: true, productId };
  }

  /**
   * Rebuild search index for all products
   */
  async rebuildSearchIndex() {
    const [products] = await mysqlPool.query('SELECT id FROM products WHERE status = "published"');
    
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        await this.updateSearchIndex(product.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to index product ${product.id}:`, error.message);
        errorCount++;
      }
    }

    return {
      success: true,
      indexed: successCount,
      failed: errorCount,
      total: products.length
    };
  }

  /**
   * Build cache key from query params
   */
  _buildCacheKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `search:products:${sortedParams}`;
  }

  /**
   * Extract unique values from JSON array results
   */
  _extractUniqueValues(rows, fieldName) {
    const values = new Set();
    
    for (const row of rows) {
      if (row[fieldName]) {
        try {
          const arr = typeof row[fieldName] === 'string' 
            ? JSON.parse(row[fieldName]) 
            : row[fieldName];
          
          if (Array.isArray(arr)) {
            arr.forEach(v => values.add(v));
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }

    return Array.from(values).filter(Boolean);
  }

  /**
   * Format product search result
   */
  _formatProductSearchResult(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      slug: product.slug,
      sku: product.sku,
      basePrice: Number(product.base_price || product.min_price || 0),
      minPrice: Number(product.min_price || 0),
      maxPrice: Number(product.max_price || 0),
      totalStock: product.total_stock || 0,
      avgRating: product.avg_rating ? parseFloat(product.avg_rating).toFixed(1) : null,
      reviewCount: product.review_count || 0,
      categoryNames: product.category_names ? JSON.parse(product.category_names) : [],
      attributeNames: product.attribute_names ? JSON.parse(product.attribute_names) : {},
      relevanceScore: product.relevance_score,
      inStock: (product.total_stock || 0) > 0
    };
  }
}

module.exports = new SearchService();
