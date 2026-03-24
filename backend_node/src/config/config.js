const dotenv = require('dotenv');
const Joi = require('joi');
dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    PORT: Joi.number().default(8000),
    MONGO_URL: Joi.string().required().description('Mongo DB url'),
    DB_NAME: Joi.string().required(),
    MYSQL_HOST: Joi.string().required(),
    MYSQL_PORT: Joi.number().default(3306),
    MYSQL_USER: Joi.string().required(),
    MYSQL_PASSWORD: Joi.string().required(),
    MYSQL_DATABASE: Joi.string().required(),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    CORS_ORIGINS: Joi.string().default('*'),
    PUBLIC_BASE_URL: Joi.string().default('http://localhost:8000'),
    REDIS_URL: Joi.string().allow('', null).default('').description('Redis URL'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(15),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),
    COOKIE_SECURE: Joi.string().default('false'),
    RAZORPAY_KEY_ID: Joi.string().allow('', null),
    RAZORPAY_KEY_SECRET: Joi.string().allow('', null),
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

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGO_URL + (envVars.MONGO_URL.endsWith('/') ? '' : '/') + envVars.DB_NAME,
  },
  mysql: {
    host: envVars.MYSQL_HOST,
    port: envVars.MYSQL_PORT,
    user: envVars.MYSQL_USER,
    password: envVars.MYSQL_PASSWORD,
    database: envVars.MYSQL_DATABASE
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
  publicBaseUrl: envVars.PUBLIC_BASE_URL,
  redis: {
    url: envVars.REDIS_URL,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET
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

