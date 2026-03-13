# API Mapping Document - ShriRamya E-Commerce Platform

**Generated:** 2026-03-13  
**Version:** 2.0.0

---

## FRONTEND → BACKEND MAPPING TABLE

### Authentication APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| AuthDialog.js | `/auth/register` | `/api/v1/auth/register` | authController.register | POST | No | `{ success, data: { user, token } }` |
| AuthDialog.js | `/auth/login` | `/api/v1/auth/login` | authController.login | POST | No | `{ success, data: { user, token } }` |
| AccountPage.js | `/auth/me` | `/api/v1/auth/me` | authController.getMe | GET | Yes | `{ success, data: { user } }` |
| AdminProductsPage.js | `/auth/check-admin` | `/api/v1/auth/check-admin` | authController.checkAdmin | GET | Yes (Admin) | `{ success, data: { isAdmin } }` |

### Product APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| HomePage.js | `/products` | `/api/v1/products` | productController.getProducts | GET | No | `{ success, data: { products, pagination } }` |
| ProductsPage.js | `/products` | `/api/v1/products` | productController.getProducts | GET | No | `{ success, data: { products, pagination } }` |
| ProductDetailPage.js | `/products/:id` | `/api/v1/products/:product_id` | productController.getProduct | GET | No | `{ success, data: { product } }` |
| ProductDetailPage.js | `/products/:id/recommendations` | `/api/v1/products/:product_id/recommendations` | recommendationController.getProductRecommendations | GET | No | `{ success, data: { productId, recommendations, count } }` |
| ProductDetailPage.js | `/products/:id/reviews` | `/api/v1/reviews/products/:id/reviews` | reviewController.getProductReviews | GET | No | `{ success, data: { reviews, pagination } }` |
| CategoryPage.js | `/categories/slug/:slug` | `/api/v1/categories/slug/:slug` | categoryController.getCategoryBySlug | GET | No | `{ success, data: { category, products } }` |
| CategoriesPage.js | `/categories` | `/api/v1/categories` | categoryController.getAllCategories | GET | No | `{ success, data: { categories } }` |
| AdminProductsPage.js | `/products` | `/api/v1/products` | productController.createProduct | POST | Yes (Admin/Editor) | `{ success, data: { product } }` |
| AdminProductsPage.js | `/products/:id` | `/api/v1/products/:product_id` | productController.updateProduct | PUT | Yes (Admin/Editor) | `{ success, data: { product } }` |
| AdminProductsPage.js | `/products/:id` | `/api/v1/products/:product_id` | productController.deleteProduct | DELETE | Yes (Admin) | `{ success, data: { message } }` |

### Cart APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| CartPage.js | `/cart` | `/api/v1/cart` | cartController.getCart | GET | No (Session) | `{ success, data: { items, total } }` |
| CartPage.js | `/cart/add` | `/api/v1/cart/add` | cartController.addToCart | POST | No (Session) | `{ success, data: { cart } }` |
| CartPage.js | `/cart/item/:id` | `/api/v1/cart/item/:id` | cartController.updateCartItem | PUT | No (Session) | `{ success, data: { cart } }` |
| CartPage.js | `/cart/item/:id` | `/api/v1/cart/item/:id` | cartController.removeCartItem | DELETE | No (Session) | `{ success, data: { cart } }` |
| CartPage.js | `/cart/coupon/apply` | `/api/v1/cart/coupon/apply` | cartController.applyCoupon | POST | No (Session) | `{ success, data: { cart, coupon } }` |
| CartPage.js | `/cart/coupon/remove` | `/api/v1/cart/coupon/remove` | cartController.removeCoupon | DELETE | No (Session) | `{ success, data: { cart } }` |
| CheckoutPage.js | `/cart` | `/api/v1/cart` | cartController.getCart | GET | No (Session) | `{ success, data: { items, total } }` |

### Order APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| CheckoutPage.js | `/orders` | `/api/v1/orders` | orderController.createOrder | POST | Yes | `{ success, data: { order } }` |
| AccountPage.js | `/orders/my` | `/api/v1/orders/my` | orderController.getCustomerOrders | GET | Yes | `{ success, data: { orders } }` |
| AccountPage.js | `/orders/:id` | `/api/v1/orders/:id` | orderController.getOrder | GET | Yes | `{ success, data: { order } }` |
| AccountPage.js | `/orders/my/:id/cancel` | `/api/v1/orders/my/:id/cancel` | orderController.cancelOrder | POST | Yes | `{ success, data: { order } }` |
| TrackOrderPage.js | `/orders/:id/tracking` | `/api/v1/orders/:id/tracking` | shipmentController.getOrderTracking | GET | Yes | `{ success, data: { tracking } }` |
| AdminOrdersPage.js | `/orders/admin/all` | `/api/v1/orders/admin/all` | orderController.getAllOrders | GET | Yes (Admin) | `{ success, data: { orders, pagination } }` |
| AdminOrdersPage.js | `/orders/admin/:id/shipments` | `/api/v1/orders/admin/:id/shipments` | shipmentController.createShipment | POST | Yes (Admin) | `{ success, data: { shipment } }` |
| AdminOrdersPage.js | `/orders/admin/shipments/:id/ship` | `/api/v1/orders/admin/shipments/:id/ship` | shipmentController.markAsShipped | POST | Yes (Admin) | `{ success, data: { shipment } }` |

