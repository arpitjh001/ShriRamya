# Variant-Based Inventory Management System

## Overview

This document describes the complete variant-based inventory management system implemented for the ShriRamya clothing ecommerce platform. The system manages stock at the **variant level** (Color + Size combinations) rather than at the product level.

---

## Architecture

### Database Schema

```
Products (Parent)
├── id, name, sku, base_price
└── Variants (Children)
    ├── id, product_id, color, size
    ├── stock_quantity, price_override
    ├── sku, attributes_json
    └── version (for optimistic locking)

Variant Inventory (Synced)
├── variant_id
├── stock_level
└── low_stock_threshold

Inventory Reservations
├── variant_id, session_id
├── quantity, expires_at
└── status
```

### Key Principles

1. **Stock is NOT stored at product level** - Total product stock is calculated as the sum of all variant stocks
2. **Variant = Color + Size** - Each unique combination is a separate inventory item
3. **Optimistic Locking** - Version numbers prevent overselling during concurrent purchases
4. **Cart Reservations** - Temporary stock holds with expiration

---

## Backend Implementation

### 1. Database Migrations

#### Migration: `20260313_variant_inventory_system.sql`

Adds color, size, stock_quantity, and version columns to `product_variants`:

```sql
ALTER TABLE product_variants 
ADD COLUMN color VARCHAR(50) DEFAULT NULL,
ADD COLUMN size VARCHAR(20) DEFAULT NULL,
ADD COLUMN stock_quantity INT DEFAULT 0,
ADD COLUMN price_override DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN version INT DEFAULT 0;
```

#### Migration: `20260313_create_inventory_reservations.sql`

Creates the `inventory_reservations` table for cart stock holds.

---

### 2. Repository Layer (`product.sql.repository.js`)

New methods added:

| Method | Description |
|--------|-------------|
| `getVariantByColorSize(productId, color, size)` | Find variant by color+size |
| `getVariantMatrix(productId)` | Get all variants for a product |
| `getProductColors(productId)` | Get available colors |
| `getProductSizes(productId, color)` | Get available sizes (optionally filtered) |
| `getVariantStock(productId, color, size)` | Get stock info for variant |
| `updateVariantStockOptimistic(variantId, quantity, version)` | Reduce stock with locking |
| `syncVariantMatrix(productId, variants)` | Bulk create/update variants |
| `getProductTotalStock(productId)` | Calculate total stock (sum of variants) |

---

### 3. Service Layer (`variant-inventory.service.js`)

Core business logic:

```javascript
// Calculate total stock across all variants
calculateTotalStock(productId)

// Get stock for specific variant
getVariantStock(productId, color, size)

// Validate stock before adding to cart
validateStockAvailability(productId, color, size, quantity)

// Reduce stock after purchase (with optimistic locking)
reduceStock(variantId, quantity, expectedVersion)

// Bulk sync variant matrix
syncVariantMatrix(productId, variants)

// Cart reservation system
reserveStock(variantId, quantity, sessionId, expirationMinutes)
releaseReservation(sessionId)
confirmReservation(sessionId)
```

---

### 4. Controller Layer (`product.controller.js`)

New API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products/:id/variants/matrix` | GET | Get full variant matrix |
| `/products/:id/variants/colors` | GET | Get available colors |
| `/products/:id/variants/sizes?color=X` | GET | Get sizes (filtered by color) |
| `/products/:id/variants/stock?color=X&size=Y` | GET | Get stock for variant |
| `/products/:id/variants/validate-stock?color=X&size=Y&quantity=Z` | GET | Validate availability |
| `/products/:id/variants/matrix` | PUT | Sync variant matrix (Admin) |
| `/products/:id/variants/:variantId/stock` | PUT | Update stock level (Admin) |
| `/products/variants/low-stock` | GET | Get low stock variants (Admin) |

---

### 5. Order Stock Reduction (`orderStateMachine.service.js`)

When an order is marked as **PAID**:

```javascript
async function reduceOrderStock(orderId, connection) {
    // 1. Get all order items with variant info
    // 2. For each item, reduce variant stock
    // 3. Use optimistic locking to prevent overselling
    // 4. Log success/failure for each variant
}
```

---

## Frontend Implementation

### 1. Admin Variant Grid Component (`VariantGridInput.js`)

Features:
- Color selection chips
- Size selection chips
- Bulk stock input ("Apply to all")
- Real-time stock status badges
- Variant table with inline editing

Usage in AdminProductsPage:
```jsx
<VariantGridInput
  variants={productForm.variants || []}
  onChange={(newVariants) => setProductForm({ ...productForm, variants: newVariants })}
  basePrice={parseFloat(productForm.basePrice) || 0}
