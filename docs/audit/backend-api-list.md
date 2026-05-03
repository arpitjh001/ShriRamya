# Backend API Discovery Report

**Generated:** March 9, 2026  
**Source:** `/backend_node/src/routes/v1/`

---

## Complete API Endpoint Inventory

### Legend
- **AUTH:** Authentication required
- **ROLES:** Required roles for access
- **CONTROLLER:** Handling controller function

---

## 1. Authentication APIs (`/api/v1/auth`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/auth/register` | `authController.register` | No | - |
| POST | `/auth/login` | `authController.login` | No | - |
| POST | `/auth/refresh` | `authController.refreshTokens` | No | - |
| GET | `/auth/me` | `authController.getMe` | Yes | Any |
| GET | `/auth/check-admin` | `authController.checkAdmin` | Yes | Admin |

---

## 2. Products APIs (`/api/v1/products`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/products` | `productController.getProducts` | No (optional) | - |
| GET | `/products/:product_id` | `productController.getProduct` | No (optional) | - |
| POST | `/products` | `productController.createProduct` | Yes | Admin, Editor |
| PUT | `/products/:product_id` | `productController.updateProduct` | Yes | Admin, Editor |
| DELETE | `/products/:product_id` | `productController.deleteProduct` | Yes | Admin |
| GET | `/products/:product_id/categories` | `productController.getProductCategories` | No (optional) | - |
| POST | `/products/:product_id/categories` | `productController.assignCategoriesToProduct` | Yes | Admin, Editor |
| DELETE | `/products/:product_id/categories/:category_id` | `productController.removeCategoryFromProduct` | Yes | Admin |
| POST | `/products/:product_id/variants` | `productController.addVariant` | Yes | Admin, Editor |
| PUT | `/products/:product_id/variants/:variant_id` | `productController.updateVariant` | Yes | Admin, Editor |
| DELETE | `/products/:product_id/variants/:variant_id` | `productController.deleteVariant` | Yes | Admin |
| GET | `/products/:product_id/recommendations` | `recommendationController.getProductRecommendations` | No (optional) | - |

---

## 3. Orders APIs (`/api/v1/orders`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/orders` | `orderController.createOrder` | Yes | Any |
| GET | `/orders/my` | `orderController.getCustomerOrders` | Yes | Any |
| GET | `/orders/:id` | `orderController.getOrder` | Yes | Any |
| POST | `/orders/my/:id/cancel` | `orderController.cancelOrder` | Yes | Any |
| GET | `/orders/:id/tracking` | `shipmentController.getOrderTracking` | Yes | Any |
| GET | `/orders/:id/shipments` | `shipmentController.getOrderShipments` | Yes | Any |
| POST | `/orders/:id/refunds` | `refundController.createRefund` | Yes | Any |
| GET | `/orders/:id/refunds` | `refundController.getOrderRefunds` | Yes | Any |
| GET | `/orders/admin/all` | `orderController.getAllOrders` | Yes | Admin |
| PATCH | `/orders/admin/:id/status` | `orderController.updateOrderStatus` | Yes | Admin |
| GET | `/orders/admin/shipments` | `shipmentController.getAllShipments` | Yes | Admin |
| GET | `/orders/admin/shipments/ready-to-ship` | `shipmentController.getReadyToShip` | Yes | Admin |
| GET | `/orders/admin/shipments/pending` | `shipmentController.getPendingShipments` | Yes | Admin |
| POST | `/orders/admin/:id/shipments` | `shipmentController.createShipment` | Yes | Admin |
| PATCH | `/orders/admin/shipments/:id/tracking` | `shipmentController.updateTracking` | Yes | Admin |
| POST | `/orders/admin/shipments/:id/ship` | `shipmentController.markAsShipped` | Yes | Admin |
| POST | `/orders/admin/shipments/:id/deliver` | `shipmentController.markAsDelivered` | Yes | Admin |
| DELETE | `/orders/admin/shipments/:id` | `shipmentController.deleteShipment` | Yes | Admin |
| POST | `/orders/admin/refunds/:id/approve` | `refundController.approveRefund` | Yes | Admin |
| POST | `/orders/admin/refunds/:id/process` | `refundController.processRefund` | Yes | Admin |
| POST | `/orders/admin/refunds/:id/reject` | `refundController.rejectRefund` | Yes | Admin |
| GET | `/orders/admin/refunds/:id` | `refundController.getRefund` | Yes | Admin |
| GET | `/orders/admin/analytics/orders` | `orderController.getOrderAnalytics` | Yes | Admin |
| POST | `/orders/webhooks/payment/razorpay` | `webhookController.handleRazorpayWebhook` | No | - |
| POST | `/orders/webhooks/payment/stripe` | `webhookController.handleStripeWebhook` | No | - |

