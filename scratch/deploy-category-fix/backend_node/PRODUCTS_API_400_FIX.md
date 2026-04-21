# Products API 400 Error - Fix Summary

**Date:** March 13, 2026  
**Issue:** 400 Bad Request on GET /api/v1/products  
**Status:** ✅ **FIXED**

---

## Problem

Users were getting **400 Bad Request** errors when accessing the products API endpoint.

### Error Example
```
GET /api/v1/products?invalid_param=test
HTTP/1.1 400 Bad Request

{
  "success": false,
  "message": "\"query.invalid_param\" is not allowed"
}
```

---

## Root Cause

The validation middleware (`src/middlewares/validate.js`) was using strict Joi validation that rejected **any query parameters not explicitly defined** in the schema.

### Original Validation Schema

```javascript
const getProducts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    // ... other params
  }),  // ❌ No .unknown() - rejects unknown params
};
```

### Why This Caused Issues

1. **Frontend might send unexpected params** (search, sort, filters, etc.)
2. **Joi validation by default rejects unknown keys**
3. **Any typo or new param causes 400 error**
4. **Very strict validation breaks flexibility**

---

## Solution

### Updated Validation Schema

**File:** `backend_node/src/validations/product.validation.js`

```javascript
const getProducts = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'published', 'archived'),
    category: Joi.string(),
    category_id: Joi.number().integer(),
    featured: Joi.boolean().default(false),
    search: Joi.string().allow('', null),      // ✅ Added
    sort: Joi.string(),                         // ✅ Added
    order: Joi.string(),                        // ✅ Added
    min_price: Joi.number().min(0),            // ✅ Added
    max_price: Joi.number().min(0),            // ✅ Added
    tenant_id: Joi.number().integer(),         // ✅ Added
  }).unknown(true),  // ✅ KEY FIX: Allow unknown query params
};
```

### Changes Made

1. **Added `.unknown(true)`** - Allows query parameters not in schema to pass through
2. **Added common e-commerce params**:
   - `search` - Search query
   - `sort` - Sort field
   - `order` - Sort order (asc/desc)
   - `min_price` - Minimum price filter
   - `max_price` - Maximum price filter
   - `tenant_id` - Multi-tenant support

---

## Testing

### Before Fix ❌

```bash
curl "http://localhost:8080/api/v1/products?search=silk"
# 400 Bad Request - "query.search is not allowed"

curl "http://localhost:8080/api/v1/products?sort=price"
# 400 Bad Request - "query.sort is not allowed"
```

### After Fix ✅

```bash
curl "http://localhost:8080/api/v1/products?search=silk"
# 200 OK - Returns filtered products

curl "http://localhost:8080/api/v1/products?sort=price&order=asc"
# 200 OK - Returns sorted products

curl "http://localhost:8080/api/v1/products?invalid_param=test"
# 200 OK - Ignores invalid param, returns all products
```

---

## Impact

### ✅ Positive Effects

1. **API is more flexible** - Accepts new parameters without breaking
2. **Frontend can evolve** - Add new filters without backend changes
3. **Better developer experience** - Less strict validation
4. **Backward compatible** - All existing calls still work

### ⚠️ Considerations

1. **Typos won't be caught** - `?serch=silk` will be ignored, not rejected
2. **Documentation is important** - Developers should check supported params
3. **Some params are still validated** - `page`, `per_page` must be valid numbers

---

## Validation Levels

### Strict Validation (Before)
```javascript
query: Joi.object().keys({
  page: Joi.number()
})
// ❌ Rejects: ?page=1&search=test
```

### Lenient Validation (After)
```javascript
query: Joi.object().keys({
  page: Joi.number()
}).unknown(true)
// ✅ Accepts: ?page=1&search=test (ignores search)
```

### Best Practice (Recommended)
```javascript
query: Joi.object().keys({
  page: Joi.number(),
  search: Joi.string(),
  sort: Joi.string()
}).unknown(true)  // Allow known + unknown params
```

---

## Files Modified

1. **`backend_node/src/validations/product.validation.js`**
   - Added `.unknown(true)` to `getProducts` schema
   - Added common e-commerce query parameters
   - Updated comments

---

## Deployment

### Rebuild Backend Container

```bash
# Rebuild with changes
docker-compose build backend

# Restart container
docker-compose up -d backend

# Verify
curl http://localhost:8080/api/v1/products
```

---

## Other Validation Schemas

The same pattern should be applied to other endpoints for consistency:

### Recommended Updates

```javascript
// blogs.route.js
const getBlogs = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow('', null),
    category: Joi.string(),
    status: Joi.string().valid('draft', 'review', 'published', 'archived'),
  }).unknown(true)  // ✅ Add this
};

// orders.route.js
const getOrders = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string(),
  }).unknown(true)  // ✅ Add this
};
```

---

## API Documentation

### GET /api/v1/products

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `per_page` | number | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status (draft/published/archived) |
| `category` | string | - | Filter by category slug |
| `category_id` | number | - | Filter by category ID |
| `featured` | boolean | false | Show only featured products |
| `search` | string | - | Search query |
| `sort` | string | - | Sort field (price, name, created_at) |
| `order` | string | - | Sort order (asc, desc) |
| `min_price` | number | - | Minimum price filter |
| `max_price` | number | - | Maximum price filter |
| `tenant_id` | number | - | Tenant ID (multi-tenant) |

**Example Requests:**

```bash
# Get all products
GET /api/v1/products

# Paginated results
GET /api/v1/products?page=2&per_page=50

# Filter by category
GET /api/v1/products?category=sarees

# Search products
GET /api/v1/products?search=silk

# Sort by price
GET /api/v1/products?sort=price&order=asc

# Price range
GET /api/v1/products?min_price=1000&max_price=5000

# Combined filters
GET /api/v1/products?category=sarees&search=bridal&sort=price&order=asc
```

---

## Verification Checklist

- [x] Validation schema updated
- [x] Backend container rebuilt
- [x] API tested with various params
- [x] Invalid params no longer cause 400 errors
- [x] Valid params still work correctly
- [x] Documentation updated

---

## Related Issues

This fix might also resolve:
- Frontend search not working
- Category filtering issues
- Sort functionality errors
- Price filter not applying

---

**Fix Completed:** March 13, 2026  
**Status:** ✅ **RESOLVED**  
**Time to Fix:** < 10 minutes
