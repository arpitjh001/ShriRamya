# Repository Structure Audit

**Generated:** March 9, 2026  
**Auditor:** Autonomous QA System

---

## Project Overview

**Project Name:** ShriRamya Ecommerce Platform  
**Type:** Headless Ecommerce System  
**Architecture:** MERN Stack + MySQL (WordPress integration)

---

## Directory Structure

```
ShriRamya/
├── backend_node/              # Node.js/Express Backend
│   ├── src/
│   │   ├── config/           # Database and app configuration
│   │   ├── controllers/      # Request handlers (21 controllers)
│   │   ├── middlewares/      # Auth, RBAC, rate limiting, validation
│   │   ├── models/           # Mongoose and MySQL models
│   │   ├── repositories/     # Data access layer
│   │   ├── routes/           # API route definitions (v1)
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # Helper functions
│   │   ├── validations/      # Joi schemas
│   │   └── app.js            # Express app initialization
│   ├── scripts/              # Seed scripts, migrations, tests
│   ├── tests/                # Jest test suites
│   ├── uploads/              # Uploaded files
│   └── package.json
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── assets/           # Static assets
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Context (Auth, Cart)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Page layouts
│   │   ├── pages/            # Page components (33 pages)
│   │   ├── routes/           # React Router configuration
│   │   ├── services/         # API service layer
│   │   └── utils/            # Helper functions
│   ├── public/               # Public static files
│   └── package.json
│
├── migrations/                # Database migration scripts
├── audit/                     # Audit reports (generated)
├── ai-proxy/                  # AI Proxy service (separate project)
├── nginx/                     # Nginx configuration
└── docker-compose.yml         # Docker orchestration
```

---

## Backend Structure

### Controllers (21 files)

| Controller | Purpose |
|------------|---------|
| `analytics.controller.js` | Dashboard analytics |
| `auth.controller.js` | Authentication (login, register, refresh) |
| `blog.controller.js` | Blog post management |
| `cart.controller.js` | Shopping cart operations |
| `category.controller.js` | Product categories |
| `coupon.controller.js` | Coupon/discount management |
| `customer.controller.js` | Customer management |
| `fraud.controller.js` | Fraud detection |
| `notification.controller.js` | User notifications |
| `order.controller.js` | Order processing |
| `product.controller.js` | Product CRUD |
| `recommendation.controller.js` | Product recommendations |
| `refund.controller.js` | Refund processing |
| `review.controller.js` | Product reviews |
| `search.controller.js` | Product search |
| `shipment.controller.js` | Order shipment tracking |
| `tenant.controller.js` | Multi-tenant management |
| `upload.controller.js` | File uploads |
| `user-management.controller.js` | User role management |
| `warehouse.controller.js` | Warehouse/inventory |
| `webhook.controller.js` | Payment webhooks |

### Routes (18 route files)

All routes under `src/routes/v1/`:

| Route | Base Path |
|-------|-----------|
| `analytics.route.js` | `/admin/analytics` |
| `auth.route.js` | `/auth` |
| `blogs.route.js` | `/blogs` |
| `cart.route.js` | `/cart` |
| `category.route.js` | `/categories` |
| `coupons.route.js` | `/coupons` |
| `customers.route.js` | `/customers` |
| `fraud.route.js` | `/admin/fraud` |
| `notification.route.js` | `/notifications` |
| `orders.route.js` | `/orders` |
| `products.route.js` | `/products` |
| `recommendation.route.js` | `/recommendations` |
| `review.route.js` | `/reviews` |
| `search.route.js` | `/search` |
| `tenants.route.js` | `/tenants` |
| `upload.route.js` | `/upload` |
| `users.route.js` | `/users` |
| `warehouse.route.js` | `/admin/warehouses` |

### Middlewares

| Middleware | Purpose |
|------------|---------|
| `auth.js` | JWT authentication |
| `authRBAC.js` | Role-based access control |
| `rateLimit.middleware.js` | API rate limiting |
| `validate.js` | Request validation |
| `webhookAuth.middleware.js` | Webhook signature verification |

### Services