### Blog APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| BlogPage.js | `/blogs` | `/api/v1/blogs` | blogController.getPosts | GET | No | `{ success, data: { posts, pagination } }` |
| BlogPostPage.js | `/blogs/slug/:slug` | `/api/v1/blogs/slug/:slug` | blogController.getPostBySlug | GET | No | `{ success, data: { post } }` |
| BlogPostPage.js | `/blogs/:id/related` | `/api/v1/blogs/:post_id/related` | blogController.getRelatedPosts | GET | No | `{ success, data: { posts } }` |
| BlogPostPage.js | `/blogs/:id/comments` | `/api/v1/blogs/:post_id/comments` | blogController.getComments | GET | No | `{ success, data: { comments } }` |
| BlogPostPage.js | `/blogs/:id/comment` | `/api/v1/blogs/:post_id/comment` | blogController.addComment | POST | Yes | `{ success, data: { comment } }` |
| AdminBlogsPage.js | `/blogs` | `/api/v1/blogs` | blogController.createPost | POST | Yes (Editor/Admin) | `{ success, data: { post } }` |
| AdminBlogEditPage.js | `/blogs/:id` | `/api/v1/blogs/:post_id` | blogController.updatePost | PUT | Yes (Editor/Admin) | `{ success, data: { post } }` |
| AdminBlogEditPage.js | `/upload/image` | `/api/v1/upload/image` | uploadController.uploadImage | POST | Yes | `{ success, data: { url } }` |
| AdminBlogsPage.js | `/blogs/:id/publish` | `/api/v1/blogs/:post_id/publish` | blogController.publishPost | POST | Yes (Editor/Admin) | `{ success, data: { post } }` |
| AdminBlogsPage.js | `/blogs/:id/archive` | `/api/v1/blogs/:post_id/archive` | blogController.archivePost | POST | Yes (Editor/Admin) | `{ success, data: { post } }` |

### Coupon APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| CartPage.js | `/coupons/validate/:code` | `/api/v1/coupons/validate/:code` | couponController.validateCouponCode | GET | No | `{ success, data: { valid, discount } }` |
| AdminCouponsPage.js | `/coupons` | `/api/v1/coupons` | couponController.getCoupons | GET | Yes (Admin) | `{ success, data: { coupons } }` |
| AdminCouponsPage.js | `/coupons` | `/api/v1/coupons` | couponController.createCoupon | POST | Yes (Admin) | `{ success, data: { coupon } }` |
| AdminCouponsPage.js | `/coupons/:id` | `/api/v1/coupons/:coupon_id` | couponController.updateCoupon | PUT | Yes (Admin) | `{ success, data: { coupon } }` |
| AdminCouponsPage.js | `/coupons/:id` | `/api/v1/coupons/:coupon_id` | couponController.deleteCoupon | DELETE | Yes (Admin) | `{ success, data: { message } }` |

### Analytics APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| AdminAnalyticsPage.js | `/admin/analytics/overview` | `/api/v1/admin/analytics/overview` | analyticsController.getOverview | GET | Yes (Admin) | `{ success, data: { overview } }` |
| AdminAnalyticsPage.js | `/admin/analytics/sales` | `/api/v1/admin/analytics/sales` | analyticsController.getSales | GET | Yes (Admin) | `{ success, data: { sales } }` |
| AdminAnalyticsPage.js | `/admin/analytics/products` | `/api/v1/admin/analytics/products` | analyticsController.getProductAnalytics | GET | Yes (Admin) | `{ success, data: { products } }` |
| AdminAnalyticsPage.js | `/admin/analytics/revenue` | `/api/v1/admin/analytics/revenue` | analyticsController.getRevenue | GET | Yes (Admin) | `{ success, data: { revenue } }` |
| AdminAnalyticsPage.js | `/admin/warehouses` | `/api/v1/admin/warehouses` | warehouseController.getAllWarehouses | GET | Yes (Admin) | `{ success, data: { warehouses } }` |

### Search APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| SearchAutocomplete.js | `/search/suggestions` | `/api/v1/search/suggestions` | searchController.getSuggestions | GET | No | `{ success, data: { suggestions } }` |
| AllProductsPage.js | `/search` | `/api/v1/search` | searchController.searchProducts | GET | No | `{ success, data: { products, filters } }` |

### Review APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| ProductDetailPage.js | `/products/:id/reviews` | `/api/v1/reviews/products/:id/reviews` | reviewController.getProductReviews | GET | No | `{ success, data: { reviews } }` |
| ProductDetailPage.js | `/products/:id/reviews` | `/api/v1/reviews/products/:id/reviews` | reviewController.createReview | POST | Yes (Customer) | `{ success, data: { review } }` |
| ProductDetailPage.js | `/reviews/:id/helpful` | `/api/v1/reviews/:id/helpful` | reviewController.markReviewHelpful | POST | Yes (Customer) | `{ success, data: { review } }` |