/>
```

---

### 2. Product Detail Page Updates

**Color Selection:**
- Shows color swatches
- Disabled swatches for out-of-stock colors
- "SOLD" overlay on unavailable colors

**Size Selection:**
- Shows size buttons
- Disabled buttons for unavailable sizes
- "SOLD OUT" overlay on unavailable sizes
- Red dot indicator for low stock (≤5)

**Stock Messages:**
- "In stock" (green)
- "Hurry! Only X pieces left" (orange, when ≤5)
- "This variant is currently out of stock" (red)

---

### 3. Cart Validation

When adding to cart:
1. Check if color and size are selected
2. Validate requested quantity ≤ variant stock
3. Show error: "Only X items available" if insufficient

---

## API Examples

### Get Variant Matrix

```bash
GET /api/v1/products/123/variants/matrix
```

Response:
```json
{
  "success": true,
  "data": {
    "productId": 123,
    "productName": "Classic Cotton T-Shirt",
    "variants": [
      {
        "id": 1,
        "color": "Black",
        "size": "S",
        "stock": 10,
        "price": 999,
        "sku": "SR-TSHIRT-001",
        "stockStatus": "in_stock",
        "isOutOfStock": false,
        "isLowStock": false
      },
      {
        "id": 2,
        "color": "Black",
        "size": "M",
        "stock": 3,
        "price": 999,
        "sku": "SR-TSHIRT-001",
        "stockStatus": "low_stock",
        "isOutOfStock": false,
        "isLowStock": true
      }
    ],
    "totalStock": 50,
    "availableColors": ["Black", "White"],
    "availableSizes": ["S", "M", "L", "XL"]
  }
}
```

### Validate Stock Before Purchase

```bash
GET /api/v1/products/123/variants/validate-stock?color=Black&size=M&quantity=5
```

Response (success):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "available": 18,
    "requested": 5,
    "message": "Stock available",
    "variantId": 2
  }
}
```

Response (failure):
```json
{
  "success": true,
  "data": {
    "valid": false,
    "available": 3,
    "requested": 5,
    "message": "Only 3 items available"
  }
}
```

### Sync Variant Matrix (Admin)

```bash
PUT /api/v1/products/123/variants/matrix
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "variants": [
    {
      "color": "Black",
      "size": "S",
      "stock_quantity": 10,
      "price": 999
    },
    {
      "color": "Black",
      "size": "M",
      "stock_quantity": 18,
      "price": 999
    },
    {
      "color": "White",
      "size": "S",
      "stock_quantity": 6,
      "price": 999
    }
  ]
}
```

---

## Edge Case Handling

### 1. Out of Stock (stock = 0)

**Backend:**
- `isOutOfStock: true`
- `stockStatus: "out_of_stock"`

**Frontend:**
- Size button disabled with "SOLD OUT" overlay
- Color swatch disabled with "SOLD" overlay
- Add to cart button disabled or shows "Out of Stock"

---

### 2. Low Stock (stock ≤ 5)

**Backend:**
- `isLowStock: true`
- `stockStatus: "low_stock"`

**Frontend:**
- Red dot indicator on size button
- Message: "Hurry! Only X pieces left"

---

### 3. Concurrent Purchases

**Optimistic Locking:**

```javascript
// 1. Read current stock + version
const variant = await getVariant(variantId);
const { stock_quantity, version } = variant;

// 2. Attempt update with version check
UPDATE product_variants 
SET stock_quantity = stock_quantity - 1, version = version + 1
WHERE id = variantId AND version = expectedVersion;

// 3. If affectedRows = 0, another request modified stock
// Return error: "Stock was modified. Please refresh and try again."
```

---

### 4. Cart Reservation Expiration

