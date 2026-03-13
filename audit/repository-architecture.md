# ShriRamya Ecommerce Platform - System Architecture Map

**Generated:** March 14, 2026  
**Version:** 2.0  
**Architecture Type:** Multi-Tenant Hybrid (MongoDB + MySQL)

---

## Executive Summary

ShriRamya is a **multi-tenant ecommerce platform** built with a hybrid database architecture combining:
- **MongoDB**: User data, authentication
- **MySQL**: Products, orders, inventory, blogs, RBAC

The system follows a **layered architecture** with clear separation between controllers, services, and repositories.

---

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | Latest |
| Framework | Express.js | ^4.x |
| Database (NoSQL) | MongoDB | Latest |
| Database (SQL) | MySQL | 8.0+ |
| Cache | Redis | Latest |
| ORM/Query Builder | Native (mysql2/promise) | - |
| ODM | Mongoose | Latest |
| Validation | Joi | Latest |
| Authentication | JWT | Latest |
| File Upload | Multer | Latest |
| Image Processing | Sharp | Latest |
| Queue System | Bull | Latest |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| Routing | React Router | 6.x |
| State Management | Context API | - |
| UI Components | Custom + shadcn/ui | - |
| Styling | Tailwind CSS | Latest |
| HTTP Client | Axios | Latest |
| Animations | Framer Motion | Latest |

### DevOps
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Containerization | Docker | Application isolation |
| Orchestration | Docker Compose | Multi-container management |
| Reverse Proxy | NGINX | Load balancing, SSL |
| CI/CD | Git | Version control |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web App   │  │  Mobile App │  │  Admin Panel│             │
│  │  (React)    │  │   (Future)  │  │  (React)    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼──────┐
                    │   NGINX     │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │   Backend   │  │   Backend   │  │   AI Proxy  │
   │  Node:8000  │  │  Node:8001  │  │  Node:8002  │
   │  (Express)  │  │  (Express)  │  │  (Express)  │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │   MongoDB   │  │    MySQL    │  │    Redis    │
   │  :27017     │  │   :3306     │  │   :6379     │
   │  (Users)    │  │ (Products,  │  │  (Cache,    │
   │             │  │  Orders,    │  │   Sessions) │
   │             │  │   RBAC)     │  │             │
   └─────────────┘  └─────────────┘  └─────────────┘
```

---

## Backend Architecture

### Folder Structure

```
backend_node/
├── src/
│   ├── config/           # Configuration files
│   │   ├── config.js     # Environment config
│   │   ├── db.js         # Database connections
│   │   └── swagger.js    # API documentation
│   ├── controllers/      # Request handlers (24 files)
│   ├── middlewares/      # Express middlewares
│   │   ├── auth.js       # JWT authentication
│   │   ├── authRBAC.js   # Role-based access control
│   │   ├── error.js      # Error handling
│   │   ├── rateLimit.middleware.js
│   │   ├── requestId.js  # Request tracing
│   │   └── validate.js   # Request validation
│   ├── models/           # MongoDB/MongoDB models
│   │   ├── user.model.js
│   │   └── rbac.model.js
│   ├── repositories/     # Data access layer (SQL)
│   │   ├── product.sql.repository.js
│   │   ├── cart.sql.repository.js
│   │   ├── category.sql.repository.js
│   │   └── shipment.repository.js
│   ├── routes/           # API route definitions
│   │   └── v1/           # API version 1 (20 route files)
│   ├── services/         # Business logic layer (30+ files)
│   ├── utils/            # Utility functions
│   ├── validations/      # Joi validation schemas
│   └── app.js            # Express app setup
├── scripts/              # Utility scripts
├── tests/                # Test files
├── uploads/              # File uploads
├── server.js             # Entry point
└── package.json
```

### API Routes (v1)

| Route | Controller | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/auth/*` | auth.controller | Authentication & user management | Varies |
| `/products/*` | product.controller | Product CRUD, variants, matrix | Admin/Editor |
| `/categories/*` | category.controller | Category management | Admin/Editor |
| `/orders/*` | order.controller | Order processing | Admin/Customer |
| `/cart/*` | cart.controller | Shopping cart operations | Customer |
| `/blogs/*` | blog.controller | Blog system (multi-tenant) | Admin/Editor |
| `/upload/*` | upload.controller | Image/file uploads | Admin |
| `/customers/*` | customer.controller | Customer management | Admin |
| `/coupons/*` | coupon.controller | Coupon management | Admin |
| `/search/*` | search.controller | Product search | Public |
| `/reviews/*` | review.controller | Product reviews | Customer |
| `/recommendations/*` | recommendation.controller | Product recommendations | Public |
| `/admin/analytics/*` | analytics.controller | Analytics dashboard | Admin |
| `/admin/warehouses/*` | warehouse.controller | Warehouse management | Admin |
| `/notifications/*` | notification.controller | Notifications | All |
| `/admin/fraud/*` | fraud.controller | Fraud detection | Admin |
| `/tenants/*` | tenant.controller | Multi-tenant management | Admin |
| `/users/*` | user-management.controller | User management | Admin |

