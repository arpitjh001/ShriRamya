const Redis = require('ioredis');
const config = require('../config');

let client = null;
let connectPromise = null;
let available = false;
let failureTimestamps = [];
let circuitOpenUntil = 0;

const now = () => Date.now();

const log = (level, event, fields = {}) => {
  const payload = { event, ...fields };
  const message = `[Redis] ${JSON.stringify(payload)}`;
  if (level === 'warn') console.warn(message);
  else if (level === 'error') console.error(message);
  else if (config.redis.debug) console.info(message);
};

const isEnabled = () => Boolean(config.redis.enabled && config.redis.url);

const isCircuitOpen = () => {
  if (!circuitOpenUntil) return false;
  if (now() >= circuitOpenUntil) {
    circuitOpenUntil = 0;
    log('info', 'REDIS_CIRCUIT_HALF_OPEN');
    return false;
  }
  return true;
};

const resetFailures = () => {
  failureTimestamps = [];
  circuitOpenUntil = 0;
};

const recordFailure = (reason) => {
  available = false;
  const cutoff = now() - config.redis.failureWindowMs;
  failureTimestamps = failureTimestamps.filter((timestamp) => timestamp >= cutoff);
  failureTimestamps.push(now());

  if (failureTimestamps.length >= config.redis.failureThreshold) {
    circuitOpenUntil = now() + config.redis.unhealthyCooldownMs;
    log('warn', 'REDIS_CIRCUIT_OPENED', {
      reason,
      failures: failureTimestamps.length,
      cooldownMs: config.redis.unhealthyCooldownMs,
    });
  }
};

const createClient = () => {
  if (!isEnabled()) {
    log('warn', 'REDIS_DISABLED');
    return null;
  }

  if (client) {
    return client;
  }

  const options = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    connectTimeout: config.redis.connectTimeoutMs,
    commandTimeout: config.redis.commandTimeoutMs,
    retryStrategy(times) {
      if (times > 2) return null;
      return Math.min(times * 250, 1000);
    },
  };

  if (config.redis.url.startsWith('rediss://')) {
    options.tls = {};
  }

  client = new Redis(config.redis.url, options);

  client.on('ready', () => {
    available = true;
    resetFailures();
    log('info', 'REDIS_CONNECTED');
  });

  client.on('close', () => {
    available = false;
    log('warn', 'REDIS_DISCONNECTED');
  });

  client.on('end', () => {
    available = false;
    log('warn', 'REDIS_CONNECTION_ENDED');
  });

  client.on('error', (error) => {
    available = false;
    log('warn', 'REDIS_ERROR', { reason: error.message });
  });

  return client;
};

const initRedis = () => {
  try {
    return createClient();
  } catch (error) {
    recordFailure(error.message);
    log('warn', 'REDIS_INIT_FAILED', { reason: error.message });
    return null;
  }
};

const ensureConnected = async () => {
  if (!isEnabled() || isCircuitOpen()) {
    return null;
  }

  const redis = createClient();
  if (!redis) {
    return null;
  }

  if (redis.status === 'ready') {
    available = true;
    return redis;
  }

  if (redis.status === 'connecting' || redis.status === 'connect') {
    if (connectPromise) {
      try {
        await connectPromise;
        available = redis.status === 'ready';
        return available ? redis : null;
      } catch (error) {
        recordFailure(error.message);
        log('warn', 'REDIS_CONNECT_FAILED', { reason: error.message });
        return null;
      }
    }

    return null;
  }

  try {
    if (!connectPromise) {
      connectPromise = redis.connect().finally(() => {
        connectPromise = null;
      });
    }
    await connectPromise;
    available = redis.status === 'ready';
    return available ? redis : null;
  } catch (error) {
    recordFailure(error.message);
    log('warn', 'REDIS_CONNECT_FAILED', { reason: error.message });
    return null;
  }
};

const getRedis = () => client;

const isAvailable = () => isEnabled() && !isCircuitOpen() && available && client?.status === 'ready';

const markCommandFailure = (error, command = 'unknown') => {
  recordFailure(error.message);
  log('warn', 'REDIS_COMMAND_FAILED', { command, reason: error.message });
};

const runCommand = async (command, operation, fallback = null) => {
  const redis = await ensureConnected();
  if (!redis) {
    return fallback;
  }

  try {
    return await operation(redis);
  } catch (error) {
    markCommandFailure(error, command);
    return fallback;
  }
};

const get = (key) => runCommand('GET', (redis) => redis.get(key), null);

const set = async (key, value, options = {}) => {
  const ttl = options?.ex || options?.EX || options?.ttl;
  const result = await runCommand(
    'SET',
    (redis) => (ttl ? redis.set(key, value, 'EX', Number(ttl)) : redis.set(key, value)),
    null
  );

  return result === 'OK';
};

const setex = async (key, ttlSeconds, value) => {
  const result = await runCommand(
    'SETEX',
    (redis) => redis.setex(key, Number(ttlSeconds), value),
    null
  );

  return result === 'OK';
};

const del = async (...keys) => {
  const normalizedKeys = keys.flat().filter(Boolean);
  if (normalizedKeys.length === 0) {
    return 0;
  }

  return runCommand('DEL', (redis) => redis.del(...normalizedKeys), 0);
};

const keys = (pattern) => runCommand('KEYS', (redis) => redis.keys(pattern), []);

const exists = async (key) => {
  const result = await runCommand('EXISTS', (redis) => redis.exists(key), 0);
  return result === 1;
};

const ping = () => runCommand('PING', (redis) => redis.ping(), null);

module.exports = {
  initRedis,
  ensureConnected,
  getRedis,
  isAvailable,
  isEnabled,
  markCommandFailure,
  get,
  set,
  setex,
  del,
  keys,
  exists,
  ping,
};
