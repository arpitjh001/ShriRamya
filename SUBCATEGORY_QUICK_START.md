# Quick Start Guide - Subcategory Integration

## Installation & Deployment (5 minutes)

### 1. Create Database Tables
```bash
cd backend_node
node src/migrations/create_subcategory_tables.js
```

**Output**: Should see three ✅ confirmations:
- ✅ subcategory_groups table created
- ✅ subcategory_values table created  
- ✅ product_subcategory_values table created

### 2. Rebuild Docker (Optional - if code changed)
```bash
docker compose build backend
docker compose up -d backend
```

### 3. Verify Deployment
```bash
# Test API
curl http://localhost:8001/api/v1/categories

# Should return HTTP 200 with category list
```

---

## Usage Guide

### For Admins - via Dashboard

1. **Create Categories & Subcategories**
   - Go to `Categories` page
   - Select a category (e.g., "Sarees")
   - Click "Manage Subcategories"
   - Add groups (e.g., "Fabric", "Occasion")
   - Add values to each group (e.g., "Silk", "Cotton")

2. **Add Subcategories to Products**
   - Go to `Products` page
   - Create or edit a product
   - Select category → subcategories section appears
   - Click badges to select values
   - Save product

3. **Verify**
   - Refresh product page
   - Re-open product
   - Selected subcategories should be checked

### For Developers - via API

#### Create Product with Subcategories
```javascript
const productData = {
  name: "Premium Silk Saree",
  description: "Beautiful hand-woven silk saree",
  basePrice: 5000,
  categories: [1],  // Category ID
  subcategoryValueIds: [1, 3],  // Subcategory value IDs
  images: ["url1", "url2"],
  variants: []
};

const response = await fetch('http://localhost:8001/api/v1/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});

const product = await response.json();
console.log(product.data.subcategories);
// [
//   { id: 1, name: "Silk", group_name: "Fabric" },
//   { id: 3, name: "Wedding", group_name: "Occasion" }
// ]
```

#### Get Product with Subcategories
```javascript
const response = await fetch('http://localhost:8001/api/v1/products/123');
const product = await response.json();
console.log(product.data.subcategories);
```

#### Update Product Subcategories
```javascript
const response = await fetch('http://localhost:8001/api/v1/products/123', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subcategoryValueIds: [1, 2, 4]
  })
});
```

#### Fetch Subcategory Groups for Category
```javascript
const response = await fetch('http://localhost:8001/api/v1/subcategories/groups/category/1');
const groups = await response.json();
// [
//   {
//     id: 1,
//     name: "Fabric",
//     values: [
//       { id: 1, name: "Silk" },
//       { id: 2, name: "Cotton" }
//     ]
//   }
// ]
```

---

## Code Structure

```
backend_node/
├── src/
│   ├── repositories/
│   │   ├── product.sql.repository.js      # Updated: subcategory methods
│   │   └── subcategory.sql.repository.js  # New: full CRUD operations
│   ├── validations/
│   │   └── product.validation.js          # Updated: subcategoryValueIds validation
│   ├── services/
│   │   └── product.service.js             # Uses repository methods
│   ├── controllers/
│   │   └── product.controller.js          # API endpoints
│   └── migrations/
│       └── create_subcategory_tables.js   # Create database tables
│
frontend/
└── src/
    └── pages/
        └── AdminProductsPage.js           # Updated: UI for subcategories
```

---

## Database Schema

### subcategory_groups
```sql
CREATE TABLE subcategory_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,           -- Parent category
  name VARCHAR(100) NOT NULL,         -- "Fabric", "Occasion"
  slug VARCHAR(100) NOT NULL,         -- URL-friendly version
  display_order INT DEFAULT 0,        -- Sort order
  UNIQUE (category_id, slug),         -- Prevent duplicates
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

### subcategory_values  
```sql
CREATE TABLE subcategory_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,              -- Parent group
  name VARCHAR(100) NOT NULL,         -- "Silk", "Cotton"
  slug VARCHAR(100) NOT NULL,         -- URL-friendly
  display_order INT DEFAULT 0,        -- Sort order
  UNIQUE (group_id, slug),            -- Prevent duplicates per group
  FOREIGN KEY (group_id) REFERENCES subcategory_groups(id) ON DELETE CASCADE
);
```

### product_subcategory_values (Junction Table)
```sql
CREATE TABLE product_subcategory_values (
  product_id INT NOT NULL,
  subcategory_value_id INT NOT NULL,
  PRIMARY KEY (product_id, subcategory_value_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (subcategory_value_id) REFERENCES subcategory_values(id) ON DELETE CASCADE
);
```

---

## Testing

### Run Tests
```bash
cd backend_node
npm test tests/product-subcategory.test.js
```

### Test Cases
- ✅ Creates product with subcategory values
- ✅ Returns subcategories from GET endpoint
- ✅ Updates product subcategories
- ✅ Clears subcategories with empty array

---

## Common Tasks

### Reset Subcategory Data
```bash
# Delete all product associations (keep definitions)
mysql> DELETE FROM product_subcategory_values;

# Delete all values
mysql> DELETE FROM subcategory_values;

# Delete all groups
mysql> DELETE FROM subcategory_groups;
```

### Export Subcategories
```bash
# Get all groups for a category
SELECT * FROM subcategory_groups WHERE category_id = 1;

# Get all values for a group
SELECT * FROM subcategory_values WHERE group_id = 1;
```

### Migrate Data
```bash
# Get products with specific subcategory
SELECT DISTINCT p.id, p.name
FROM products p
JOIN product_subcategory_values psv ON p.id = psv.product_id
WHERE psv.subcategory_value_id = 1;
```

---

## Support & Documentation

- **Full Documentation**: See SUBCATEGORY_INTEGRATION_DEPLOYMENT.md
- **API Docs**: http://localhost:8001/api/docs
- **Frontend Code**: frontend/src/pages/AdminProductsPage.js (lines 1150-1230)
- **Backend Code**: backend_node/src/repositories/subcategory.sql.repository.js

---

**Status**: ✅ Production Ready | **Last Updated**: 2026-03-25
