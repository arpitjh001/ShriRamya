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
    WOOCOMMERCE_URL: Joi.string().required(),
    WP_ADMIN_USER: Joi.string().required(),
    WP_APP_PASSWORD: Joi.string().required(),
    WOOCOMMERCE_VERIFY_SSL: Joi.string().default('False'),
    CORS_ORIGINS: Joi.string().default('*'),
    PUBLIC_BASE_URL: Joi.string().default('http://localhost:8000'),
    RAZORPAY_KEY_ID: Joi.string().allow('', null),
    RAZORPAY_KEY_SECRET: Joi.string().allow('', null)
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
    accessExpirationMinutes: 30,
    refreshExpirationDays: 30,
  },
  woocommerce: {
    url: envVars.WOOCOMMERCE_URL,
    user: envVars.WP_ADMIN_USER,
    password: envVars.WP_APP_PASSWORD,
    verifySsl: envVars.WOOCOMMERCE_VERIFY_SSL === 'True'
  },
  cors: envVars.CORS_ORIGINS,
  publicBaseUrl: envVars.PUBLIC_BASE_URL,
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET
  }
};
