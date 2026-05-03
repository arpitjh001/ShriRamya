# Coupon/Discount Feature Audit Report

**Generated:** March 9, 2026  
**Auditor:** Senior Full-Stack System Auditor  
**Project:** ShriRamya Ecommerce Platform

---

## Executive Summary

The coupon/discount feature is **PARTIALLY IMPLEMENTED** with a robust backend foundation but incomplete frontend and cart/checkout integration. The backend service layer is production-ready with comprehensive validation logic, but the customer-facing UI and cart integration are missing.

**Overall Completion: ~65%**

---

## 1️⃣ DATABASE LAYER

### ✅ COMPLETE

#### Coupons Table

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `id` | int | NO | PRI | NULL | auto_increment |
| `code` | varchar(50) | NO | UNI | NULL | Unique coupon code |
| `type` | enum | NO | | 'percentage' | percentage/flat/free_shipping/buy_x_get_y |
| `value` | decimal(10,2) | NO | | 0.00 | Discount value |
| `min_cart_value` | decimal(10,2) | YES | | 0.00 | Minimum cart requirement |
| `max_discount` | decimal(10,2) | YES | | NULL | Maximum discount cap |
| `usage_limit` | int | YES | | NULL | Total usage limit |
| `used_count` | int | YES | | 0 | Current usage count |
| `starts_at` | datetime | YES | | NULL | Valid from date |
| `expires_at` | datetime | YES | MUL | NULL | Expiry date |
| `status` | enum | YES | MUL | 'active' | active/inactive/expired |
| `applicable_products` | json | YES | | NULL | Product restrictions |
| `applicable_categories` | json | YES | | NULL | Category restrictions |
| `buy_x_qty` | int | YES | | 1 | BOGO: Buy quantity |
| `get_y_qty` | int | YES | | 1 | BOGO: Get quantity |
| `created_at` | timestamp | YES | | CURRENT_TIMESTAMP | |
| `updated_at` | timestamp | YES | | CURRENT_TIMESTAMP | on update |

#### Cart Coupons Table (Junction Table)

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| `id` | int | NO | PRI | NULL | auto_increment |
| `cart_id` | int | NO | MUL | NULL | FK to carts |
| `coupon_id` | int | NO | MUL | NULL | FK to coupons |
| `discount_amount` | decimal(10,2) | YES | | NULL | Applied discount |
| `applied_at` | timestamp | YES | | CURRENT_TIMESTAMP | |

**Indexes:**
- `UNIQUE KEY unique_cart_coupon (cart_id, coupon_id)`
- `KEY idx_coupon (coupon_id)`
- `KEY idx_cart (cart_id)`

**Foreign Keys:**
- `fk_cart_coupons_cart` → `carts(id)` ON DELETE CASCADE
- `fk_cart_coupons_coupon` → `coupons(id)` ON DELETE CASCADE

### Migrations

✅ Migration exists: `src/utils/dbMigration.js`
- Creates `coupons` table
- Creates `cart_coupons` junction table
- Proper indexes and constraints

---

## 2️⃣ BACKEND IMPLEMENTATION

### ✅ COMPLETE

#### Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `/backend_node/src/services/coupon.service.js` | Core coupon logic | ✅ Complete |
| `/backend_node/src/controllers/coupon.controller.js` | HTTP handlers | ✅ Complete |
| `/backend_node/src/routes/v1/coupons.route.js` | API routes | ✅ Complete |
| `/backend_node/src/utils/dbMigration.js` | Database setup | ✅ Complete |

#### Coupon Service (`coupon.service.js`)

**Implemented Methods:**

