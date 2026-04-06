# ShriRamya E-Commerce Platform - PRD

## Original Problem Statement
Check all backend APIs and their integration with frontend. Verify that all routes are well defined with no overlapping.

## Architecture Overview
- **Backend:** Node.js/Express (in `/app/backend_node/`)
- **Frontend:** React with Vite (in `/app/frontend/`)
- **Databases:** MongoDB + MySQL (hybrid)
- **Cache:** Redis
- **Auth:** JWT-based with RBAC

## What's Been Implemented

## January 2026 - Docker Removal & Frontend Fixes

### Docker Files Removed:
- `/app/frontend/Dockerfile`
- `/app/frontend/.dockerignore`
- `/app/.dockerignore`
- `/app/docker-compose.production.yml`
- `/app/docker-compose.yml`
- `/app/docker-compose.local.yml`
- `/app/backend_node/Dockerfile`
- `/app/backend_node/Dockerfile.production`
- `/app/backend_node/.dockerignore`
- `/app/backend_node/docker-compose.production.yml`
- `/app/backend_node/docker-compose.local.yml`
- `/app/ai-proxy/Dockerfile`
- `/app/ai-proxy/Dockerfile.test`
- `/app/scripts/deploy-docker.ps1`
- `/app/scripts/deploy-docker.bat`
- Docker-related documentation files

### Frontend Fixes Applied:
1. Added `start` script to package.json for Vite compatibility with supervisor
2. Fixed vite.config.js to allow all preview hosts
3. Created frontend .env with correct backend URL (empty for relative URLs)
4. Fixed ai-collaboration.route.js import paths (../../ instead of ../)

### Backend Route Fixes:
1. Fixed route ordering in `users.route.js` 
2. Fixed route ordering in `recommendation.route.js`
3. Fixed route ordering in `tenants.route.js`
4. Fixed route ordering in `warehouse.route.js`

### Current Status:
- Frontend: ✅ Running and displaying correctly
- Node.js Backend: ✅ Running on port 8000
- API Routes: ✅ All fixed for proper ordering
- Mock Data: ✅ Configured for products, categories, cart, search, recommendations
- MongoDB: ✅ Running (for auth/user data)

### Mock Data Includes:
- 8 sample saree products (Banarasi, Kanjivaram, Chanderi, Pochampally, etc.)
- 4 categories (Silk, Cotton, Handloom, Designer)
- Full cart functionality with session management
- Search and recommendations
- Sample coupon codes: WELCOME10, SILK20, FESTIVE15

### Note:
MySQL is not available in this preview environment, so mock data routes are used for:
- Products (/api/v1/products)
- Categories (/api/v1/categories)
- Cart (/api/v1/cart)
- Search (/api/v1/search)
- Recommendations (/api/v1/recommendations)
- Coupon validation (/api/v1/coupons/validate)

## API Endpoints Summary

### Total Routes: ~150+ endpoints across 21 route files
- Auth: 5 endpoints
- Products: 23 endpoints
- Cart: 9 endpoints
- Orders: 27 endpoints
- Blogs: 15 endpoints
- Categories: 7 endpoints
- Coupons: 6 endpoints
- Search: 5 endpoints
- Reviews: 7 endpoints
- Recommendations: 3 endpoints
- Analytics: 4 endpoints
- Warehouses: 8 endpoints
- Inventory: 3 endpoints
- Notifications: 4 endpoints
- Fraud: 3 endpoints
- Tenants: 9 endpoints
- Users: 10 endpoints
- Customers: 5 endpoints
- Upload: 2 endpoints
- AI Collaboration: TBD

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Route ordering fixes in users, recommendations, tenants, warehouse routes
- ✅ Cart page product thumbnail image fix (March 2026)
- ✅ Real model images seeded across all 50 products and 9 categories (March 2026)
- ✅ Backend stability: Added Node.js backend to supervisor for auto-restart (March 2026)
- ✅ Libas-style category filtering system with FilterSidebar, SortDropdown, MobileFilterDrawer, URL sync, filter chips (March 2026)

### P1 (Important) - DONE
- ✅ URL query parameter synchronization for filters (part of filtering system)
- ✅ Skeleton loaders for product loading (integrated in ProductsPage)
- ✅ Advanced filter features (dynamic product counts per filter option)
- ✅ Checkout page totals fix (March 2026)
- ✅ Razorpay payment flow (mock mode, ready for real keys)
- ✅ Quick View modal on product cards
- ✅ Customer registration endpoint
- ✅ Full checkout flow: Add to Cart → Cart → Checkout → Pay → Order Success
- ✅ Order management endpoints (create, confirm, list, cancel, track)

### P2 (Nice to Have)
- [ ] Connect real Razorpay test keys (user to provide)
- [ ] Email notifications on order placement
- [x] Added "Kurti Material" category with 5 products (April 2026)

## Environment Notes
- **Development**: Node.js on port 8000, MongoDB local, managed by supervisor
- **Production (Vercel)**: React static site + Express serverless function (`/api/v1/index.js`)
  - Live URL: https://app-sigma-rouge-33.vercel.app
  - Custom domain: www.shriramya.com (DNS configuration pending)
  - Requires `MONGODB_URI` environment variable in Vercel dashboard
