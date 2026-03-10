# System Architecture Audit Report

**Generated:** March 9, 2026  
**Auditor:** Senior Full-Stack QA Engineer  
**Repository:** ShriRamya Ecommerce Platform

---

## Executive Summary

This document provides a comprehensive architectural overview of the ShriRamya Ecommerce Platform, including technology stack, system components, and integration patterns.

---

## 1. Backend Framework

| Attribute | Value |
|-----------|-------|
| **Framework** | Express.js (Node.js) |
| **Runtime** | Node.js >= 18.0.0 |
| **Package Manager** | npm >= 9.0.0 |
| **Location** | `/backend_node` |
| **Entry Point** | `server.js` |
| **App Initialization** | `src/app.js` |

### Key Backend Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `mysql2` - MySQL client
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `joi` - Request validation
- `multer` - File uploads
- `sharp` - Image processing
- `bull` - Job queues
- `ioredis` - Redis client
- `razorpay`, `stripe` - Payment gateways
- `swagger-jsdoc`, `swagger-ui-express` - API documentation

---

## 2. Frontend Framework

| Attribute | Value |
|-----------|-------|
| **Framework** | React.js 19.0.0 |
| **Build Tool** | Vite 7.3.1 |
| **Location** | `/frontend` |
| **Routing** | React Router DOM 7.5.1 |
| **HTTP Client** | Axios 1.8.4 |
| **Styling** | Tailwind CSS 3.4.17 |
| **UI Components** | Radix UI, shadcn/ui patterns |
| **Form Handling** | React Hook Form 7.56.2 |
| **Validation** | Zod 3.24.4 |
| **Charts** | Recharts 3.6.0 |
| **Animations** | Framer Motion 12.34.0 |

---

## 3. Database Architecture

### 3.1 MongoDB (Primary Database)
| Attribute | Value |
|-----------|-------|
| **Version** | MongoDB 6 (Docker) |
| **Port** | 27017 |
| **Database Name** | `shriramya` |
| **Purpose** | User accounts, sessions, orders, carts |
| **ODM** | Mongoose 8.0.3 |

### 3.2 MySQL (CMS Database)
| Attribute | Value |
|-----------|-------|
| **Version** | MySQL 8.0 (Docker) |
| **Port** | 3307 (external) |
| **Database Name** | `shriramya` |
| **Purpose** | WordPress/WooCommerce CMS data, RBAC tables |
| **Client** | mysql2 3.6.5 |

### 3.3 Redis (Cache & Session Store)
| Attribute | Value |
|-----------|-------|
| **Version** | Redis 7 Alpine (Docker) |
| **Port** | 6379 |
| **Purpose** | Token blacklist, caching, rate limiting |
| **Client** | ioredis 5.10.0 |

---

## 4. API Architecture

### 4.1 API Pattern
- **Style:** RESTful API
- **Versioning:** URL-based (`/api/v1/`)
- **Base URL:** `http://localhost:8080/api/v1`
- **Response Format:** Standard JSON with `{ success, message, data }`

### 4.2 Route Structure
```
backend_node/src/routes/v1/
├── index.js           # Main router
├── auth.route.js      # Authentication
├── products.route.js  # Products
├── orders.route.js    # Orders
├── blogs.route.js     # Native blogs
├── users.route.js     # User management
├── tenants.route.js   # Multi-tenant
├── cart.route.js      # Shopping cart
├── category.route.js  # Categories
├── customers.route.js # Customers
├── coupons.route.js   # Coupons
├── search.route.js    # Search
├── review.route.js    # Reviews
├── analytics.route.js # Analytics (admin)
├── warehouse.route.js # Warehouses (admin)
├── fraud.route.js     # Fraud detection (admin)
├── notification.route.js # Notifications
├── recommendation.route.js # Recommendations
└── upload.route.js    # File uploads
```

### 4.3 Middleware Stack
1. **CORS** - Cross-origin requests
2. **Helmet** - Security headers
3. **Compression** - Response compression
4. **Morgan** - HTTP logging
5. **Cookie Parser** - Cookie handling
6. **Rate Limiting** - API rate limits
7. **Auth (JWT)** - Token verification
8. **RBAC** - Role-based access control
9. **Tenant Isolation** - Multi-tenant filtering
10. **Validation (Joi)** - Request schema validation

---

## 5. Authentication System

### 5.1 Authentication Method
- **Type:** JWT (JSON Web Tokens)
- **Token Type:** Bearer tokens in Authorization header
- **Storage:** Client-side localStorage
- **Expiry:** Configurable (access + refresh tokens)

### 5.2 JWT Structure
```javascript
{
  user_id: "MongoDB ObjectId",
  tenant_id: Number,
  roles: ["Admin", "Customer"],
  permissions: ["create_product", "manage_orders"],
  deviceId: "optional-device-id",
  jti: "unique-token-id",
  iat: timestamp,
  exp: timestamp
}
```

### 5.3 Security Features
- Token blacklist (Redis)
- Device binding (optional)
- Refresh token rotation
- Rate limiting per endpoint

### 5.4 Auth Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| GET | `/api/v1/auth/me` | Get current user |
| GET | `/api/v1/auth/check-admin` | Admin check |

