const cacheInvalidationService = require('./src/services/cacheInvalidation.service');
const redis = require('./src/config/integrations/redis');

async function run() {
  console.log('Clearing all product-related cache...');
  await cacheInvalidationService.invalidateProducts();
  console.log('Cache cleared successfully.');
  
  // Also check if there are any other suspicious keys
  if (redis && redis.keys) {
    const keys = await redis.keys('*products*');
    console.log('Remaining product keys:', keys);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log('Cleaned up remaining keys.');
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
