const NodeCache = require('node-cache');
const wcClient = require('../integrations/woocommerce');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes

const getAllProducts = async (params) => {
  try {
    const cacheKey = `products_${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const response = await wcClient.get('/products', { params });

    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 'Failed to fetch products'
    );
  }
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
  if (!productData.price || productData.price <= 0) {
    throw new Error('Price must be positive');
  }

  if (!productData.color) {
    throw new Error('Color is required');
  }

  if (!productData.size) {
    throw new Error('Size is required');
  }

  const wcPayload = {
    name: productData.name,
    description: productData.description,
    regular_price: String(productData.price),
    type: 'simple',
    categories: [{ name: productData.category }],
    manage_stock: true,
    stock_quantity: productData.stock,
    attributes: [
      {
        name: 'Color',
        options: [productData.color],
        visible: true,
        variation: true,
      },
      {
        name: 'Size',
        options: [productData.size],
        visible: true,
        variation: true,
      },
    ],
  };

  const response = await wcClient.post('/products', wcPayload);

  cache.flushAll(); // clear product cache after creation

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
