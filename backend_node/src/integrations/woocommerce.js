const axios = require('axios');
const config = require('../config/config');

const wcClient = axios.create({
  baseURL: `${config.woocommerce.url.replace(/\/$/, '')}/wp-json/wc/v3`,
  auth: {
    username: config.woocommerce.user,
    password: config.woocommerce.password
  },
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'ShriRamya-Node/2.0.0',
    'X-Forwarded-Proto': 'https'
  },
  timeout: 30000
});

// Add response interceptor for debugging axios errors
wcClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('WooCommerce API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    return Promise.reject(error);
  }
);

module.exports = wcClient;
