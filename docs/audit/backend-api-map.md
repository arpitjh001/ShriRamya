# Backend API Map

**Generated:** March 9, 2026  
**Base URL:** `http://localhost:8080/api/v1`  
**Total Endpoints:** 137

---

## Authentication APIs (`/auth`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/register` | No | - | User registration |
| POST | `/login` | No | - | User login |
| POST | `/refresh` | No | - | Refresh tokens |
| GET | `/me` | Yes | Any | Get current user |
| GET | `/check-admin` | Yes | Admin | Check admin status |

---

## Product APIs (`/products`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | No | - | List products (paginated) |
| GET | `/:id` | No | - | Get single product |
| POST | `/` | Yes | Admin, Editor | Create product |
| PUT | `/:id` | Yes | Admin, Editor | Update product |
| DELETE | `/:id` | Yes | Admin | Delete product |
| GET | `/:id/recommendations` | No | - | Get product recommendations |
| GET | `/:id/categories` | No | - | Get product categories |
| POST | `/:id/categories` | Yes | Admin, Editor | Assign categories |
| DELETE | `/:id/categories/:category_id` | Yes | Admin | Remove category |
| POST | `/:id/variants` | Yes | Admin, Editor | Add variant |
| PUT | `/:id/variants/:variant_id` | Yes | Admin, Editor | Update variant |
| DELETE | `/:id/variants/:variant_id` | Yes | Admin | Delete variant |

---

## Cart APIs (`/cart`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | No | - | Get cart |
| POST | `/add` | No | - | Add item to cart |
| PUT | `/item/:id` | No | - | Update item quantity |
| DELETE | `/item/:id` | No | - | Remove item |
| DELETE | `/` | No | - | Clear cart |
| GET | `/:id` | No | - | Get cart by ID (admin) |
| POST | `/coupon/apply` | No | 30/min | Apply coupon |
| DELETE | `/coupon/remove` | No | 30/min | Remove coupon |
| GET | `/coupon` | No | - | Get applied coupon |

---

## Order APIs (`/orders`)

### Customer Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Yes | Create order |
| POST | `/create` | Yes | Create order (alias) |
| GET | `/my` | Yes | Get customer orders |
| GET | `/:id` | Yes | Get order details |
| POST | `/my/:id/cancel` | Yes | Cancel order |
| GET | `/:id/tracking` | Yes | Get order tracking |
| GET | `/:id/shipments` | Yes | Get order shipments |
| POST | `/:id/refunds` | Yes | Request refund |
| GET | `/:id/refunds` | Yes | Get order refunds |

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/all` | Admin | Get all orders |
| PATCH | `/admin/:id/status` | Admin | Update order status |
| GET | `/admin/shipments` | Admin | Get all shipments |
| GET | `/admin/shipments/ready-to-ship` | Admin | Get ready to ship |
| GET | `/admin/shipments/pending` | Admin | Get pending shipments |
| POST | `/admin/:id/shipments` | Admin | Create shipment |
| PATCH | `/admin/shipments/:id/tracking` | Admin | Update tracking |
| POST | `/admin/shipments/:id/ship` | Admin | Mark as shipped |
| POST | `/admin/shipments/:id/deliver` | Admin | Mark as delivered |
| DELETE | `/admin/shipments/:id` | Admin | Delete shipment |
| POST | `/admin/refunds/:id/approve` | Admin | Approve refund |
| POST | `/admin/refunds/:id/process` | Admin | Process refund |
| POST | `/admin/refunds/:id/reject` | Admin | Reject refund |
| GET | `/admin/refunds/:id` | Admin | Get refund details |
| GET | `/admin/analytics/orders` | Admin | Order analytics |

### Webhooks (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/webhooks/payment/razorpay` | No | Razorpay webhook |
| POST | `/webhooks/payment/stripe` | No | Stripe webhook |

---

## Category APIs (`/categories`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | No | - | List categories |
| POST | `/` | Yes | Admin, Editor | Create category |
| GET | `/:id` | No | - | Get category |
| PUT | `/:id` | Yes | Admin, Editor | Update category |
| DELETE | `/:id` | Yes | Admin | Delete category |
| GET | `/slug/:slug` | No | - | Get by slug |
| GET | `/:id/products` | No | - | Get products by category |

---