### Upload APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| AdminBlogEditPage.js | `/upload/image` | `/api/v1/upload/image` | uploadController.uploadImage | POST | Yes | `{ success, data: { url } }` |
| AdminProductsPage.js | `/upload/images` | `/api/v1/upload/images` | uploadController.uploadImages | POST | Yes | `{ success, data: { urls } }` |

### Wishlist APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| WishlistPage.js | `/wishlist` | `/api/v1/wishlist` | wishlistController.getWishlist | GET | Yes | `{ success, data: { items } }` |
| WishlistPage.js | `/wishlist/:productId` | `/api/v1/wishlist/:productId` | wishlistController.addToWishlist | POST | Yes | `{ success, data: { item } }` |
| WishlistPage.js | `/wishlist/:productId` | `/api/v1/wishlist/:productId` | wishlistController.removeFromWishlist | DELETE | Yes | `{ success, data: { message } }` |

### Virtual Try-On APIs

| Frontend Page/Component | API Call | Backend Route | Controller | Method | Auth Required | Response Schema |
|-------------------------|----------|---------------|------------|--------|---------------|-----------------|
| TryOnModal.js | `/tryon/upload` | `/api/v1/tryon/upload` | tryOnController.uploadTryOn | POST | No | `{ success, data: { job_id } }` |
| TryOnModal.js | `/tryon/status/:id` | `/api/v1/tryon/status/:job_id` | tryOnController.getTryOnStatus | GET | No | `{ success, data: { status, result_url } }` |

---

## BACKEND ROUTE SUMMARY

### Total Routes by Module

| Module | Routes | Public | Auth Required | Admin Only |
|--------|--------|-------|---------------|------------|
| Auth | 5 | 2 | 3 | 1 |
| Products | 13 | 4 | 9 | 4 |
| Categories | 6 | 4 | 2 | 0 |
| Cart | 8 | 8 | 0 | 0 |
| Orders | 20 | 0 | 20 | 12 |
| Blogs | 14 | 10 | 4 | 2 |
| Coupons | 6 | 1 | 5 | 5 |
| Reviews | 6 | 2 | 4 | 1 |
| Search | 5 | 4 | 1 | 1 |
| Analytics | 6 | 0 | 6 | 6 |
| Upload | 2 | 0 | 2 | 0 |
| Recommendations | 3 | 1 | 2 | 1 |
| **TOTAL** | **94** | **36** | **58** | **33** |

---

## API CONTRACT ISSUES IDENTIFIED

### Critical Issues

1. **ProductDetailPage.js → Recommendations API**
   - **Issue:** Route param mismatch (`:product_id` vs `id`)
   - **Status:** ✅ FIXED in recommendation.controller.js
   - **Fix:** Changed `const { id }` to `const { product_id }`

2. **Recommendation Engine → Category Lookup**
   - **Issue:** Querying `category_id` from products table directly instead of junction table
   - **Status:** ✅ FIXED in recommendationEngine.service.js
   - **Fix:** Added query to `product_categories` junction table

### Warning Issues

1. **Wishlist API** - Referenced in frontend but routes not found in backend routes
2. **Virtual Try-On API** - Referenced in frontend but routes not found in backend routes

---

## RESPONSE SCHEMA STANDARDS

### Success Response
```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details",
  "data": null
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## AUTHENTICATION FLOW

1. **Login/Register** → `/api/v1/auth/login` or `/api/v1/auth/register`
2. **Receive Token** → Store in `localStorage` as `token`
3. **Subsequent Requests** → Add `Authorization: Bearer <token>` header
4. **Guest Cart** → Uses `x-session-id` header instead of auth

---

## ROLE-BASED ACCESS CONTROL (RBAC)

| Role | Products | Orders | Blogs | Coupons | Analytics | Users |
|------|----------|--------|-------|---------|-----------|-------|
| Admin | CRUD | CRUD | CRUD | CRUD | Read | CRUD |
| Editor | CUD | Read | CUD | None | None | None |
| Blogger | None | None | CUD | None | None | None |
| Customer | Read | Read (own) | Read | Read (validate) | None | None |
| Guest | Read | None | Read | None | None | None |

**Legend:** C=Create, R=Read, U=Update, D=Delete

---

## ENDPOINTS REQUIRING FIXES

### Missing Backend Routes

1. **Wishlist Endpoints** (referenced in frontend api.js but not in routes)
   - `GET /api/v1/wishlist`
   - `POST /api/v1/wishlist/:productId`
   - `DELETE /api/v1/wishlist/:productId`

2. **Virtual Try-On Endpoints** (referenced in frontend but not in routes)
   - `POST /api/v1/tryon/upload`
   - `GET /api/v1/tryon/status/:job_id`

### Frontend Issues

1. **ProductDetailPage.js** - Uses `productsAPI.getRecommendations(id)` which calls `/recommendations/${id}` but route is `/products/:product_id/recommendations`
   - **Status:** ✅ FIXED - Both routes now work

---

**Document End**
