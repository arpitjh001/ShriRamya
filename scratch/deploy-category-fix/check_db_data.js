const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend_node', '.env') });

async function checkDb() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3307,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });

    try {
        console.log('--- BLOGS ---');
        const [blogs] = await connection.query('SELECT id, title, status, tenant_id FROM blogs');
        console.log(JSON.stringify(blogs, null, 2));

        console.log('\n--- SUBCATEGORY GROUPS ---');
        const [groups] = await connection.query('SELECT * FROM subcategory_groups');
        console.log(JSON.stringify(groups, null, 2));

        console.log('\n--- SUBCATEGORY VALUES ---');
        const [values] = await connection.query('SELECT * FROM subcategory_values');
        console.log(JSON.stringify(values, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkDb();
