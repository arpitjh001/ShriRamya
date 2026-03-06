const axios = require('axios');
const config = require('../config');

const wpClient = axios.create({
    baseURL: `${config.woocommerce.url.replace(/\/$/, '')}/wp-json/wp/v2`,
    auth: {
        username: config.wordpress.user,
        password: config.wordpress.password
    },
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShriRamya-Node/2.0.0'
    },
    timeout: 30000
});

module.exports = wpClient;


