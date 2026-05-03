# Frontend API Discovery Report

**Generated:** March 9, 2026  
**Source:** `/frontend/src/services/api.js`, `/frontend/src/services/wcApi.service.js`

---

## Complete Frontend API Calls Inventory

### Legend
- **SERVICE:** API service module
- **FILE:** Source file containing the API call
- **COMPONENT:** Primary component using this API

---

## 1. Authentication APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| POST | `/auth/register` | `authAPI.register` | `services/api.js` | Auth pages |
| POST | `/auth/login` | `authAPI.login` | `services/api.js` | Login page |
| GET | `/auth/me` | `authAPI.getMe` | `services/api.js` | AuthContext |
| GET | `/auth/check-admin` | `authAPI.checkAdmin` | `services/api.js` | Admin pages |

---

## 2. Products APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/products` | `productsAPI.getAll` | `services/api.js` | ProductsPage, Home |
| GET | `/products/:id` | `productsAPI.getById` | `services/api.js` | ProductDetail |
| GET | `/categories` | `productsAPI.getCategories` | `services/api.js` | Category filters |
| GET | `/recommendations/:id` | `productsAPI.getRecommendations` | `services/api.js` | ProductDetail |
| GET | `/products` | `wcProductsAPI.getProducts` | `services/wcApi.service.js` | AdminProductsPage |
| GET | `/products/:id` | `wcProductsAPI.getProduct` | `services/wcApi.service.js` | AdminProductsPage |
| POST | `/products` | `wcProductsAPI.createProduct` | `services/wcApi.service.js` | AdminProductsPage |
| PUT | `/products/:id` | `wcProductsAPI.updateProduct` | `services/wcApi.service.js` | AdminProductsPage |
| POST | `/products/:id/variants` | `wcProductsAPI.addVariant` | `services/wcApi.service.js` | AdminProductsPage |
| DELETE | `/products/:id` | `wcProductsAPI.deleteProduct` | `services/wcApi.service.js` | AdminProductsPage |

---

## 3. Categories APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/categories` | `categoriesAPI.getAll` | `services/api.js` | Category pages |
| GET | `/categories/:id` | `categoriesAPI.getById` | `services/api.js` | Category pages |
| GET | `/categories/slug/:slug` | `categoriesAPI.getBySlug` | `services/api.js` | CategoryPage |
| POST | `/categories` | `categoriesAPI.create` | `services/api.js` | AdminProductsPage |
| PUT | `/categories/:id` | `categoriesAPI.update` | `services/api.js` | AdminProductsPage |
| DELETE | `/categories/:id` | `categoriesAPI.delete` | `services/api.js` | AdminProductsPage, CategoriesPage |
| GET | `/categories` | `wcCategoriesAPI.getCategories` | `services/wcApi.service.js` | AdminWooCommercePage |
| POST | `/categories` | `wcCategoriesAPI.createCategory` | `services/wcApi.service.js` | AdminWooCommercePage |
| DELETE | `/categories/:id` | `wcCategoriesAPI.deleteCategory` | `services/wcApi.service.js` | AdminWooCommercePage |

---

## 4. Cart APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/cart` | `cartAPI.get` | `services/api.js` | CartContext, CartPage |
| POST | `/cart/add` | `cartAPI.add` | `services/api.js` | CartContext, ProductDetail |
| PUT | `/cart/item/:id` | `cartAPI.updateQuantity` | `services/api.js` | CartPage |
| DELETE | `/cart/item/:id` | `cartAPI.remove` | `services/api.js` | CartPage |
| DELETE | `/cart` | `cartAPI.clear` | `services/api.js` | CartPage, Checkout |

---

## 5. Wishlist APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/wishlist` | `wishlistAPI.get` | `services/api.js` | WishlistPage |
| POST | `/wishlist/:productId` | `wishlistAPI.add` | `services/api.js` | ProductDetail |
| DELETE | `/wishlist/:productId` | `wishlistAPI.remove` | `services/api.js` | WishlistPage |

---

## 6. Orders APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| POST | `/orders/create` | `ordersAPI.create` | `services/api.js` | Checkout |
| POST | `/orders/:orderId/payment` | `ordersAPI.confirmPayment` | `services/api.js` | Checkout |
| GET | `/orders` | `ordersAPI.getAll` | `services/api.js` | OrderHistory |
| GET | `/orders/:id` | `ordersAPI.getById` | `services/api.js` | OrderDetail |
| GET | `/orders/track/:orderNumber` | `ordersAPI.track` | `services/api.js` | OrderTracking |
| GET | `/orders` | `wcOrdersAPI.getOrders` | `services/wcApi.service.js` | AdminOrdersPage |
| GET | `/orders/:id` | `wcOrdersAPI.getOrder` | `services/wcApi.service.js` | AdminOrdersPage |
| POST | `/orders` | `wcOrdersAPI.createOrder` | `services/wcApi.service.js` | AdminOrdersPage |
| POST | `/orders/:id/paid` | `wcOrdersAPI.markAsPaid` | `services/wcApi.service.js` | AdminOrdersPage |
| POST | `/orders/:id/notes` | `wcOrdersAPI.addNote` | `services/wcApi.service.js` | AdminOrdersPage |

