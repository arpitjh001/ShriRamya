# Multi-Tenant RBAC - Quick Reference Guide

## For Backend Developers

### 1. Creating New Endpoints

Always use the RBAC middleware pattern:

```javascript
const { auth, requireRole, requirePermission, ensureTenantIsolation } = require('../middlewares/authRBAC');

// Public endpoint (tenant-isolated)
router.get('/items', 
    ensureTenantIsolation,
    controller.getItems
);

// Admin/Editor only
router.post('/items', 
    auth,
    requireRole('Admin', 'Editor'),
    ensureTenantIsolation,
    controller.createItem
);

// Admin only with specific permission
router.delete('/items/:id', 
    auth,
    requireRole('Admin'),
    requirePermission('delete_item'),
    ensureTenantIsolation,
    controller.deleteItem
);
```

### 2. Repository Pattern

Always include `tenantId` parameter:

```javascript
// CREATE
async createItem(data, tenantId = 1) {
    await mysqlPool.query(
        'INSERT INTO items (name, tenant_id) VALUES (?, ?)',
        [data.name, tenantId]
    );
}

// READ
async getItemById(id, tenantId = 1) {
    const [rows] = await mysqlPool.query(
        'SELECT * FROM items WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
    );
    return rows[0];
}

// UPDATE
async updateItem(id, data, tenantId = 1) {
    // First verify item belongs to tenant
    const existing = await this.getItemById(id, tenantId);
    if (!existing) throw new Error('Item not found');
    
    await mysqlPool.query(
        'UPDATE items SET name = ? WHERE id = ? AND tenant_id = ?',
        [data.name, id, tenantId]
    );
}

// DELETE
async deleteItem(id, tenantId = 1) {
    const result = await mysqlPool.query(
        'DELETE FROM items WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
    );
    return result.affectedRows > 0;
}
```

### 3. Controller Pattern

Extract `tenantId` from request:

```javascript
const getTenantId = (req) => {
    return req.tenantId || req.user?.tenantId || 1;
};

const createItem = async (req, res, next) => {
    try {
        const tenantId = getTenantId(req);
        const item = await itemService.createItem(req.body, tenantId);
        return successResponse(res, item);
    } catch (error) {
        next(error);
    }
};
```

### 4. JWT Token Structure

```javascript
{
    "user_id": "123",
    "tenant_id": 5,
    "roles": ["Admin", "Editor"],
    "permissions": ["manage_products", "delete_product"],
    "role": "Admin",  // Primary role (legacy)
    "exp": 1234567890
}
```

### 5. Available Roles

- `Admin` - Full access
- `Editor` - Create/edit content, no delete, no orders/users
- `Customer` - Browse, cart, own orders

### 6. Common Permissions

```javascript
// Products
'manage_products', 'create_product', 'update_product', 'delete_product', 'view_products'

// Orders
'manage_orders', 'view_orders', 'view_own_orders'

// Users
'manage_users', 'view_users'

// Inventory
'manage_inventory', 'update_inventory', 'view_inventory'

// Blog
'manage_blog', 'create_blog', 'update_blog', 'delete_blog', 'view_blog'

// Settings
'manage_settings', 'view_settings'

// Dashboard
'view_dashboard'

// Cart/Checkout
'add_to_cart', 'view_cart', 'place_order'
```

---

## For Frontend Developers

### 1. Using Auth Context

```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
    const {
        user,
        isAdmin,
        isEditor,
        isCustomer,
        canDeleteProduct,
        canCreateBlog,
        roles,
        permissions,
        tenantId
    } = useAuth();

    return (
        <div>
            {isAdmin() && <AdminPanel />}
            {canDeleteProduct() && <DeleteButton />}
        </div>
    );
}
```

### 2. Using RBAC Guards

```javascript
import { 
    RoleGuard, 
    PermissionGuard, 
    AdminGuard, 
    EditorGuard 
} from '../components/RBACGuard';

function Dashboard() {
    return (
        <div>
            {/* Show only to Admin */}
            <AdminGuard>
                <UserManagement />
            </AdminGuard>

            {/* Show to Admin and Editor */}
            <EditorGuard>
                <ContentEditor />
            </EditorGuard>

            {/* Show to specific roles */}
            <RoleGuard roles={['Admin', 'Manager']}>
                <SpecialFeatures />
            </RoleGuard>

            {/* Show based on permission */}
            <PermissionGuard permissions={['delete_product']}>
                <DeleteButton />
            </PermissionGuard>
        </div>
    );
}
```