Business logic layer including:
- Authentication service
- Blog service
- Cart service
- Category service
- Coupon service
- Email service
- Order state machine
- Product service
- Review service
- Search service
- Shipment service
- Token service
- User role management

### Models

| Model | Database |
|-------|----------|
| `user.model.js` | MongoDB |
| `rbac.model.js` | MySQL (roles, permissions) |

### Repositories

SQL data access layer:
- `category.sql.repository.js`
- `product.sql.repository.js`
- Other SQL repositories

---

## Frontend Structure

### Pages (33 files)

| Page | Route | Purpose |
|------|-------|---------|
| `HomePage.js` | `/` | Landing page |
| `ProductsPage.js` | `/products` | Product listing |
| `ProductDetailPage.js` | `/products/:id` | Product details |
| `CartPage.js` | `/cart` | Shopping cart |
| `CheckoutPage.js` | `/checkout` | Checkout flow |
| `OrderSuccessPage.js` | `/order-success/:id` | Order confirmation |
| `AccountPage.js` | `/account` | User account |
| `WishlistPage.js` | `/wishlist` | Wishlist |
| `BlogPage.js` | `/blog` | Blog listing |
| `BlogPostPage.js` | `/blog/:slug` | Blog post |
| `BlogCreatePage.js` | `/admin/blog/new` | Create blog |
| `AdminProductsPage.js` | `/admin/products` | Product management |
| `AdminCouponsPage.js` | `/admin/coupons` | Coupon management |
| `AdminOrdersPage.js` | `/admin/orders` | Order management |
| `AdminAnalyticsPage.js` | `/admin/analytics` | Analytics dashboard |
| `AdminBlogsPage.js` | `/admin/blogs` | Blog management |
| `AdminInventoryPage.js` | `/admin/inventory` | Inventory |
| `AdminWooCommercePage.js` | `/admin/dashboard` | Admin dashboard |
| `AllProductsPage.js` | `/all-products` | All products |
| `CategoriesPage.js` | `/categories` | Category listing |
| `CategoryPage.js` | `/category/:slug` | Category products |
| `AboutPage.js` | `/about` | About page |
| `ContactPage.js` | `/contact` | Contact form |
| `TrackOrderPage.js` | `/track-order` | Order tracking |
| `FabricCarePage.js` | `/fabric-care` | Care guide |
| `LookbookPage.js` | `/lookbook` | Lookbook |
| `LuxuryCollectionPage.js` | `/luxury-collection` | Luxury collection |
| `RegionalCollectionsPage.js` | `/regional-collections` | Regional |
| `SanganeriBlogPost.js` | `/blog/sanganeri-print` | Sanganeri blog |

### Context Providers

| Context | Purpose |
|---------|---------|
| `AuthContext.js` | Authentication state |
| `CartContext.js` | Shopping cart state (with coupon support) |

### Services

| Service | Purpose |
|---------|---------|
| `api.js` | Main API client (axios) |
| `apiClient.js` | Centralized API client |
| `adminOrderService.js` | Order management |
| `analyticsService.js` | Analytics |
| `notificationService.js` | Notifications |
| `reviewService.js` | Reviews |
| `searchService.js` | Search |
| `tenantService.js` | Multi-tenant |
| `userManagementService.js` | User management |

### Components

UI component library including:
- Product cards
- Cart components
- Forms
- Dialogs
- Tables
- Navigation

---

## Database Architecture

### MongoDB Collections

- `users` - User accounts
- `sessions` - User sessions
- `carts` - Shopping carts

### MySQL Tables

- `coupons` - Discount coupons
- `cart_coupons` - Cart-coupon junction
- `orders` - Orders (with coupon tracking)
- `order_items` - Order line items
- `products` - Products
- `product_variants` - Product variants
- `categories` - Categories
- `blogs` - Blog posts
- `blog_tags` - Blog tags
- `blog_categories` - Blog categories
- `blog_post_tags` - Blog post-tag junction
- `mysql_users` - User mapping (MongoDB ↔ MySQL)
- `roles` - RBAC roles
- `permissions` - RBAC permissions
- `role_permissions` - Role-permission junction
- `user_roles` - User-role junction
- `tenants` - Multi-tenant
- `tenant_settings` - Tenant configuration