---

## 7. Blogs APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/blogs` | `blogAPI.getPosts` | `services/api.js` | BlogPage |
| GET | `/blogs/slug/:slug` | `blogAPI.getPostBySlug` | `services/api.js` | BlogPostPage |
| GET | `/blogs/:postId` | `blogAPI.getPostById` | `services/api.js` | BlogPostPage |
| GET | `/blogs/categories` | `blogAPI.getCategories` | `services/api.js` | BlogPage |
| GET | `/blogs/tags` | `blogAPI.getTags` | `services/api.js` | BlogPage |
| GET | `/blogs/:postId/related` | `blogAPI.getRelatedPosts` | `services/api.js` | BlogPostPage |
| GET | `/blogs/:postId/comments` | `blogAPI.getComments` | `services/api.js` | BlogPostPage |
| POST | `/blogs/:postId/comment` | `blogAPI.addComment` | `services/api.js` | BlogPostPage |
| GET | `/blogs/admin/analytics` | `blogAPI.getAnalytics` | `services/api.js` | AdminBlogsPage |
| GET | `/blogs/capabilities` | `blogAPI.getCapabilities` | `services/api.js` | AdminBlogsPage |
| POST | `/blogs` | `blogAPI.createPost` | `services/api.js` | BlogCreatePage |
| PUT | `/blogs/:postId` | `blogAPI.updatePost` | `services/api.js` | AdminBlogEditPage |
| POST | `/blogs/:postId/publish` | `blogAPI.publishPost` | `services/api.js` | AdminBlogsPage |
| POST | `/blogs/:postId/archive` | `blogAPI.archivePost` | `services/api.js` | AdminBlogsPage |

---

## 8. Coupons APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/coupons` | `couponsAPI.getAll` | `services/api.js` | AdminCouponsPage |
| GET | `/coupons/:id` | `couponsAPI.getById` | `services/api.js` | AdminCouponsPage |
| POST | `/coupons` | `couponsAPI.create` | `services/api.js` | AdminCouponsPage |
| PUT | `/coupons/:id` | `couponsAPI.update` | `services/api.js` | AdminCouponsPage |
| DELETE | `/coupons/:id` | `couponsAPI.delete` | `services/api.js` | AdminCouponsPage |
| GET | `/coupons` | `wcCouponsAPI.getCoupons` | `services/wcApi.service.js` | AdminWooCommercePage |
| POST | `/coupons` | `wcCouponsAPI.createCoupon` | `services/wcApi.service.js` | AdminWooCommercePage |
| GET | `/coupons/validate/:code` | `wcCouponsAPI.validateCoupon` | `services/wcApi.service.js` | CartPage |

---

## 9. Warehouse APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/admin/warehouses` | `warehouseAPI.getAll` | `services/api.js` | AdminWarehousePage |
| GET | `/admin/inventory/low-stock` | `warehouseAPI.getLowStockAlerts` | `services/api.js` | AdminInventoryPage |

---

## 10. Analytics APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/admin/analytics/overview` | `analyticsAPI.getOverview` | `services/api.js` | AdminAnalyticsPage |
| GET | `/admin/analytics/sales` | `analyticsAPI.getSales` | `services/api.js` | AdminAnalyticsPage |
| GET | `/admin/analytics/products` | `analyticsAPI.getProducts` | `services/api.js` | AdminAnalyticsPage |
| GET | `/admin/analytics/revenue` | `analyticsAPI.getRevenue` | `services/api.js` | AdminAnalyticsPage |
| GET | `/reports/sales` | `wcReportsAPI.getSalesReport` | `services/wcApi.service.js` | AdminAnalyticsPage |
| GET | `/reports/top-sellers` | `wcReportsAPI.getTopSellers` | `services/wcApi.service.js` | AdminAnalyticsPage |

---

## 11. Upload APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| POST | `/upload/image` | `uploadAPI.uploadImage` | `services/api.js` | BlogCreatePage, AdminProductsPage |
| POST | `/upload/images` | `uploadAPI.uploadImages` | `services/api.js` | AdminProductsPage |
| POST | `/upload` | (fetch) | `AdminWooCommercePage.js` | AdminWooCommercePage |

---

## 12. Search APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/search` | `searchAPI.search` | `services/api.js` | SearchPage |
| GET | `/search/suggestions` | `searchAPI.getSuggestions` | `services/api.js` | SearchBar |

