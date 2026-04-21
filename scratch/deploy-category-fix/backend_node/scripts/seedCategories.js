const wcClient = require('../config/integrations/woocommerce');

const categories = [
    {
        name: "Women Wear",
        subcategories: ["Sarees", "Suit Sets", "Lehengas", "Kurtas", "Dupattas"]
    },
    {
        name: "Home and Lifestyle",
        subcategories: ["Cushion Covers", "Bed Linens", "Table Linens", "Decor"]
    },
    {
        name: "Regional Collections",
        subcategories: ["Banarasi", "Jaipuri", "Bandhani", "Chanderi", "Lucknowi"]
    },
    {
        name: "Luxury Collections",
        subcategories: ["Bridal", "Heritage", "Handcrafted", "Limited Edition"]
    }
];

const seedCategories = async () => {
    console.log('🚀 Starting Category Seeding...');

    try {
        for (const cat of categories) {
            console.log(`Creating top-level category: ${cat.name}`);
            let parentId;

            try {
                const response = await wcClient.post('/products/categories', { name: cat.name });
                parentId = response.data.id;
                console.log(`✅ Created: ${cat.name} (ID: ${parentId})`);
            } catch (error) {
                if (error.response?.data?.code === 'term_exists') {
                    parentId = error.response.data.data.resource_id;
                    console.log(`ℹ️ Category ${cat.name} already exists (ID: ${parentId})`);
                } else {
                    throw error;
                }
            }

            for (const sub of cat.subcategories) {
                try {
                    await wcClient.post('/products/categories', { name: sub, parent: parentId });
                    console.log(`   ✅ Created Sub: ${sub}`);
                } catch (error) {
                    if (error.response?.data?.code === 'term_exists') {
                        console.log(`   ℹ️ Sub-category ${sub} already exists`);
                    } else {
                        console.warn(`   ❌ Error creating ${sub}:`, error.message);
                    }
                }
            }
        }
        console.log('✨ Category Seeding Completed!');
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    }
};

if (require.main === module) {
    seedCategories().then(() => process.exit(0));
}

module.exports = seedCategories;

