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

### January 2026 - API Audit & Route Fixes
1. **Comprehensive API audit** - Analyzed 21 backend route files and 10 frontend service files
2. **Fixed critical route ordering issues:**
   - `users.route.js` - `/roles`, `/permissions` now before `/:id`
   - `recommendation.route.js` - `/personal` now before `/:id`
   - `tenants.route.js` - `/settings`, `/roles`, `/my-roles` now before `/:id`
   - `warehouse.route.js` - `/variants/:variantId/inventory`, `/inventory/low-stock` now before `/:id`
3. **Created API Audit Report** at `/app/API_AUDIT_REPORT.md`

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
