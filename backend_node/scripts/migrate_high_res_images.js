const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const images = {
    'sarees': 'saree_model_high_res_1773311100000_1773310975132.png',
    'lehenga': 'lehenga_model_high_res_1773311100000_1773310991053.png',
    'anarkali': 'anarkali_model_high_res_1773311100000_1773311004972.png',
    'blouses': 'blouse_model_high_res_1773311100000_1773311024188.png',
    'kurta': 'kurta_model_high_res_1773311100000_1773311153028.png',
    'jewellery': 'jewellery_model_high_res_1773311100000_1773311171859.png'
};

const artifactDir = 'C:/Users/Lenovo/.gemini/antigravity/brain/b7dbb69a-4872-43a1-841b-14e5f378021e';
const targetDir = path.join(__dirname, '../uploads/high-res');

async function migrateImages() {
    console.log('--- Product Image Migration Start ---');
    console.log(`Artifact Dir: ${artifactDir}`);
    console.log(`Target Dir: ${targetDir}`);
    
    // 1. Create directory
    if (!fs.existsSync(targetDir)) {
        console.log(`Creating directory: ${targetDir}`);
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // 2. Copy images
    for (const [key, filename] of Object.entries(images)) {
        const src = path.join(artifactDir, filename);
        const dest = path.join(targetDir, filename);
        console.log(`Checking source: ${src}`);
        if (fs.existsSync(src)) {
            try {
                fs.copyFileSync(src, dest);
                console.log(`✓ Copied ${filename} to ${dest}`);
            } catch (copyErr) {
                console.error(`✗ Failed to copy ${filename}:`, copyErr.message);
            }
        } else {
            console.warn(`! Source image ${filename} not found in artifacts!`);
        }
    }

    // 3. Update Database
    console.log('Connecting to MySQL...');
    // When running from host, we use localhost instead of docker service name 'mysql'
    // Also the port is mapped to 3307 in docker-compose.yml
    const dbHost = process.env.MYSQL_HOST === 'mysql' ? 'localhost' : (process.env.MYSQL_HOST || 'localhost');
    const dbPort = dbHost === 'localhost' ? 3307 : parseInt(process.env.MYSQL_PORT || '3306');
    
    console.log(`DB Host: ${dbHost}`);
    console.log(`DB Port: ${dbPort}`);
    console.log(`DB User: ${process.env.MYSQL_USER}`);
    console.log(`DB Name: ${process.env.MYSQL_DATABASE}`);

    try {
        const connection = await mysql.createConnection({
            host: dbHost,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: dbPort
        });
        console.log('✓ Connected to MySQL');

        const [products] = await connection.execute('SELECT id, name FROM products');
        console.log(`Found ${products.length} products to update.`);

        for (const product of products) {
            let selectedImage = images['sarees']; // Default
            const nameLower = product.name.toLowerCase();
            
            if (nameLower.includes('lehenga')) selectedImage = images['lehenga'];
            else if (nameLower.includes('anarkali')) selectedImage = images['anarkali'];
            else if (nameLower.includes('blouse')) selectedImage = images['blouses'];
            else if (nameLower.includes('kurta')) selectedImage = images['kurta'];
            else if (nameLower.includes('jewellery') || nameLower.includes('necklace')) selectedImage = images['jewellery'];
            
            const imageUrl = `/uploads/high-res/${selectedImage}`;
            const imagesJson = JSON.stringify([{ src: imageUrl }]);

            await connection.execute('UPDATE products SET images = ? WHERE id = ?', [imagesJson, product.id]);
            await connection.execute('UPDATE product_variants SET image = ? WHERE product_id = ?', [imageUrl, product.id]);
            
            console.log(`  → Updated product: ${product.name} with ${imageUrl}`);
        }

        await connection.end();
        console.log('--- Migration Complete ---');
    } catch (err) {
        console.error('✗ Migration failed with database error:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

migrateImages();
