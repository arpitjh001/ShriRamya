/**
 * Catalog Integrity Fix Script
 * 
 * Objectives:
 * 1. Update "Linen Leaf Handblock Printed Suit" price to 2999.
 * 2. Remove "Uncategorized" category from all products.
 * 3. Delete duplicate "Jaipuri Cotton Suit Set" record.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require('../src/models/product.model');
const Category = require('../src/models/category.model');

async function runFix() {
  const isDryRun = process.argv.includes('--dry-run');
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
  const DB_NAME = process.env.DB_NAME || 'shriramya';

  console.log(`Connecting to ${MONGO_URL}${DB_NAME}...`);
  
  try {
    await mongoose.connect(`${MONGO_URL}${DB_NAME}`);
    console.log('Connected to MongoDB.');

    const UNCATEGORIZED_ID = '69e6288c8b7a6d59dff807c7';
    const LINEN_LEAF_ID = '6a0049b54351988e900863f6';
    const JAIPURI_DUPLICATE_ID = '6a004f1996460b76897dc704';

    // 1. Update Linen Leaf Price
    console.log('\n--- Updating Linen Leaf Price ---');
    const linenLeaf = await Product.findById(LINEN_LEAF_ID);
    if (linenLeaf) {
      console.log(`Found product: ${linenLeaf.name} (Current Price: ${linenLeaf.basePrice})`);
      linenLeaf.basePrice = 2999;
      // Also update variants if they exist
      if (linenLeaf.variants && linenLeaf.variants.length > 0) {
        linenLeaf.variants.forEach(v => {
          v.price = 2999;
        });
      }
      await linenLeaf.save();
      console.log('Price updated to 2999.');
    } else {
      console.log('Linen Leaf product not found.');
    }

    // 2. Remove "Uncategorized" from all products
    console.log('\n--- Removing "Uncategorized" category mapping ---');
    const productsWithUncategorized = await Product.find({ 
      $or: [
        { categories: UNCATEGORIZED_ID },
        { categoryId: UNCATEGORIZED_ID }
      ]
    });
    
    console.log(`Found ${productsWithUncategorized.length} products with "Uncategorized" tag.`);
    
    for (const prod of productsWithUncategorized) {
      console.log(`Updating ${prod.name}...`);
      prod.categories = prod.categories.filter(id => id.toString() !== UNCATEGORIZED_ID);
      if (prod.categoryId && prod.categoryId.toString() === UNCATEGORIZED_ID) {
        prod.categoryId = prod.categories[0] || null;
      }
      await prod.save();
    }
    console.log('Category mapping cleaned.');

    // 3. Delete Duplicate Jaipuri Record
    console.log('\n--- Deleting Duplicate Jaipuri Record ---');
    const duplicateJaipuri = await Product.findById(JAIPURI_DUPLICATE_ID);
    if (duplicateJaipuri) {
      console.log(`Found duplicate: ${duplicateJaipuri.name} (ID: ${JAIPURI_DUPLICATE_ID})`);
      await Product.deleteOne({ _id: JAIPURI_DUPLICATE_ID });
      console.log('Duplicate record deleted.');
    } else {
      console.log('Duplicate Jaipuri record not found (already deleted or wrong ID).');
    }

    console.log('\nAudit and fix complete.');
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    await mongoose.connection.close();
  }
}

runFix();
