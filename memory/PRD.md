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

### P1 (Important) - IN PROGRESS
- [ ] URL query parameter synchronization for filters ✅ DONE (part of filtering system)
- [ ] Skeleton loaders for product loading ✅ DONE (integrated in ProductsPage)
- [ ] Advanced filter features (dynamic product counts per filter option) ✅ DONE (counts show next to each filter option)

### P2 (Nice to Have)
- [ ] Full user checkout flow testing
- [ ] Customer management frontend
- [ ] Non-admin user auth & account management
- [ ] Replace mock data with real database (MySQL/Redis dependency)

## Environment Notes
- Backend: Node.js on port 8000, proxied through FastAPI on port 8001, managed by supervisor (node_backend)
- Mock data layer active (MySQL/Redis unavailable)
- Frontend: React/Vite on port 3000

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
