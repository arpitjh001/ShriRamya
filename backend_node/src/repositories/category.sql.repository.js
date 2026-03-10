const { mysqlPool } = require('../config/db');

class CategorySqlRepository {
    async createCategory(data) {
        const [result] = await mysqlPool.query(
            `INSERT INTO categories (name, slug, description, image, parent_id, menu_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [data.name, data.slug, data.description || null, data.image || null, data.parent_id || null, data.menu_order || 0]
        );
        return result.insertId;
    }

    async getCategoryById(id) {
        const [rows] = await mysqlPool.query('SELECT * FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = 0)', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getCategoryBySlug(slug) {
        const [rows] = await mysqlPool.query('SELECT * FROM categories WHERE slug = ? AND (deleted_at IS NULL OR deleted_at = 0)', [slug]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getAllCategories() {
        const [rows] = await mysqlPool.query('SELECT * FROM categories WHERE (deleted_at IS NULL OR deleted_at = 0) ORDER BY menu_order ASC, name ASC');
        return rows;
    }

    async updateCategory(id, data) {
        const updateFields = [];
        const updateValues = [];

        if (data.name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(data.name);
        }
        if (data.slug !== undefined) {
            updateFields.push('slug = ?');
            updateValues.push(data.slug);
        }
        if (data.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(data.description);
        }
        if (data.image !== undefined) {
            updateFields.push('image = ?');
            updateValues.push(data.image);
        }
        if (data.parent_id !== undefined) {
            updateFields.push('parent_id = ?');
            updateValues.push(data.parent_id);
        }
        if (data.menu_order !== undefined) {
            updateFields.push('menu_order = ?');
            updateValues.push(data.menu_order);
        }

        if (updateFields.length > 0) {
            updateValues.push(id);
            await mysqlPool.query(
                `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            return true;
        }
        return false;
    }

    /**
     * Soft delete category - marks as deleted instead of actually deleting
     * This prevents FK constraint errors with product_categories
     */
    async deleteCategory(id) {
        try {
            // First try soft delete with new columns
            const [result] = await mysqlPool.query(
                'UPDATE categories SET deleted_at = UNIX_TIMESTAMP(), is_deleted = 1 WHERE id = ? AND (deleted_at IS NULL OR deleted_at = 0)',
                [id]
            );

            if (result.affectedRows > 0) {
                console.log(`[CategoryRepository] Soft deleted category ${id}`);
                return true;
            }

            // If no rows affected, check if category exists and is already soft-deleted
            const [rows] = await mysqlPool.query('SELECT id, is_deleted FROM categories WHERE id = ?', [id]);
            if (rows.length === 0) {
                console.log(`[CategoryRepository] Category ${id} not found`);
                return false; // Category doesn't exist
            }

            if (rows[0].is_deleted) {
                console.log(`[CategoryRepository] Category ${id} already soft-deleted`);
                return false; // Already deleted, should probably return false or status that it's gone
            }

            // Columns might not exist - try hard delete as fallback
            console.log(`[CategoryRepository] Attempting hard delete for category ${id}`);
            const [hardDelete] = await mysqlPool.query('DELETE FROM categories WHERE id = ?', [id]);

            if (hardDelete.affectedRows > 0) {
                console.log(`[CategoryRepository] Hard deleted category ${id}`);
                return true;
            }

            return false;
        } catch (error) {
            // If soft delete fails, try hard delete as fallback
            console.error('[CategoryRepository] Soft delete error:', error.message);
            console.log('[CategoryRepository] Attempting hard delete as fallback...');

            try {
                const [result] = await mysqlPool.query('DELETE FROM categories WHERE id = ?', [id]);
                if (result.affectedRows > 0) {
                    console.log(`[CategoryRepository] Hard delete successful for category ${id}`);
                    return true;
                }
                return false;
            } catch (hardError) {
                console.error('[CategoryRepository] Hard delete error:', hardError.message);
                return false;
            }
        }
    }

    async getProductsByCategoryId(categoryId, limit = 100, status = 'published') {
        let sql = `
             SELECT p.*
             FROM products p
             INNER JOIN product_categories pc ON pc.product_id = p.id
             INNER JOIN categories c ON c.id = pc.category_id
             WHERE pc.category_id = ? AND (c.deleted_at IS NULL OR c.deleted_at = 0)
        `;
        const params = [categoryId];

        if (status) {
            sql += ' AND p.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY p.created_at DESC LIMIT ?';
        params.push(limit);

        const [rows] = await mysqlPool.query(sql, params);
        return rows;
    }

    async getProductsByCategorySlug(slug, limit = 100, status = 'published') {
        let sql = `
             SELECT p.*
             FROM products p
             INNER JOIN product_categories pc ON pc.product_id = p.id
             INNER JOIN categories c ON c.id = pc.category_id
             WHERE c.slug = ? AND (c.deleted_at IS NULL OR c.deleted_at = 0)
        `;
        const params = [slug];

        if (status) {
            sql += ' AND p.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY p.created_at DESC LIMIT ?';
        params.push(limit);

        const [rows] = await mysqlPool.query(sql, params);
        return rows;
    }
}

module.exports = new CategorySqlRepository();