---

## 4. Blogs APIs (`/api/v1/blogs`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/blogs` | `blogController.getPosts` | No (optional) | - |
| GET | `/blogs/search` | `blogController.searchPosts` | No (optional) | - |
| GET | `/blogs/tags` | `blogController.getTags` | No | - |
| GET | `/blogs/capabilities` | `blogController.getCapabilities` | Yes | Any |
| GET | `/blogs/slug/:slug` | `blogController.getPostBySlug` | No (optional) | - |
| GET | `/blogs/:post_id/related` | `blogController.getRelatedPosts` | No (optional) | - |
| GET | `/blogs/:post_id/comments` | `blogController.getComments` | No (optional) | - |
| POST | `/blogs/:post_id/comment` | `blogController.addComment` | Yes | Any |
| GET | `/blogs/:post_id` | `blogController.getPost` | No (optional) | - |
| POST | `/blogs` | `blogController.createPost` | Yes | Editor, Admin |
| PUT | `/blogs/:post_id` | `blogController.updatePost` | Yes | Editor, Admin |
| POST | `/blogs/:post_id/publish` | `blogController.publishPost` | Yes | Editor, Admin |
| POST | `/blogs/:post_id/archive` | `blogController.archivePost` | Yes | Editor, Admin |
| GET | `/blogs/admin/analytics` | `blogController.getAnalytics` | Yes | Admin |
| DELETE | `/blogs/:post_id` | `blogController.deletePost` | Yes | Admin |

---

## 5. User Management APIs (`/api/v1/users`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/users` | `userManagementController.getUsers` | Yes | Admin |
| GET | `/users/:id` | `userManagementController.getUserById` | Yes | Admin |
| POST | `/users/sync` | `userManagementController.syncUserMapping` | Yes | Admin |
| POST | `/users/:userId/roles` | `userManagementController.assignRole` | Yes | Admin |
| POST | `/users/:userId/roles/multiple` | `userManagementController.assignMultipleRoles` | Yes | Admin |
| DELETE | `/users/:userId/roles/:roleId` | `userManagementController.removeRole` | Yes | Admin |
| GET | `/users/roles` | `userManagementController.getRoles` | Yes | Admin, Editor |
| GET | `/users/permissions` | `userManagementController.getPermissions` | Yes | Any |
| POST | `/users/roles` | `userManagementController.createRole` | Yes | Admin |
| DELETE | `/users/roles/:id` | `userManagementController.deleteRole` | Yes | Admin |

---

## 6. Tenants APIs (`/api/v1/tenants`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/tenants` | `tenantController.createTenant` | No | - |
| GET | `/tenants` | `tenantController.getAllTenants` | Yes | Admin |
| GET | `/tenants/current` | `tenantController.getCurrentTenant` | Yes | Any |
| GET | `/tenants/:id` | `tenantController.getTenantById` | Yes | Admin |
| PUT | `/tenants/:id` | `tenantController.updateTenant` | Yes | Admin |
| GET | `/tenants/settings` | `tenantController.getTenantSettings` | Yes | Any |
| PUT | `/tenants/settings/:key` | `tenantController.updateTenantSetting` | Yes | Admin |
| GET | `/tenants/roles` | `tenantController.getTenantRoles` | Yes | Any |
| GET | `/tenants/my-roles` | `tenantController.getMyRoles` | Yes | Any |