## Coupon APIs (`/coupons`)

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin | List coupons |
| GET | `/:id` | Admin | Get coupon |
| POST | `/` | Admin | Create coupon |
| PUT | `/:id` | Admin | Update coupon |
| DELETE | `/:id` | Admin | Delete coupon |

### Public Endpoints

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| GET | `/validate/:code` | 5/min | Validate coupon code |

---

## Blog APIs (`/blogs`)

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | List blog posts |
| GET | `/search` | No | Search blogs |
| GET | `/tags` | No | Get all tags |
| GET | `/slug/:slug` | No | Get by slug |
| GET | `/:id` | No | Get post |
| GET | `/:id/related` | No | Related posts |
| GET | `/:id/comments` | No | Get comments |

### Authenticated Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/capabilities` | Yes | Get capabilities |
| POST | `/:id/comment` | Yes | Add comment |

### Editor/Admin Endpoints

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/` | Yes | Editor, Admin | Create post |
| PUT | `/:id` | Yes | Editor, Admin | Update post |
| POST | `/:id/publish` | Yes | Editor, Admin | Publish post |
| POST | `/:id/archive` | Yes | Editor, Admin | Archive post |
| DELETE | `/:id` | Yes | Admin | Delete post |
| GET | `/admin/analytics` | Yes | Admin | Blog analytics |

---

## Review APIs (`/reviews`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/:id` | No | - | Get review |
| POST | `/:id/helpful` | Yes | Customer, Admin | Mark helpful |
| PUT | `/:id/approve` | Yes | Admin | Approve review |
| DELETE | `/:id` | Yes | Customer, Admin | Delete review |
| POST | `/products/:id/reviews` | Yes | Customer, Admin | Create review |
| GET | `/products/:id/reviews` | No | - | Get product reviews |
| GET | `/users/:userId/reviews` | No | - | Get user reviews |

---

## Customer APIs (`/customers`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | Yes | Admin | List customers |
| GET | `/:id` | Yes | Admin | Get customer |
| POST | `/` | Yes | Admin | Create customer |
| PUT | `/:id` | Yes | Admin | Update customer |
| DELETE | `/:id` | Yes | Admin | Delete customer |

---

## Search APIs (`/search`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | No | 30/min | Search products |
| GET | `/suggestions` | No | 30/min | Search suggestions |
| GET | `/filters` | No | - | Search filters |
| GET | `/sku/:sku` | No | - | Search by SKU |
| POST | `/rebuild-index` | Yes | Admin | Rebuild index |

---

## User Management APIs (`/users`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | Yes | Admin | List users |
| GET | `/:id` | Yes | Admin | Get user |
| POST | `/sync` | Yes | Admin | Sync user mapping |
| POST | `/:userId/roles` | Yes | Admin | Assign role |
| POST | `/:userId/roles/multiple` | Yes | Admin | Assign multiple roles |
| DELETE | `/:userId/roles/:roleId` | Yes | Admin | Remove role |
| GET | `/roles` | Yes | Admin, Editor | Get roles |
| GET | `/permissions` | Yes | Any | Get permissions |
| POST | `/roles` | Yes | Admin | Create role |
| DELETE | `/roles/:id` | Yes | Admin | Delete role |

---

## Tenant APIs (`/tenants`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/` | No | - | Create tenant |
| GET | `/` | Yes | Admin | List tenants |
| GET | `/current` | Yes | Any | Get current tenant |
| GET | `/:id` | Yes | Admin | Get tenant |
| PUT | `/:id` | Yes | Admin | Update tenant |
| GET | `/settings` | Yes | Any | Get settings |
| PUT | `/settings/:key` | Yes | Admin | Update setting |
| GET | `/roles` | Yes | Any | Get tenant roles |
| GET | `/my-roles` | Yes | Any | Get user roles |

---

## Upload APIs (`/upload`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/image` | Yes | Admin | Upload single image |
| POST | `/images` | Yes | Admin | Upload multiple images |

---

## Analytics APIs (`/admin/analytics`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/overview` | Yes | Admin | Dashboard overview |
| GET | `/sales` | Yes | Admin | Sales analytics |
| GET | `/products` | Yes | Admin | Product analytics |
| GET | `/revenue` | Yes | Admin | Revenue analytics |

---

