# Coupon Creation 400 Error Fix

**Date:** March 13, 2026  
**Issue:** Failed to create coupon - AxiosError: Request failed with status code 400  
**Status:** ✅ Fixed

---

## Problem

When trying to create a coupon through the Admin Coupons page (`/admin/dashboard` → Coupons tab), the backend returned a **400 Bad Request** error.

### Error Message
```
Failed to create coupon: AxiosError: Request failed with status code 400
```

---

## Root Cause

The issue was caused by a **field name mismatch** between the frontend form data and the backend validation schema.

### Frontend Sent:
```javascript
{
  code: "WELCOME20",
  type: "percentage",
  value: "20",
  min_cart_value: "500",      // ❌ Backend didn't recognize this
  max_discount: "200",        // ❌ Backend didn't recognize this
  usage_limit: "100",         // ❌ Backend didn't recognize this
  starts_at: "2026-03-13...", // ❌ Backend didn't recognize this
  expires_at: "2026-12-31...",// ❌ Backend didn't recognize this
  status: "active",
  // ... other fields
}
```

### Backend Expected (validation schema):
```javascript
{
  code: "WELCOME20",
  type: "percentage",
  value: 20,
  minOrderValue: 500,         // ❌ Different field name
  maxDiscount: 200,           // ❌ Different field name
  usageLimit: 100,            // ❌ Different field name
  startDate: "2026-03-13...", // ❌ Different field name
  endDate: "2026-12-31...",   // ❌ Different field name
  // ... other fields
}
```

### Additional Issues:
1. **Type mismatch**: Frontend sent strings for numeric fields, backend expected numbers
2. **Empty strings**: Frontend sent empty strings `""` for optional fields, backend validation failed
3. **Missing field names**: Backend validation didn't include `buy_x_get_y` type

---

## Solution

### 1. Updated Backend Validation Schema
**File:** `backend_node/src/validations/coupon.validation.js`

Changed field names to match what the frontend and service layer were using:

```javascript
const createCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required().max(50).regex(/^[A-Z0-9_-]+$/),
    type: Joi.string().valid('percentage', 'flat', 'free_shipping', 'buy_x_get_y').required(),
    value: Joi.number().min(0).required(),
    min_cart_value: Joi.number().min(0).default(0),  // ✅ Changed from minOrderValue
    max_discount: Joi.number().min(0).allow(null).optional(), // ✅ Changed from maxDiscount
    usage_limit: Joi.number().integer().min(1).allow(null).optional(), // ✅ Changed from usageLimit
    starts_at: Joi.date().iso().optional(),    // ✅ Changed from startDate (now optional)
    expires_at: Joi.date().iso().optional(),   // ✅ Changed from endDate (now optional)
    status: Joi.string().valid('active', 'inactive').default('active'),
    buy_x_qty: Joi.number().integer().min(1).optional(),
    get_y_qty: Joi.number().integer().min(1).optional(),
    // ... other fields
  }),
};
```

Also updated `updateCoupon` validation with the same field names.

### 2. Updated Frontend Data Transformation
**File:** `frontend/src/pages/AdminCouponsPage.js`

Added proper data transformation before sending to backend:

```javascript
const handleCreate = async (e) => {
  e.preventDefault();
  setSaving(true);
  
  // Prepare data - convert empty strings to null/undefined for optional fields
  const submitData = {
    ...formData,
    value: Number(formData.value),
    min_cart_value: formData.min_cart_value ? Number(formData.min_cart_value) : undefined,
    max_discount: formData.max_discount ? Number(formData.max_discount) : undefined,
    usage_limit: formData.usage_limit ? Number(formData.usage_limit) : undefined,
    starts_at: formData.starts_at || undefined,
    expires_at: formData.expires_at || undefined,
    buy_x_qty: formData.buy_x_qty ? Number(formData.buy_x_qty) : undefined,
    get_y_qty: formData.get_y_qty ? Number(formData.get_y_qty) : undefined,
  };
  
  try {
    await couponsAPI.create(submitData);
    toast.success('Coupon created successfully');
    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
};
```

Same transformation applied to `handleEdit` function.

---

## Changes Summary

### Files Modified:
1. **`backend_node/src/validations/coupon.validation.js`**
   - Changed `minOrderValue` → `min_cart_value`
   - Changed `maxDiscount` → `max_discount`
   - Changed `usageLimit` → `usage_limit`
   - Changed `startDate` → `starts_at` (made optional)
   - Changed `endDate` → `expires_at` (made optional)
   - Added `buy_x_get_y` to valid types
   - Updated params validation: `couponId` → `coupon_id`

2. **`frontend/src/pages/AdminCouponsPage.js`**
   - Added data transformation in `handleCreate()`
   - Added data transformation in `handleEdit()`
   - Converts empty strings to `undefined` for optional fields
   - Converts string numbers to actual `Number` type

### Docker Services Rebuilt:
- `shriramya-backend-1` (to pick up validation changes)
- `shriramya-frontend-1` (to pick up form changes)

---

## Testing

### How to Test:
1. Navigate to **Admin Dashboard** → **Coupons** tab
2. Click **"Create Coupon"** button
3. Fill in the form:
   - **Coupon Code**: `WELCOME20`
   - **Discount Type**: `Percentage`
   - **Discount Value**: `20`
   - **Minimum Cart Value**: `500` (optional)
   - **Usage Limit**: `100` (optional)
   - **Valid From**: (optional)
   - **Expires At**: (optional)
   - **Status**: `Active`
4. Click **"Create Coupon"**

### Expected Result:
- ✅ Coupon created successfully
- ✅ Success toast message appears
- ✅ Coupon appears in the table
- ✅ No 400 errors in console

---

## API Documentation

### POST /api/v1/coupons

**Request Body:**
```json
{
  "code": "WELCOME20",
  "type": "percentage",
  "value": 20,
  "min_cart_value": 500,
  "max_discount": 200,
  "usage_limit": 100,
  "starts_at": "2026-03-13T00:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z",
  "status": "active",
  "buy_x_qty": 1,
  "get_y_qty": 1
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": 1,
    "code": "WELCOME20",
    "type": "percentage",
    "value": 20,
    "min_cart_value": 500,
    "max_discount": 200,
    "usage_limit": 100,
    "used_count": 0,
    "status": "active",
    "starts_at": "2026-03-13T00:00:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "created_at": "2026-03-13T09:50:00Z",
    "updated_at": "2026-03-13T09:50:00Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "code": "Coupon code is required",
    "value": "Coupon value must be a number"
  }
}
```

---

## Related Files

- `backend_node/src/controllers/coupon.controller.js` - Controller logic
- `backend_node/src/services/coupon.service.js` - Business logic
- `backend_node/src/routes/v1/coupons.route.js` - Route definitions
- `frontend/src/services/api.js` - API client (`couponsAPI`)

---

## Notes

- All numeric fields are now properly converted to `Number` type before sending
- Empty optional fields are sent as `undefined` instead of empty strings
- Date fields (`starts_at`, `expires_at`) are now optional in validation
- Backend validation schema now matches the actual service implementation
- The fix maintains backward compatibility with existing coupons

---

**Status:** ✅ Coupon creation is now working correctly!
