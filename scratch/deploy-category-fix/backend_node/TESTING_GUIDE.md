# Backend Testing Guide

**Date:** March 13, 2026  
**Status:** ✅ Configuration Fixed

---

## Quick Start

### Prerequisites

Make sure Docker containers are running:

```bash
docker-compose up -d mysql mongodb redis
```

### Setup Test Databases

Run the test database setup script:

```bash
cd backend_node
npm run setup:test-db
```

This will:
- Create `shriramya_test` MySQL database
- Create `shriramya_test` MongoDB database
- Prepare schema for testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:api
npm run test:rbac
npm run test:tenant
npm run test:validation

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

---

## Configuration

### Test Environment Variables

The test setup (`tests/setup.js`) automatically configures:

```env
NODE_ENV=test
MYSQL_HOST=localhost
MYSQL_PORT=3307          # Docker mapped port
MYSQL_USER=shriramya_user
MYSQL_PASSWORD=shriramya_password
MYSQL_DATABASE=shriramya_test
MONGO_URL=mongodb://localhost:27017/
DB_NAME=shriramya_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test_jwt_secret_key_for_testing_purposes_only
```

### Jest Configuration

`jest.config.js`:
- Test timeout: 30 seconds
- Force exit: enabled
- Coverage threshold: 10% (configurable)
- Setup file: `tests/setup.js`

---

## Test Database Setup

### Manual Setup (Alternative)

If you prefer to set up databases manually:

#### MySQL
```bash
docker-compose exec mysql mysql -u shriramya_user -pshriramya_password -e "CREATE DATABASE IF NOT EXISTS shriramya_test;"
```

#### MongoDB
```bash
docker-compose exec mongodb mongosh --eval "use shriramya_test"
```

#### Redis
Redis doesn't need setup - just ensure it's running:
```bash
docker-compose ps redis
```

---

## Running Tests in Docker

If you want to run tests inside a Docker container:

```bash
docker-compose -f docker-compose.local.yml run --rm backend npm test
```

---

## Test Structure

### Test Files

```
tests/
├── setup.js                    # Test environment setup
├── setup-test-db.js           # Database setup script
├── api.test.js                # API endpoint tests
├── api-validation.test.js     # Input validation tests
├── rbac.test.js               # Role-based access tests
├── rbac-comprehensive.test.js # Comprehensive RBAC tests
└── tenant-isolation.test.js   # Multi-tenant isolation tests
```

### What Each Test Suite Covers

1. **api.test.js**
   - Authentication (login)
   - Products CRUD
   - Orders & Customers
   - Blogs
   - Health check

2. **api-validation.test.js**
   - Registration validation
   - Login validation
   - Category validation
   - Blog validation
   - Coupon validation
   - User management validation
   - Response format validation
   - Rate limiting

3. **rbac.test.js**
   - Admin role permissions
   - Editor role permissions
   - Customer role permissions
   - Tenant isolation
   - Security tests

4. **tenant-isolation.test.js**
   - Cross-tenant data access
   - Blog tenant isolation
   - Tenant settings isolation

---

## Troubleshooting

### Issue: "getaddrinfo ENOTFOUND mysql"

**Cause:** Tests trying to connect to Docker service name instead of localhost

**Solution:** The test setup file (`tests/setup.js`) already fixes this by overriding environment variables. Make sure you're running tests with `npm test` which uses the jest config.

### Issue: "Connection refused" to MySQL

**Cause:** MySQL container not running or wrong port

**Solution:**
```bash
# Check if MySQL is running
docker-compose ps mysql

# Restart if needed
docker-compose restart mysql

# Wait for MySQL to be ready (takes ~30s)
sleep 30

# Run tests again
npm test
```

### Issue: "Connection refused" to MongoDB

**Cause:** MongoDB container not running

**Solution:**
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Restart if needed
docker-compose restart mongodb

# Run tests again
npm test
```

### Issue: Tests timing out

**Cause:** Database queries taking too long

**Solution:** Increase timeout in `jest.config.js`:
```javascript
module.exports = {
  testTimeout: 60000, // 60 seconds
};
```

### Issue: "Cannot find module"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install
```

