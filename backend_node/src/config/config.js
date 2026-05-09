const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

const envFiles = [
  process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..', '..', '.env.production')
    : path.join(__dirname, '..', '..', '.env.local'),
  path.join(__dirname, '..', '..', '.env'),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile });
}

dotenv.config();

const sanitizeEnvValue = (value) => (
  typeof value === 'string' ? value.trim() : value
);

const sanitizeEnvObject = (input) => Object.fromEntries(
  Object.entries(input).map(([key, value]) => [key, sanitizeEnvValue(value)])
);

const buildNonSrvMongoConnectionUrl = (envVars) => {
  const nonSrvHosts = envVars.MONGODB_NON_SRV_HOSTS;
  if (!nonSrvHosts) {
    return null;
  }

  const sourceUri = envVars.MONGODB_URI || envVars.MONGO_URL || '';
  const authMatch = sourceUri.match(/mongodb(?:\+srv)?:\/\/([^@]+)@/);
  if (!authMatch) {
    return null;
  }

  const authPart = authMatch[1];
  const dbName = envVars.DB_NAME || '';
  const options = envVars.MONGODB_NON_SRV_OPTIONS
    || 'tls=true&authSource=admin&retryWrites=true&w=majority';

  return `mongodb://${authPart}@${nonSrvHosts}/${dbName}?${options}`;
};

const buildMongoConnectionUrl = (envVars) => {
  const nonSrvMongoUri = buildNonSrvMongoConnectionUrl(envVars);
  if (nonSrvMongoUri) {
    return nonSrvMongoUri;
  }

  const fullMongoUri = envVars.MONGODB_URI;
  if (fullMongoUri) {
    return fullMongoUri;
  }

  const baseMongoUrl = envVars.MONGO_URL;
  if (!baseMongoUrl) {
    return null;
  }

  const dbName = envVars.DB_NAME;
  if (!dbName) {
    return baseMongoUrl;
  }

  if (baseMongoUrl.includes('?')) {
    const [baseWithoutQuery, queryString] = baseMongoUrl.split('?');
    const normalizedBase = baseWithoutQuery.endsWith('/') ? baseWithoutQuery : `${baseWithoutQuery}/`;
    return `${normalizedBase}${dbName}?${queryString}`;
  }

  const normalizedBase = baseMongoUrl.endsWith('/') ? baseMongoUrl : `${baseMongoUrl}/`;
  return `${normalizedBase}${dbName}`;
};

const buildRedisConnectionUrl = (envVars) => {
  if (envVars.REDIS_URL) {
    return envVars.REDIS_URL;
  }

  const host = envVars.REDIS_HOST;
  if (!host) {
    return '';
  }

  const port = envVars.REDIS_PORT || 6379;
  const db = envVars.REDIS_DB || 0;
  const password = envVars.REDIS_PASSWORD ? `:${encodeURIComponent(envVars.REDIS_PASSWORD)}@` : '';

  return `redis://${password}${host}:${port}/${db}`;
};

