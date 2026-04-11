/**
 * Test Setup File
 * Configures test environment with localhost database connections
 */

// Override environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'shriramya_user';
process.env.MYSQL_PASSWORD = 'shriramya_password';
process.env.MYSQL_DATABASE = 'shriramya_test';
process.env.MONGO_URL = 'mongodb://localhost:27017/';
process.env.DB_NAME = 'shriramya_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_purposes_only';
process.env.JWT_ACCESS_EXPIRATION_MINUTES = '15';
process.env.JWT_REFRESH_EXPIRATION_DAYS = '1';
process.env.CORS_ORIGINS = '*';
process.env.PUBLIC_BASE_URL = 'http://localhost:8000';
process.env.COOKIE_SECURE = 'false';
process.env.RAZORPAY_KEY_ID = 'test_razorpay_key';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('🧪 Test environment initialized with localhost connections');
});

// Global cleanup
afterAll(async () => {
  // Force exit to prevent hanging
  // jest will handle cleanup via forceExit option
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