---

## 6. Role-Based Access Control (RBAC)

### 6.1 RBAC Architecture
- **Multi-tenant** role system
- **MySQL-backed** role/permission storage
- **Dynamic** role and permission assignment
- **System roles** (built-in) and **custom roles** (tenant-specific)

### 6.2 System Roles
| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Full system access | All permissions |
| **Editor** | Content/product management | Create/update products, blogs |
| **Blogger** | Blog management only | Create/update blogs |
| **Customer** | End-user access | View products, place orders |

### 6.3 RBAC Database Schema
```sql
-- Roles table
roles (id, name, description, tenant_id, is_system_role)

-- Permissions table
permissions (id, name, resource, description)

-- Role-Permissions mapping
role_permissions (role_id, permission_id)

-- User-Roles mapping
user_roles (user_id, role_id, tenant_id)
```

### 6.4 RBAC Middleware
```javascript
// Authentication
auth()

// Role-based authorization
requireRole('Admin', 'Editor')

// Permission-based authorization
requirePermission('create_product')

// Tenant isolation
ensureTenantIsolation
```

---

## 7. Multi-Tenant Architecture

### 7.1 Tenant Model
- **Database:** MySQL `tenants` table
- **Isolation:** Logical (tenant_id filtering)
- **Default Tenant:** ID = 1

### 7.2 Tenant Propagation
1. JWT token contains `tenant_id`
2. Middleware extracts tenant from token
3. Repository layer filters queries by `tenant_id`
4. All data operations are tenant-scoped

### 7.3 Tenant Settings
- Stored in `tenant_settings` table
- Key-value format with JSON support
- Per-tenant customization

---

## 8. CMS Integration

### 8.1 WordPress + WooCommerce
| Component | Version | Purpose |
|-----------|---------|---------|
| WordPress | Latest | Content management |
| WooCommerce | Latest | Product/order management |
| Redis Cache | Enabled | Object caching |

### 8.2 Headless Integration
- Backend fetches products from WooCommerce REST API
- Products transformed to internal schema
- Orders synced back to WooCommerce

---

## 9. Infrastructure & Deployment

### 9.1 Docker Services
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| mysql | mysql:8.0 | 3307 | CMS database |
| mongodb | mongo:6 | 27017 | Primary database |
| redis | redis:7-alpine | 6379 | Cache/sessions |
| wordpress | wordpress:latest | - | CMS |
| backend | Custom (Node.js) | 8001 | API server |
| frontend | Custom (React) | - | Web UI |
| nginx | nginx:latest | 8080 | Reverse proxy |
| ai-proxy | Custom | 8081 | AI proxy |
| wpcli | wordpress:cli | - | WP-CLI tasks |

### 9.2 Docker Compose Files
- `docker-compose.yml` - Main composition
- `docker-compose.local.yml` - Local development
- `docker-compose.production.yml` - Production

---

## 10. File Structure Summary

```
ShriRamya/
├── backend_node/          # Express.js backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Auth, RBAC, validation
│   │   ├── models/        # Mongoose/MySQL models
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access layer
│   │   ├── utils/         # Utilities
│   │   └── validations/   # Joi schemas
│   ├── tests/             # Jest tests
│   └── scripts/           # Utility scripts
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   ├── context/       # React context
│   │   └── utils/         # Utilities
│   └── tests/             # Frontend tests
├── wordpress/             # WordPress installation
├── ai-proxy/              # AI proxy service
├── nginx/                 # Nginx configuration
├── migrations/            # Database migrations
└── audit/                 # Audit reports (this folder)
```

---

## 11. Key Configuration Files

| File | Purpose |
|------|---------|
| `backend_node/.env` | Backend environment variables |
| `backend_node/package.json` | Backend dependencies |
| `frontend/package.json` | Frontend dependencies |
| `frontend/vite.config.js` | Vite configuration |
| `docker-compose.yml` | Docker orchestration |
| `nginx/nginx.conf` | Reverse proxy config |

---

## 12. Testing Infrastructure

| Framework | Purpose | Location |
|-----------|---------|----------|
| Jest + Supertest | Backend API tests | `backend_node/tests/` |
| React Testing Library | Frontend tests | `frontend/tests/` |
| E2E Scripts | Integration tests | `backend_node/scripts/` |

---

## 13. Security Features

1. **JWT Authentication** - Stateless token-based auth
2. **RBAC** - Role and permission-based access
3. **Tenant Isolation** - Data segregation by tenant
4. **Rate Limiting** - Per-endpoint rate limits
5. **Input Validation** - Joi schema validation
6. **Token Blacklist** - Redis-backed revocation
7. **Helmet** - Security HTTP headers
8. **CORS** - Controlled cross-origin access
9. **File Upload Validation** - MIME type and extension checks

---

## 14. Performance Optimizations

1. **Redis Caching** - Product listings, sessions
2. **Database Indexing** - MongoDB and MySQL indexes
3. **Image Optimization** - Sharp-based processing
4. **Response Compression** - gzip compression
5. **Background Jobs** - Bull queue for async tasks

---

**End of System Architecture Report**
