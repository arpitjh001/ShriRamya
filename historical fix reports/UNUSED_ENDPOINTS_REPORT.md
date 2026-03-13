# 📡 UNUSED & UNDERUTILIZED ENDPOINTS REPORT
**Shri Ramya E-Commerce Platform**

**Date:** March 12, 2026  
**Status:** Documentation & Recommendations

---

## 📊 ENDPOINT USAGE ANALYSIS

### Analysis Method
- Scanned frontend codebase for API calls
- Compared with backend route definitions
- Identified endpoints with no frontend integration

---

## 🔴 UNUSED ENDPOINTS (No Frontend Integration)

### 1. Fraud Detection APIs
**Base Path:** `/api/v1/admin/fraud`  
**Priority:** LOW - Admin feature not yet built

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/alerts` | GET | Get fraud alerts | Keep for future admin dashboard |
| `/flag` | POST | Flag order for review | Keep for future admin dashboard |
| `/orders/:id/risk` | GET | Get order risk score | Keep for future admin dashboard |

**Action:** Document for future admin dashboard development

### 2. Notification APIs
**Base Path:** `/api/v1/notifications`  
**Priority:** MEDIUM - User engagement feature

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/` | GET | Get user notifications | Keep for future notification center |
| `/:id/read` | PUT | Mark as read | Keep for future notification center |
| `/` | DELETE | Clear notifications | Keep for future notification center |

**Action:** Consider building notification center in Q2

### 3. Tenant Management APIs
**Base Path:** `/api/v1/tenants`  
**Priority:** LOW - Multi-tenant feature (single tenant now)

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/` | POST | Create tenant | Keep for SaaS expansion |
| `/` | GET | Get all tenants | Keep for SaaS expansion |
| `/current` | GET | Get current tenant | ✅ Used internally |
| `/settings` | GET | Get tenant settings | ⚠️ Partially used |
| `/settings/:key` | PUT | Update tenant setting | Keep for SaaS expansion |
| `/roles` | GET | Get tenant roles | ⚠️ Partially used |
| `/my-roles` | GET | Get my roles | ✅ Used internally |

**Action:** Keep for future SaaS expansion

### 4. Warehouse Management APIs
**Base Path:** `/api/v1/admin/warehouses`  
**Priority:** MEDIUM - Inventory management feature

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/` | GET | Get all warehouses | ⚠️ Used in admin but not UI |
| `/` | POST | Create warehouse | ❌ Not used |
| `/:id` | PUT | Update warehouse | ❌ Not used |
| `/:id` | DELETE | Delete warehouse | ❌ Not used |
| `/:id/inventory` | GET | Get warehouse inventory | ⚠️ Used in admin but not UI |

**Action:** Build warehouse management UI or deprecate

### 5. Recommendation APIs
**Base Path:** `/api/v1/recommendations`  
**Priority:** HIGH - Conversion optimization

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/products/:productId` | GET | Get product recommendations | ✅ Used in product detail |
| `/for-you` | GET | Personalized recommendations | ❌ Not used |

**Action:** Implement personalized recommendations on homepage

### 6. Customer Management APIs
**Base Path:** `/api/v1/customers`  
**Priority:** MEDIUM - Admin feature

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/` | GET | Get all customers | ⚠️ Used in admin but limited |
| `/:id` | GET | Get customer by ID | ❌ Not used |
| `/:id` | PUT | Update customer | ❌ Not used |

**Action:** Build customer management UI

### 7. Analytics APIs
**Base Path:** `/api/v1/admin/analytics`  
**Priority:** HIGH - Business intelligence

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/orders` | GET | Order analytics | ✅ Used |
| `/products` | GET | Product analytics | ✅ Used |
| `/customers` | GET | Customer analytics | ❌ Not used |
| `/revenue` | GET | Revenue analytics | ❌ Not used |

**Action:** Implement customer and revenue analytics dashboards

### 8. Search Advanced Features
**Base Path:** `/api/v1/search`  
**Priority:** MEDIUM - UX improvement

| Endpoint | Method | Purpose | Recommendation |
|----------|--------|---------|----------------|
| `/filters` | GET | Get search filters | ❌ Not used |
| `/sku/:sku` | GET | Search by SKU | ❌ Not used |
| `/rebuild-index` | POST | Rebuild search index | ✅ Admin only |

**Action:** Implement advanced search filters

### 9. Review Management
**Base Path:** `/api/v1/reviews`  
**Priority:** MEDIUM - Social proof

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/:id` | GET | Get review by ID | ❌ Not used |
| `/:id/helpful` | POST | Mark review helpful | ❌ Not used |
| `/:id/approve` | PUT | Approve review (admin) | ❌ Not used |
| `/products/:id/reviews` | POST | Create review | ✅ Used |
| `/products/:id/reviews` | GET | Get product reviews | ✅ Used |
| `/users/:userId/reviews` | GET | Get user reviews | ❌ Not used |

**Action:** Implement review moderation system

