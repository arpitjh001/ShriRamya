# Postman API Collection - ShriRamya Ecommerce Platform

**Version:** 2.0.0  
**Last Updated:** March 8, 2026

---

## 📥 Import Collection

1. Open Postman
2. Click **Import** (top left)
3. Select file: `ShriRamya-API-Collection.postman_collection.json`
4. Collection will appear in your workspace

---

## 🔧 Setup Instructions

### 1. Set Base URL

The collection uses a variable `baseUrl` with default value:
```
http://localhost:8080/api/v1
```

To change (for production):
1. Click on the collection name
2. Go to **Variables** tab
3. Update `baseUrl` value
4. Save

### 2. Login to Get Auth Token

**Steps:**
1. Open request: `1 - Authentication / Login`
2. Update request body with your credentials:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123",
     "tenantId": 1
   }
   ```
3. Click **Send**
4. Token is automatically saved to `authToken` variable

### 3. Set Timestamp for Unique Names

Before creating resources (tenants, products, etc.), run:
1. Open request: `Variables & Scripts / Set Timestamp Variable`
2. Click **Send**
3. This sets `{{timestamp}}` variable for unique naming

---

## 📁 Collection Structure

```
ShriRamya Ecommerce API - Multi-Tenant RBAC
├── 0 - Health & Status
│   └── Health Check
├── 1 - Authentication
│   ├── Register User
│   ├── Login
│   ├── Logout
│   ├── Refresh Token
│   ├── Get Current User
│   └── Check Admin
├── 2 - Tenant Management
│   ├── Create Tenant
│   ├── Get All Tenants
│   ├── Get Current Tenant
│   ├── Get Tenant Settings
│   ├── Update Tenant Setting
│   ├── Get Tenant Roles
│   └── Get My Roles
├── 3 - User Management (Admin)
│   ├── Get All Users
│   ├── Get User by ID
│   ├── Sync User Mapping
│   ├── Assign Role to User
│   ├── Assign Multiple Roles
│   ├── Remove Role from User
│   ├── Get All Roles
│   ├── Get All Permissions
│   ├── Create Custom Role
│   └── Delete Custom Role
├── 4 - Products
│   ├── List Products
│   ├── Get Product by ID
│   ├── Create Product
│   ├── Update Product
│   ├── Delete Product
│   ├── Add Variant
│   ├── Update Variant
│   ├── Delete Variant
│   ├── Get Product Categories
│   ├── Assign Categories to Product
│   └── Remove Category from Product
├── 5 - Categories
│   ├── List Categories
│   ├── Get Category by ID
│   ├── Create Category
│   ├── Update Category
│   └── Delete Category
├── 6 - Blogs (Native Multi-Tenant)
│   ├── List Blogs
│   ├── Get Blog by ID
│   ├── Get Blog by Slug
│   ├── Create Blog
│   ├── Update Blog
│   └── Delete Blog
├── 7 - Orders
│   ├── List Orders
│   ├── Get Order by ID
│   ├── Create Order
│   ├── Update Order Status
│   └── ...
├── 8 - Cart
│   ├── Get Cart
│   ├── Add to Cart
│   ├── Update Cart Item
│   ├── Remove from Cart
│   └── Clear Cart
├── 9 - Search
│   └── Search Products
├── 10 - Reviews
│   ├── Get Product Reviews
│   └── Create Review
├── 11 - Coupons
│   ├── List Coupons
│   └── Create Coupon
├── 12 - Upload
│   └── Upload Image
├── 13 - Analytics (Admin)
│   ├── Get Dashboard Analytics
│   ├── Get Sales Analytics
│   └── Get Product Analytics
└── Variables & Scripts
    └── Set Timestamp Variable
```

---

## 🔑 Authentication

Most endpoints require authentication. The collection automatically handles tokens:

### Auto-Save Token
After successful login, the token is saved to `{{authToken}}` variable and used in all subsequent requests.

### Manual Token Setting
If needed, manually set `authToken` variable:
1. Click on collection name
2. Go to **Variables** tab
3. Set `authToken` value to your JWT token
4. Save

---

## 🧪 Testing Workflows

### Workflow 1: Create New Tenant and Admin

```
1. Variables & Scripts / Set Timestamp Variable
2. 2 - Tenant Management / Create Tenant
   - Note the ownerEmail and ownerPassword
3. 1 - Authentication / Login
   - Use the owner credentials from step 2
4. 2 - Tenant Management / Get My Roles
   - Verify owner has Admin role
```

### Workflow 2: Create Product as Admin

```
1. 1 - Authentication / Login (as Admin)
2. 4 - Products / Create Product
   - Note the productId from response
3. 4 - Products / Get Product by ID
   - Verify product was created
4. 4 - Products / Update Product
   - Update product details
5. 4 - Products / List Products
   - Verify product appears in list
```

### Workflow 3: User Role Assignment

```
1. 1 - Authentication / Login (as Admin)
2. 3 - User Management / Get All Users
   - Note a user's mongo_user_id
