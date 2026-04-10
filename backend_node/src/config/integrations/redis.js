const Redis = require('ioredis');
const config = require('../config');

let redis = null;
let redisAvailable = false;

/**
 * Initialize Redis connection with fallback
 */
const initRedis = () => {
    try {
        // Enable TLS for rediss:// URLs
        const options = {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) {
                    console.warn('[Redis] Max retries reached, operating without Redis');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 100, 2000);
                return delay;
            },
            connectTimeout: 5000,
            lazyConnect: true,
        };

        // Enable TLS when using rediss:// protocol
        if (config.redis.url && config.redis.url.startsWith('rediss://')) {
            options.tls = {};
            console.info('[Redis] TLS enabled for secure connection');
        }

        redis = new Redis(config.redis.url, options);

        redis.on('connect', () => {
            console.info('[Redis] Connected successfully');
            redisAvailable = true;
        });

        redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
            redisAvailable = false;
        });

        redis.on('close', () => {
            console.warn('[Redis] Connection closed');
            redisAvailable = false;
        });

        redis.on('reconnecting', () => {
            console.info('[Redis] Attempting to reconnect...');
        });

    } catch (error) {
        console.error('[Redis] Failed to initialize:', error.message);
        redisAvailable = false;
    }
};

/**
 * Get Redis instance (may be null if unavailable)
 */
const getRedis = () => redis;

/**
 * Check if Redis is available
 */
const isAvailable = () => redisAvailable;

/**
 * Safe Redis operations with fallback
 */
const safeRedis = {
    async get(key) {
        if (!redisAvailable || !redis) {
            console.warn('[Redis] GET skipped - Redis unavailable');
            return null;
        }
        try {
            return await redis.get(key);
        } catch (error) {
            console.error('[Redis] GET error:', error.message);
            redisAvailable = false;
            return null;
        }
    },

    async set(key, value, options) {
        if (!redisAvailable || !redis) {
            console.warn('[Redis] SET skipped - Redis unavailable');
            return false;
        }
        try {
            if (options?.ex) {
                await redis.setex(key, options.ex, value);
            } else {
                await redis.set(key, value);
            }
            return true;
        } catch (error) {
            console.error('[Redis] SET error:', error.message);
            redisAvailable = false;
            return false;
        }
    },

    async del(...keys) {
        if (!redisAvailable || !redis) {
            console.warn('[Redis] DEL skipped - Redis unavailable');
            return false;
        }
        try {
            await redis.del(...keys);
            return true;
        } catch (error) {
            console.error('[Redis] DEL error:', error.message);
            return false;
        }
    },

    async exists(key) {
        if (!redisAvailable || !redis) {
            return false;
        }
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            console.error('[Redis] EXISTS error:', error.message);
            return false;
        }
    },

    async keys(pattern) {
        if (!redisAvailable || !redis) {
            return [];
        }
        try {
            return await redis.keys(pattern);
        } catch (error) {
            console.error('[Redis] KEYS error:', error.message);
            return [];
        }
    }
};

// Initialize Redis on module load
initRedis();

// Export both the direct redis instance (for backward compat) and safe wrappers
module.exports = safeRedis;
module.exports.getRedis = getRedis;
module.exports.isAvailable = isAvailable;
module.exports.initRedis = initRedis;


