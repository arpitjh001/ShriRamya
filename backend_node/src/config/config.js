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
    REDIS_URL: Joi.string().allow('', null).default('').description('Redis URL'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(15),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),
    COOKIE_SECURE: Joi.string().default('false'),
    RAZORPAY_KEY_ID: Joi.string().allow('', null),
    RAZORPAY_KEY_SECRET: Joi.string().allow('', null),
    XPRESSBEES_ENABLED: Joi.string().default('false'),
    XPRESSBEES_API_BASE_URL: Joi.string().default('https://shipment.xpressbees.com/api'),
    XPRESSBEES_EMAIL: Joi.string().allow('', null),
    XPRESSBEES_PASSWORD: Joi.string().allow('', null),
    XPRESSBEES_TIMEOUT_MS: Joi.number().default(30000),
    XPRESSBEES_REQUEST_AUTO_PICKUP: Joi.string().default('yes'),
    XPRESSBEES_DEFAULT_PACKAGE_WEIGHT: Joi.number().default(500),
    XPRESSBEES_DEFAULT_PACKAGE_LENGTH: Joi.number().default(10),
    XPRESSBEES_DEFAULT_PACKAGE_BREADTH: Joi.number().default(10),
    XPRESSBEES_DEFAULT_PACKAGE_HEIGHT: Joi.number().default(10),
    XPRESSBEES_PICKUP_WAREHOUSE_NAME: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_NAME: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_ADDRESS: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_ADDRESS_2: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_CITY: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_STATE: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_PINCODE: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_PHONE: Joi.string().allow('', null),
    XPRESSBEES_PICKUP_GST_NUMBER: Joi.string().allow('', null),
    XPRESSBEES_RTO_WAREHOUSE_NAME: Joi.string().allow('', null),
    XPRESSBEES_RTO_NAME: Joi.string().allow('', null),
    XPRESSBEES_RTO_ADDRESS: Joi.string().allow('', null),
    XPRESSBEES_RTO_ADDRESS_2: Joi.string().allow('', null),
    XPRESSBEES_RTO_CITY: Joi.string().allow('', null),
    XPRESSBEES_RTO_STATE: Joi.string().allow('', null),
    XPRESSBEES_RTO_PINCODE: Joi.string().allow('', null),
    XPRESSBEES_RTO_PHONE: Joi.string().allow('', null),
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
  frontendUrl: envVars.CORS_ORIGINS === '*' ? '*' : envVars.CORS_ORIGINS.split(',')[0].trim(),
  publicBaseUrl: envVars.PUBLIC_BASE_URL,
  redis: {
    url: envVars.REDIS_URL,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET
  },
  xpressbees: {
    enabled: envVars.XPRESSBEES_ENABLED === 'true',
    baseUrl: envVars.XPRESSBEES_API_BASE_URL.replace(/\/$/, ''),
    email: envVars.XPRESSBEES_EMAIL,
    password: envVars.XPRESSBEES_PASSWORD,
    timeoutMs: envVars.XPRESSBEES_TIMEOUT_MS,
    requestAutoPickup: String(envVars.XPRESSBEES_REQUEST_AUTO_PICKUP || 'yes').toLowerCase() === 'no' ? 'no' : 'yes',
    defaultPackage: {
      weight: envVars.XPRESSBEES_DEFAULT_PACKAGE_WEIGHT,
      length: envVars.XPRESSBEES_DEFAULT_PACKAGE_LENGTH,
      breadth: envVars.XPRESSBEES_DEFAULT_PACKAGE_BREADTH,
      height: envVars.XPRESSBEES_DEFAULT_PACKAGE_HEIGHT,
    },
    pickup: {
      warehouse_name: envVars.XPRESSBEES_PICKUP_WAREHOUSE_NAME,
      name: envVars.XPRESSBEES_PICKUP_NAME,
      address: envVars.XPRESSBEES_PICKUP_ADDRESS,
      address_2: envVars.XPRESSBEES_PICKUP_ADDRESS_2,
      city: envVars.XPRESSBEES_PICKUP_CITY,
      state: envVars.XPRESSBEES_PICKUP_STATE,
      pincode: envVars.XPRESSBEES_PICKUP_PINCODE,
      phone: envVars.XPRESSBEES_PICKUP_PHONE,
      gst_number: envVars.XPRESSBEES_PICKUP_GST_NUMBER,
    },
    rto: {
      warehouse_name: envVars.XPRESSBEES_RTO_WAREHOUSE_NAME,
      name: envVars.XPRESSBEES_RTO_NAME,
      address: envVars.XPRESSBEES_RTO_ADDRESS,
      address_2: envVars.XPRESSBEES_RTO_ADDRESS_2,
      city: envVars.XPRESSBEES_RTO_CITY,
      state: envVars.XPRESSBEES_RTO_STATE,
      pincode: envVars.XPRESSBEES_RTO_PINCODE,
      phone: envVars.XPRESSBEES_RTO_PHONE,
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