```javascript
// Reserve stock when item added to cart
reserveStock(variantId, quantity, sessionId, 15); // 15 minutes

// Auto-release when reservation expires
cleanupExpiredReservations(); // Cron job every 5 minutes

// Release when cart is cleared
releaseReservation(sessionId);

// Confirm and reduce stock on checkout
confirmReservation(sessionId);
```

---

## Stock Calculation Examples

### Example Product: Classic Cotton T-Shirt

**Variants:**
| Color | Size | Stock |
|-------|------|-------|
| Black | S | 10 |
| Black | M | 18 |
| Black | L | 5 |
| White | S | 6 |
| White | M | 9 |
| White | L | 2 |

**Total Stock Calculation:**
```
Total = 10 + 18 + 5 + 6 + 9 + 2 = 50 pieces
```

**Stock Reduction Example:**

Customer buys: Black-M, Quantity: 2

```
Before: Black-M = 18
After:  Black-M = 16
Total:  50 → 48
```

**Other variants remain unchanged.**

---

## Admin Workflow

### Creating a Product with Variants

1. **Enter Product Details**
   - Name, description, base price
   - Upload images

2. **Select Colors**
   - Click color chips: Black, White, Blue

3. **Select Sizes**
   - Click size chips: S, M, L, XL

4. **Auto-Generate Variants**
   - System creates 3 colors × 4 sizes = 12 variants

5. **Enter Stock Levels**
   - Option A: Use "Bulk Stock Update" to set all to 20
   - Option B: Manually adjust each variant

6. **Save Product**
   - Variants synced to database
   - Stock available for purchase

---

## Customer Workflow

### Purchasing a Variant

1. **Select Product** → Navigate to product page

2. **Select Color** → Click color swatch
   - Out-of-stock colors are disabled

3. **Select Size** → Click size button
   - Out-of-stock sizes show "SOLD OUT"
   - Low stock sizes show red dot

4. **View Stock Message**
   - "In stock" / "Only X pieces left" / "Out of stock"

5. **Add to Cart**
   - System validates: requested ≤ available
   - Error shown if insufficient stock

6. **Checkout**
   - Stock reserved during checkout
   - Stock reduced after payment

---

## Testing Checklist

- [ ] Create product with multiple color/size variants
- [ ] Verify variant matrix displays correctly in admin
- [ ] Test bulk stock update feature
- [ ] Verify total stock calculation (sum of variants)
- [ ] Test color selection on product page
- [ ] Test size availability filtering by color
- [ ] Verify out-of-stock variants are disabled
- [ ] Verify low-stock indicator shows correctly
- [ ] Add to cart with valid quantity → Success
- [ ] Add to cart with quantity > stock → Error message
- [ ] Complete order → Verify stock reduced
- [ ] Test concurrent purchases (two users, last item)
- [ ] Verify cart reservation expiration
- [ ] Test variant stock update in admin
- [ ] Verify low-stock alert in admin dashboard

---

## Files Modified/Created

### Backend
- `migrations/20260313_variant_inventory_system.sql`
- `migrations/20260313_create_inventory_reservations.sql`
- `backend_node/src/repositories/product.sql.repository.js`
- `backend_node/src/services/variant-inventory.service.js`
- `backend_node/src/controllers/product.controller.js`
- `backend_node/src/routes/v1/products.route.js`
- `backend_node/src/validations/product.validation.js`
- `backend_node/src/services/orderStateMachine.service.js`
- `backend_node/src/controllers/order.controller.js`

### Frontend
- `frontend/src/components/VariantGridInput.js`
- `frontend/src/pages/AdminProductsPage.js`
- `frontend/src/pages/ProductDetailPage.js`
- `frontend/src/services/api.js`

---

## Summary

This variant-based inventory system provides:

✅ **Per-variant stock tracking** (Color + Size)
✅ **Real-time stock calculation** (sum of all variants)
✅ **Stock validation** before adding to cart
✅ **Out-of-stock handling** with visual indicators
✅ **Low-stock alerts** for customers and admins
✅ **Admin variant grid UI** for easy management
✅ **Bulk stock input** feature
✅ **Concurrent purchase protection** (optimistic locking)
✅ **Cart reservation system** with expiration
✅ **Automatic stock reduction** after order payment

The system follows ecommerce best practices similar to Shopify, Magento, and other major platforms.