| Method | Description | Status |
|--------|-------------|--------|
| `createCoupon(couponData)` | Create new coupon with validation | ✅ Complete |
| `getCouponById(id)` | Fetch single coupon | ✅ Complete |
| `getCouponByCode(code)` | Fetch by code for validation | ✅ Complete |
| `getAllCoupons(params)` | List with pagination/filters | ✅ Complete |
| `updateCoupon(id, updateData)` | Update existing coupon | ✅ Complete |
| `deleteCoupon(id)` | Delete coupon | ✅ Complete |
| `validateAndApplyCoupon(code, cartData, userId)` | Validate & calculate discount | ✅ Complete |
| `applyCouponToCart(cartId, couponCode, userId)` | Apply to cart | ✅ Complete |
| `removeCouponFromCart(cartId)` | Remove from cart | ✅ Complete |
| `getAppliedCoupon(cartId)` | Get cart's applied coupon | ✅ Complete |
| `_calculateDiscount(coupon, cartData)` | Calculate discount amount | ✅ Complete |
| `_calculateBogoDiscount(coupon, cartData)` | BOGO calculation | ✅ Complete |
| `_validateCouponData(data)` | Input validation | ✅ Complete |
| `_formatCoupon(coupon)` | Response formatting | ✅ Complete |

**Validation Logic Implemented:**
- ✅ Duplicate code prevention
- ✅ Coupon code required
- ✅ Value must be > 0
- ✅ Valid coupon types (percentage, flat, free_shipping, buy_x_get_y)
- ✅ Percentage cannot exceed 100%
- ✅ Max discount validation
- ✅ Minimum cart value validation
- ✅ Expiry date check
- ✅ Start date check
- ✅ Usage limit check
- ✅ Product eligibility check
- ✅ Category eligibility check
- ✅ Per-user usage tracking (commented out, optional)

**Discount Types Supported:**
1. **percentage** - % off cart total
2. **flat** - Fixed amount off
3. **free_shipping** - Waives shipping cost
4. **buy_x_get_y** - BOGO offers

**TODO Comments:** None found - implementation is complete

---

## 3️⃣ API ENDPOINTS

### ✅ COMPLETE (Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/coupons` | GET | Admin | List all coupons (paginated) |
| `/api/v1/coupons/:coupon_id` | GET | Admin | Get single coupon |
| `/api/v1/coupons` | POST | Admin | Create new coupon |
| `/api/v1/coupons/:coupon_id` | PUT | Admin | Update coupon |
| `/api/v1/coupons/:coupon_id` | DELETE | Admin | Delete coupon |

### ⚠️ MISSING (Customer-Facing)

| Endpoint | Method | Auth | Description | Status |
|----------|--------|------|-------------|--------|
| `/api/v1/cart/coupon/apply` | POST | Optional | Apply coupon to cart | ❌ Missing |
| `/api/v1/cart/coupon/remove` | DELETE | Optional | Remove coupon from cart | ❌ Missing |
| `/api/v1/cart/coupon` | GET | Optional | Get applied coupon | ❌ Missing |
| `/api/v1/coupons/validate/:code` | GET | Optional | Validate coupon code | ❌ Missing |

### Request/Response Examples

**POST /api/v1/coupons (Create)**
```json
// Request
{
  "code": "WELCOME20",
  "type": "percentage",
  "value": 20,
  "min_cart_value": 500,
  "max_discount": 200,
  "usage_limit": 100,
  "starts_at": "2026-03-09T00:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z",
  "status": "active",
  "applicable_products": [1, 2, 3],
  "applicable_categories": [10, 11]
}

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "code": "WELCOME20",
    "type": "percentage",
    "value": 20,
    ...
  },
  "message": "Coupon created successfully"
}
```

**Query Parameters (GET /api/v1/coupons)**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `status` - Filter by status (active/inactive/expired)
- `type` - Filter by type
- `search` - Search by code

---

## 4️⃣ FRONTEND IMPLEMENTATION

### ⚠️ PARTIAL

#### Admin Coupons Page

**File:** `/frontend/src/pages/AdminCouponsPage.js`

**Current Status:** Demo/Hardcoded Data Only

```javascript
// Current implementation uses demo data
const demoCoupons = [
  { id: 1, code: 'WELCOME20', type: 'percentage', value: 20, ... },
  { id: 2, code: 'FLAT500', type: 'flat', value: 500, ... },
  // ...
];
```

