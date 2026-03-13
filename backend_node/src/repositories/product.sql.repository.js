const { mysqlPool } = require('../config/db');
const crypto = require('crypto');

class ProductSqlRepository {
    /**
     * Generate URL-friendly slug from string
     * @param {string} text - Text to convert to slug
     * @returns {string} URL-friendly slug
     */
    generateSlug(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
    }

    /**
     * Generate unique slug by appending random suffix if needed
     * @param {string} baseSlug - Base slug
     * @param {number} productId - Product ID (for updates)
     * @returns {Promise<string>} Unique slug
     */
    async generateUniqueSlug(baseSlug, productId = null) {
        let slug = baseSlug;
        let suffix = '';
        let attempts = 0;

        while (attempts < 10) {
            const checkSlug = slug + (suffix ? `-${suffix}` : '');

            const [rows] = await mysqlPool.query(
                'SELECT id FROM products WHERE slug = ?' + (productId ? ' AND id != ?' : ''),
                productId ? [checkSlug, productId] : [checkSlug]
            );

            if (rows.length === 0) {
                return checkSlug;
            }

            // Generate random 4-digit suffix
            suffix = Math.floor(1000 + Math.random() * 9000);
            attempts++;
        }

        // Fallback: append timestamp
        return `${slug}-${Date.now()}`;
    }

    parseAttributes(attributesValue) {
        if (attributesValue == null) return {};
        if (typeof attributesValue === 'object') return attributesValue;

        try {
            return JSON.parse(attributesValue);
        } catch (error) {
            return {};
        }
    }

    normalizeDiscountFields(variantData = {}) {
        const discountPrice =
            variantData.discountPrice === '' || variantData.discountPrice === undefined || variantData.discountPrice === null
                ? null
                : Number(variantData.discountPrice);

        const discountStart =
            variantData.discountStart === '' || variantData.discountStart === undefined || variantData.discountStart === null
                ? null
                : variantData.discountStart;

        const discountEnd =
            variantData.discountEnd === '' || variantData.discountEnd === undefined || variantData.discountEnd === null
                ? null
                : variantData.discountEnd;

        return { discountPrice, discountStart, discountEnd };
    }

    mapVariantRow(variantRow) {
        return {
            id: variantRow.id,
            sku: variantRow.sku,
            price: variantRow.price != null ? Number(variantRow.price) : null,
            discountPrice: variantRow.discount_price != null ? Number(variantRow.discount_price) : null,
            discountStart: variantRow.discount_start || null,
            discountEnd: variantRow.discount_end || null,
            stock: variantRow.stock_level != null ? Number(variantRow.stock_level) : 0,
            lowStockThreshold: variantRow.low_stock_threshold != null ? Number(variantRow.low_stock_threshold) : 5,
            attributes: this.parseAttributes(variantRow.attributes_json),
            image: variantRow.image || null,
        };
    }

    /**
     * Hash attributes for uniqueness check
     * Normalizes keys to lowercase and sorts them to ensure consistent hashing
     */
    hashAttributes(attrs) {
        if (!attrs || typeof attrs !== 'object') return '';
        const normalized = Object.keys(attrs)
            .sort()
            .reduce((acc, key) => {
                acc[key.toLowerCase()] = String(attrs[key]).toLowerCase();
                return acc;
            }, {});
        return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    }

    /**
     * Create a new product with optional attributes
     */
    async createProduct(data, tenantId = 1) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            // Auto-generate slug from name if not provided
            let slug = data.slug;
            if (!slug && data.name) {
                const baseSlug = this.generateSlug(data.name);
                slug = await this.generateUniqueSlug(baseSlug);
            }

            // Handle images - convert array to JSON string for storage
            const imagesJson = data.images && Array.isArray(data.images) && data.images.length > 0
                ? JSON.stringify(data.images)
                : null;

