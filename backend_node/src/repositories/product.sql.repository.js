const { mysqlPool } = require('../config/db');
const crypto = require('crypto');

class ProductSqlRepository {
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
    async createProduct(data) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO products (name, sku, description, fabric, occasion, base_price, category_id, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.name,
                    data.sku ? String(data.sku).trim() : null,
                    data.description || '',
                    data.fabric ? String(data.fabric).trim() : null,
                    data.occasion ? String(data.occasion).trim() : null,
                    data.basePrice || 0,
                    data.categoryId || null,
                    data.status || 'published'
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
    async updateProduct(id, data) {
        const connection = await mysqlPool.getConnection();
        try {
            await connection.beginTransaction();

            const updateFields = [];
            const updateValues = [];

            if (data.name) {
                updateFields.push('name = ?');
                updateValues.push(data.name);
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

            if (updateFields.length > 0) {
                updateValues.push(id);
                await connection.query(
                    `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
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

            // Sync Variants if provided
            if (data.variants && Array.isArray(data.variants)) {
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
    async getProduct(id) {
        const [products] = await mysqlPool.query('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) return null;

        const product = { ...products[0] };

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
             WHERE pc.product_id = ?`,
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
     */
    async listProducts(filter = {}, options = {}) {
        const skip = (options.page - 1) * options.perPage;
        const limit = options.perPage;

        let whereClause = '1=1';
        const params = [];
        let joins = '';

        if (filter.status) {
            whereClause += ' AND p.status = ?';
            params.push(filter.status);
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
            whereClause += ' AND c0.slug = ?';
            params.push(filter.category);
        }

        const [rows] = await mysqlPool.query(
            `SELECT p.* FROM products p ${joins} WHERE ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, skip]
        );

        const [totalRows] = await mysqlPool.query(`SELECT COUNT(p.id) as count FROM products p ${joins} WHERE ${whereClause}`, params);

        const products = [];
        for (const row of rows) {
            const product = { ...row };

            const [variants] = await mysqlPool.query(
                `SELECT v.*, i.stock_level, i.low_stock_threshold
                 FROM product_variants v
                 LEFT JOIN variant_inventory i ON v.id = i.variant_id
                 WHERE v.product_id = ?`,
                [product.id]
            );
            product.variants = variants.map((v) => this.mapVariantRow(v));

            const [categories] = await mysqlPool.query(
                `SELECT c.id, c.name, c.slug, c.image
                 FROM categories c
                 INNER JOIN product_categories pc ON c.id = pc.category_id
                 WHERE pc.product_id = ?`,
                [product.id]
            );
            product.categories = categories;
            products.push(product);
        }

        return {
            products,
            total: totalRows[0].count,
            page: options.page,
            perPage: options.perPage
        };
    }

    /**
     * Delete a product (cascade will handle variants and attributes)
     */
    async deleteProduct(id) {
        const [result] = await mysqlPool.query('DELETE FROM products WHERE id = ?', [id]);
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
             WHERE pc.product_id = ?`,
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
}

module.exports = new ProductSqlRepository();