**What Works:**
- ✅ Table display with coupon data
- ✅ Badge display for discount types
- ✅ Delete button (demo only)
- ✅ Create button placeholder

**What's Missing:**
- ❌ No API integration for listing coupons
- ❌ No API integration for creating coupons
- ❌ No API integration for editing coupons
- ❌ No API integration for deleting coupons
- ❌ No coupon creation form/modal
- ❌ No coupon edit form/modal
- ❌ No pagination UI
- ❌ No search/filter functionality

#### Customer-Facing UI

**Status:** ❌ NOT IMPLEMENTED

**Missing Components:**
- ❌ Coupon input field on cart page
- ❌ Coupon input field on checkout page
- ❌ "Apply Coupon" button
- ❌ Discount display in cart summary
- ❌ Discount display in checkout summary
- ❌ "Remove Coupon" button
- ❌ Success/error messages for coupon application
- ❌ Coupon validation feedback

#### API Service

**File:** `/frontend/src/services/api.js`

```javascript
export const couponsAPI = {
  getAll: async (params = {}) => { ... },      // ✅ Exists
  getById: async (id) => { ... },              // ✅ Exists
  create: async (data) => { ... },             // ✅ Exists
  update: async (id, data) => { ... },         // ✅ Exists
  delete: async (id) => { ... },               // ✅ Exists
};
```

**Missing Services:**
- ❌ `applyToCart(code, cartId)`
- ❌ `removeFromCart(cartId)`
- ❌ `getApplied(cartId)`
- ❌ `validateCode(code)`

---

## 5️⃣ CART + CHECKOUT INTEGRATION

### ⚠️ PARTIAL

#### Cart Service (Backend)

**File:** `/backend_node/src/services/coupon.service.js`

**Implemented:**
- ✅ `applyCouponToCart(cartId, couponCode, userId)` - Full implementation
- ✅ `removeCouponFromCart(cartId)` - Full implementation
- ✅ `getAppliedCoupon(cartId)` - Full implementation
- ✅ Discount calculation in cart context
- ✅ Usage count increment on apply
- ✅ Usage count decrement on remove

#### Cart Controller (Backend)

**File:** `/backend_node/src/controllers/cart.controller.js`

**Status:** ❌ NO COUPON ENDPOINTS

**Missing Endpoints:**
- ❌ `POST /api/v1/cart/coupon/apply`
- ❌ `DELETE /api/v1/cart/coupon/remove`
- ❌ `GET /api/v1/cart/coupon`

#### Cart Context (Frontend)

**File:** `/frontend/src/context/CartContext.js`

**Status:** ❌ NO COUPON INTEGRATION

**Missing:**
- ❌ `applyCoupon(code)` function
- ❌ `removeCoupon()` function
- ❌ `appliedCoupon` state
- ❌ `discountAmount` state
- ❌ Cart total recalculation with discount

#### Checkout Page

**File:** `/frontend/src/pages/CheckoutPage.js`

**Status:** ❌ NO COUPON INTEGRATION

**Current Calculation:**
```javascript
const subtotal = calculateSubtotal();
const shipping = subtotal > 999 ? 0 : 99;
const total = subtotal + shipping; // No discount consideration
```

**Missing:**
- ❌ Coupon input field
- ❌ Apply coupon button
- ❌ Discount display
- ❌ Final total with discount
- ❌ Coupon validation before payment

#### Calculation Flow

**Current Flow:**
```
Subtotal (items × price)
+ Shipping
= TOTAL
```

**Expected Flow:**
```
Subtotal (items × price)
- Discount (coupon)
+ Shipping
= FINAL TOTAL
```

---

## 6️⃣ ORDER SYSTEM

### ⚠️ PARTIAL

#### Order Table

**Checked Schema:** Order table does NOT have coupon-related fields