## Warehouse APIs (`/admin/warehouses`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/` | Yes | Admin | Create warehouse |
| GET | `/` | Yes | Admin | List warehouses |
| GET | `/:id` | Yes | Admin | Get warehouse |
| PUT | `/:id` | Yes | Admin | Update warehouse |
| DELETE | `/:id` | Yes | Admin | Delete warehouse |
| POST | `/:id/stock` | Yes | Admin | Add stock |
| GET | `/variants/:variantId/inventory` | Yes | Admin | Get variant inventory |
| GET | `/inventory/low-stock` | Yes | Admin | Low stock alerts |

---

## Notification APIs (`/notifications`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/` | Yes | Customer, Admin | Get notifications |
| GET | `/unread-count` | Yes | Customer, Admin | Unread count |
| PUT | `/:id/read` | Yes | Customer, Admin | Mark as read |
| PUT | `/read-all` | Yes | Customer, Admin | Mark all read |

---

## Fraud Detection APIs (`/admin/fraud`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/flagged-orders` | Yes | Admin | Get flagged orders |
| POST | `/orders/:id/unflag` | Yes | Admin | Unflag order |
| GET | `/statistics` | Yes | Admin | Fraud statistics |

---

## Recommendation APIs (`/recommendations`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/:id` | No | - | Get recommendations |
| GET | `/personal` | Yes | Customer, Admin | Personalized recommendations |
| DELETE | `/cache/:productId` | Yes | Admin | Clear cache |

---

## Rate Limiting Summary

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| Coupon validation | 5 requests | 1 minute |
| Cart operations | 30 requests | 1 minute |
| Search | 30 requests | 1 minute |
| Reviews | 5 requests | 1 hour |
| General API | 100 requests | 1 minute |
| Auth endpoints | 20 requests | 15 minutes |

---

## Authentication Requirements Summary

### Public Endpoints (No Auth Required)

- GET `/products`
- GET `/products/:id`
- GET `/categories`
- GET `/categories/:id`
- GET `/categories/slug/:slug`
- GET `/blogs`
- GET `/blogs/:id`
- GET `/blogs/search`
- GET `/blogs/tags`
- GET `/blogs/:id/related`
- GET `/blogs/:id/comments`
- GET `/reviews/products/:id/reviews`
- GET `/reviews/users/:userId/reviews`
- GET `/reviews/:id`
- GET `/search`
- GET `/search/suggestions`
- GET `/search/filters`
- GET `/search/sku/:sku`
- GET `/recommendations/:id`
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/coupons/validate/:code`
- POST `/tenants` (public in dev)
- POST `/webhooks/*`

### Customer Auth Required

- GET `/cart`
- POST `/cart/add`
- PUT `/cart/item/:id`
- DELETE `/cart/item/:id`
- DELETE `/cart`
- POST `/orders`
- GET `/orders/my`
- GET `/orders/:id`
- POST `/orders/my/:id/cancel`
- GET `/notifications`
- GET `/notifications/unread-count`
- PUT `/notifications/:id/read`
- PUT `/notifications/read-all`
- POST `/reviews/products/:id/reviews`
- DELETE `/reviews/:id`
- POST `/reviews/:id/helpful`
- GET `/recommendations/personal`

### Admin Only

- All `/admin/*` endpoints
- POST `/products`
- PUT `/products/:id`
- DELETE `/products/:id`
- POST `/categories`
- PUT `/categories/:id`
- DELETE `/categories/:id`
- POST `/coupons`
- PUT `/coupons/:id`
- DELETE `/coupons/:id`
- GET `/customers`
- POST `/customers`
- PUT `/customers/:id`
- DELETE `/customers/:id`
- POST `/upload/image`
- POST `/upload/images`
- GET `/users`
- POST `/users/:userId/roles`
- DELETE `/users/:userId/roles/:roleId`
- POST `/users/roles`
- DELETE `/users/roles/:id`
- GET `/tenants`
- PUT `/tenants/:id`
- POST `/search/rebuild-index`
- DELETE `/recommendations/cache/:productId`

### Editor Access

- POST `/products`
- PUT `/products/:id`
- POST `/categories`
- PUT `/categories/:id`
- POST `/blogs`
- PUT `/blogs/:id`
- POST `/blogs/:id/publish`
- POST `/blogs/:id/archive`
- GET `/users/roles`
- GET `/users/permissions`
- PUT `/tenants/settings/:key`

---

**End of Backend API Map**
