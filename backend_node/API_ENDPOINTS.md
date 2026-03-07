# ShriRamya Ecommerce Platform - Complete API Endpoints

## Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.shriramya.com/api/v1
```

---

## Table of Contents
1. [Authentication](#authentication)
2. [Products](#products)
3. [Categories](#categories)
4. [Orders](#orders)
5. [Cart](#cart)
6. [Coupons](#coupons)
7. [Search](#search)
8. [Reviews](#reviews)
9. [Recommendations](#recommendations)
10. [Customers](#customers)
11. [Analytics (Admin)](#analytics-admin)
12. [Warehouses (Admin)](#warehouses-admin)
13. [Fraud Detection (Admin)](#fraud-detection-admin)
14. [Notifications](#notifications)
15. [Upload](#upload)
16. [Blog](#blog)
17. [Health](#health)

---

## Authentication

### Register User
```
POST /api/v1/auth/register
Body: { name, email, password, phone }
```

### Login
```
POST /api/v1/auth/login
Body: { email, password }
```

### Refresh Tokens
```
POST /api/v1/auth/refresh
Body: { refresh_token }
```

### Logout
```
POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
```

### Get Current User
```
GET /api/v1/auth/me
Headers: Authorization: Bearer <token>
```

---

## Products

### List Products
```
GET /api/v1/products
Query: page, per_page, category, sort, status
```

### Get Product
```
GET /api/v1/products/:id
```

### Create Product (Admin)
```
POST /api/v1/products
Headers: Authorization: Bearer <admin-token>
Body: { name, description, basePrice, status, variants, categories }
```

### Update Product (Admin)
```
PUT /api/v1/products/:id
Headers: Authorization: Bearer <admin-token>
Body: { name, description, basePrice, status, variants, categories }
```

### Delete Product (Admin)
```
DELETE /api/v1/products/:id
Headers: Authorization: Bearer <admin-token>
```

### Add Variant (Admin)
```
POST /api/v1/products/:id/variants
Headers: Authorization: Bearer <admin-token>
Body: { sku, price, stock, attributes, image }
```

### Update Variant (Admin)
```
PUT /api/v1/products/:id/variants/:variant_id
Headers: Authorization: Bearer <admin-token>
Body: { sku, price, stock, attributes, image }
```

### Delete Variant (Admin)
```
DELETE /api/v1/products/:id/variants/:variant_id
Headers: Authorization: Bearer <admin-token>
```

### Product Categories
```
POST   /api/v1/products/:product_id/categories      - Assign categories
GET    /api/v1/products/:product_id/categories      - Get categories
DELETE /api/v1/products/:product_id/categories/:id  - Remove category
```

---

## Categories

### List Categories
```
GET /api/v1/categories
```

### Get Category
```
GET /api/v1/categories/:id
```

### Create Category (Admin)
```
POST /api/v1/categories
Headers: Authorization: Bearer <admin-token>
Body: { name, slug, description, parent_id }
```

### Update Category (Admin)
```
PUT /api/v1/categories/:id
Headers: Authorization: Bearer <admin-token>
Body: { name, slug, description, parent_id }
```

### Delete Category (Admin)
```
DELETE /api/v1/categories/:id
Headers: Authorization: Bearer <admin-token>
```

---

## Orders

### List Orders
```
GET /api/v1/orders
Query: page, per_page, status, user_id
```

### Get Order
```
GET /api/v1/orders/:id
```

### Create Order
```
POST /api/v1/orders
Headers: Authorization: Bearer <token>
Body: { cart_id, shipping_address, billing_address, payment_method }
```

### Update Order Status (Admin)
```
PUT /api/v1/orders/:id/status
Headers: Authorization: Bearer <admin-token>
Body: { status }
```

### Cancel Order
```
POST /api/v1/orders/:id/cancel
Headers: Authorization: Bearer <token>
```

### Request Refund
```
POST /api/v1/orders/:id/refund
Headers: Authorization: Bearer <token>
Body: { reason, amount }
```

---

## Cart

### Get Cart
```
GET /api/v1/cart
```

### Add to Cart
```
POST /api/v1/cart/items
Headers: Authorization: Bearer <token> (for logged-in users)
Body: { variant_id, quantity }
```

### Update Cart Item
```
PUT /api/v1/cart/items/:cart_item_id
Body: { quantity }
```

### Remove from Cart
```
DELETE /api/v1/cart/items/:cart_item_id
```

### Clear Cart
```
DELETE /api/v1/cart/clear
```

### Apply Coupon
```
POST /api/v1/cart/apply-coupon
Body: { coupon_code }
```

### Remove Coupon
```
POST /api/v1/cart/remove-coupon
```

---

## Coupons

### List Coupons (Admin)
```
GET /api/v1/admin/coupons
Query: page, per_page, status, type, search
```

### Get Coupon (Admin)
```
GET /api/v1/admin/coupons/:id
```

### Create Coupon (Admin)
```
POST /api/v1/admin/coupons
Headers: Authorization: Bearer <admin-token>
Body: { code, type, value, min_cart_value, max_discount, usage_limit, starts_at, expires_at }
```

### Update Coupon (Admin)
```
PUT /api/v1/admin/coupons/:id
Headers: Authorization: Bearer <admin-token>
Body: { code, type, value, min_cart_value, max_discount, usage_limit, starts_at, expires_at }
```

### Delete Coupon (Admin)
```
DELETE /api/v1/admin/coupons/:id
Headers: Authorization: Bearer <admin-token>
```

---

## Search

### Search Products
```
GET /api/v1/search
Query: q, category, color, size, fabric, price_min, price_max, min_rating, in_stock, sort, page, per_page
```

### Get Suggestions
```
GET /api/v1/search/suggestions
Query: q, limit
```

### Get Search Filters
```
GET /api/v1/search/filters
Query: q, category
```

### Search by SKU
```
GET /api/v1/search/sku/:sku
```

### Rebuild Search Index (Admin)
```
POST /api/v1/search/rebuild-index
Headers: Authorization: Bearer <admin-token>
```

---

## Reviews

### Create Review
```
POST /api/v1/products/:id/reviews
Headers: Authorization: Bearer <token>
Body: { rating, review_text }
```

### Get Product Reviews
```
GET /api/v1/products/:id/reviews
Query: page, per_page, rating, verified_only, sort
```

### Get User Reviews
```
GET /api/v1/users/:userId/reviews
Query: page, per_page
```

### Get Review
```
GET /api/v1/reviews/:id
```

### Approve Review (Admin)
```
PUT /api/v1/reviews/:id/approve
Headers: Authorization: Bearer <admin-token>
Body: { approved: true/false }
```

### Mark Review Helpful
```
POST /api/v1/reviews/:id/helpful
Headers: Authorization: Bearer <token>
```

### Delete Review
```
DELETE /api/v1/reviews/:id
Headers: Authorization: Bearer <token>
```

---

## Recommendations

### Get Product Recommendations
```
GET /api/v1/products/:id/recommendations
Query: strategy (all, related, same_category, similar_attributes, top_selling), limit
```

### Get Personalized Recommendations
```
GET /api/v1/recommendations/personal
Headers: Authorization: Bearer <token>
Query: limit
```

### Clear Recommendation Cache (Admin)
```
DELETE /api/v1/recommendations/cache/:productId
Headers: Authorization: Bearer <admin-token>
```

---

## Customers

### List Customers (Admin)
```
GET /api/v1/customers
Query: page, per_page, search
```

### Get Customer (Admin)
```
GET /api/v1/customers/:id
```

### Update Customer (Admin)
```
PUT /api/v1/customers/:id
Headers: Authorization: Bearer <admin-token>
Body: { name, email, phone, role }
```

### Delete Customer (Admin)
```
DELETE /api/v1/customers/:id
Headers: Authorization: Bearer <admin-token>
```

---

## Analytics (Admin)

### Dashboard Overview
```
GET /api/v1/admin/analytics/overview
```

### Sales Analytics
```
GET /api/v1/admin/analytics/sales
Query: start_date, end_date, group_by (day, week, month)
```

### Product Analytics
```
GET /api/v1/admin/analytics/products
Query: start_date, end_date, limit, sort_by (revenue, quantity, views, rating)
```

### Revenue Analytics
```
GET /api/v1/admin/analytics/revenue
Query: start_date, end_date
```

---

## Warehouses (Admin)

### List Warehouses
```
GET /api/v1/admin/warehouses
Query: is_active, city, country
```

### Get Warehouse
```
GET /api/v1/admin/warehouses/:id
```

### Create Warehouse
```
POST /api/v1/admin/warehouses
Headers: Authorization: Bearer <admin-token>
Body: { name, city, country, address, latitude, longitude }
```

### Update Warehouse
```
PUT /api/v1/admin/warehouses/:id
Headers: Authorization: Bearer <admin-token>
Body: { name, city, country, address, latitude, longitude, is_active }
```

### Delete Warehouse
```
DELETE /api/v1/admin/warehouses/:id
Headers: Authorization: Bearer <admin-token>
```

### Add Stock to Warehouse
```
POST /api/v1/admin/warehouses/:id/stock
Headers: Authorization: Bearer <admin-token>
Body: { variant_id, quantity }
```

### Get Variant Inventory
```
GET /api/v1/admin/variants/:variantId/inventory
```

### Get Low Stock Alerts
```
GET /api/v1/admin/inventory/low-stock
Query: threshold
```

---

## Fraud Detection (Admin)

### Get Flagged Orders
```
GET /api/v1/admin/fraud/flagged-orders
Query: page, per_page, status
```

### Unflag Order
```
POST /api/v1/admin/fraud/orders/:id/unflag
Headers: Authorization: Bearer <admin-token>
Body: { notes }
```

### Get Fraud Statistics
```
GET /api/v1/admin/fraud/statistics
Query: start_date, end_date
```

---

## Notifications

### Get User Notifications
```
GET /api/v1/notifications
Query: page, per_page, type, status
```

### Get Unread Count
```
GET /api/v1/notifications/unread-count
```

### Mark as Read
```
PUT /api/v1/notifications/:id/read
Headers: Authorization: Bearer <token>
```

### Mark All as Read
```
PUT /api/v1/notifications/read-all
Headers: Authorization: Bearer <token>
```

---

## Upload

### Upload Single Image
```
POST /api/v1/upload/image
FormData: file, category
```

### Upload Multiple Images
```
POST /api/v1/upload/images
FormData: files[], category
```

### Delete Image
```
DELETE /api/v1/upload/image/:imageUrl
```

### Get CDN URL
```
GET /api/v1/upload/cdn-url/:filename
Query: size (thumbnail, medium, large, original)
```

### Generate Placeholder
```
POST /api/v1/upload/placeholder
Query: width, height, text
```

---

## Blog

### List Blog Posts
```
GET /api/v1/blog
Query: page, per_page, category, search
```

### Get Blog Post
```
GET /api/v1/blog/:id
```

### Create Blog Post (Admin)
```
POST /api/v1/blog
Headers: Authorization: Bearer <admin-token>
Body: { title, content, excerpt, category, tags, featured_image }
```

### Update Blog Post (Admin)
```
PUT /api/v1/blog/:id
Headers: Authorization: Bearer <admin-token>
Body: { title, content, excerpt, category, tags, featured_image }
```

### Delete Blog Post (Admin)
```
DELETE /api/v1/blog/:id
Headers: Authorization: Bearer <admin-token>
```

---

## Health

### Health Check
```
GET /api/v1/health
```

### API Documentation
```
GET /api/docs (Development only)
GET /api/docs.json
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "stack": "Stack trace (development only)"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth | 20 req | 15 min |
| General API | 100 req | 1 min |
| Search | 30 req | 1 min |
| Upload | 20 req | 15 min |
| Reviews | 5 req | 1 hour |
| Coupons | 10 req | 15 min |

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

**Version:** 2.0.0  
**Last Updated:** 2024