---

## 7. Categories APIs (`/api/v1/categories`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/categories` | `categoryController.getAllCategories` | No | - |
| POST | `/categories` | `categoryController.createCategory` | Yes | Any |
| GET | `/categories/:categoryId` | `categoryController.getCategoryById` | No | - |
| GET | `/categories/slug/:slug` | `categoryController.getCategoryBySlug` | No | - |
| PUT | `/categories/:categoryId` | `categoryController.updateCategory` | Yes | Any |
| DELETE | `/categories/:categoryId` | `categoryController.deleteCategory` | Yes | Any |
| GET | `/categories/:categoryId/products` | `categoryController.getProductsByCategory` | No | - |

---

## 8. Cart APIs (`/api/v1/cart`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/cart` | `cartController.getCart` | No | - |
| POST | `/cart/add` | `cartController.addToCart` | No | - |
| PUT | `/cart/item/:id` | `cartController.updateCartItem` | No | - |
| DELETE | `/cart/item/:id` | `cartController.removeCartItem` | No | - |
| DELETE | `/cart` | `cartController.clearCart` | No | - |
| GET | `/cart/:id` | `cartController.getCartById` | No | - |

---

## 9. Customers APIs (`/api/v1/customers`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/customers` | `customerController.getCustomers` | Yes | Admin |
| GET | `/customers/:customer_id` | `customerController.getCustomer` | Yes | Admin |
| POST | `/customers` | `customerController.createCustomer` | Yes | Admin |
| PUT | `/customers/:customer_id` | `customerController.updateCustomer` | Yes | Admin |
| DELETE | `/customers/:customer_id` | `customerController.deleteCustomer` | Yes | Admin |

---

## 10. Coupons APIs (`/api/v1/coupons`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/coupons` | `couponController.getCoupons` | Yes | Admin |
| GET | `/coupons/:coupon_id` | `couponController.getCoupon` | Yes | Admin |
| POST | `/coupons` | `couponController.createCoupon` | Yes | Admin |
| PUT | `/coupons/:coupon_id` | `couponController.updateCoupon` | Yes | Admin |
| DELETE | `/coupons/:coupon_id` | `couponController.deleteCoupon` | Yes | Admin |

---

## 11. Search APIs (`/api/v1/search`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/search` | `searchController.searchProducts` | No | - |
| GET | `/search/suggestions` | `searchController.getSuggestions` | No | - |
| GET | `/search/filters` | `searchController.getSearchFilters` | No | - |
| GET | `/search/sku/:sku` | `searchController.searchBySku` | No | - |
| POST | `/search/rebuild-index` | `searchController.rebuildSearchIndex` | Yes | Admin |

---

## 12. Reviews APIs (`/api/v1/reviews`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/reviews/products/:id/reviews` | `reviewController.createReview` | Yes | Customer, Admin |
| GET | `/reviews/products/:id/reviews` | `reviewController.getProductReviews` | No | - |
| GET | `/reviews/users/:userId/reviews` | `reviewController.getUserReviews` | No | - |
| GET | `/reviews/:id` | `reviewController.getReview` | No | - |
| POST | `/reviews/:id/helpful` | `reviewController.markReviewHelpful` | Yes | Customer, Admin |
| PUT | `/reviews/:id/approve` | `reviewController.approveReview` | Yes | Admin |
| DELETE | `/reviews/:id` | `reviewController.deleteReview` | Yes | Customer, Admin |

---

## 13. Recommendations APIs (`/api/v1/recommendations`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/recommendations/:id` | `recommendationController.getProductRecommendations` | No | - |
| GET | `/recommendations/personal` | `recommendationController.getPersonalizedRecommendations` | Yes | Customer, Admin |
| DELETE | `/recommendations/cache/:productId` | `recommendationController.clearRecommendationCache` | Yes | Admin |

---

