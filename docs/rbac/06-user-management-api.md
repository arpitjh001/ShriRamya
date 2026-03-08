# User Management & Tenant Creation API Documentation

## Overview

This document describes the new APIs for:
1. **Tenant Creation** - Create new tenants (stores)
2. **User Role Assignment** - Assign roles to users
3. **User Management** - Manage users and their permissions

---

## Base URL

```
http://localhost:8080/api/v1
```

---

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Tenant Management APIs

### 1. Create Tenant

Creates a new tenant (store) with an owner who automatically gets Admin role.

**Endpoint:** `POST /tenants`

**Access:** Public (or Admin only in production)

**Request Body:**
```json
{
  "name": "My New Store",
  "domain": "mystore.example.com",
  "ownerEmail": "owner@mystore.com",
  "ownerName": "Store Owner",
  "ownerPassword": "SecurePassword123!",
  "settings": {
    "currency": "INR",
    "timezone": "Asia/Kolkata"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "My New Store",
    "domain": "mystore.example.com",
    "ownerUserId": 15,
    "ownerEmail": "owner@mystore.com"
  },
  "message": "Tenant created successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Store",
    "domain": "mystore.example.com",
    "ownerEmail": "owner@mystore.com",
    "ownerName": "Store Owner",
    "ownerPassword": "SecurePassword123!"
  }'
```

---

### 2. Get Current Tenant

Gets information about the current tenant.

**Endpoint:** `GET /tenants/current`

**Access:** Authenticated users

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Default Store",
    "domain": "default",
    "status": "active",
    "settings": {
      "store_info": {
        "name": "Default Store",
        "currency": "INR"
      }
    }
  }
}
```

---

### 3. Get All Tenants

Lists all tenants (Admin only).

**Endpoint:** `GET /tenants`

**Access:** Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Default Store",
      "domain": "default",
      "status": "active"
    },
    {
      "id": 2,
      "name": "My New Store",
      "domain": "mystore.example.com",
      "status": "active"
    }
  ]
}
```

---

## User Management APIs

### 1. Get All Users with Roles

Gets all users for the current tenant with their assigned roles.

**Endpoint:** `GET /users`

**Access:** Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "mysql_user_id": 1,
      "mongo_user_id": "65e1234567890abcdef12345",
      "email": "admin@example.com",
      "name": "Admin User",
      "tenant_id": 1,
      "roles": ["Admin"],
      "role_ids": [1]
    },
    {
      "mysql_user_id": 2,
      "mongo_user_id": "65e1234567890abcdef12346",
      "email": "user@example.com",
      "name": "Regular User",
      "tenant_id": 1,
      "roles": ["Customer"],
      "role_ids": [3]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer <admin_token>"
```

---

### 2. Get User by ID

Gets a specific user by their MongoDB ID.

**Endpoint:** `GET /users/:id`

**Access:** Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mongo_user_id": "65e1234567890abcdef12345",
    "email": "admin@example.com",
    "name": "Admin User",
    "tenant_id": 1
  }
}
```

---

### 3. Sync User Mapping

Creates or updates the mysql_users mapping for a MongoDB user.

**Endpoint:** `POST /users/sync`

**Access:** Admin only

**Request Body:**
```json
{
  "mongoUserId": "65e1234567890abcdef12345",
  "tenantId": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "mongo_user_id": "65e1234567890abcdef12345",
    "mysql_user_id": 1
  },
  "message": "User mapping created successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/users/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "mongoUserId": "65e1234567890abcdef12345",
    "tenantId": 1
  }'
```

---

### 4. Assign Role to User

Assigns a single role to a user.

**Endpoint:** `POST /users/:userId/roles`

**Access:** Admin only

**Request Body:**
```json
{
  "roleId": 1,
  "tenantId": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "65e1234567890abcdef12345",
    "mysql_user_id": 1,
    "role_id": 1,
    "tenant_id": 1
  },
  "message": "Role assigned successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/users/65e1234567890abcdef12345/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "roleId": 1,
    "tenantId": 1
  }'
```

---

### 5. Assign Multiple Roles to User

Assigns multiple roles to a user.

**Endpoint:** `POST /users/:userId/roles/multiple`

**Access:** Admin only

**Request Body:**
```json
{
  "roleIds": [1, 2],
  "tenantId": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "65e1234567890abcdef12345",
    "mysql_user_id": 1,
    "role_ids": [1, 2],
    "tenant_id": 1
  },
  "message": "Roles assigned successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/users/65e1234567890abcdef12345/roles/multiple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "roleIds": [1, 2],
    "tenantId": 1
  }'
```

---

### 6. Remove Role from User

Removes a specific role from a user.

**Endpoint:** `DELETE /users/:userId/roles/:roleId`

**Access:** Admin only

**Request Body (optional):**
```json
{
  "tenantId": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Role removed successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:8080/api/v1/users/65e1234567890abcdef12345/roles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "tenantId": 1
  }'
```

---

### 7. Get All Roles

Gets all available roles with their permissions.

**Endpoint:** `GET /users/roles`

**Access:** Admin, Editor

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "description": "Full system access",
      "is_system_role": true,
      "permissions": [
        "manage_products",
        "manage_orders",
        "manage_users",
        "delete_product",
        "delete_order"
      ]
    },
    {
      "id": 2,
      "name": "Editor",
      "description": "Can manage products and blogs",
      "is_system_role": true,
      "permissions": [
        "create_product",
        "update_product",
        "create_blog",
        "update_blog"
      ]
    },
    {
      "id": 3,
      "name": "Customer",
      "description": "Standard customer access",
      "is_system_role": true,
      "permissions": [
        "view_products",
        "add_to_cart",
        "place_order"
      ]
    }
  ]
}
```

---

### 8. Get All Permissions

Gets all available permissions in the system.

**Endpoint:** `GET /users/permissions`

**Access:** All authenticated users

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "manage_products",
      "description": "Full product management access",
      "resource": "products",
      "action": "manage"
    },
    {
      "id": 2,
      "name": "create_product",
      "description": "Create new products",
      "resource": "products",
      "action": "create"
    }
    // ... more permissions
  ]
}
```