### Middleware Chain

```
Request → requestId → CORS → Body Parser → Auth → RBAC → Validation → Controller
```

**Key Middlewares:**
1. `requestId` - Request tracing
2. `auth` - JWT token verification
3. `authRBAC` - Role-based access control
4. `validate` - Joi schema validation
5. `rateLimit` - API rate limiting
6. `error` - Global error handling

---

## Database Architecture

### MongoDB Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User accounts | email, password, role, name, phone |

### MySQL Tables

#### Core Business Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `tenants` | Multi-tenant support | id, name, domain, status, settings |
| `products` | Product catalog | id, tenant_id, name, slug, sku, base_price, status |
| `product_variants` | Product variants | id, product_id, sku, price, color, size, stock_quantity |
| `variant_inventory` | Inventory tracking | variant_id, stock_level, low_stock_threshold |
| `categories` | Product categories | id, tenant_id, name, slug, parent_id |
| `product_categories` | Product-category mapping | product_id, category_id |
| `product_attributes` | Product attributes | id, product_id, name |
| `product_attribute_values` | Attribute values | attribute_id, value |
| `orders` | Order management | id, tenant_id, user_id, status, total |
| `order_items` | Order line items | order_id, product_id, variant_id, quantity |
| `carts` | Shopping carts | id, tenant_id, user_id, session_id |
| `cart_items` | Cart line items | cart_id, product_id, variant_id, quantity |
| `coupons` | Discount coupons | id, tenant_id, code, discount, min_order_value |
| `reviews` | Product reviews | id, tenant_id, product_id, user_id, rating |
| `blogs` | Blog posts | id, tenant_id, title, slug, content, status |

#### RBAC Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `roles` | Role definitions | id, name, tenant_id, is_system_role |
| `permissions` | Permission definitions | id, name, resource, action |
| `role_permissions` | Role-permission mapping | role_id, permission_id |
| `user_roles` | User-role mapping | user_id, role_id, tenant_id |
| `mysql_users` | MySQL user reference | id, mongo_user_id, email, tenant_id |

#### Support Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `inventory_audit_log` | Inventory change tracking | variant_id, change_type, old/new_stock |
| `inventory_reservations` | Stock reservations | variant_id, quantity, order_id, expires_at |
| `tenant_settings` | Tenant configuration | tenant_id, setting_key, setting_value |
| `shipments` | Order shipments | id, order_id, tracking_number, status |
| `refunds` | Order refunds | id, order_id, amount, reason, status |

---

## RBAC System

### Default Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full system access | All permissions |
| **Editor** | Content management | create/update/view products, blogs |
| **Customer** | Standard user | view products, cart, place orders |

### Permission Matrix

| Resource | Admin | Editor | Customer |
|----------|-------|--------|----------|
| Products | manage | create, update, view | view |
| Orders | manage | view | view_own, place |
| Users | manage | - | - |
| Inventory | manage | update, view | view |
| Blog | manage | create, update, view | view |
| Settings | manage | - | - |
| Dashboard | view | view | - |
| Cart | - | - | add, view |

---

## Service Layer Architecture

### Core Services