---

## Authentication System

### JWT-Based Auth

- Access token: 15 minutes
- Refresh token: 7 days
- Token blacklist: Redis-backed
- Device binding: Optional

### User Roles

| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Editor | Create/edit products, blogs |
| Blogger | Create/edit blogs only |
| Customer | Browse, cart, orders |

---

## Key Features

### Implemented

- ✅ Product management (CRUD)
- ✅ Category management
- ✅ Shopping cart
- ✅ Coupon/discount system
- ✅ Order processing
- ✅ Blog system
- ✅ User authentication
- ✅ RBAC (Role-Based Access Control)
- ✅ Multi-tenant support
- ✅ File uploads
- ✅ Product reviews
- ✅ Search functionality
- ✅ Analytics dashboard
- ✅ Payment integration (Razorpay)
- ✅ Shipment tracking
- ✅ Refund processing

### Recent Additions

- ✅ Complete coupon feature (Phases 1-11)
- ✅ Cart page coupon UI
- ✅ Checkout coupon integration
- ✅ Admin coupon management
- ✅ Rate limiting for coupons

---

## Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| `mysql` | 3307 | CMS database |
| `mongodb` | 27017 | App database |
| `redis` | 6379 | Cache/sessions |
| `backend` | 8001 | Node.js API |
| `frontend` | - | React app |
| `nginx` | 8080 | Reverse proxy |
| `wordpress` | - | CMS |
| `ai-proxy` | 8081 | AI proxy |

---

## API Documentation

Base URL: `http://localhost:8080/api/v1`

### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh tokens
- `GET /auth/me` - Get current user
- `GET /auth/check-admin` - Admin check

### Product Endpoints

- `GET /products` - List products
- `GET /products/:id` - Get product
- `POST /products` - Create product (Admin/Editor)
- `PUT /products/:id` - Update product (Admin/Editor)
- `DELETE /products/:id` - Delete product (Admin)

### Cart Endpoints

- `GET /cart` - Get cart
- `POST /cart/add` - Add to cart
- `PUT /cart/item/:id` - Update quantity
- `DELETE /cart/item/:id` - Remove item
- `POST /cart/coupon/apply` - Apply coupon
- `DELETE /cart/coupon/remove` - Remove coupon
- `GET /cart/coupon` - Get applied coupon

### Order Endpoints

- `POST /orders` - Create order
- `GET /orders/my` - Get user orders
- `GET /orders/:id` - Get order details

### Coupon Endpoints

- `GET /coupons` - List coupons (Admin)
- `POST /coupons` - Create coupon (Admin)
- `PUT /coupons/:id` - Update coupon (Admin)
- `DELETE /coupons/:id` - Delete coupon (Admin)
- `GET /coupons/validate/:code` - Validate coupon (Public)

### Blog Endpoints

- `GET /blogs` - List blogs
- `GET /blogs/:id` - Get blog post
- `POST /blogs` - Create blog (Admin/Editor)
- `PUT /blogs/:id` - Update blog (Admin/Editor)

---

## Testing Infrastructure

### Backend Tests

- Jest + Supertest
- RBAC tests
- Tenant isolation tests
- API integration tests

### Test Scripts

- `npm run seed:users` - Seed test users
- `npm run seed:blogs` - Seed blog posts
- `npm run migrate:categories` - Run migrations

---

## Security Features

- JWT authentication
- RBAC middleware
- Rate limiting
- Input validation (Joi)
- CORS configuration
- Helmet security headers
- Token blacklist (Redis)

---

## Performance Optimizations

- Redis caching
- Database indexing
- Response compression
- Image optimization
- Lazy loading (React)
- Code splitting

---

## Known Issues

None currently - all major features implemented and tested.

---

## Recent Changes

- Complete coupon feature implementation
- Cart and checkout coupon integration
- Admin coupon management UI
- Rate limiting for coupon endpoints
- Order system coupon tracking

---

**End of Repository Structure Audit**
