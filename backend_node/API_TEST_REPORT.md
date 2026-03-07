# API Test Report - Admin Dashboard Tabs

**Test Date:** 2026-03-07T02:36:42.498Z
**Base URL:** http://localhost:8080/api/v1

---

## Test Results

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Native Products | 7 | 2 | 20 |
| Categories | 5 | 1 | 20 |
| Analytics | 0 | 4 | 20 |
| Inventory | 1 | 1 | 20 |

---

## Passed Tests

- ✅ GET /products - List all products
- ✅ GET /products/:id - Get single product
- ✅ GET /products/:id/variants - Get product variants
- ✅ POST /products - Create product
- ✅ PUT /products/:id - Update product
- ✅ POST /products/:id/variants - Add variant
- ✅ DELETE /products/:id/variants/:variant_id - Delete variant
- ✅ GET /categories - List all categories
- ✅ GET /categories/:id - Get category by ID
- ✅ GET /categories/slug/:slug - Get category by slug
- ✅ POST /categories - Create category
- ✅ DELETE /categories/:id - Delete category
- ✅ GET /admin/warehouses - List warehouses

---

## Failed Tests

- ❌ PUT /products/:id/variants/:variant_id - Update variant
  **Error:** Request failed with status code 400

- ❌ PUT /categories/:id - Update category
  **Error:** Cannot read properties of null (reading 'name')

- ❌ GET /admin/analytics/overview - Dashboard overview
  **Error:** Request failed with status code 500

- ❌ GET /admin/analytics/sales - Sales analytics
  **Error:** Request failed with status code 500

- ❌ GET /admin/analytics/products - Product analytics
  **Error:** Request failed with status code 500

- ❌ GET /admin/analytics/revenue - Revenue analytics
  **Error:** Request failed with status code 500

- ❌ GET /admin/inventory/low-stock - Low stock alerts
  **Error:** Request failed with status code 404

---

## Recommendations


### Issues to Fix:
1. **PUT /products/:id/variants/:variant_id - Update variant** - Request failed with status code 400
1. **PUT /categories/:id - Update category** - Cannot read properties of null (reading 'name')
1. **GET /admin/analytics/overview - Dashboard overview** - Request failed with status code 500
1. **GET /admin/analytics/sales - Sales analytics** - Request failed with status code 500
1. **GET /admin/analytics/products - Product analytics** - Request failed with status code 500
1. **GET /admin/analytics/revenue - Revenue analytics** - Request failed with status code 500
1. **GET /admin/inventory/low-stock - Low stock alerts** - Request failed with status code 404


---

**Report Generated:** 2026-03-07T02:36:42.500Z
**Status:** ⚠️ SOME FAILURES