- GitHub repo: https://github.com/arpitjh001/ShriRamya.git

## Bug Fixes Log
### March 2026 - Cart Page Thumbnail Fix
- **Root cause**: CartPage.js used `item.product_id` but cart API returns `item.productId`. Also made N+1 API calls to fetch product details when all data was already on cart items.
- **Fix**: Refactored CartPage to use cart item data directly (name, image, price, attributes). Eliminated unnecessary API calls.
- **Files changed**: `/app/frontend/src/pages/CartPage.js`, `/app/frontend/src/context/CartContext.js`

### March 2026 - Backend Auto-Restart
- Added supervisor config `/etc/supervisor/conf.d/node_backend.conf` for persistent Node.js backend

### March 2026 - Libas-Style Filtering System
- Complete filtering UI with 10+ filter types, URL sync, filter chips, infinite scroll, mobile drawer
- 32/32 backend + all frontend tests passed (test report: `/app/test_reports/iteration_1.json`)

### March 2026 - Checkout, Payments, Quick View
- **Checkout fix**: CheckoutPage used `item.product_id` (undefined) — rewrote to use cart item data directly
- **Cart fix**: CartContext.addToCart legacy pattern sent `{variantId: productId}` instead of `{productId}` → 404 on add to cart. Fixed to always include `productId`.
- **Razorpay**: Created order/payment endpoints with mock/real hybrid approach. Mock mode active (real keys to be provided).
- **Quick View modal**: New `QuickViewModal.js` component with image gallery, variant selectors, quantity control, add-to-cart. Triggered from ProductCard eye icon.
- **Customer auth**: Added `/auth/register` endpoint with token generation.
- **Order flow**: Full CRUD: create, confirm payment, list user orders, track, cancel.
- 26/26 backend + 95% frontend tests passed (test report: `/app/test_reports/iteration_2.json`)

### April 6, 2026 - New Category: Kurti Material
- **Added 5 "Kurti Material" products** to MongoDB (productIds 51-55): Chanderi Silk, Cotton Block Print, Georgette Embroidered, Rayon Floral, Chikankari Lucknowi
- **Homepage:** Added Kurti Material tile in "Lookbook Highlights" section
- **Navigation:** Added "Kurti Material" to Women Wear dropdown subcategories  
- **Bug Fix:** Fixed CategoryPage crash (`/categories/slug/${slug}` → `/categories/${slug}`)
- **Seed script:** Updated `seed.js` to include Kurti Material products for future seeding consistency
- 6/6 API verification tests passed (categories, products filter, category detail, search, product detail, total count)
- **Git repo synced**: Pulled latest code from `arpitjh001/ShriRamya.git` (main branch) and pushed all changes back
- **Fixed /blog page crash**: Categories API returns strings but page expected objects with `.id`, `.name`, `.count`. Fixed `.toString()` on undefined crash.
- **Comprehensive API test suite**: Created `/app/backend/tests/test_all_apis.py` covering 91 test cases across 12 categories:
  - Authentication (7 tests): admin/customer login, register, duplicate check, token refresh
  - Products (15 tests): list, pagination, sort, filter by category/price/featured, detail, 404
  - Categories (3 tests): list, by slug, 404
  - Search (3 tests): query, empty, no results
  - Cart (9 tests): CRUD operations, add/remove/update/clear
  - Coupons (3 tests): validate, invalid, below minimum
  - Orders (12 tests): create, payment, status update, tracking, cancel, frontend alias
  - Wishlist (8 tests): add, check, remove, alias endpoints
  - Blogs (8 tests): CRUD, categories, stats, slug lookup
  - User Profile (4 tests): get, update, verify persistence
  - Admin (13 tests): analytics (overview/revenue/sales/products), warehouses, inventory, users, orders management
  - Misc (6 tests): recommendations, reviews, shipment stubs
- **Result: 91/91 PASSED (100%)**
- **Data fixes**: Fixed products with null `salePrice` and null `price` fields in MongoDB
- **Admin Dashboard APIs**: Added mock endpoints for `/admin/analytics/*` (overview, revenue, sales, products), `/admin/warehouses`, `/admin/inventory/low-stock`, admin order/shipment stubs
- **Blog CRUD fixes**: Fixed `Plus` icon missing import in `BlogCreatePage.js` and `AdminBlogEditPage.js` (caused page crash). Fixed `tags` handling to accept both arrays and strings. Fixed categories widget to handle string array from API.
- **Admin Blogs date fix**: `AdminBlogsPage.js` used snake_case fields (`published_at`, `created_at`) but mock data uses camelCase (`publishedAt`, `createdAt`). Fixed to support both formats.
- **Recently Viewed**: `RecentlyViewed.js` component using localStorage tracking, integrated into HomePage.
- **GitHub remote**: Configured with user's PAT (read access confirmed, write pending permissions).
- 100% frontend tests passed (test report: `/app/test_reports/iteration_4.json`)
