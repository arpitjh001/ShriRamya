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
        const [rows] = await mysqlPool.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getCategoryBySlug(slug) {
        const [rows] = await mysqlPool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
        return rows.length > 0 ? rows[0] : null;
    }

    async getAllCategories() {
        const [rows] = await mysqlPool.query('SELECT * FROM categories ORDER BY menu_order ASC, name ASC');
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

    async deleteCategory(id) {
        const [result] = await mysqlPool.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = new CategorySqlRepository();