3. 3 - User Management / Assign Role to User
   - Set roleId: 1 (Admin), 2 (Editor), or 3 (Customer)
4. 3 - User Management / Get All Users
   - Verify role was assigned
```

### Workflow 4: Create Blog Post

```
1. 1 - Authentication / Login (as Admin or Editor)
2. Variables & Scripts / Set Timestamp Variable
3. 6 - Blogs / Create Blog
   - Title and slug use {{timestamp}} for uniqueness
4. 6 - Blogs / List Blogs
   - Verify blog appears
5. 6 - Blogs / Update Blog
   - Update blog content
```

### Workflow 5: Complete Customer Journey

```
1. 1 - Authentication / Register User (as Customer)
2. 4 - Products / List Products
   - Browse products
3. 8 - Cart / Add to Cart
   - Add product to cart
4. 8 - Cart / Get Cart
   - Verify cart contents
5. 7 - Orders / Create Order
   - Place order
6. 7 - Orders / List Orders
   - Verify order was created
```

---

## 📋 Environment Variables

The collection uses these variables:

| Variable | Description | Auto-Set |
|----------|-------------|----------|
| `baseUrl` | API base URL | No |
| `authToken` | JWT access token | Yes (after login) |
| `userId` | Current user ID | Yes (after login) |
| `productId` | Last created product ID | No |
| `variantId` | Last created variant ID | No |
| `orderId` | Last created order ID | No |
| `blogId` | Last created blog ID | No |
| `blogSlug` | Last created blog slug | No |
| `categoryId` | Last created category ID | No |
| `timestamp` | Current timestamp | Yes (run Set Timestamp) |

---

## 🔍 Common Test Scenarios

### Test RBAC - Editor Cannot Delete Product

```
1. Login as Editor
2. Create a product
3. Try to delete the product
   - Expected: 403 Forbidden
```

### Test RBAC - Customer Cannot Create Product

```
1. Login as Customer
2. Try to create a product
   - Expected: 403 Forbidden
```

### Test Tenant Isolation

```
1. Create Tenant A, login as Tenant A Admin
2. Create a product
3. Create Tenant B, login as Tenant B Admin
4. List products
   - Expected: Only Tenant B products visible
```

---

## 🛠️ Troubleshooting

### Issue: 401 Unauthorized

**Solution:**
- Check if `authToken` is set
- Re-run Login request
- Verify token hasn't expired

### Issue: 403 Forbidden

**Solution:**
- Check if user has required role
- Verify role permissions in `Get My Roles`
- Admin may be required for this endpoint

### Issue: 404 Not Found

**Solution:**
- Check if resource ID is correct
- Verify tenant isolation (resource may belong to different tenant)
- Check baseUrl variable

### Issue: Variables Not Working

**Solution:**
- Run "Set Timestamp Variable" request
- Check variable names have double curly braces: `{{variableName}}`
- Verify variables are set at collection or environment level

---

## 📝 Request Examples

### Create Product with Variants

```json
{
  "name": "Premium Saree",
  "sku": "SAREE-001",
  "basePrice": 2999,
  "description": "Beautiful handloom saree",
  "fabric": "Silk",
  "occasion": "Wedding",
  "status": "published",
  "variants": [
    {
      "sku": "SAREE-001-RED",
      "price": 2999,
      "stock": 10,
      "attributes": {
        "color": "Red",
        "size": "Free Size"
      }
    },
    {
      "sku": "SAREE-001-BLUE",
      "price": 2999,
      "stock": 5,
      "attributes": {
        "color": "Blue",
        "size": "Free Size"
      }
    }
  ]
}
```

### Assign Admin Role to User

```json
{
  "roleId": 1,
  "tenantId": 1
}
```

### Create Blog Post

```json
{
  "title": "Summer Collection 2026",
  "slug": "summer-collection-2026",
  "content": "Discover our latest summer collection...",
  "excerpt": "New summer arrivals",
  "status": "published",
  "metaTitle": "Summer Collection 2026 - ShriRamya",
  "metaDescription": "Shop the latest summer collection"
}
```

---

## 🔒 Role Permissions Reference

### Admin (roleId: 1)
- All permissions
- Can delete products, orders, blogs
- Can manage users and settings
- Can view analytics

### Editor (roleId: 2)
- create_product, update_product, view_products
- create_blog, update_blog, view_blog
- view_dashboard
- **Cannot** delete products or blogs
- **Cannot** manage orders or users

### Customer (roleId: 3)
- view_products
- add_to_cart, view_cart
- place_order, view_own_orders

---

## 📞 Support

For API issues or questions:
1. Check response body for error details
2. Review backend logs: `docker-compose logs backend`
3. Verify authentication and authorization
4. Check tenant isolation requirements

---

**Collection Version:** 2.0.0  
**Compatible With:** Backend v2.0.0+  
**Last Updated:** March 8, 2026