**Missing Fields:**
- ❌ `coupon_code` (varchar)
- ❌ `coupon_id` (int, FK)
- ❌ `discount_amount` (decimal)
- ❌ `final_total` (decimal)

#### Order Creation

**File:** `/backend_node/src/controllers/order.controller.js`

**Status:** ❌ NO COUPON INTEGRATION

**Missing:**
- ❌ Coupon validation during order creation
- ❌ Storing coupon reference with order
- ❌ Storing discount amount with order
- ❌ Preventing order if coupon invalid

#### Order Validation

**File:** `/backend_node/src/validations/order.validation.js`

**Current Schema:**
```javascript
couponCode: Joi.string().optional()  // ✅ Field exists in validation
```

**But:**
- ❌ No backend processing of couponCode
- ❌ No discount calculation
- ❌ No coupon usage increment on order completion

---

## 7️⃣ ADMIN PANEL

### ⚠️ PARTIAL

#### Admin Coupons Page

**Route:** `/admin/coupons`  
**File:** `/frontend/src/pages/AdminCouponsPage.js`

**Current Capabilities:**
- ✅ View coupons (demo data only)
- ✅ Delete button (non-functional)
- ✅ Create button (placeholder)

**Missing Capabilities:**
- ❌ Fetch real coupons from API
- ❌ Create new coupon with form
- ❌ Edit existing coupon
- ❌ Delete coupon (API integration)
- ❌ Toggle coupon status (active/inactive)
- ❌ View usage statistics
- ❌ Search/filter coupons
- ❌ Pagination

#### API Connection

**Status:** ⚠️ PARTIAL

```javascript
// Imported but not used
import { couponsAPI } from '../services/api';

// Current handlers use demo data
const handleDelete = (id) => {
  if (!window.confirm('Delete this coupon?')) return;
  toast.success('Coupon deleted (demo)');  // ❌ No API call
};

const handleCreate = () => {
  toast.info('Create coupon feature coming soon!');  // ❌ Placeholder
};
```

---

## 8️⃣ SECURITY + VALIDATION

### ✅ BACKEND VALIDATION (COMPLETE)

| Validation | Status | Implementation |
|------------|--------|----------------|
| Duplicate code prevention | ✅ | SQL check before insert |
| Expired coupon blocking | ✅ | Date comparison in `validateAndApplyCoupon` |
| Start date validation | ✅ | Date comparison |
| Minimum order validation | ✅ | Cart total check |
| Max usage validation | ✅ | `usage_limit` vs `used_count` |
| Per-user usage limit | ⚠️ | Code exists but commented out |
| Product eligibility | ✅ | JSON array check |
| Category eligibility | ✅ | JSON array check |
| Coupon type validation | ✅ | Enum check |
| Percentage cap (100%) | ✅ | Value validation |
| Max discount cap | ✅ | Applied in calculation |

### ⚠️ SECURITY CONCERNS

1. **No Rate Limiting** on coupon validation endpoint (when created)
2. **No CSRF Protection** on coupon application
3. **No Audit Log** for coupon usage
4. **No IP-based Restrictions** for abuse prevention
5. **Per-user usage tracking** is commented out

---

## 9️⃣ CURRENT STATUS SUMMARY

| Feature | Status | Completion |
|---------|--------|------------|
| **Database Schema** | ✅ Complete | 100% |
| **Backend Service** | ✅ Complete | 100% |
| **Backend Controller** | ✅ Complete | 100% |
| **Backend Routes** | ✅ Complete | 100% |
| **Admin API** | ✅ Complete | 100% |
| **Customer API** | ❌ Missing | 0% |
| **Admin UI - List** | ⚠️ Demo Only | 30% |
| **Admin UI - Create** | ❌ Missing | 0% |
| **Admin UI - Edit** | ❌ Missing | 0% |
| **Admin UI - Delete** | ❌ Missing | 0% |
| **Cart Integration** | ❌ Missing | 0% |
| **Checkout Integration** | ❌ Missing | 0% |
| **Order Integration** | ❌ Missing | 0% |
| **Security Hardening** | ⚠️ Partial | 60% |

