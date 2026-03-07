# Native Ecommerce API (Phase 5)

Base URL: `http://localhost:8080/api/v1`

This document covers the native Node.js + MySQL product engine APIs after Phase 5 discount pricing support.

## Auth

### `POST /auth/register`
Creates a new admin user (current system behavior).

Request:
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!",
  "name": "Admin User",
  "phone": "9999999999"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "mongo_user_id",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "access_token": "jwt"
  }
}
```

### `POST /auth/login`
Logs in and returns `access_token`.

Request:
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

## Products

### `POST /products` (admin)
Creates a product with optional explicit variants.

Request:
```json
{
  "name": "Royal Banarasi Saree",
  "description": "Handcrafted silk saree",
  "basePrice": 4299,
  "status": "published",
  "attributes": [
    { "name": "Color", "values": ["Maroon", "Emerald"] },
    { "name": "Size", "values": ["S", "M", "L"] }
  ],
  "variants": [
    {
      "sku": "RB-001-S",
      "price": 4299,
      "discountPrice": 3899,
      "discountStart": "2026-03-05T00:00:00Z",
      "discountEnd": "2026-03-20T00:00:00Z",
      "stock": 20,
      "attributes": { "Color": "Maroon", "Size": "S" },
      "image": "http://localhost:8080/uploads/sample.png"
    }
  ]
}
```

### `GET /products`
Returns paginated products with variants.

Query params:
- `page` (default `1`)
- `per_page` (default `20`, max `100`)
- `status` (`draft|published|archived`)

### `GET /products/:product_id`
Returns one product with attributes and variants.

### `PUT /products/:product_id` (admin)
Updates product fields and optionally syncs full `variants` payload.

### `DELETE /products/:product_id` (admin)
Deletes product and cascades variant/attribute records.

## Variants

### `POST /products/:product_id/variants` (admin)
Adds a variant to a product.

### `PUT /products/:product_id/variants/:variant_id` (admin)
Updates a single variant.

### `DELETE /products/:product_id/variants/:variant_id` (admin)
Deletes a single variant.

Variant payload:
```json
{
  "sku": "RB-001-M",
  "price": 4499,
  "discountPrice": 3999,
  "discountStart": "2026-03-05T00:00:00Z",
  "discountEnd": "2026-03-20T00:00:00Z",
  "stock": 25,
  "attributes": { "Color": "Maroon", "Size": "M" },
  "image": "http://localhost:8080/uploads/sample.png",
  "lowStockThreshold": 5
}
```

Variant response format:
```json
{
  "id": 123,
  "sku": "RB-001-M",
  "price": 4499,
  "discountPrice": 3999,
  "discountStart": "2026-03-05T00:00:00.000Z",
  "discountEnd": "2026-03-20T00:00:00.000Z",
  "effectivePrice": 3999,
  "stock": 25,
  "attributes": { "Color": "Maroon", "Size": "M" },
  "image": "http://localhost:8080/uploads/sample.png"
}
```

## Upload

### `POST /upload` (admin)
Uploads image file (`multipart/form-data`, key: `file`).

Response:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "url": "http://localhost:8080/uploads/uuid.png",
  "filename": "uuid.png"
}
```

## Discount Rules

Applied on variant response field `effectivePrice`:

1. `discountPrice` must be `< price`.
2. If both dates are null, `discountPrice` acts as static sale price.
3. If date window is provided, discount applies only when now is within:
   - `now >= discountStart` (if `discountStart` exists)
   - `now <= discountEnd` (if `discountEnd` exists)

Validation and DB safeguards:
- Joi validation enforces:
  - `discountPrice < price`
  - `discountStart` ISO date
  - `discountEnd > discountStart` when both are provided
- MySQL check constraint:
  - `chk_discount_price_less_than_price`

## Error Behavior

- `401` for unauthorized create/update/delete operations.
- `400` for validation failures (discount violations, malformed payloads).
- `404` for missing product/variant resources.
- `409` for duplicate SKU or duplicate attribute-hash variants.

## Database Notes

`product_variants` includes:
- `discount_price DECIMAL(10,2) NULL`
- `discount_start DATETIME NULL`
- `discount_end DATETIME NULL`
- index `idx_discount_window(discount_start, discount_end)`

Migration file:
- `migrations/20260305_add_variant_discount.sql`
