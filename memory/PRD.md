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
- MySQL Database: ❌ Not available in this environment (required for product/cart data)
- MongoDB: ✅ Running (for auth/user data)

### Known Limitations:
The backend requires MySQL for products, categories, orders, inventory etc.
In this preview environment, MySQL is not configured, so product listings and cart functionality return 500 errors.

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

### P1 (Important)
- [ ] Create frontend service for Customer management API
- [ ] Create frontend service for AI Collaboration API
- [ ] Environment setup fixes (supervisor config for Node.js backend)

### P2 (Nice to Have)
- [ ] Standardize review route patterns
- [ ] Add comprehensive OpenAPI/Swagger documentation
- [ ] Remove duplicate route patterns

## Environment Issues (Blocking Live Testing)
1. Supervisor configured for Python backend but actual backend is Node.js
2. Missing `.env` files for both frontend and backend
3. Frontend uses Vite (`yarn dev`) but supervisor tries `yarn start`

## Next Steps
1. Set up proper environment variables
2. Configure supervisor for Node.js backend
3. Run live API testing to verify fixes
