const config = require('../config/config');
const redisConnection = require('../config/integrations/redis');

class CacheService {
  constructor(connection = redisConnection, options = {}) {
    this.connection = connection;
    this.commandTimeoutMs = options.commandTimeoutMs || config.redis.commandTimeoutMs;
    this.defaultTtlSeconds = options.defaultTtlSeconds || config.cache.defaultTtlSeconds;
    this.debug = options.debug ?? config.redis.debug;
  }

  log(level, event, fields = {}) {
    if (level === 'debug' && !this.debug) return;

    const payload = { event, ...fields };
    const message = `[Cache] ${JSON.stringify(payload)}`;
    if (level === 'warn') console.warn(message);
    else if (level === 'error') console.error(message);
    else console.info(message);
  }

  async withTimeout(operation, command, key) {
    let timeoutHandle;
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`${command} timeout after ${this.commandTimeoutMs}ms`));
          }, this.commandTimeoutMs);
        }),
      ]);
    } catch (error) {
      if (this.connection.markCommandFailure) {
        this.connection.markCommandFailure(error, command);
      }
      this.log('warn', 'CACHE_FALLBACK', {
        key,
        command,
        reason: error.message,
        fallback: 'DATABASE',
      });
      return null;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async getClient(command, key) {
    if (!this.connection.isEnabled?.()) {
      this.log('debug', 'CACHE_SKIPPED', { key, command, reason: 'REDIS_DISABLED' });
      return null;
    }

    const client = await this.connection.ensureConnected?.();
    if (!client) {
      this.log('warn', 'CACHE_FALLBACK', {
        key,
        command,
        reason: 'REDIS_UNAVAILABLE',
        fallback: 'DATABASE',
      });
      return null;
    }

    return client;
  }

  parse(rawValue, key) {
    if (rawValue == null) return null;
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      this.log('warn', 'CACHE_PARSE_FAILED', { key, reason: error.message });
      return rawValue;
    }
  }

  serialize(value) {
    return JSON.stringify(value);
  }

  normalizeTtl(ttlSeconds) {
    if (typeof ttlSeconds === 'object' && ttlSeconds !== null) {
      return Number(ttlSeconds.ex || ttlSeconds.EX || ttlSeconds.ttl || this.defaultTtlSeconds);
    }
    return Number(ttlSeconds || this.defaultTtlSeconds);
  }

  async get(key) {
    const client = await this.getClient('GET', key);
    if (!client) return null;

    const rawValue = await this.withTimeout(() => client.get(key), 'GET', key);
    if (rawValue == null) {
      this.log('debug', 'CACHE_MISS', { key });
      return null;
    }

    this.log('debug', 'CACHE_HIT', { key });
    return this.parse(rawValue, key);
  }

  async set(key, value, ttlSeconds = this.defaultTtlSeconds) {
    const client = await this.getClient('SET', key);
    if (!client) return false;

    const ttl = this.normalizeTtl(ttlSeconds);
    const payload = this.serialize(value);
    const result = await this.withTimeout(async () => {
      if (ttl > 0) {
        return client.set(key, payload, 'EX', ttl);
      }
      return client.set(key, payload);
    }, 'SET', key);

    if (result === null) {
      this.log('warn', 'CACHE_SET_FAILED', { key });
      return false;
    }

    this.log('debug', 'CACHE_SET', { key, ttlSeconds: ttl });
    return true;
  }

  async setex(key, ttlSeconds, value) {
    return this.set(key, value, ttlSeconds);
  }

  async del(...inputKeys) {
    const keys = inputKeys.flat().filter(Boolean);
    if (keys.length === 0) return true;

    const client = await this.getClient('DEL', keys[0]);
    if (!client) return false;

    const result = await this.withTimeout(() => client.del(...keys), 'DEL', keys.join(','), keys[0]);
    if (result === null) {
      this.log('warn', 'CACHE_INVALIDATION_FAILED', { keys });
      return false;
    }

    this.log('debug', 'CACHE_INVALIDATED', { keys, deleted: result });
    return true;
  }

  async delPattern(pattern) {
    const client = await this.getClient('DEL_PATTERN', pattern);
    if (!client) return false;

    const deleted = await this.withTimeout(async () => {
      let cursor = '0';
      let totalDeleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          totalDeleted += await client.del(...keys);
        }
      } while (cursor !== '0');
      return totalDeleted;
    }, 'DEL_PATTERN', pattern);

    if (deleted === null) {
      this.log('warn', 'CACHE_INVALIDATION_FAILED', { pattern });
      return false;
    }

    this.log('debug', 'CACHE_PATTERN_INVALIDATED', { pattern, deleted });
    return true;
  }

  async keys(pattern) {
    const client = await this.getClient('KEYS', pattern);
    if (!client) return [];
    const result = await this.withTimeout(() => client.keys(pattern), 'KEYS', pattern);
    return Array.isArray(result) ? result : [];
  }

  async getOrSet(key, ttlSeconds, fetchFunction) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await fetchFunction();
    if (freshValue !== undefined && freshValue !== null) {
      await this.set(key, freshValue, ttlSeconds);
    }
    return freshValue;
  }

  isHealthy() {
    return Boolean(this.connection.isAvailable?.());
  }
}

const cacheService = new CacheService();

module.exports = cacheService;
module.exports.CacheService = CacheService;