**Overall Completion: ~45%**

---

## 🔟 MISSING IMPLEMENTATION

### Critical (Must Have for MVP)

#### 1. Customer-Facing API Endpoints

**File to Create:** `/backend_node/src/routes/v1/cart.route.js` (extend)

```javascript
// Add to cart routes
router.post('/coupon/apply', auth(), cartController.applyCoupon);
router.delete('/coupon/remove', auth(), cartController.removeCoupon);
router.get('/coupon', auth(), cartController.getAppliedCoupon);
```

**File to Create:** `/backend_node/src/controllers/cart.controller.js` (extend)

```javascript
const applyCoupon = async (req, res, next) => {
  // Implement coupon application
};

const removeCoupon = async (req, res, next) => {
  // Implement coupon removal
};

const getAppliedCoupon = async (req, res, next) => {
  // Implement get applied coupon
};
```

#### 2. Cart Page - Coupon UI

**File to Modify:** `/frontend/src/pages/CartPage.js`

**Add:**
- Coupon code input field
- "Apply" button
- Discount line item in summary
- "Remove" button for applied coupon
- Success/error toast messages

#### 3. Checkout Page - Coupon UI

**File to Modify:** `/frontend/src/pages/CheckoutPage.js`

**Add:**
- Coupon code input field
- "Apply" button
- Discount calculation in total
- Validation before payment

#### 4. Cart Context - Coupon State

**File to Modify:** `/frontend/src/context/CartContext.js`

**Add:**
```javascript
const [appliedCoupon, setAppliedCoupon] = useState(null);
const [discountAmount, setDiscountAmount] = useState(0);

const applyCoupon = async (code) => { ... };
const removeCoupon = async () => { ... };
```

#### 5. Admin Coupons Page - API Integration

**File to Modify:** `/frontend/src/pages/AdminCouponsPage.js`

**Replace demo data with:**
- API call to fetch coupons
- Real delete functionality
- Create coupon modal/form
- Edit coupon modal/form
- Pagination controls
- Search/filter functionality

#### 6. Order Integration

**File to Modify:** `/backend_node/src/controllers/order.controller.js`

**Add:**
- Coupon validation on order creation
- Store coupon_id with order
- Store discount_amount with order
- Increment usage count on successful order

**Database Migration Required:**
```sql
ALTER TABLE orders 
ADD COLUMN coupon_code VARCHAR(50) NULL,
ADD COLUMN coupon_id INT NULL,
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0,
ADD FOREIGN KEY (coupon_id) REFERENCES coupons(id);
```

### Important (Should Have)

#### 7. Coupon Validation Endpoint

**File to Create:** `/backend_node/src/routes/v1/coupons.route.js` (extend)

```javascript
// Public endpoint for validation
router.get('/validate/:code', couponController.validateCoupon);
```

#### 8. Per-User Usage Tracking

**File to Modify:** `/backend_node/src/services/coupon.service.js`

**Uncomment and implement:**
```javascript
// In validateAndApplyCoupon
if (userId) {
  const [userUsage] = await mysqlPool.query(
    'SELECT COUNT(*) as count FROM cart_coupons cc JOIN coupons c ON cc.coupon_id = c.id WHERE cc.cart_id IN (SELECT id FROM carts WHERE user_id = ?) AND c.code = ?',
    [userId, couponCode]
  );
  if (userUsage[0].count > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already used this coupon');
  }
}
```

#### 9. Usage Statistics Dashboard

**File to Create:** `/frontend/src/pages/AdminCouponsPage.js` (extend)

**Add:**
- Usage count display
- Remaining uses display
- Revenue impact calculation
- Popular coupons list

### Nice to Have

#### 10. Automatic Coupon Application

- Apply best coupon automatically
- Suggest coupons at checkout
- Loyalty points integration

#### 11. Coupon Email Campaigns

- Email unique coupon codes
- Track email campaign performance
- One-time use codes