```
services/
├── auth.service.js              # Authentication logic
├── token.service.js             # JWT token generation/validation
├── product.service.js           # Product business logic
├── category.service.js          # Category management
├── cart.service.js              # Shopping cart operations
├── orderStateMachine.service.js # Order state machine
├── variant-inventory.service.js # Variant inventory management
├── inventory-audit.service.js   # Inventory audit logging
├── blog.service.js              # Blog operations
├── coupon.service.js            # Coupon management
├── review.service.js            # Review system
├── search.service.js            # Search functionality
├── recommendation.service.js    # Product recommendations
├── analytics.service.js         # Analytics aggregation
├── notification.service.js      # Notifications
├── fraud.service.js             # Fraud detection
├── tenant.service.js            # Multi-tenant management
├── warehouse.service.js         # Warehouse management
├── refund.service.js            # Refund processing
├── shipment.service.js          # Shipment tracking
└── queue/
    └── jobQueue.service.js      # Background job processing
```

### Service Communication Pattern

```
Controller → Service → Repository → Database
                  ↓
            (Business Logic)
                  ↓
            (Validation)
```

---

## Frontend Architecture

### Folder Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # Base UI components
│   │   ├── VariantGridInput.js
│   │   └── VirtualTryOn/
│   ├── context/        # React Context providers
│   │   ├── AuthContext.js
│   │   └── CartContext.js
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Page layouts
│   │   └── MainLayout.jsx
│   ├── pages/          # Page components
│   │   ├── AdminProductsPage.js
│   │   ├── AllProductsPage.js
│   │   ├── HomePage.js
│   │   ├── ProductDetailPage.js
│   │   └── ...
│   ├── routes/         # Route definitions
│   ├── services/       # API services
│   │   ├── api.js      # Main API client
│   │   └── apiClient.js
│   └── utils/          # Utility functions
├── package.json
└── public/
```

### Key Pages

| Page | Route | Purpose |
|------|-------|---------|
| HomePage | `/` | Landing page |
| AllProductsPage | `/products` | Product listing |
| ProductDetailPage | `/products/:id` | Product details |
| AdminProductsPage | `/admin/products` | Admin product management |
| CartPage | `/cart` | Shopping cart |
| CheckoutPage | `/checkout` | Checkout flow |
| OrdersPage | `/orders` | Order history |
| BlogPage | `/blog` | Blog listing |
| BlogPostPage | `/blog/:slug` | Blog post view |

---

## Authentication Flow

```
1. User Login → POST /api/v1/auth/login
2. Backend validates credentials (MongoDB)
3. Creates MySQL RBAC mapping (mysql_users, user_roles)
4. Generates JWT with roles & permissions
5. Returns access_token + refresh_token (HTTPOnly cookie)
6. Frontend stores access_token in localStorage
7. Subsequent requests include Authorization: Bearer <token>
8. Middleware validates token and extracts roles
9. RBAC middleware checks permissions
```

### Token Structure

```javascript
{
  sub: userId,
  user_id: userId,
  tenant_id: tenantId,
  roles: ['Admin', 'Editor', ...],
  permissions: ['manage_products', 'view_orders', ...],
  role: 'Admin',  // Primary role
  deviceId: 'xxx',
  jti: 'uuid',
  iat: timestamp,
  exp: timestamp
}
```

---

## Multi-Tenant Architecture

### Tenant Isolation Strategy

- **Database Level**: All business tables include `tenant_id` column
- **Query Level**: All queries filter by `tenant_id`
- **Middleware**: `ensureTenantIsolation` middleware validates tenant access
- **RBAC**: Roles and permissions are tenant-specific

### Tenant Resolution

1. From JWT token (`tenant_id` claim)
2. From subdomain (future)
3. From request header (`x-tenant-id`)
4. Default: tenant_id = 1

---

## API Request Flow Example

### Product Update Flow

```
PUT /api/v1/products/9
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Product",
  "basePrice": 1999,
  "variants": [...]
}

↓

1. requestId middleware (generate request ID)
2. CORS middleware (validate origin)
3. Body parser (parse JSON)
4. auth middleware (verify JWT)
5. authRBAC middleware (check Admin/Editor role)
6. validate middleware (Joi schema)
7. productController.updateProduct()
8. productService.updateProduct()
9. productSqlRepository.updateProduct()
   - Begin transaction
   - Update products table
   - Sync product_attributes
   - Sync product_categories
   - Sync product_variants (CRUD operations)
   - Update variant_inventory
   - Commit transaction
