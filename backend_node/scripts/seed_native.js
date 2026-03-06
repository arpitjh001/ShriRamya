const mysqlRepository = require('../src/repositories/product.sql.repository');
const { mysqlPool } = require('../src/config/db');

async function seed() {
    try {
        const productData = {
            name: "Designer Denim Jacket",
            description: "Premium handcrafted denim.",
            basePrice: 89.99,
            status: "published",
            attributes: [
                { name: "Material", values: ["Denim", "Corduroy"] },
                { name: "Fit", values: ["Slim", "Regular"] }
            ]
        };

        console.log("Creating product...");
        const productId = await mysqlRepository.createProduct(productData);

        console.log("Adding variants...");
        await mysqlRepository.addVariant(productId, {
            sku: "JKT-DEN-SLIM",
            price: 89.99,
            stock: 12,
            attributes: { "Material": "Denim", "Fit": "Slim" }
        });

        await mysqlRepository.addVariant(productId, {
            sku: "JKT-CORD-REG",
            price: 99.99,
            stock: 5,
            attributes: { "Material": "Corduroy", "Fit": "Regular" }
        });

        console.log("Seeding complete! Product ID:", productId);
    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        process.exit(0);
    }
}

seed();
