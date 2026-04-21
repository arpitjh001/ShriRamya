const catalogReadService = require('../backend_node/src/services/catalog-read.service');

const mockProducts = [
  {
    name: 'Test Product',
    sku: 'SKU-001',
    categories: [{ name: 'Cat1' }, null, { name: 'Cat2' }],
    variants: [{ sku: 'V-001' }, null]
  }
];

try {
  console.log('Testing applyFilters...');
  const result = catalogReadService.applyFilters(mockProducts, { q: 'SKU' });
  console.log('Success! Found:', result.length);
} catch (error) {
  console.error('FAILED with error:', error.message);
  console.error(error.stack);
}