#### 12. Advanced Analytics

- Conversion rate with coupons
- Average order value with/without coupons
- Customer retention with coupons

---

## 1️⃣1️⃣ RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Core Functionality (Week 1)

1. **Create customer-facing API endpoints** (cart.route.js, cart.controller.js)
2. **Add coupon state to CartContext**
3. **Build cart page coupon UI**
4. **Test coupon application flow**

### Phase 2: Checkout & Orders (Week 2)

5. **Add coupon UI to checkout page**
6. **Modify order controller to store coupon data**
7. **Create database migration for orders table**
8. **Test complete flow: cart → checkout → order**

### Phase 3: Admin Panel (Week 3)

9. **Connect admin coupons page to API**
10. **Build create coupon form**
11. **Build edit coupon modal**
12. **Implement real delete functionality**

### Phase 4: Polish & Security (Week 4)

13. **Add rate limiting to coupon endpoints**
14. **Implement per-user usage tracking**
15. **Add audit logging**
16. **Write comprehensive tests**

---

## 1️⃣2️⃣ FILES REQUIRING CHANGES

### Backend Files

| File | Action | Priority |
|------|--------|----------|
| `src/routes/v1/cart.route.js` | Add coupon endpoints | P0 |
| `src/controllers/cart.controller.js` | Add coupon handlers | P0 |
| `src/controllers/order.controller.js` | Add coupon integration | P1 |
| `src/validations/order.validation.js` | Already has couponCode | - |
| `src/services/coupon.service.js` | Uncomment per-user tracking | P2 |

### Frontend Files

| File | Action | Priority |
|------|--------|----------|
| `src/pages/CartPage.js` | Add coupon UI | P0 |
| `src/pages/CheckoutPage.js` | Add coupon UI | P1 |
| `src/context/CartContext.js` | Add coupon state | P0 |
| `src/pages/AdminCouponsPage.js` | Connect to API | P1 |
| `src/services/api.js` | Add coupon services | P0 |

### Database Migrations

| Migration | Action | Priority |
|-----------|--------|----------|
| `migrations/add_order_coupon_fields.sql` | Create | P1 |

---

## 1️⃣3️⃣ TESTING CHECKLIST

### Backend Tests Needed

- [ ] Coupon creation validation
- [ ] Coupon code uniqueness
- [ ] Expired coupon rejection
- [ ] Minimum cart value validation
- [ ] Usage limit enforcement
- [ ] Product eligibility check
- [ ] Category eligibility check
- [ ] Discount calculation accuracy
- [ ] BOGO calculation
- [ ] Cart coupon application
- [ ] Cart coupon removal
- [ ] Usage count increment/decrement

### Frontend Tests Needed

- [ ] Coupon input renders
- [ ] Apply button click
- [ ] Success message display
- [ ] Error message display
- [ ] Discount appears in summary
- [ ] Remove coupon functionality
- [ ] Cart total updates correctly
- [ ] Checkout total includes discount

### Integration Tests Needed

- [ ] Full flow: Cart → Apply Coupon → Checkout → Order
- [ ] Coupon usage count increments
- [ ] Expired coupon blocked at checkout
- [ ] Usage limit enforced
- [ ] Order stores coupon reference

---

## CONCLUSION

The coupon/discount feature has a **solid backend foundation** with comprehensive validation logic and discount calculations. However, the **frontend implementation is minimal** (demo data only) and the **cart/checkout integration is completely missing**.

**Priority Focus:**
1. Customer-facing API endpoints (cart coupon apply/remove)
2. Cart page UI for coupon input
3. Checkout integration
4. Order storage of coupon data

**Estimated Effort:** 3-4 weeks for full implementation

**Risk Areas:**
- Per-user tracking is commented out (potential abuse)
- No rate limiting on validation endpoints
- No audit logging for compliance

---

**Report Generated:** March 9, 2026  
**Next Steps:** Begin Phase 1 implementation (Core Functionality)

---

*End of Coupon Feature Audit Report*