10. Update search index (async)
11. Return response
```

---

## Background Jobs

### Queue System (Bull + Redis)

| Job Type | Purpose | Frequency |
|----------|---------|-----------|
| Order Processing | Process pending orders | On demand |
| Inventory Sync | Sync inventory levels | Scheduled |
| Email Notifications | Send order emails | On demand |
| Analytics Aggregation | Compute daily stats | Daily |
| Cache Cleanup | Expire old cache entries | Hourly |

---

## File Upload Architecture

### Image Processing Pipeline

```
1. Upload → POST /api/v1/upload/image
2. Multer middleware (stores in memory)
3. imageOptimization.service.js
   - Validate file type
   - Convert to WebP
   - Generate sizes: thumb, med, lg, orig
   - Save to /uploads/images/
   - Generate CDN URLs
4. Return URLs for all sizes
```

### Image Sizes

| Size | Dimensions | Suffix | Quality |
|------|-----------|--------|---------|
| Thumbnail | 300x300 | `_thumb` | 70% |
| Medium | 800x800 | `_med` | 80% |
| Large | 1600x1600 | `_lg` | 85% |
| Original | Original | `_orig` | 90% |

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT with blacklist (Redis) |
| Authorization | RBAC with roles & permissions |
| Rate Limiting | Express rate limiter |
| Input Validation | Joi schemas |
| SQL Injection | Parameterized queries |
| XSS Protection | Helmet.js headers |
| CORS | Configured origins |
| File Upload | Type validation, size limits |
| Password Hashing | bcrypt (10 rounds) |
| Token Rotation | Refresh token rotation |

---

## Performance Optimizations

| Optimization | Description |
|-------------|-------------|
| Redis Caching | Product list, sessions, token blacklist |
| Database Indexes | Composite indexes on tenant_id + status |
| Image CDN | Configurable CDN base URL |
| Compression | Gzip via NGINX |
| Connection Pooling | MySQL connection pool (10 connections) |
| Lazy Loading | Frontend code splitting |

---

## Known Issues & Technical Debt

1. **Hybrid Database Complexity**: Managing consistency between MongoDB and MySQL
2. **Variant Inventory Sync**: Triggers keep variant_inventory in sync, but edge cases exist
3. **RBAC Migration**: Some legacy code still uses simple role checks
4. **AI Collaboration Module**: Temporarily disabled for deployment
5. **Inventory Route**: `/admin/inventory` temporarily disabled

---

## Testing Strategy

### Test Coverage

| Test Type | Framework | Coverage |
|-----------|-----------|----------|
| Unit Tests | Jest | Services, utilities |
| API Tests | Jest + Supertest | All endpoints |
| Integration Tests | Jest + Supertest | Full flows |
| E2E Tests | Custom scripts | Admin, Customer flows |

### Test Files

- `backend_node/tests/api.test.js`
- `backend_node/tests/rbac.test.js`
- `backend_node/tests/tenant-isolation.test.js`
- `backend_node/tests/product-variant.test.js`
- `backend_node/tests/cart-variant.test.js`

---

## Deployment Architecture

### Docker Services

```yaml
services:
  - backend (Node.js:8000)
  - frontend (React:3000 → NGINX:80)
  - mongodb (27017)
  - mysql (3306)
  - redis (6379)
  - nginx (reverse proxy:80/443)
```

### Environment Variables

Critical variables in `.env`:
- `MONGO_URL`, `DB_NAME`
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_MINUTES`, `JWT_REFRESH_EXPIRATION_DAYS`
- `REDIS_URL`
- `PORT`, `CORS_ORIGINS`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

---

## Monitoring & Observability

| Component | Tool | Purpose |
|-----------|------|---------|
| Logging | Morgan + Winston | Request logging |
| Request Tracing | requestId middleware | Request correlation |
| Error Tracking | Custom error handler | Centralized error handling |
| Database Monitoring | MySQL slow query log | Query optimization |

---

## Future Enhancements

1. **Mobile App**: React Native application
2. **AI Recommendations**: ML-based product recommendations
3. **Multi-Language**: i18n support
4. **Payment Gateway**: Multiple payment providers
5. **Shipping Integration**: Real-time shipping rates
6. **Analytics Dashboard**: Advanced analytics with charts
7. **WebSocket**: Real-time notifications
8. **GraphQL API**: Alternative to REST API

---

**Document Maintained By:** AI Engineering Team  
**Last Updated:** March 14, 2026
