# 🔐 Test Credentials - E2E System Test

**Generated:** March 8, 2026  
**System:** Multi-Tenant Ecommerce Platform  

---

## Pre-existing Admin Account

Use this account for manual testing:

```
Email:    admin@shriramya.com
Password: Admin@123
Role:     Admin
```

---

## Test Accounts (Auto-Generated)

The E2E test script creates unique users for each test run to avoid duplicate email errors.

### Admin User
```
Email:    admin.test.{timestamp}@test.com
Password: AdminPass123!
Role:     Admin
```

### Editor User
```
Email:    editor.test.{timestamp}@test.com
Password: EditorPass123!
Role:     Editor
```

### Customer User
```
Email:    customer.test.{timestamp}@test.com
Password: CustomerPass123!
Role:     Customer
```

**Note:** `{timestamp}` is replaced with the current Unix timestamp during test execution.

---

## Database Credentials

### MySQL
```
Host:     localhost (or mysql in Docker)
Port:     3307
Database: shriramya
Username: root
Password: rootpassword
```

### MongoDB
```
Host:     localhost (or mongodb in Docker)
Port:     27017
Database: shriramya
```

---

## API Access

### Base URLs
```
Backend API:  http://localhost:8080/api/v1
Frontend:     http://localhost:3000
```

### Authentication
All authenticated requests require JWT token in header:
```
Authorization: Bearer {your_jwt_token}
```

---

## How to Get JWT Token

### Via API (Login)
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shriramya.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@shriramya.com",
      "role": "admin"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## Role Permissions

### Admin
- Full system access
- Can manage users, products, orders, blogs, categories
- Can access all admin endpoints

### Editor
- Can create/update products
- Can create/update blogs
- Cannot delete products
- Cannot access user management

### Customer
- Can browse products
- Can manage cart
- Can place orders
- Can view own orders
- Cannot access admin endpoints

---

## Test Data Created During E2E Test

### Categories
- Women (ID: varies)
- Sarees (ID: varies)
- Silk Sarees (ID: varies)

### Products
- Products are created during performance test (10 products)
- Names: "Performance Test Product 0-9"

### Users
- 3 test users created per test run (admin, editor, customer)
- Unique emails ensure no conflicts

---

## Reset Test Data

To clean up test data between runs:

```sql
-- Delete test users (keep admin@shriramya.com)
DELETE FROM mysql_users WHERE email LIKE '%test.%@test.com';

-- Delete test categories
DELETE FROM categories WHERE name IN ('Women', 'Sarees', 'Silk Sarees');

-- Delete test products
DELETE FROM products WHERE name LIKE 'Performance Test Product%';

-- Delete test blogs
DELETE FROM blogs WHERE title LIKE '%Test%';
```

---

## Support

For issues or questions about test credentials, check:
- `E2E_FINAL_TEST_REPORT.md` - Full test report
- `backend_node/scripts/e2e-system-test.js` - Test script source

---

*Last Updated: March 8, 2026*