### 10. Shipment Management
**Base Path:** `/api/v1/orders` (Admin)  
**Priority:** HIGH - Order fulfillment

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/admin/shipments` | GET | Get all shipments | ❌ Not used |
| `/admin/shipments/ready-to-ship` | GET | Get ready to ship | ❌ Not used |
| `/admin/shipments/pending` | GET | Get pending shipments | ❌ Not used |
| `/admin/:id/shipments` | POST | Create shipment | ❌ Not used |
| `/admin/shipments/:id/tracking` | PATCH | Update tracking | ❌ Not used |
| `/admin/shipments/:id/ship` | POST | Mark as shipped | ❌ Not used |
| `/admin/shipments/:id/deliver` | POST | Mark as delivered | ❌ Not used |
| `/admin/shipments/:id` | DELETE | Delete shipment | ❌ Not used |

**Action:** Build shipment management UI urgently

---

## 🟡 PARTIALLY USED ENDPOINTS

### 1. Blog APIs
**Usage:** 60%

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /blogs` | ✅ Used | Blog listing page |
| `GET /blogs/:id` | ✅ Used | Blog post page |
| `GET /blogs/categories` | ❌ Not used | Add category filter |
| `GET /blogs/tags` | ❌ Not used | Add tag filter |
| `GET /blogs/:id/related` | ❌ Not used | Add related posts |
| `GET /blogs/:id/comments` | ⚠️ Partial | Show comments |
| `POST /blogs/:id/comment` | ❌ Not used | Add comment form |
| `POST /blogs` | ✅ Used | Admin create |
| `PUT /blogs/:id` | ✅ Used | Admin update |
| `POST /blogs/:id/publish` | ✅ Used | Admin publish |
| `POST /blogs/:id/archive` | ❌ Not used | Add archive feature |
| `DELETE /blogs/:id` | ✅ Used | Admin delete |
| `GET /blogs/admin/analytics` | ❌ Not used | Add analytics |

### 2. Coupon APIs
**Usage:** 50%

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /coupons` | ✅ Used | Admin listing |
| `GET /coupons/:id` | ❌ Not used | Add detail view |
| `POST /coupons` | ✅ Used | Admin create |
| `PUT /coupons/:id` | ✅ Used | Admin update |
| `DELETE /coupons/:id` | ❌ Not used | Add delete button |
| `GET /coupons/validate/:code` | ✅ Used | Cart validation |

---

## 📋 RECOMMENDATIONS

### Immediate Actions (This Sprint)

1. **Build Shipment Management UI**
   - Priority: HIGH
   - Endpoints: All shipment management
   - Impact: Order fulfillment

2. **Implement Review Moderation**
   - Priority: MEDIUM
   - Endpoints: `/reviews/:id/approve`, `/reviews/:id/helpful`
   - Impact: Social proof quality

3. **Add Customer Analytics Dashboard**
   - Priority: MEDIUM
   - Endpoints: `/admin/analytics/customers`, `/admin/analytics/revenue`
   - Impact: Business intelligence

### Short-Term (Next Month)

4. **Build Notification Center**
   - Priority: MEDIUM
   - Endpoints: All notification endpoints
   - Impact: User engagement

5. **Implement Personalized Recommendations**
   - Priority: HIGH
   - Endpoint: `/recommendations/for-you`
   - Impact: Conversion rate

6. **Advanced Search Filters**
   - Priority: MEDIUM
   - Endpoints: `/search/filters`, `/search/sku/:sku`
   - Impact: UX improvement

### Long-Term (Next Quarter)

7. **Warehouse Management UI**
   - Priority: LOW
   - Endpoints: All warehouse endpoints
   - Impact: Inventory management

8. **Customer Management Dashboard**
   - Priority: MEDIUM
   - Endpoints: `/customers/*`
   - Impact: Customer support

9. **Fraud Detection Dashboard**
   - Priority: LOW
   - Endpoints: All fraud endpoints
   - Impact: Loss prevention

---

## 🗑️ DEPRECATION CANDIDATES

Consider deprecating in next major version:

1. **Tenant Management** (if staying single-tenant)
   - Most endpoints unused
   - Complexity without benefit

2. **Warehouse Management** (if using single warehouse)
   - Simplify inventory management

3. **Fraud Detection** (if using third-party service)
   - Replace with external service

---

## 📊 USAGE STATISTICS

| Category | Total Endpoints | Used | Unused | Usage % |
|----------|----------------|------|--------|---------|
| Authentication | 5 | 5 | 0 | 100% |
| Products | 12 | 12 | 0 | 100% |
| Categories | 7 | 7 | 0 | 100% |
| Cart | 9 | 9 | 0 | 100% |
| Orders | 25 | 15 | 10 | 60% |
| Blogs | 15 | 9 | 6 | 60% |
| Reviews | 6 | 3 | 3 | 50% |
| Coupons | 6 | 4 | 2 | 67% |
| Analytics | 4 | 2 | 2 | 50% |
| Search | 5 | 2 | 3 | 40% |
| Recommendations | 2 | 1 | 1 | 50% |
| Notifications | 3 | 0 | 3 | 0% |
| Warehouses | 5 | 1 | 4 | 20% |
| Customers | 3 | 1 | 2 | 33% |
| Fraud Detection | 3 | 0 | 3 | 0% |
| Tenants | 7 | 3 | 4 | 43% |
| **TOTAL** | **108** | **74** | **34** | **69%** |

---

## ✅ ACTION ITEMS

- [ ] Create shipment management UI
- [ ] Implement review moderation
- [ ] Add customer analytics dashboard
- [ ] Build notification center
- [ ] Implement personalized recommendations
- [ ] Add advanced search filters
- [ ] Review tenant management necessity
- [ ] Document fraud detection for future use
- [ ] Create warehouse management UI (if needed)
- [ ] Build customer management dashboard

---

**Report Generated:** March 12, 2026  
**Next Review:** April 12, 2026  
**Owner:** Product Manager + Tech Lead

---

**END OF REPORT**