## 14. Analytics APIs (`/api/v1/admin/analytics`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/admin/analytics/overview` | `analyticsController.getDashboardOverview` | Yes | Admin |
| GET | `/admin/analytics/sales` | `analyticsController.getSalesAnalytics` | Yes | Admin |
| GET | `/admin/analytics/products` | `analyticsController.getProductAnalytics` | Yes | Admin |
| GET | `/admin/analytics/revenue` | `analyticsController.getRevenueAnalytics` | Yes | Admin |

---

## 15. Warehouse APIs (`/api/v1/admin/warehouses`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/admin/warehouses` | `warehouseController.createWarehouse` | Yes | Admin |
| GET | `/admin/warehouses` | `warehouseController.getWarehouses` | Yes | Admin |
| GET | `/admin/warehouses/:id` | `warehouseController.getWarehouse` | Yes | Admin |
| PUT | `/admin/warehouses/:id` | `warehouseController.updateWarehouse` | Yes | Admin |
| DELETE | `/admin/warehouses/:id` | `warehouseController.deleteWarehouse` | Yes | Admin |
| POST | `/admin/warehouses/:id/stock` | `warehouseController.addStock` | Yes | Admin |
| GET | `/admin/warehouses/variants/:variantId/inventory` | `warehouseController.getVariantInventory` | Yes | Admin |
| GET | `/admin/warehouses/inventory/low-stock` | `warehouseController.getLowStockAlerts` | Yes | Admin |

---

## 16. Fraud Detection APIs (`/api/v1/admin/fraud`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/admin/fraud/flagged-orders` | `fraudController.getFlaggedOrders` | Yes | Admin |
| POST | `/admin/fraud/orders/:id/unflag` | `fraudController.unflagOrder` | Yes | Admin |
| GET | `/admin/fraud/statistics` | `fraudController.getFraudStatistics` | Yes | Admin |

---

## 17. Notifications APIs (`/api/v1/notifications`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| GET | `/notifications` | `notificationController.getUserNotifications` | Yes | Customer, Admin |
| GET | `/notifications/unread-count` | `notificationController.getUnreadCount` | Yes | Customer, Admin |
| PUT | `/notifications/:id/read` | `notificationController.markAsRead` | Yes | Customer, Admin |
| PUT | `/notifications/read-all` | `notificationController.markAllAsRead` | Yes | Customer, Admin |

---

## 18. Upload APIs (`/api/v1/upload`)

| METHOD | ENDPOINT | CONTROLLER | AUTH | ROLES |
|--------|----------|------------|------|-------|
| POST | `/upload/image` | `uploadController.uploadImage` | Yes | Admin |
| POST | `/upload/images` | `uploadController.uploadMultipleImages` | Yes | Admin |

---

## Summary Statistics

| Category | Total Endpoints | Public | Authenticated | Admin Only |
|----------|----------------|--------|---------------|------------|
| Authentication | 5 | 3 | 2 | 1 |
| Products | 12 | 4 | 8 | 0 |
| Orders | 24 | 2 | 22 | 17 |
| Blogs | 15 | 9 | 6 | 2 |
| User Management | 10 | 0 | 10 | 8 |
| Tenants | 9 | 1 | 8 | 4 |
| Categories | 7 | 5 | 2 | 0 |
| Cart | 6 | 6 | 0 | 0 |
| Customers | 5 | 0 | 5 | 5 |
| Coupons | 5 | 0 | 5 | 5 |
| Search | 5 | 4 | 1 | 1 |
| Reviews | 7 | 4 | 3 | 1 |
| Recommendations | 3 | 1 | 2 | 1 |
| Analytics | 4 | 0 | 4 | 4 |
| Warehouse | 8 | 0 | 8 | 8 |
| Fraud | 3 | 0 | 3 | 3 |
| Notifications | 4 | 0 | 4 | 0 |
| Upload | 2 | 0 | 2 | 2 |
| **TOTAL** | **134** | **34** | **100** | **62** |

---

**End of Backend API Discovery Report**
