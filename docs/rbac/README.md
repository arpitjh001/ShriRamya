# Multi-Tenant RBAC - Complete Documentation

**Project:** ShriRamya Ecommerce Platform  
**Version:** 2.0.0  
**Last Updated:** March 8, 2026

---

## 📚 Documentation Index

This folder contains comprehensive documentation for the Multi-Tenant Role-Based Access Control (RBAC) system.

### Core Documentation

| # | Document | Description |
|---|----------|-------------|
| 01 | [Multi-Tenant RBAC Implementation](01-multi-tenant-rbac-implementation.md) | Complete implementation guide with schema, middleware, and API details |
| 02 | [RBAC Final Test Report](02-rbac-final-test-report.md) | Comprehensive test results and security verification |
| 03 | [Known Limitations Fixed](03-rbac-known-limitations-fixed.md) | Solutions for tenant creation and user role assignment |
| 04 | [Docker Deployment Report](04-docker-deployment-report.md) | Backend deployment guide and status |
| 05 | [Full Stack Deployment](05-full-stack-deployment.md) | Complete frontend + backend deployment guide |
| 06 | [User Management API](06-user-management-api.md) | Complete API reference for user and role management |
| 07 | [RBAC Quick Reference](07-rbac-quick-reference.md) | Developer quick reference guide |
| 📮 | [Postman Collection](ShriRamya-API-Collection.postman_collection.json) | Complete API testing collection |
| 📖 | [Postman Guide](POSTMAN_COLLECTION_GUIDE.md) | How to use the Postman collection |

---

## 🚀 Quick Start

### 1. Read the Implementation Guide
Start with [01-multi-tenant-rbac-implementation.md](01-multi-tenant-rbac-implementation.md) to understand the architecture.

### 2. Review API Documentation
See [06-user-management-api.md](06-user-management-api.md) for all available endpoints.

### 3. Deploy the System
Follow [05-full-stack-deployment.md](05-full-stack-deployment.md) for deployment steps.

### 4. Test the System
Use [02-rbac-final-test-report.md](02-rbac-final-test-report.md) as a testing checklist.

---

## 📋 Overview

### What is Multi-Tenant RBAC?

The Multi-Tenant RBAC system enables:
- **Multiple Stores (Tenants)** - Run multiple independent stores on the same backend
- **Role-Based Access** - Admin, Editor, Customer roles with specific permissions
- **Data Isolation** - Each tenant's data is completely isolated
- **Secure APIs** - All endpoints protected by JWT + RBAC middleware

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Admin Panel │  │ Editor Panel│  │Customer Store│    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Authentication & Authorization Middleware      │   │
│  │  • JWT Validation                               │   │
│  │  • Role Checks (requireRole)                    │   │
│  │  • Permission Checks (requirePermission)        │   │
│  │  • Tenant Isolation (ensureTenantIsolation)     │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  API Routes (Protected by RBAC)                 │   │
│  │  • /api/v1/products  (Admin, Editor)            │   │
│  │  • /api/v1/orders    (Admin only)               │   │
│  │  • /api/v1/blogs     (Admin, Editor)            │   │
│  │  • /api/v1/users     (Admin only)               │   │
│  │  • /api/v1/tenants   (Admin only)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Database Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   MySQL      │  │   MongoDB    │  │    Redis     │ │
│  │ • tenants    │  │ • users      │  │ • sessions   │ │
│  │ • roles      │  │ • orders     │  │ • cache      │ │
│  │ • permissions│  │ • carts      │  │ • tokens     │ │
│  │ • user_roles │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Features

✅ **Multi-Tenant Architecture**
- Tenant isolation at database level
- All queries filtered by tenant_id
- No cross-tenant data leakage

✅ **Role-Based Access Control**
- 3 default roles: Admin, Editor, Customer
- 20+ granular permissions
- Custom role creation support

✅ **Security**
- JWT-based authentication
- Role and permission middleware
- Tenant isolation enforcement

✅ **User Management**
- Create tenants via API
- Assign/remove user roles
- Sync MongoDB-MySQL user mappings

---

## 🔧 Setup Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- MySQL 8.0
- MongoDB 6.0
- Redis 7.0

### Installation

```bash
# 1. Clone repository
cd c:\Users\Lenovo\shriramya\ShriRamya

# 2. Run database migrations
docker exec shriramya-mysql-1 mysql -uroot -prootpassword shriramya < migrations/20260307_create_multi_tenant_rbac.sql

# 3. Start all services
docker-compose up -d

# 4. Verify services
docker-compose ps
```