---

## 13. Reviews APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/products/:id/reviews` | `reviewsAPI.getProductReviews` | `services/api.js` | ProductDetail |
| POST | `/products/:id/reviews` | `reviewsAPI.createReview` | `services/api.js` | ProductDetail |
| GET | `/users/:userId/reviews` | `reviewsAPI.getUserReviews` | `services/api.js` | ProfilePage |

---

## 14. Recommendations APIs

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/recommendations/:productId` | `recommendationsAPI.getProductRecommendations` | `services/api.js` | ProductDetail |
| GET | `/recommendations/personal` | `recommendationsAPI.getPersonalized` | `services/api.js` | HomePage |

---

## 15. Customers APIs (WooCommerce)

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| GET | `/customers` | `wcCustomersAPI.getCustomers` | `services/wcApi.service.js` | AdminCustomersPage |
| GET | `/customers/:id` | `wcCustomersAPI.getCustomer` | `services/wcApi.service.js` | AdminCustomersPage |
| POST | `/customers` | `wcCustomersAPI.createCustomer` | `services/wcApi.service.js` | AdminCustomersPage |
| PUT | `/customers/:id` | `wcCustomersAPI.updateCustomer` | `services/wcApi.service.js` | AdminCustomersPage |
| GET | `/customers/lookup/:email` | `wcCustomersAPI.lookupCustomer` | `services/wcApi.service.js` | AdminCustomersPage |

---

## 16. Virtual Try-On (External API)

| METHOD | ENDPOINT | SERVICE | FILE | COMPONENT |
|--------|----------|---------|------|-----------|
| POST | `/upload` | (fetch) | `TryOnModal.js` | VirtualTryOn |
| GET | `{resultUrl}` | (fetch) | `TryOnModal.js` | VirtualTryOn |

---

## Summary Statistics

| API Category | Total Calls | GET | POST | PUT | DELETE |
|--------------|-------------|-----|------|-----|--------|
| Authentication | 4 | 2 | 2 | 0 | 0 |
| Products (Native + WC) | 10 | 4 | 3 | 1 | 2 |
| Categories (Native + WC) | 9 | 4 | 2 | 1 | 2 |
| Cart | 5 | 1 | 1 | 1 | 2 |
| Wishlist | 3 | 1 | 1 | 0 | 1 |
| Orders (Native + WC) | 10 | 4 | 5 | 0 | 0 |
| Blogs | 14 | 9 | 4 | 1 | 0 |
| Coupons (Native + WC) | 7 | 4 | 2 | 1 | 1 |
| Warehouse | 2 | 2 | 0 | 0 | 0 |
| Analytics (Native + WC) | 6 | 6 | 0 | 0 | 0 |
| Upload | 3 | 0 | 3 | 0 | 0 |
| Search | 2 | 2 | 0 | 0 | 0 |
| Reviews | 3 | 2 | 1 | 0 | 0 |
| Recommendations | 2 | 2 | 0 | 0 | 0 |
| Customers (WC) | 5 | 3 | 1 | 1 | 0 |
| Virtual Try-On | 2 | 1 | 1 | 0 | 0 |
| **TOTAL** | **87** | **43** | **25** | **6** | **8** |

---

## Files Using API Calls

| File | API Count | Primary Purpose |
|------|-----------|-----------------|
| `services/api.js` | 60+ | Main API service layer |
| `services/wcApi.service.js` | 26+ | WooCommerce API service |
| `context/AuthContext.js` | 1 | Authentication state |
| `context/CartContext.js` | 4 | Cart state management |
| `pages/AdminProductsPage.js` | 8 | Product management |
| `pages/AdminWooCommercePage.js` | 6 | WC management |
| `pages/BlogPage.js` | 3 | Blog listing |
| `pages/BlogCreatePage.js` | 2 | Blog creation |
| `pages/AdminBlogsPage.js` | 4 | Blog management |
| `pages/CartPage.js` | 5 | Cart operations |
| `pages/Checkout.js` | 3 | Order creation |
| `pages/ProductDetail.js` | 5 | Product display |
| `pages/AdminAnalyticsPage.js` | 4 | Analytics dashboard |

---

## API Service Architecture

```
frontend/src/services/
├── api.js              # Main API service (native backend)
├── wcApi.service.js    # WooCommerce API service
└── (axios instance)    # Configured in api.js
```

### Axios Configuration
```javascript
{
  baseURL: "/api/v1",  // Relative URL (NGINX proxy)
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30000
}
```

### Request Interceptor
- Automatically attaches JWT token from localStorage
- Adds `Authorization: Bearer {token}` header

### Response Interceptor
- Handles standard `{ success, message, data }` format
- Extracts `data` on success
- Rejects on failure with error message

---

**End of Frontend API Discovery Report**
