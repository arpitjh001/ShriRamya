# ShriRamya Ecommerce Platform - Phase 9

## Production-Grade Ecommerce Platform Features

This document describes the enterprise-level systems added to transform the platform into a production-grade ecommerce solution similar to Shopify.

---

## 📋 Table of Contents

1. [Coupons & Promotion Engine](#1-coupons--promotion-engine)
2. [Multi-Warehouse Inventory](#2-multi-warehouse-inventory)
3. [Advanced Product Search](#3-advanced-product-search)
4. [Product Review & Rating System](#4-product-review--rating-system)
5. [Recommendation Engine](#5-recommendation-engine)
6. [Image Optimization System](#6-image-optimization-system)
7. [CDN-Ready Image URLs](#7-cdn-ready-image-urls)
8. [Background Job Queue](#8-background-job-queue)
9. [Caching Layer](#9-caching-layer)
10. [Analytics Engine](#10-analytics-engine)
11. [Notification System](#11-notification-system)
12. [Fraud Detection](#12-fraud-detection)
13. [Rate Limiting](#13-rate-limiting)
14. [Security Hardening](#14-security-hardening)
15. [API Documentation](#15-api-documentation)
16. [Docker Production](#16-docker-production-optimization)

---

## 1️⃣ Coupons & Promotion Engine

### Database Table: `coupons`
- `id`, `code`, `type`, `value`, `min_cart_value`, `max_discount`
- `usage_limit`, `used_count`, `starts_at`, `expires_at`, `status`
- `applicable_products`, `applicable_categories`, `buy_x_qty`, `get_y_qty`

### Coupon Types
- `percentage` - Percentage discount (e.g., 20% off)
- `flat` - Fixed amount discount (e.g., ₹500 off)
- `free_shipping` - Free shipping
- `buy_x_get_y` - Buy X get Y free

### API Endpoints
```
POST   /api/v1/admin/coupons              - Create coupon
GET    /api/v1/admin/coupons              - List all coupons
GET    /api/v1/admin/coupons/:id          - Get coupon by ID
PUT    /api/v1/admin/coupons/:id          - Update coupon
DELETE /api/v1/admin/coupons/:id          - Delete coupon
POST   /api/v1/cart/apply-coupon          - Apply coupon to cart
POST   /api/v1/cart/remove-coupon         - Remove coupon from cart
```

### Validation Rules
- Expiry date check
- Usage limit check
- Minimum cart value check
- Product/category eligibility

---

## 2️⃣ Multi-Warehouse Inventory

### Database Tables
**warehouses**
- `id`, `name`, `city`, `country`, `address`, `latitude`, `longitude`, `is_active`

**warehouse_inventory**
- `variant_id`, `warehouse_id`, `stock`, `reserved_stock`

### Features
- Nearest warehouse allocation
- Stock reservation during order
- Multi-warehouse stock tracking
- Low stock alerts

### API Endpoints
```
POST   /api/v1/admin/warehouses           - Create warehouse
GET    /api/v1/admin/warehouses           - List warehouses
GET    /api/v1/admin/warehouses/:id       - Get warehouse
PUT    /api/v1/admin/warehouses/:id       - Update warehouse
DELETE /api/v1/admin/warehouses/:id       - Delete warehouse
POST   /api/v1/admin/warehouses/:id/stock - Add stock
GET    /api/v1/admin/inventory/low-stock  - Low stock alerts
```

---

## 3️⃣ Advanced Product Search Engine

### Features
- FULLTEXT search optimization
- Multi-filter support (category, attributes, price range)
- Search suggestions/autocomplete
- Search result caching

### API Endpoints
```
GET /api/v1/search?q=saree&color=red&price_min=1000
GET /api/v1/search/suggestions?q=sar
GET /api/v1/search/filters
GET /api/v1/search/sku/:sku
POST /api/v1/search/rebuild-index (Admin)
```

### Example Usage
```bash
# Search with filters
GET /api/v1/search?q=saree&category=clothing&color=red&price_min=1000&price_max=5000

# Get suggestions
GET /api/v1/search/suggestions?q=sar

# Search by SKU
GET /api/v1/search/sku/SAREE-001
```

---

## 4️⃣ Product Review & Rating System

### Database Table: `reviews`
- `id`, `product_id`, `user_id`, `rating`, `review_text`
- `is_verified_purchase`, `is_approved`, `helpful_count`

### Features
- Verified purchase validation
- Rating distribution
- Average rating calculation
- Helpful vote system

### API Endpoints
```
POST   /api/v1/products/:id/reviews      - Create review
GET    /api/v1/products/:id/reviews      - Get product reviews
GET    /api/v1/users/:userId/reviews     - Get user reviews
PUT    /api/v1/reviews/:id/approve       - Approve review (Admin)
POST   /api/v1/reviews/:id/helpful       - Mark as helpful
DELETE /api/v1/reviews/:id               - Delete review
```

---

## 5️⃣ Recommendation Engine

### Strategies
- **related** - Related products
- **same_category** - Same category products
- **similar_attributes** - Similar attributes
- **top_selling** - Top selling products
- **all** - Combined strategy with scoring

### API Endpoints
```
GET /api/v1/products/:id/recommendations?strategy=all&limit=10
GET /api/v1/recommendations/personal?limit=10 (Authenticated)
DELETE /api/v1/recommendations/cache/:productId (Admin)
```

---

## 6️⃣ Image Optimization System

### Features
- Automatic image resizing
- Thumbnail generation
- WebP conversion
- Quality optimization

### Generated Sizes
- `thumbnail` - 300x300
- `medium` - 800x800
- `large` - 1600x1600
- `original` - Original size

### API Endpoints
```
POST /api/v1/upload/image          - Upload single image
POST /api/v1/upload/images         - Upload multiple images
DELETE /api/v1/upload/image/:url   - Delete image
GET  /api/v1/upload/cdn-url/:filename - Get CDN URL
POST /api/v1/upload/placeholder    - Generate placeholder
```

---

## 7️⃣ CDN-Ready Image URLs

### Configuration
```env
CDN_BASE_URL=https://cdn.shriramya.com
```

### URL Format
```
https://cdn.shriramya.com/uploads/images/products_image_thumb.webp
https://cdn.shriramya.com/uploads/images/products_image_med.webp
https://cdn.shriramya.com/uploads/images/products_image_lg.webp
```

---

## 8️⃣ Background Job Queue

### Technology: BullMQ + Redis

### Job Types
- `email` - Send emails
- `image-processing` - Generate thumbnails
- `analytics` - Aggregate statistics
- `notifications` - Multi-channel notifications
- `stock-alerts` - Low stock alerts

### Usage
```javascript
const { addEmailJob } = require('./src/services/queue/jobQueue.service');

// Add email job
await addEmailJob('send-order-confirmation', {
  userId,
  orderId,
  email,
  orderData
});
```

---

## 9️⃣ Caching Layer

### Technology: Redis

### Cached Data
- Product listings (5 min TTL)
- Search results (5 min TTL)
- Recommendations (1 hour TTL)
- Analytics (5 min TTL)

### Cache Invalidation
- Automatic on product update
- Manual via admin endpoints

---

## 🔟 Analytics Engine

### Metrics
- Daily revenue
- Top products
- Conversion rate
- Orders per day
- Average order value

### API Endpoints (Admin Only)
```
GET /api/v1/admin/analytics/overview  - Dashboard overview
GET /api/v1/admin/analytics/sales     - Sales analytics
GET /api/v1/admin/analytics/products  - Product analytics
GET /api/v1/admin/analytics/revenue   - Revenue analytics
```

---

## 1️⃣1️⃣ Notification System

### Channels
- Email (SMTP)
- SMS (Twilio/MSG91)
- Push (FCM)

### Events
- Order placed
- Order shipped
- Delivery confirmation
- Refund processed
- Low stock alert

### API Endpoints
```
GET    /api/v1/notifications          - Get user notifications
PUT    /api/v1/notifications/:id/read - Mark as read
PUT    /api/v1/notifications/read-all - Mark all as read
GET    /api/v1/notifications/unread-count - Unread count
```

---

## 1️⃣2️⃣ Fraud Detection

### Rules
- Multiple orders quickly (3+ in 60 min)
- Mismatched billing/shipping country
- Unusually high order value (₹50,000+)
- First-time customer with high value
- COD with high value
- Suspicious email patterns

### Database Columns (orders)
- `is_flagged` - Boolean
- `fraud_score` - Integer (0-100)
- `fraud_reasons` - JSON

### API Endpoints (Admin Only)
```
GET /api/v1/admin/fraud/flagged-orders  - Get flagged orders
POST /api/v1/admin/fraud/orders/:id/unflag - Unflag order
GET /api/v1/admin/fraud/statistics      - Fraud statistics
```

---

## 1️⃣3️⃣ Rate Limiting

### Limits by Endpoint Type
- **Auth endpoints**: 20 requests / 15 min
- **General API**: 100 requests / min
- **Search**: 30 requests / min
- **Uploads**: 20 requests / 15 min
- **Reviews**: 5 requests / hour
- **Coupons**: 10 requests / 15 min

### Redis-backed for distributed systems

---

## 1️⃣4️⃣ Security Hardening

### Implemented
- ✅ Helmet security headers
- ✅ CORS restrictions
- ✅ JWT expiry (15 min access, 7 days refresh)
- ✅ Password hashing (bcrypt)
- ✅ Input sanitization (Joi validation)
- ✅ SQL injection protection (parameterized queries)
- ✅ Token blacklisting
- ✅ Device binding

---

## 1️⃣5️⃣ API Documentation

### Swagger/OpenAPI
- Auto-generated documentation
- Interactive API explorer
- Available at: `/api/docs` (development only)
- JSON spec: `/api/docs.json`

### Access
```
http://localhost:8000/api/docs
```

---

## 1️⃣6️⃣ Docker Production Optimization

### Features
- Multi-stage builds
- Non-root user
- Dumb-init for signal handling
- NGINX reverse proxy
- Gzip compression
- Static file caching
- Health checks
- Auto-restart policies

### Services
- NGINX (Reverse Proxy)
- Node.js Backend (Cluster: 3 replicas)
- MySQL 8.0
- Redis 7
- MongoDB 7
- BullMQ Dashboard (optional)
- Prometheus (optional)
- Grafana (optional)

### Commands
```bash
# Build production image
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npm run migrate
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Start Production (Docker)
```bash
npm run docker:up
```

---

## 📁 New File Structure

```
backend_node/
├── src/
│   ├── config/
│   │   ├── swagger.js          # API documentation
│   │   └── config.js           # Updated with CDN, SMTP, SMS
│   ├── controllers/
│   │   ├── search.controller.js
│   │   ├── review.controller.js
│   │   ├── recommendation.controller.js
│   │   ├── analytics.controller.js
│   │   ├── warehouse.controller.js
│   │   ├── notification.controller.js
│   │   ├── fraud.controller.js
│   │   └── upload.controller.js (enhanced)
│   ├── services/
│   │   ├── search/
│   │   │   └── search.service.js
│   │   ├── review/
│   │   │   └── review.service.js
│   │   ├── recommendations/
│   │   │   └── recommendationEngine.service.js
│   │   ├── images/
│   │   │   └── imageOptimization.service.js
│   │   ├── inventory/
│   │   │   └── warehouseAllocator.service.js
│   │   ├── analytics/
│   │   │   └── analytics.service.js
│   │   ├── notifications/
│   │   │   └── notification.service.js
│   │   ├── fraud/
│   │   │   └── fraudDetection.service.js
│   │   ├── queue/
│   │   │   └── jobQueue.service.js
│   │   ├── email/
│   │   │   └── email.service.js
│   │   └── coupon.service.js (enhanced)
│   ├── routes/v1/
│   │   ├── search.route.js
│   │   ├── review.route.js
│   │   ├── recommendation.route.js
│   │   ├── analytics.route.js
│   │   ├── warehouse.route.js
│   │   ├── notification.route.js
│   │   └── fraud.route.js
│   ├── middlewares/
│   │   └── rateLimit.middleware.js (enhanced)
│   ├── utils/
│   │   └── dbMigration.js
│   └── app.js (updated with Swagger)
├── Dockerfile.production
├── nginx.conf
├── docker-compose.production.yml
└── package.json (updated)
```

---

## 📊 Database Schema Summary

### New Tables
1. `coupons` - Promotion codes
2. `warehouses` - Warehouse locations
3. `warehouse_inventory` - Per-warehouse stock
4. `reviews` - Product reviews
5. `recommendations_cache` - Cached recommendations
6. `search_index` - FULLTEXT search index
7. `notifications` - Notification log
8. `background_jobs` - Job queue tracking
9. `analytics_daily_stats` - Daily analytics
10. `analytics_product_performance` - Product metrics
11. `cart_coupons` - Cart-coupon mapping
12. `email_templates` - Email templates
13. `sms_templates` - SMS templates
14. `api_rate_limits` - Rate limit tracking
15. `product_attributes_index` - Attribute search index

---

## 🔐 Environment Variables

### New Variables
```env
# CDN
CDN_BASE_URL=https://cdn.shriramya.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@shriramya.com
SMTP_PASS=your_password

# SMS
SMS_PROVIDER=twilio
SMS_API_KEY=your_api_key
SMS_SENDER_ID=ShriRamya

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin123
```

---

## 📈 Monitoring

### Metrics Available
- Queue job counts (pending, active, completed, failed)
- Cache hit/miss rates
- API response times
- Database query performance
- Error rates

### Dashboards
- BullMQ Dashboard: `http://localhost:3000`
- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`

---

## ✅ Testing

### Run Migrations
```bash
npm run migrate
```

### Start Queue Processor
```bash
npm run queue:process
```

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

---

## 🎯 Production Checklist

- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure CDN
- [ ] Set up email provider
- [ ] Set up SMS provider
- [ ] Configure monitoring dashboards
- [ ] Enable Docker health checks
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Test fraud detection rules
- [ ] Review rate limit settings

---

## 📞 Support

For issues or questions, contact: support@shriramya.com

---

**Version:** 2.0.0  
**Last Updated:** 2024  
**Platform:** ShriRamya Ecommerce
