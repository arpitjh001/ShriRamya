const axios = require('axios');
const config = require('../config/config');

const wpClient = axios.create({
    baseURL: `${config.woocommerce.url.replace(/\/$/, '')}/wp-json/wp/v2`,
    auth: {
        username: config.woocommerce.user,
        password: config.woocommerce.password
    },
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShriRamya-Node/2.0.0'
    },
    timeout: 30000
});

module.exports = wpClient;
