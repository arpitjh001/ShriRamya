/**
 * One-time cleanup script to permanently remove all soft-deleted products
 * from MongoDB. Run this after deploying the hard-delete fix.
 *
 * Usage: node backend_node/scripts/purge_soft_deleted.js
 */
const { connectDB, mongoose } = require('../src/db/mongodb');
const Product = require('../src/models/product.model');

(async () => {
  try {
    await connectDB();

    // Count soft-deleted products
    const softDeletedCount = await Product.countDocuments({ is_deleted: true });
    console.log(`Found ${softDeletedCount} soft-deleted product(s) in the database.`);

    if (softDeletedCount === 0) {
      console.log('Nothing to purge. All clean!');
      process.exit(0);
    }

    // List them before deleting
    const softDeleted = await Product.find({ is_deleted: true }, { name: 1, slug: 1, deleted_at: 1 }).lean();
    console.log('\nProducts to be permanently removed:');
    softDeleted.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (slug: ${p.slug}, deleted_at: ${p.deleted_at || 'unknown'})`);
    });

    // Permanently remove them
    const result = await Product.deleteMany({ is_deleted: true });
    console.log(`\n✅ Permanently removed ${result.deletedCount} soft-deleted product(s).`);

    // Verify
    const remaining = await Product.countDocuments({ is_deleted: true });
    console.log(`Remaining soft-deleted products: ${remaining}`);

    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);

    process.exit(0);
  } catch (error) {
    console.error('Purge failed:', error.message);
    process.exit(1);
  }
})();