const envVarsSchema = Joi.object()
  .keys({
    PORT: Joi.number().default(8000),
    MONGO_URL: Joi.string().allow('', null).description('Mongo DB base url'),
    MONGODB_URI: Joi.string().allow('', null).description('Full Mongo DB connection uri'),
    MONGODB_NON_SRV_HOSTS: Joi.string().allow('', null).description('Comma-separated MongoDB hosts for non-SRV fallback'),
    MONGODB_NON_SRV_OPTIONS: Joi.string().allow('', null).description('Query string options for non-SRV MongoDB fallback'),
    DB_NAME: Joi.string().allow('', null),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    CORS_ORIGINS: Joi.string().default('*'),
    PUBLIC_BASE_URL: Joi.string().default('http://localhost:8000'),
    REDIS_ENABLED: Joi.string().default('auto'),
    REDIS_URL: Joi.string().allow('', null).default('').description('Redis URL'),
    REDIS_HOST: Joi.string().allow('', null).default('').description('Redis host for Docker/local deployments'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('', null).default(''),
    REDIS_DB: Joi.number().integer().min(0).default(0),
    REDIS_CONNECT_TIMEOUT_MS: Joi.number().integer().min(50).default(1000),
    REDIS_COMMAND_TIMEOUT_MS: Joi.number().integer().min(50).default(500),
    REDIS_UNHEALTHY_COOLDOWN_MS: Joi.number().integer().min(1000).default(60000),
    REDIS_FAILURE_THRESHOLD: Joi.number().integer().min(1).default(3),
    REDIS_FAILURE_WINDOW_MS: Joi.number().integer().min(1000).default(60000),
    CACHE_DEFAULT_TTL_SECONDS: Joi.number().integer().min(1).default(300),
    CACHE_HOMEPAGE_TTL_SECONDS: Joi.number().integer().min(1).default(600),
    CACHE_CATEGORY_TTL_SECONDS: Joi.number().integer().min(1).default(3600),
    CACHE_SUBCATEGORY_TTL_SECONDS: Joi.number().integer().min(1).default(3600),
    CACHE_PRODUCT_LIST_TTL_SECONDS: Joi.number().integer().min(1).default(300),
    CACHE_PRODUCT_DETAIL_TTL_SECONDS: Joi.number().integer().min(1).default(900),
    CACHE_COUPON_TTL_SECONDS: Joi.number().integer().min(1).default(180),
    CACHE_DEBUG: Joi.string().default('false'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(15),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),
    COOKIE_SECURE: Joi.string().default('false'),
    RAZORPAY_KEY_ID: Joi.string().allow('', null),
    RAZORPAY_KEY_SECRET: Joi.string().allow('', null),
    SHIPROCKET_ENABLED: Joi.string().default('false'),
    SHIPROCKET_API_BASE_URL: Joi.string().default('https://apiv2.shiprocket.in/v1/external'),
    SHIPROCKET_EMAIL: Joi.string().allow('', null),
    SHIPROCKET_PASSWORD: Joi.string().allow('', null),
    SHIPROCKET_TIMEOUT_MS: Joi.number().default(30000),
    SHIPROCKET_PICKUP_LOCATION: Joi.string().allow('', null).default('Primary'),
    SHIPROCKET_PICKUP_PINCODE: Joi.string().allow('', null),
    SHIPROCKET_COMPANY_NAME: Joi.string().allow('', null).default('Shri Ramya'),
    SHIPROCKET_RESELLER_NAME: Joi.string().allow('', null).default('Shri Ramya'),
    SHIPROCKET_REQUEST_PICKUP: Joi.string().default('true'),
    SHIPROCKET_GENERATE_MANIFEST: Joi.string().default('true'),
    SHIPROCKET_GENERATE_LABEL: Joi.string().default('true'),
    SHIPROCKET_GENERATE_INVOICE: Joi.string().default('true'),
    SHIPROCKET_DEFAULT_PACKAGE_WEIGHT: Joi.number().default(0.5),
    SHIPROCKET_DEFAULT_PACKAGE_LENGTH: Joi.number().default(10),
    SHIPROCKET_DEFAULT_PACKAGE_BREADTH: Joi.number().default(10),
    SHIPROCKET_DEFAULT_PACKAGE_HEIGHT: Joi.number().default(10),
    SHIPROCKET_WEBHOOK_TOKEN: Joi.string().allow('', null).default(''),
    CDN_BASE_URL: Joi.string().allow('', null).description('CDN base URL for images'),
    SMTP_HOST: Joi.string().allow('', null),
    SMTP_PORT: Joi.number().allow('', null),
    SMTP_USER: Joi.string().allow('', null),
    SMTP_PASS: Joi.string().allow('', null),
    SMS_PROVIDER: Joi.string().allow('', null).default('twilio'),
    SMS_API_KEY: Joi.string().allow('', null),
    SMS_SENDER_ID: Joi.string().allow('', null)
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(sanitizeEnvObject(process.env));

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const mongoConnectionUrl = buildMongoConnectionUrl(envVars);
const redisConnectionUrl = buildRedisConnectionUrl(envVars);

if (!mongoConnectionUrl) {
  throw new Error('Config validation error: either "MONGO_URL" or "MONGODB_URI" is required');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: envVars.PORT,
  mongoose: {
    url: mongoConnectionUrl,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  cookie: {
    secure: envVars.COOKIE_SECURE === 'true',
  },
  cors: envVars.CORS_ORIGINS,
  frontendUrl: envVars.CORS_ORIGINS,
  publicBaseUrl: envVars.PUBLIC_BASE_URL,
  redis: {
    enabled: envVars.REDIS_ENABLED === 'true' || (envVars.REDIS_ENABLED !== 'false' && Boolean(redisConnectionUrl)),
    url: redisConnectionUrl,
    connectTimeoutMs: envVars.REDIS_CONNECT_TIMEOUT_MS,
    commandTimeoutMs: envVars.REDIS_COMMAND_TIMEOUT_MS,
    unhealthyCooldownMs: envVars.REDIS_UNHEALTHY_COOLDOWN_MS,
    failureThreshold: envVars.REDIS_FAILURE_THRESHOLD,
    failureWindowMs: envVars.REDIS_FAILURE_WINDOW_MS,
    debug: envVars.CACHE_DEBUG === 'true',
  },
  cache: {
    defaultTtlSeconds: envVars.CACHE_DEFAULT_TTL_SECONDS,
    homepageTtlSeconds: envVars.CACHE_HOMEPAGE_TTL_SECONDS,
    categoryTtlSeconds: envVars.CACHE_CATEGORY_TTL_SECONDS,
    subcategoryTtlSeconds: envVars.CACHE_SUBCATEGORY_TTL_SECONDS,
    productListTtlSeconds: envVars.CACHE_PRODUCT_LIST_TTL_SECONDS,
    productDetailTtlSeconds: envVars.CACHE_PRODUCT_DETAIL_TTL_SECONDS,
    couponTtlSeconds: envVars.CACHE_COUPON_TTL_SECONDS,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET
  },
  shiprocket: {
    enabled: envVars.SHIPROCKET_ENABLED === 'true',
    baseUrl: envVars.SHIPROCKET_API_BASE_URL.replace(/\/$/, ''),
    email: envVars.SHIPROCKET_EMAIL,
    password: envVars.SHIPROCKET_PASSWORD,
    timeoutMs: envVars.SHIPROCKET_TIMEOUT_MS,
    pickupLocation: envVars.SHIPROCKET_PICKUP_LOCATION,
    pickupPincode: envVars.SHIPROCKET_PICKUP_PINCODE,
    companyName: envVars.SHIPROCKET_COMPANY_NAME,
    resellerName: envVars.SHIPROCKET_RESELLER_NAME,
    requestPickup: String(envVars.SHIPROCKET_REQUEST_PICKUP).toLowerCase() !== 'false',
    generateManifest: String(envVars.SHIPROCKET_GENERATE_MANIFEST).toLowerCase() !== 'false',
    generateLabel: String(envVars.SHIPROCKET_GENERATE_LABEL).toLowerCase() !== 'false',
    generateInvoice: String(envVars.SHIPROCKET_GENERATE_INVOICE).toLowerCase() !== 'false',
    webhookToken: envVars.SHIPROCKET_WEBHOOK_TOKEN,
    defaultPackage: {
      weight: envVars.SHIPROCKET_DEFAULT_PACKAGE_WEIGHT,
      length: envVars.SHIPROCKET_DEFAULT_PACKAGE_LENGTH,
      breadth: envVars.SHIPROCKET_DEFAULT_PACKAGE_BREADTH,
      height: envVars.SHIPROCKET_DEFAULT_PACKAGE_HEIGHT,
    },
  },
  cdnBaseUrl: envVars.CDN_BASE_URL,
  smtp: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.SMTP_USER,
    pass: envVars.SMTP_PASS
  },
  sms: {
    provider: envVars.SMS_PROVIDER,
    apiKey: envVars.SMS_API_KEY,
    senderId: envVars.SMS_SENDER_ID
  }
};