### 3. Available Auth Methods

```javascript
// Role checks
hasRole('Admin')
hasAnyRole(['Admin', 'Editor'])
isAdmin()
isEditor()
isCustomer()

// Permission checks
hasPermission('delete_product')
hasAnyPermission(['delete_product', 'delete_order'])

// Capability checks
canViewProducts()
canCreateProduct()
canEditProduct()
canDeleteProduct()
canViewOrders()
canManageOrders()
canViewUsers()
canManageUsers()
canViewInventory()
canManageInventory()
canViewBlogs()
canCreateBlog()
canEditBlog()
canDeleteBlog()
canViewSettings()
canManageSettings()
canViewDashboard()
canViewAnalytics()
```

### 4. Login with Tenant

```javascript
const { login } = useAuth();

// Login with tenant ID
await login(email, password, tenantId);

// Default is tenant 1
await login(email, password);
```

---

## Common Patterns

### Pattern 1: Admin-Only Feature

**Backend:**
```javascript
router.post('/admin-feature', 
    auth,
    requireRole('Admin'),
    controller.adminFeature
);
```

**Frontend:**
```javascript
<AdminGuard>
    <AdminFeatureComponent />
</AdminGuard>
```

### Pattern 2: Editor Can Create, Admin Can Delete

**Backend:**
```javascript
// Create - Editor and Admin
router.post('/items', 
    auth,
    requireRole('Editor', 'Admin'),
    controller.createItem
);

// Delete - Admin only
router.delete('/items/:id', 
    auth,
    requireRole('Admin'),
    controller.deleteItem
);
```

**Frontend:**
```javascript
<EditorGuard>
    <CreateButton />
</EditorGuard>

<AdminGuard>
    <DeleteButton />
</AdminGuard>
```

### Pattern 3: Tenant-Isolated Data

**Backend:**
```javascript
// Always use ensureTenantIsolation
router.get('/my-data', 
    auth,
    ensureTenantIsolation,
    controller.getMyData
);

// Repository enforces tenant filtering
async getData(params, tenantId) {
    return mysqlPool.query(
        'SELECT * FROM data WHERE tenant_id = ?',
        [tenantId]
    );
}
```

**Frontend:**
```javascript
// Automatically handled by backend
// Just make authenticated requests
const response = await api.get('/my-data');
```

---

## Testing

### Run RBAC Tests
```bash
cd backend_node
npm run test:rbac
```

### Run Tenant Isolation Tests
```bash
cd backend_node
npm run test:tenant
```

### Manual API Testing

```bash
# Create product as Admin
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","basePrice":100}'

# Try to delete as Editor (should fail)
curl -X DELETE http://localhost:8000/api/v1/products/1 \
  -H "Authorization: Bearer EDITOR_TOKEN"

# View products (tenant-isolated)
curl http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## Troubleshooting

### Issue: "Access token missing"
**Solution:** Ensure Bearer token is included in Authorization header

### Issue: "Insufficient permissions"
**Solution:** Check user has required role/permission

### Issue: "Product not found" (but it exists)
**Solution:** Verify tenant_id matches - cross-tenant access is blocked

### Issue: Frontend not showing admin menu
**Solution:** Check `user.roles` array contains 'Admin'

### Issue: Token doesn't have roles
**Solution:** Re-login after RBAC migration to get new token format

---

## Migration Commands

```bash
# Run schema migrations
npm run migrate

# Migrate existing data to default tenant
npm run migrate:data

# Seed RBAC roles (if needed)
npm run seed:rbac
```

---

## Security Checklist

- [ ] All endpoints use `auth` middleware where needed
- [ ] All endpoints use `ensureTenantIsolation` for data access
- [ ] All endpoints use `requireRole` for write operations
- [ ] Repository queries include `tenant_id` filter
- [ ] Frontend uses RBAC guards for UI elements
- [ ] Delete operations restricted to Admin only
- [ ] Editor cannot access orders/users
- [ ] Customer cannot access admin features

---

**Quick Start:** See `MULTI_TENANT_RBAC_IMPLEMENTATION.md` for full documentation
