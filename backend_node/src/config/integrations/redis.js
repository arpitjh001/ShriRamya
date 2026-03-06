const Redis = require('ioredis');
const config = require('../config');

const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('connect', () => {
    console.info('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redis;