            const [result] = await connection.query(
                `INSERT INTO products (name, slug, sku, description, fabric, occasion, images, base_price, category_id, status, tenant_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.name,
                    slug,
                    data.sku ? String(data.sku).trim() : null,
                    data.description || '',
                    data.fabric ? String(data.fabric).trim() : null,
                    data.occasion ? String(data.occasion).trim() : null,
                    imagesJson,
                    data.basePrice || 0,
                    data.categoryId || null,
                    data.status || 'draft',
                    tenantId
                ]
            );
            const productId = result.insertId;

            // Handle Attributes
            if (data.attributes && Array.isArray(data.attributes)) {
                for (const attr of data.attributes) {
                    const [attrResult] = await connection.query(
                        'INSERT INTO product_attributes (product_id, name) VALUES (?, ?)',
                        [productId, attr.name]
                    );
                    const attributeId = attrResult.insertId;

                    if (attr.values && Array.isArray(attr.values)) {
                        for (const val of attr.values) {
                            await connection.query(
                                'INSERT INTO product_attribute_values (attribute_id, value) VALUES (?, ?)',
                                [attributeId, val]
                            );
                        }
                    }
                }
            }

            if (data.categories && Array.isArray(data.categories)) {
                for (const catId of data.categories) {
                    await connection.query(
                        'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
                        [productId, catId]
                    );
                }
            } else if (data.categoryId) {
                await connection.query(
                    'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
                    [productId, data.categoryId]
                );
            }

            await connection.commit();
            return productId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Add a variant to an existing product
     */
    async addVariant(productId, variantData) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const attributesHash = this.hashAttributes(variantData.attributes);
            const { discountPrice, discountStart, discountEnd } = this.normalizeDiscountFields(variantData);

            // 1. Insert Variant
            const [variantResult] = await connection.query(
                `INSERT INTO product_variants 
                (product_id, sku, price, discount_price, discount_start, discount_end, image, attributes_json, attributes_hash) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    productId,
                    variantData.sku,
                    variantData.price,
                    discountPrice,
                    discountStart,
                    discountEnd,
                    variantData.image || null,
                    JSON.stringify(variantData.attributes),
                    attributesHash
                ]
            );
            const variantId = variantResult.insertId;

            // 2. Insert Inventory
            await connection.query(
                `INSERT INTO variant_inventory (variant_id, stock_level, low_stock_threshold) 
                 VALUES (?, ?, ?)`,
                [variantId, variantData.stock ?? 0, variantData.lowStockThreshold ?? 5]
            );

            await connection.commit();
            return variantId;
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('sku')) {
                    throw new Error(`SKU '${variantData.sku}' already exists`);
                }
                if (error.message.includes('idx_product_attr_hash')) {
                    throw new Error('A variant with these attributes already exists for this product');
                }
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async getVariantById(productId, variantId, conn = null) {
        const executor = conn || mysqlPool;
        const [rows] = await executor.query(
            `SELECT v.*, i.stock_level, i.low_stock_threshold
             FROM product_variants v
             LEFT JOIN variant_inventory i ON v.id = i.variant_id
             WHERE v.product_id = ? AND v.id = ?`,
            [productId, variantId]
        );

        if (rows.length === 0) return null;
        return this.mapVariantRow(rows[0]);
    }

    /**
     * Check if a variant with specific attributes already exists for a product
     */
    async checkVariantExists(productId, attributes) {
        const hash = this.hashAttributes(attributes);
        const [rows] = await mysqlPool.query(
            'SELECT id FROM product_variants WHERE product_id = ? AND attributes_hash = ?',
            [productId, hash]
        );
        return rows.length > 0;
    }

    /**
     * Update product details
     */
    async updateProduct(id, data, tenantId = 1) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const updateFields = [];
            const updateValues = [];

            if (data.name) {
                updateFields.push('name = ?');
                updateValues.push(data.name);

                // Auto-update slug if name changed and slug not explicitly provided
                if (!data.slug) {
                    const baseSlug = this.generateSlug(data.name);
                    const uniqueSlug = await this.generateUniqueSlug(baseSlug, id);
                    updateFields.push('slug = ?');
                    updateValues.push(uniqueSlug);
                }
            }
            if (data.slug !== undefined) {
                updateFields.push('slug = ?');
                updateValues.push(data.slug ? this.generateSlug(data.slug) : null);
            }
            if (data.sku !== undefined) {
                updateFields.push('sku = ?');
                updateValues.push(data.sku ? String(data.sku).trim() : null);
            }
            if (data.description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(data.description);
            }
            if (data.fabric !== undefined) {
                updateFields.push('fabric = ?');
                updateValues.push(data.fabric ? String(data.fabric).trim() : null);
            }
            if (data.occasion !== undefined) {
                updateFields.push('occasion = ?');
                updateValues.push(data.occasion ? String(data.occasion).trim() : null);
            }
            // Handle images - convert array to JSON string for storage
            if (data.images !== undefined) {
                updateFields.push('images = ?');
                const imagesJson = data.images && Array.isArray(data.images) && data.images.length > 0
                    ? JSON.stringify(data.images)
                    : null;
                updateValues.push(imagesJson);
            }
            if (data.basePrice !== undefined) {
                updateFields.push('base_price = ?');
                updateValues.push(data.basePrice);
            }
            if (data.categoryId !== undefined) {
                updateFields.push('category_id = ?');
                updateValues.push(data.categoryId);
            }
            if (data.status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(data.status);
            }
            // Handle metadata
            if (data.metadata !== undefined) {
                updateFields.push('metadata = ?');
                updateValues.push(JSON.stringify(data.metadata));
            }
            // Handle SEO fields
            if (data.metaTitle !== undefined) {
                updateFields.push('meta_title = ?');
                updateValues.push(data.metaTitle);
            }
            if (data.metaDescription !== undefined) {
                updateFields.push('meta_description = ?');
                updateValues.push(data.metaDescription);
            }
            if (data.metaKeywords !== undefined) {
                updateFields.push('meta_keywords = ?');
                updateValues.push(data.metaKeywords);
            }

            if (updateFields.length > 0) {
                updateValues.push(id);
                updateValues.push(tenantId);
                await connection.query(
                    `UPDATE products SET ${updateFields.join(', ')} WHERE id = ? AND tenant_id = ?`,
                    updateValues
                );
            }

            // Sync Attributes if provided (Full Replace Pattern)
            if (data.attributes && Array.isArray(data.attributes)) {
                await connection.query(
                    `DELETE pav FROM product_attribute_values pav 
                     INNER JOIN product_attributes pa ON pav.attribute_id = pa.id 
                     WHERE pa.product_id = ?`,
                    [id]
                );
                await connection.query('DELETE FROM product_attributes WHERE product_id = ?', [id]);

                for (const attr of data.attributes) {
                    const [attrResult] = await connection.query(
                        'INSERT INTO product_attributes (product_id, name) VALUES (?, ?)',
                        [id, attr.name]
                    );
                    const attributeId = attrResult.insertId;

                    if (attr.values && Array.isArray(attr.values)) {
                        for (const val of attr.values) {
                            await connection.query(
                                'INSERT INTO product_attribute_values (attribute_id, value) VALUES (?, ?)',
                                [attributeId, val]
                            );
                        }
                    }
                }
            }

            if (data.categories && Array.isArray(data.categories)) {
                await connection.query('DELETE FROM product_categories WHERE product_id = ?', [id]);
                for (const catId of data.categories) {
                    await connection.query(
                        'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
                        [id, catId]
                    );
                }
            } else if (data.categoryId !== undefined) {
                await connection.query('DELETE FROM product_categories WHERE product_id = ?', [id]);
                if (data.categoryId) {
                    await connection.query(
                        'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
                        [id, data.categoryId]
                    );
                }
            }

            // Sync Variants if provided (only if non-empty array is sent)
            if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
                // Get existing variants
                const [existingVariants] = await connection.query('SELECT id FROM product_variants WHERE product_id = ?', [id]);
                const existingVariantIds = existingVariants.map(v => v.id);

                const providedVariantIds = data.variants.map(v => v.id).filter(vId => vId != null);

                // Delete variants not in the payload
                const variantsToDelete = existingVariantIds.filter(vId => !providedVariantIds.includes(vId));
                if (variantsToDelete.length > 0) {
                    await connection.query('DELETE FROM variant_inventory WHERE variant_id IN (?)', [variantsToDelete]);
                    await connection.query('DELETE FROM product_variants WHERE id IN (?)', [variantsToDelete]);
                }

                for (const variant of data.variants) {
                    const attributesHash = this.hashAttributes(variant.attributes);
                    const { discountPrice, discountStart, discountEnd } = this.normalizeDiscountFields(variant);

                    if (variant.id) {
                        // Update existing variant
                        await connection.query(
                            `UPDATE product_variants 
                             SET sku = ?, price = ?, discount_price = ?, discount_start = ?, discount_end = ?, image = ?, attributes_json = ?, attributes_hash = ? 
                             WHERE id = ? AND product_id = ?`,
                            [
                                variant.sku,
                                variant.price,
                                discountPrice,
                                discountStart,
                                discountEnd,
                                variant.image || null,
                                JSON.stringify(variant.attributes),
                                attributesHash,
                                variant.id,
                                id
                            ]
                        );
                        await connection.query(
                            `UPDATE variant_inventory SET stock_level = ?, low_stock_threshold = ? WHERE variant_id = ?`,
                            [variant.stock ?? 0, variant.lowStockThreshold ?? 5, variant.id]
                        );
                    } else {
                        // Insert new variant
                        const [variantResult] = await connection.query(
                            `INSERT INTO product_variants 
                             (product_id, sku, price, discount_price, discount_start, discount_end, image, attributes_json, attributes_hash) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                id,
                                variant.sku,
                                variant.price,
                                discountPrice,
                                discountStart,
                                discountEnd,
                                variant.image || null,
                                JSON.stringify(variant.attributes),
                                attributesHash
                            ]
                        );
                        const variantId = variantResult.insertId;

                        await connection.query(
                            `INSERT INTO variant_inventory (variant_id, stock_level, low_stock_threshold) VALUES (?, ?, ?)`,
                            [variantId, variant.stock ?? 0, variant.lowStockThreshold ?? 5]
                        );
                    }
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('sku')) {
                    const dupErr = new Error(`Duplicate SKU detected during update`);
                    dupErr.statusCode = 409;
                    throw dupErr;
                }
                if (error.message.includes('idx_product_attr_hash')) {
                    const dupErr = new Error('A variant with these attributes already exists for this product');
                    dupErr.statusCode = 409;
                    throw dupErr;
                }
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateVariant(productId, variantId, variantData) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const attributesHash = this.hashAttributes(variantData.attributes);
            const { discountPrice, discountStart, discountEnd } = this.normalizeDiscountFields(variantData);

            const [variantResult] = await connection.query(
                `UPDATE product_variants 
                 SET sku = ?, price = ?, discount_price = ?, discount_start = ?, discount_end = ?, image = ?, attributes_json = ?, attributes_hash = ? 
                 WHERE id = ? AND product_id = ?`,
                [
                    variantData.sku,
                    variantData.price,
                    discountPrice,
                    discountStart,
                    discountEnd,
                    variantData.image || null,
                    JSON.stringify(variantData.attributes),
                    attributesHash,
                    variantId,
                    productId
                ]
            );

            if (variantResult.affectedRows === 0) {
                const notFound = new Error('Variant not found');
                notFound.statusCode = 404;
                throw notFound;
            }

            const [inventoryResult] = await connection.query(
                `UPDATE variant_inventory SET stock_level = ?, low_stock_threshold = ? WHERE variant_id = ?`,
                [variantData.stock ?? 0, variantData.lowStockThreshold ?? 5, variantId]
            );

            if (inventoryResult.affectedRows === 0) {
                await connection.query(
                    `INSERT INTO variant_inventory (variant_id, stock_level, low_stock_threshold) VALUES (?, ?, ?)`,
                    [variantId, variantData.stock ?? 0, variantData.lowStockThreshold ?? 5]
                );
            }

            await connection.commit();
            return await this.getVariantById(productId, variantId);
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('sku')) {
                    const dupErr = new Error(`SKU '${variantData.sku}' already exists`);
                    dupErr.statusCode = 409;
                    throw dupErr;
                }
                if (error.message.includes('idx_product_attr_hash')) {
                    const dupErr = new Error('A variant with these attributes already exists for this product');
                    dupErr.statusCode = 409;
                    throw dupErr;
                }
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async deleteVariant(productId, variantId) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                `DELETE vi FROM variant_inventory vi
                 INNER JOIN product_variants pv ON vi.variant_id = pv.id
                 WHERE pv.product_id = ? AND pv.id = ?`,
                [productId, variantId]
            );

            const [result] = await connection.query(
                `DELETE FROM product_variants WHERE product_id = ? AND id = ?`,
                [productId, variantId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Fetch a complete product with attributes and variants
     */
    async getProduct(id, tenantId = 1) {
        const [products] = await mysqlPool.query('SELECT * FROM products WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if (products.length === 0) return null;

        const product = { ...products[0] };

        // Parse images JSON to array
        if (product.images) {
            try {
                product.images = typeof product.images === 'string'
                    ? JSON.parse(product.images)
                    : product.images;
            } catch (e) {
                product.images = [];
            }
        } else {
            product.images = [];
        }

        // Fetch Attributes
        const [attributes] = await mysqlPool.query(
            `SELECT pa.id, pa.name, GROUP_CONCAT(pav.value) as values_list
             FROM product_attributes pa
             LEFT JOIN product_attribute_values pav ON pa.id = pav.attribute_id
             WHERE pa.product_id = ?
             GROUP BY pa.id`,
            [id]
        );

        product.attributes = attributes.map(a => ({
            id: a.id,
            name: a.name,
            values: a.values_list ? a.values_list.split(',') : []
        }));

        const [categories] = await mysqlPool.query(
            `SELECT c.id, c.name, c.slug, c.image
             FROM categories c
             INNER JOIN product_categories pc ON c.id = pc.category_id
             WHERE pc.product_id = ? AND (c.deleted_at IS NULL OR c.deleted_at = 0)`,
            [id]
        );
        product.categories = categories;

        // Fetch Variants with Inventory
        const [variants] = await mysqlPool.query(
            `SELECT v.*, i.stock_level, i.low_stock_threshold
             FROM product_variants v
             LEFT JOIN variant_inventory i ON v.id = i.variant_id
             WHERE v.product_id = ?`,
            [id]
        );
        product.variants = variants.map((v) => this.mapVariantRow(v));

        return product;
    }

    /**
     * List products with pagination and basic filtering
     * Uses batch queries to avoid N+1 problem
     * ENFORCES TENANT ISOLATION - all queries filtered by tenant_id
     */
    async listProducts(filter = {}, options = {}, tenantId = 1) {
        const skip = (options.page - 1) * options.perPage;
        const limit = options.perPage;

        let whereClause = '1=1 AND p.tenant_id = ? AND (p.deleted_at IS NULL OR p.deleted_at = 0)';
        const params = [tenantId];
        let joins = '';

        // Allow including deleted products for admin views
        if (filter.include_deleted) {
            whereClause = '1=1 AND p.tenant_id = ?';
        }

        if (filter.status) {
            whereClause += ' AND p.status = ?';
            params.push(filter.status);
        } else if (!filter.all_statuses) {
            whereClause += ' AND (p.status = "published" OR p.status = "publish")';
        }
        if (filter.category_id) {
            joins += ' INNER JOIN product_categories pc1 ON p.id = pc1.product_id';
            whereClause += ' AND pc1.category_id = ?';
            params.push(filter.category_id);
        }
        if (filter.category) {
            if (!joins.includes('pc1')) {
                joins += ' INNER JOIN product_categories pc1 ON p.id = pc1.product_id';
            }
            joins += ' INNER JOIN categories c0 ON c0.id = pc1.category_id';
            whereClause += ' AND c0.slug = ? AND (c0.deleted_at IS NULL OR c0.deleted_at = 0)';
            params.push(filter.category);
        }

        const [rows] = await mysqlPool.query(
            `SELECT p.* FROM products p ${joins} WHERE ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, skip]
        );

        const [totalRows] = await mysqlPool.query(`SELECT COUNT(DISTINCT p.id) as count FROM products p ${joins} WHERE ${whereClause}`, params);

        if (rows.length === 0) {
            return {
                products: [],
                total: totalRows[0].count,
                page: options.page,
                perPage: options.perPage
            };
        }

        // Batch load variants for all products using IN clause (fixes N+1)
        const productIds = rows.map(r => r.id);
        const [variantsRows] = await mysqlPool.query(
            `SELECT v.*, i.stock_level, i.low_stock_threshold
             FROM product_variants v
             LEFT JOIN variant_inventory i ON v.id = i.variant_id
             WHERE v.product_id IN (?)
             ORDER BY v.product_id`,
            [productIds]
        );

        // Batch load categories for all products using IN clause (fixes N+1)
        const [categoriesRows] = await mysqlPool.query(
            `SELECT c.id, c.name, c.slug, c.image, pc.product_id
             FROM categories c
             INNER JOIN product_categories pc ON c.id = pc.category_id
             WHERE pc.product_id IN (?) AND (c.deleted_at IS NULL OR c.deleted_at = 0)
             ORDER BY pc.product_id`,
            [productIds]
        );

        // Group variants by product_id
        const variantsByProduct = new Map();
        variantsRows.forEach((v) => {
            if (!variantsByProduct.has(v.product_id)) {
                variantsByProduct.set(v.product_id, []);
            }
            variantsByProduct.get(v.product_id).push(this.mapVariantRow(v));
        });

        // Group categories by product_id
        const categoriesByProduct = new Map();
        categoriesRows.forEach((c) => {
            if (!categoriesByProduct.has(c.product_id)) {
                categoriesByProduct.set(c.product_id, []);
            }
            categoriesByProduct.get(c.product_id).push({
                id: c.id,
                name: c.name,
                slug: c.slug,
                image: c.image
            });
        });

        // Assemble products with their variants and categories
        const products = rows.map((row) => {
            const product = { ...row };

            // Parse images JSON to array
            if (product.images) {
                try {
                    product.images = typeof product.images === 'string'
                        ? JSON.parse(product.images)
                        : product.images;
                } catch (e) {
                    product.images = [];
                }
            } else {
                product.images = [];
            }

            product.variants = variantsByProduct.get(row.id) || [];
            product.categories = categoriesByProduct.get(row.id) || [];
            return product;
        });

        return {
            products,
            total: totalRows[0].count,
            page: options.page,
            perPage: options.perPage
        };
    }

    /**
     * Delete a product (soft delete - sets deleted_at timestamp)
     */
    async deleteProduct(id, tenantId = 1) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            // Soft delete - set deleted_at timestamp
            const [result] = await connection.query(
                'UPDATE products SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Restore a soft-deleted product
     */
    async restoreProduct(id, tenantId = 1) {
        const [result] = await mysqlPool.query(
            'UPDATE products SET deleted_at = NULL WHERE id = ? AND tenant_id = ? AND deleted_at IS NOT NULL',
            [id, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Permanently delete a product (hard delete - use with caution)
     */
    async hardDeleteProduct(id, tenantId = 1) {
        const [result] = await mysqlPool.query(
            'DELETE FROM products WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Update stock level for a variant
     */
    async updateVariantStock(variantId, newLevel) {
        if (newLevel < 0) throw new Error('Stock level cannot be negative');

        const [result] = await mysqlPool.query(
            'UPDATE variant_inventory SET stock_level = ? WHERE variant_id = ?',
            [newLevel, variantId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get categories assigned to a product
     */
    async getProductCategories(productId) {
        const [rows] = await mysqlPool.query(
            `SELECT c.* FROM categories c
             INNER JOIN product_categories pc ON c.id = pc.category_id
             WHERE pc.product_id = ? AND (c.deleted_at IS NULL OR c.deleted_at = 0)`,
            [productId]
        );
        return rows;
    }

    /**
     * Assign categories to a product
     */
    async assignCategoriesToProduct(productId, categoryIds) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();
            for (const catId of categoryIds) {
                await connection.query(
                    'INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)',
                    [productId, catId]
                );
            }
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Remove a category from a product
     */
    async removeCategoryFromProduct(productId, categoryId) {
        const [result] = await mysqlPool.query(
            'DELETE FROM product_categories WHERE product_id = ? AND category_id = ?',
            [productId, categoryId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get variant by color and size
     */
    async getVariantByColorSize(productId, color, size) {
        const [rows] = await mysqlPool.query(
            `SELECT v.*, vi.stock_level, vi.low_stock_threshold
             FROM product_variants v
             LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
             WHERE v.product_id = ?
               AND (v.color = ? OR (v.color IS NULL AND ? IS NULL))
               AND (v.size = ? OR (v.size IS NULL AND ? IS NULL))
             LIMIT 1`,
            [productId, color, color, size, size]
        );

        if (rows.length === 0) return null;
        return this.mapVariantRow(rows[0]);
    }

    /**
     * Get all variants for a product with color/size matrix
     */
    async getVariantMatrix(productId) {
        const [rows] = await mysqlPool.query(
            `SELECT v.*, vi.stock_level, vi.low_stock_threshold
             FROM product_variants v
             LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
             WHERE v.product_id = ?
             ORDER BY v.color, v.size`,
            [productId]
        );

        return rows.map(row => this.mapVariantRow(row));
    }

    /**
     * Get all available colors for a product
     */
    async getProductColors(productId) {
        const [rows] = await mysqlPool.query(
            `SELECT DISTINCT color
             FROM product_variants
             WHERE product_id = ? AND color IS NOT NULL AND color != ''
             ORDER BY color`,
            [productId]
        );
        return rows.map(r => r.color);
    }

    /**
     * Get all available sizes for a product (optionally filtered by color)
     */
    async getProductSizes(productId, color = null) {
        let query, params;

        if (color) {
            query = `SELECT DISTINCT size
                     FROM product_variants
                     WHERE product_id = ? AND color = ?
                     ORDER BY FIELD(size, 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE_SIZE')`;
            params = [productId, color];
        } else {
            query = `SELECT DISTINCT size
                     FROM product_variants
                     WHERE product_id = ?
                     ORDER BY FIELD(size, 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE_SIZE')`;
            params = [productId];
        }

        const [rows] = await mysqlPool.query(query, params);
        return rows.map(r => r.size);
    }

    /**
     * Get stock for a specific variant
     */
    async getVariantStock(productId, color, size) {
        const variant = await this.getVariantByColorSize(productId, color, size);
        if (!variant) return null;

        return {
            variantId: variant.id,
            stock: variant.stock_level || variant.stock_quantity || 0,
            lowStockThreshold: variant.low_stock_threshold || 5,
            isOutOfStock: (variant.stock_level || variant.stock_quantity || 0) === 0,
            isLowStock: (variant.stock_level || variant.stock_quantity || 0) <= (variant.low_stock_threshold || 5)
        };
    }

    /**
     * Update variant stock with optimistic locking
     * Returns { success: boolean, newStock: number, error?: string }
     */
    async updateVariantStockOptimistic(variantId, quantityToDeduct, expectedVersion = null) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            // Get current variant state
            const [current] = await connection.query(
                'SELECT stock_quantity, version FROM product_variants WHERE id = ? FOR UPDATE',
                [variantId]
            );

            if (current.length === 0) {
                await connection.rollback();
                return { success: false, error: 'Variant not found' };
            }

            const { stock_quantity: currentStock, version: currentVersion } = current[0];

            // Check version for optimistic locking
            if (expectedVersion !== null && expectedVersion !== currentVersion) {
                await connection.rollback();
                return {
                    success: false,
                    error: 'Stock was modified by another request. Please refresh and try again.',
                    currentStock
                };
            }

            // Check if enough stock
            if (currentStock < quantityToDeduct) {
                await connection.rollback();
                return {
                    success: false,
                    error: 'Insufficient stock',
                    currentStock,
                    requested: quantityToDeduct
                };
            }

            // Update stock and increment version
            const newStock = currentStock - quantityToDeduct;
            await connection.query(
                'UPDATE product_variants SET stock_quantity = ?, version = version + 1 WHERE id = ?',
                [newStock, variantId]
            );

            // Sync with variant_inventory
            await connection.query(
                'UPDATE variant_inventory SET stock_level = ? WHERE variant_id = ?',
                [newStock, variantId]
            );

            await connection.commit();

            return {
                success: true,
                newStock,
                newVersion: currentVersion + 1
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Bulk create/update variants for a product (variant matrix sync)
     */
    async syncVariantMatrix(productId, variants) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            // Get existing variants
            const [existing] = await connection.query(
                'SELECT id, color, size, attributes_hash FROM product_variants WHERE product_id = ?',
                [productId]
            );

            const existingMap = new Map();
            existing.forEach(v => {
                const key = `${v.color || ''}_${v.size || ''}`;
                existingMap.set(key, v);
            });

            const processedKeys = new Set();

            for (const variant of variants) {
                const color = variant.color || null;
                const size = variant.size || null;
                const key = `${color || ''}_${size || ''}`;
                processedKeys.add(key);

                const attributes = {
                    ...(variant.attributes || {}),
                    color: color || undefined,
                    size: size || undefined
                };

                const attributesHash = this.hashAttributes(attributes);
                const { discountPrice, discountStart, discountEnd } = this.normalizeDiscountFields(variant);

                const existingVariant = existingMap.get(key);

                if (existingVariant) {
                    // Update existing variant
                    await connection.query(
                        `UPDATE product_variants
                         SET sku = ?, price = ?, discount_price = ?, discount_start = ?, discount_end = ?,
                             image = ?, attributes_json = ?, attributes_hash = ?,
                             stock_quantity = ?, price_override = ?, version = version
                         WHERE id = ? AND product_id = ?`,
                        [
                            variant.sku || `SKU-${productId}-${color || 'X'}-${size || 'X'}`,
                            variant.price || 0,
                            discountPrice,
                            discountStart,
                            discountEnd,
                            variant.image || null,
                            JSON.stringify(attributes),
                            attributesHash,
                            variant.stock_quantity ?? variant.stock ?? 0,
                            variant.price_override || null,
                            existingVariant.id,
                            productId
                        ]
                    );

                    // Update inventory
                    await connection.query(
                        'UPDATE variant_inventory SET stock_level = ? WHERE variant_id = ?',
                        [variant.stock_quantity ?? variant.stock ?? 0, existingVariant.id]
                    );
                } else {
                    // Insert new variant
                    const [result] = await connection.query(
                        `INSERT INTO product_variants
                         (product_id, sku, price, discount_price, discount_start, discount_end,
                          image, attributes_json, attributes_hash, color, size, stock_quantity, price_override)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            productId,
                            variant.sku || `SKU-${productId}-${color || 'X'}-${size || 'X'}`,
                            variant.price || 0,
                            discountPrice,
                            discountStart,
                            discountEnd,
                            variant.image || null,
                            JSON.stringify(attributes),
                            attributesHash,
                            color,
                            size,
                            variant.stock_quantity ?? variant.stock ?? 0,
                            variant.price_override || null
                        ]
                    );

                    const variantId = result.insertId;

                    // Create inventory record
                    await connection.query(
                        'INSERT INTO variant_inventory (variant_id, stock_level, low_stock_threshold) VALUES (?, ?, 5)',
                        [variantId, variant.stock_quantity ?? variant.stock ?? 0]
                    );
                }
            }

            // Delete variants not in the new matrix
            const variantsToDelete = [];
            for (const [key, variant] of existingMap) {
                if (!processedKeys.has(key)) {
                    variantsToDelete.push(variant.id);
                }
            }

            if (variantsToDelete.length > 0) {
                await connection.query(
                    'DELETE FROM variant_inventory WHERE variant_id IN (?)',
                    [variantsToDelete]
                );
                await connection.query(
                    'DELETE FROM product_variants WHERE id IN (?) AND product_id = ?',
                    [variantsToDelete, productId]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Calculate total stock for a product (sum of all variants)
     */
    async getProductTotalStock(productId) {
        const [rows] = await mysqlPool.query(
            `SELECT COALESCE(SUM(vi.stock_level), 0) as total_stock
             FROM product_variants v
             LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
             WHERE v.product_id = ?`,
            [productId]
        );

        return rows[0]?.total_stock || 0;
    }

    /**
     * Get variant stock status summary for a product
     */
    async getVariantStockSummary(productId) {
        const [rows] = await mysqlPool.query(
            `SELECT
                v.id,
                v.color,
                v.size,
                vi.stock_level,
                CASE
                    WHEN vi.stock_level = 0 THEN 'out_of_stock'
                    WHEN vi.stock_level <= vi.low_stock_threshold THEN 'low_stock'
                    ELSE 'in_stock'
                END as stock_status
             FROM product_variants v
             LEFT JOIN variant_inventory vi ON v.id = vi.variant_id
             WHERE v.product_id = ?
             ORDER BY v.color, v.size`,
            [productId]
        );

        return rows;
    }
}

module.exports = new ProductSqlRepository();