---

### 9. Create Custom Role

Creates a new custom role with specified permissions.

**Endpoint:** `POST /users/roles`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "Moderator",
  "description": "Can moderate content",
  "permissionIds": [1, 2, 3]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Moderator"
  },
  "message": "Role created successfully"
}
```

---

### 10. Delete Custom Role

Deletes a custom role (system roles cannot be deleted).

**Endpoint:** `DELETE /users/roles/:id`

**Access:** Admin only

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Role deleted successfully"
}
```

---

## Complete Workflow Examples

### Example 1: Create New Tenant and Assign Admin Role

```bash
# Step 1: Create tenant
TENANT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Store",
    "domain": "newstore.com",
    "ownerEmail": "owner@newstore.com",
    "ownerPassword": "Password123!"
  }')

echo "Tenant created: $TENANT_RESPONSE"

# Step 2: Login as the new tenant owner
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@newstore.com",
    "password": "Password123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')
echo "Access token: $TOKEN"

# Step 3: Verify user has Admin role
curl -X GET http://localhost:8080/api/v1/tenants/my-roles \
  -H "Authorization: Bearer $TOKEN"
```

---

### Example 2: Promote User to Admin

```bash
# Step 1: Get all users
USERS=$(curl -s -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer <admin_token>")

echo "Users: $USERS"

# Step 2: Find user's MongoDB ID
USER_ID=$(echo $USERS | jq -r '.data[0].mongo_user_id')
echo "User ID: $USER_ID"

# Step 3: Assign Admin role (roleId = 1)
curl -X POST "http://localhost:8080/api/v1/users/$USER_ID/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "roleId": 1,
    "tenantId": 1
  }'

# Step 4: Verify role assignment
curl -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer <admin_token>"
```

---

### Example 3: Create Custom Role and Assign to User

```bash
# Step 1: Get all permissions
PERMISSIONS=$(curl -s -X GET http://localhost:8080/api/v1/users/permissions \
  -H "Authorization: Bearer <admin_token>")

# Find permission IDs for specific permissions
CREATE_PRODUCT_ID=$(echo $PERMISSIONS | jq -r '.data[] | select(.name=="create_product") | .id')
UPDATE_PRODUCT_ID=$(echo $PERMISSIONS | jq -r '.data[] | select(.name=="update_product") | .id')

# Step 2: Create custom role
CUSTOM_ROLE=$(curl -s -X POST http://localhost:8080/api/v1/users/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d "{
    \"name\": \"Product Manager\",
    \"description\": \"Can create and update products\",
    \"permissionIds\": [$CREATE_PRODUCT_ID, $UPDATE_PRODUCT_ID]
  }")

ROLE_ID=$(echo $CUSTOM_ROLE | jq -r '.data.id')
echo "Created role with ID: $ROLE_ID"

# Step 3: Assign custom role to user
curl -X POST "http://localhost:8080/api/v1/users/$USER_ID/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d "{
    \"roleId\": $ROLE_ID,
    \"tenantId\": 1
  }"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "roleId is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token missing"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required roles: Admin"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Tenant with this domain already exists"
}
```

---

## Available Roles (Default)

| ID | Name | Description |
|----|------|-------------|
| 1 | Admin | Full system access |
| 2 | Editor | Can manage products and blogs |
| 3 | Customer | Standard customer access |

---

## Available Permissions

### Products
- `manage_products` - Full product management
- `create_product` - Create products
- `update_product` - Update products
- `delete_product` - Delete products
- `view_products` - View products

### Orders
- `manage_orders` - Full order management
- `view_orders` - View orders
- `view_own_orders` - View own orders

### Users
- `manage_users` - Full user management

### Inventory
- `manage_inventory` - Full inventory management

### Blog
- `manage_blog` - Full blog management
- `create_blog` - Create blogs
- `update_blog` - Update blogs
- `delete_blog` - Delete blogs
- `view_blog` - View blogs

### Settings
- `manage_settings` - Manage settings
- `view_dashboard` - View dashboard

### Cart/Checkout
- `add_to_cart` - Add to cart
- `place_order` - Place order
- `view_cart` - View cart

---

**Documentation Version:** 1.0  
**Last Updated:** March 8, 2026
