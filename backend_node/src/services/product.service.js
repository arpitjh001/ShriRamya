const NodeCache = require('node-cache');
const wcClient = require('../integrations/woocommerce');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes

const getAllProducts = async (params) => {
  const cacheKey = `products_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await wcClient.get('/products', { params });
  const data = response.data;

  cache.set(cacheKey, data);
  return data;
};

const getProductById = async (id) => {
  const cacheKey = `product_${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await wcClient.get(`/products/${id}`);
  const data = response.data;

  cache.set(cacheKey, data);
  return data;
};

const getCategories = async (params) => {
  const cacheKey = `categories_${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await wcClient.get('/products/categories', { params });
  const data = response.data;

  cache.set(cacheKey, data);
  return data;
};

const createProduct = async (productData) => {
  // Map our cleaner input to WooCommerce REST API format
  const wcPayload = {
    name: productData.name,
    description: productData.description,
    regular_price: productData.price.toString(),
    type: 'simple',
    categories: [{ name: productData.category }],
    manage_stock: true,
    stock_quantity: productData.stock,
    attributes: [
      { name: 'Color', options: [productData.color], visible: true, variation: true },
      { name: 'Size', options: [productData.size], visible: true, variation: true },
    ]
  };

  const response = await wcClient.post('/products', wcPayload);
  return response.data;
};

const createCategory = async (categoryData) => {
  const response = await wcClient.post('/products/categories', categoryData);
  cache.flushAll(); // Clear cache when new category is added
  return response.data;
};

module.exports = {
  getAllProducts,
  getProductById,
  getCategories,
  createProduct,
  createCategory,
};
