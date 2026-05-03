# Native Node.js Product & Variant Engine (Phase 1)

This document details the first phase of migrating the backend away from WooCommerce to a purely native, scalable Node.js architecture for managing products and variants.

## 🧹 WooCommerce Removal Checklist
- [x] **No more `wcId` or `wc_variant_id`**: Dropped from MySQL schema.
- [x] **No Woo REST calls**: The `ProductService` no longer imports or calls `wcClient`.
- [x] **No Woo attribute sync**: Attributes are handled natively in the relational DB.
- [x] **No cartesian matrix generation**: Variants are explicitly defined with normalized hashes.
- [x] **No MongoDB caching**: Deprecated MongoDB models and repositories in favor of a single source of truth (MySQL) for relational consistency.

## 📁 Architecture & Folder Structure

The application strictly follows Clean Architecture principles (`Controllers → Services → Repositories → DB`):

```text
src/
├── controllers/
│   └── product.controller.js  # HTTP request handling and response formatting
├── services/
│   └── product.service.js     # Business logic orchestration
├── repositories/
│   └── product.sql.repository.js # Direct MySQL interaction & transactions
├── validations/
│   └── product.validation.js  # Joi schema validation
├── models/                    # (Deprecated for Products, kept for Users)
```

## 🗄️ Relational Schema

Designed for high performance and integrity, resolving the "cartesian explosion" problem:

- `products`: Base product details (`name`, `description`, `base_price`, `status`).
- `product_attributes`: Defines attribute names tied to a product (e.g., "Color", "Size").
- `product_attribute_values`: The allowed values for those attributes (e.g., "Red", "Blue", "L").
- `product_variants`: Explicitly defined sellable configurations.
  - Features `attributes_json` for flexible querying.
  - Features `attributes_hash` (e.g., SHA256 of sorted attributes) combined with `product_id` as a **UNIQUE INDEX** to prevent duplicate variants.
  - Features a unique `sku`.
- `variant_inventory`: Dedicated inventory system.
  - Enforces `stock_level >= 0` check constraints.
  - Supports `low_stock_threshold`.

## 📦 Example API Payloads

### 1. Create a Variable Product

**POST `/api/v1/products`**
```json
{
  "name": "Classic Cotton T-Shirt",
  "description": "Comfortable 100% cotton t-shirt.",
  "basePrice": 0,
  "status": "published",
  "attributes": [
    {
      "name": "Color",
      "values": ["Red", "Black"]
    },
    {
      "name": "Size",
      "values": ["M", "L"]
    }
  ],
  "variants": [
    {
      "sku": "TS-RED-M",
      "price": 19.99,
      "stock": 50,
      "attributes": {
        "Color": "Red",
        "Size": "M"
      }
    },
    {
      "sku": "TS-BLK-L",
      "price": 21.99,
      "stock": 30,
      "attributes": {
        "Color": "Black",
        "Size": "L"
      }
    }
  ]
}
```

### 2. Add a Variant Later

**POST `/api/v1/products/:product_id/variants`**
```json
{
  "sku": "TS-RED-L",
  "price": 21.99,
  "stock": 15,
  "attributes": {
    "Color": "Red",
    "Size": "L"
  }
}
```

## 🌱 Sample Seeding Code (Node.js)

You can run this snippet locally to seed products programmatically, without relying on WooCommerce.

```javascript
// scripts/seed_native.js
const mysqlRepository = require('../src/repositories/product.sql.repository');
const { mysqlPool } = require('../src/config/db');

async function seed() {
  try {
    const productData = {
      name: "Designer Denim Jacket",
      description: "Premium handcrafted denim.",
      basePrice: 89.99,
      status: "published",
      attributes: [
        { name: "Material", values: ["Denim", "Corduroy"] },
        { name: "Fit", values: ["Slim", "Regular"] }
      ]
    };

    console.log("Creating product...");
    const productId = await mysqlRepository.createProduct(productData);
    
    console.log("Adding variants...");
    await mysqlRepository.addVariant(productId, {
      sku: "JKT-DEN-SLIM",
      price: 89.99,
      stock: 12,
      attributes: { "Material": "Denim", "Fit": "Slim" }
    });

    await mysqlRepository.addVariant(productId, {
      sku: "JKT-CORD-REG",
      price: 99.99,
      stock: 5,
      attributes: { "Material": "Corduroy", "Fit": "Regular" }
    });

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
```