---

## Test Coverage

### View Coverage Report

```bash
npm run test:coverage
```

This generates:
- Text coverage in console
- HTML coverage in `coverage/` folder
- LCov report for CI/CD

### Open HTML Coverage

```bash
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

---

## Writing New Tests

### Test Template

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('My New Test Suite', () => {
    beforeAll(async () => {
        // Setup code (runs once before all tests)
    });

    afterAll(async () => {
        // Cleanup code (runs once after all tests)
    });

    beforeEach(async () => {
        // Setup code (runs before each test)
    });

    afterEach(async () => {
        // Cleanup code (runs after each test)
    });

    test('should do something', async () => {
        const res = await request(app)
            .get('/api/v1/endpoint')
            .set('Authorization', 'Bearer token');
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
```

### Best Practices

1. **Use descriptive test names**
   ```javascript
   test('POST /auth/login - should reject invalid email', async () => {
   ```

2. **Clean up after tests**
   ```javascript
   afterEach(async () => {
       await Model.deleteMany({}); // Clear test data
   });
   ```

3. **Use test-specific data**
   ```javascript
   const testData = {
       email: 'test@example.com',
       password: 'TestPassword123!'
   };
   ```

4. **Add console logging**
   ```javascript
   console.log('🧪 Running test...');
   console.log('✓ Test passed');
   ```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpassword
          MYSQL_DATABASE: shriramya_test
          MYSQL_USER: shriramya_user
          MYSQL_PASSWORD: shriramya_password
        ports:
          - 3306:3306
      
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend_node
      
      - name: Setup test databases
        run: npm run setup:test-db
        working-directory: ./backend_node
      
      - name: Run tests
        run: npm test
        working-directory: ./backend_node
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend_node/coverage/lcov.info
          flags: backend
```

---

## Performance Tips

### Speed Up Tests

1. **Run specific test files**
   ```bash
   npm run test:api  # Only API tests
   ```

2. **Use --bail flag** (stop on first failure)
   ```bash
   npm test -- --bail
   ```

3. **Run in parallel** (for independent tests)
   ```bash
   npm test -- --workers=4
   ```

4. **Skip coverage** (faster execution)
   ```bash
   npm test -- --coverage=false
   ```

---

## Common Commands

```bash
# Setup everything
docker-compose up -d mysql mongodb redis
npm run setup:test-db
npm test

# Run tests
npm test                    # All tests
npm run test:api           # API tests only
npm run test:coverage      # With coverage

# Debug tests
npm run test:watch         # Watch mode
npm test -- --verbose      # Verbose output

# Cleanup
docker-compose down        # Stop all containers
```

---

## Expected Output

### Successful Test Run

```
🧪 Test environment initialized with localhost connections
🧪 Setting up test database connection...
✓ Connected to MongoDB test database
✓ Created admin user
✓ Obtained admin token

 PASS  tests/api.test.js
  API Endpoints Automation Tests (Native)
    🔐 Authentication
      ✓ POST /auth/login - Success (156 ms)
      ✓ POST /auth/login - Failure (45 ms)
    🛍️ Products (Native)
      ✓ GET /products - Success (89 ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        3.456 s
```

### Failed Test Run

```
🧪 Test environment initialized with localhost connections
 FAIL  tests/api.test.js
  API Endpoints Automation Tests (Native)
    🔐 Authentication
      ✕ POST /auth/login - Success (5000 ms)

  ● API Endpoints Automation Tests (Native) › 🔐 Authentication › POST /auth/login - Success

    thrown: "Exceeded timeout of 5000 ms for a test.
    Add a timeout value to this test to increase the timeout"

Test Suites: 1 failed, 1 total
Tests:       1 failed, 14 passed, 15 total
```

---

## Support

If you encounter issues:

1. Check Docker containers are running
2. Verify test databases exist
3. Check logs: `docker-compose logs mysql mongodb redis`
4. Review test setup file: `tests/setup.js`
5. Check jest config: `jest.config.js`

---

**Last Updated:** March 13, 2026  
**Maintainer:** Development Team