### Verify Setup

```bash
# Health check
curl http://localhost:8080/api/v1/health

# Expected: {"success": true, "status": "ok"}
```

---

## 📖 API Quick Reference

### Authentication

```bash
# Login
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}

# Response includes JWT with roles and tenant_id
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "123",
    "roles": ["Admin"],
    "tenantId": 1
  }
}
```

### Tenant Management

```bash
# Create tenant
POST /api/v1/tenants
{
  "name": "My Store",
  "domain": "mystore.com",
  "ownerEmail": "owner@mystore.com",
  "ownerPassword": "SecurePass123!"
}

# Get current tenant
GET /api/v1/tenants/current
```

### User Management

```bash
# Get all users (Admin only)
GET /api/v1/users

# Assign role to user
POST /api/v1/users/:userId/roles
{
  "roleId": 1,  // 1=Admin, 2=Editor, 3=Customer
  "tenantId": 1
}

# Get all roles
GET /api/v1/users/roles

# Get all permissions
GET /api/v1/users/permissions
```

### Product Management

```bash
# List products (tenant-isolated)
GET /api/v1/products

# Create product (Admin, Editor only)
POST /api/v1/products
{
  "name": "Product Name",
  "basePrice": 999,
  "sku": "SKU-001"
}

# Delete product (Admin only)
DELETE /api/v1/products/:id
```

### Blog Management

```bash
# List blogs (public)
GET /api/v1/blogs

# Create blog (Admin, Editor only)
POST /api/v1/blogs
{
  "title": "Blog Title",
  "slug": "blog-title",
  "content": "Blog content...",
  "status": "published"
}

# Delete blog (Admin only)
DELETE /api/v1/blogs/:id
```

---

## 🔒 Security Model

### Authentication Flow

```
1. User logs in with email/password
2. Backend validates credentials
3. JWT token generated with:
   - user_id
   - tenant_id
   - roles[]
   - permissions[]
4. Token included in all subsequent requests
```

### Authorization Flow

```
1. Request received with JWT token
2. auth middleware validates token
3. requireRole middleware checks user roles
4. ensureTenantIsolation filters data by tenant_id
5. Request processed if all checks pass
```

### Role Hierarchy

```
Admin
├── Full system access
├── Can delete products/orders
├── Can manage users
└── Can manage settings

Editor
├── Create/edit products
├── Create/edit blogs
└── NO delete, NO orders, NO users

Customer
├── View products
├── Add to cart
├── Place orders
└── View own orders
```

---

## 🧪 Testing

### Run Test Suite

```bash
cd backend_node
node tests/rbac-comprehensive.test.js
```

### Manual Testing

See [02-rbac-final-test-report.md](02-rbac-final-test-report.md) for complete test scenarios.

---

## 📁 Additional Documentation

### Backend Documentation
- `/backend_node/docs/` - Backend-specific docs
- `/backend_node/tests/` - Test suites

### Frontend Documentation
- `/frontend/docs/` - Frontend-specific docs
- `/frontend/src/components/RBACGuard.js` - React RBAC components

### Database Documentation
- `/migrations/` - SQL migration files
- `20260307_create_multi_tenant_rbac.sql` - Main RBAC migration

---

## 🆘 Troubleshooting

### Common Issues

**Issue: "Access token missing"**
- Solution: Include JWT token in Authorization header

**Issue: "Insufficient permissions"**
- Solution: Check user has required role via `GET /api/v1/users/roles`

**Issue: "Product not found" (but it exists)**
- Solution: Verify tenant_id matches - cross-tenant access is blocked

**Issue: Tenant creation fails**
- Solution: Check mysql_users table exists and is properly configured

### Support

For issues or questions:
1. Check the relevant documentation file above
2. Review test reports for expected behavior
3. Check backend logs: `docker-compose logs backend`

---

## 📝 Changelog

### Version 2.0.0 (March 8, 2026)

**Added:**
- Multi-tenant architecture with tenant isolation
- RBAC system with 3 default roles
- User management APIs
- Tenant creation APIs
- Native blog module
- Frontend RBAC components

**Fixed:**
- Tenant creation flow (no manual SQL needed)
- User role assignment (fully API-driven)
- Sidebar blur issue in mobile menu

---

## 📞 Contact

**Project:** ShriRamya Ecommerce Platform  
**Documentation Version:** 2.0.0  
**Last Updated:** March 8, 2026

For technical support, refer to the troubleshooting section or check the detailed implementation guides in this folder.

---

**End of Documentation Index**
