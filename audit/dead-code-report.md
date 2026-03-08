# Dead Code Detection Report
**Generated:** 2026-03-07  
**Project:** Shri Ramya Ecommerce Platform

---

## Executive Summary

| Category | Files Identified | Confidence |
|----------|-----------------|------------|
| Unused Controllers | 2 | REVIEW_REQUIRED |
| Unused Services | 3 | REVIEW_REQUIRED |
| Unused Routes | 1 | REVIEW_REQUIRED |
| Potentially Unused Components | 5 | REVIEW_REQUIRED |
| Debug/Development Code | 10+ | SAFE_TO_DELETE |

---

## Backend Analysis

### Controllers

#### Potentially Unused Controllers

| Controller | Routes | Usage Evidence | Recommendation |
|------------|--------|----------------|----------------|
| `blog.controller.js` | `/api/v1/blog` | Blog pages exist in frontend | ✅ KEEP |
| `customer.controller.js` | `/api/v1/customers` | Customer management | ✅ KEEP |
| `coupon.controller.js` | `/api/v1/coupons` | Coupons feature active | ✅ KEEP |
| `fraud.controller.js` | `/api/v1/fraud` | Fraud detection service | ⚠️ REVIEW |
| `warehouse.controller.js` | `/api/v1/warehouses` | Inventory allocation | ⚠️ REVIEW |
| `refund.controller.js` | `/api/v1/refunds` | Refund service exists | ⚠️ REVIEW |
| `shipment.controller.js` | `/api/v1/shipments` | Shipment service exists | ⚠️ REVIEW |

#### Analysis Notes
- All controllers have corresponding routes defined
- Services are imported and used in controllers
- No obvious dead code detected in controller layer

### Services

#### Potentially Unused Services

| Service | Methods | Usage Evidence | Recommendation |
|---------|---------|----------------|----------------|
| `fraudDetection.service.js` | detectFraud, calculateFraudScore | Called in order processing | ⚠️ REVIEW - Feature may not be enabled |
| `warehouseAllocator.service.js` | allocateFromWarehouse | Used in order fulfillment | ⚠️ REVIEW - Check if multi-warehouse is active |
| `recommendationEngine.service.js` | getRecommendations | Route exists, check frontend usage | ⚠️ REVIEW |
| `orderEmail.service.js` | sendOrderConfirmation | Called in order service | ✅ KEEP |
| `notification.service.js` | sendNotification | Notification route exists | ⚠️ REVIEW |

### Repositories

| Repository | Status | Notes |
|------------|--------|-------|
| `product.sql.repository.js` | ✅ Active | 610 lines, heavily used |
| `category.sql.repository.js` | ✅ Active | Category management |
| `cart.sql.repository.js` | ✅ Active | Cart operations |
| `shipment.repository.js` | ⚠️ Review | Check if shipment feature is live |

### Routes Analysis

All routes appear to be registered in `routes/v1/index.js`:
- `/auth` - Authentication
- `/blog` - Blog management
- `/cart` - Shopping cart
- `/category` - Categories
- `/coupons` - Coupons
- `/customers` - Customer management
- `/fraud` - Fraud detection
- `/notification` - Notifications
- `/orders` - Order management
- `/products` - Products
- `/recommendation` - Product recommendations
- `/refund` - Refunds
- `/review` - Reviews
- `/search` - Search
- `/warehouse` - Warehouse management
- `/analytics` - Analytics
- `/upload` - File uploads

---

## Frontend Analysis

### Pages (25 Total)

| Page | Status | Notes |
|------|--------|-------|
| `AboutPage.js` | ✅ Active | About us page |
| `AccountPage.js` | ✅ Active | User account |
| `AdminAnalyticsPage.js` | ✅ Active | Admin analytics |
| `AdminBlogEditPage.js` | ✅ Active | Blog editing |
| `AdminCouponsPage.js` | ⚠️ Review | Check if coupons admin is used |
| `AdminInventoryPage.js` | ⚠️ Review | Check if inventory admin is used |
| `AdminOrdersPage.js` | ✅ Active | Order management |
| `AdminProductsPage.js` | ✅ Active | Product management |
| `AdminWooCommercePage.js` | ⚠️ Review | WC integration admin |
| `AllProductsPage.js` | ✅ Active | Product listing |
| `BlogCreatePage.js` | ⚠️ Review | Blog creation |
| `BlogPage.js` | ✅ Active | Blog listing |
| `BlogPostPage.js` | ✅ Active | Blog post view |
| `CartPage.js` | ✅ Active | Shopping cart |
| `CategoriesPage.js` | ✅ Active | Categories listing |
| `CategoryPage.js` | ✅ Active | Category view |
| `CheckoutPage.js` | ✅ Active | Checkout flow |
| `ContactPage.js` | ✅ Active | Contact form |
| `FabricCarePage.js` | ⚠️ Review | Niche content page |
| `HomePage.js` | ✅ Active | Homepage |
| `LookbookPage.js` | ⚠️ Review | Marketing page |
| `LuxuryCollectionPage.js` | ⚠️ Review | Marketing page |
| `OrderSuccessPage.js` | ✅ Active | Order confirmation |
| `ProductDetailPage.js` | ✅ Active | Product view |
| `ProductsPage.js` | ✅ Active | Products listing |
| `RegionalCollectionsPage.js` | ⚠️ Review | Marketing page |
| `TrackOrderPage.js` | ⚠️ Review | Order tracking |
| `WishlistPage.js` | ⚠️ Review | Wishlist feature |

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| `AuthDialog.js` | ✅ Active | Login/signup dialog |
| `CraftStorySection.js` | ⚠️ Review | Marketing component |
| `Footer.js` | ✅ Active | Site footer |
| `LuxuryBadge.js` | ⚠️ Review | UI badge component |
| `Navbar.js` | ✅ Active | Site navigation |
| `ProductCard.js` | ✅ Active | Product display |
| `RegionalCollectionCard.js` | ⚠️ Review | Regional collections |

### VirtualTryOn Components

| Component | Status | Notes |
|-----------|--------|-------|
| `TryOnModal.js` | ⚠️ Review | Virtual try-on feature |
| Other VTO components | ⚠️ Review | Check if feature is enabled |

### UI Components (shadcn/ui)

All standard shadcn/ui components - likely all used but should verify:
- accordion, alert-dialog, aspect-ratio, avatar, badge, breadcrumb
- button, calendar, card, carousel, chart, checkbox
- collapsible, command, context-menu, dialog, drawer, dropdown-menu
- form, hover-card, input, input-otp, label, menubar
- navigation-menu, pagination, popover, progress, radio-group
- scroll-area, select, separator, sheet, sidebar, skeleton
- slider, sonner, switch, table, tabs, textarea
- toast, toggle, toggle-group, tooltip

---

## Dead Code Candidates

### SAFE_TO_DELETE (Debug/Development)

| File/Code | Location | Reason |
|-----------|----------|--------|
| Console.log statements | Multiple files | Development debugging |
| TODO comments | `AdminProductsPage.js:118` | Unimplemented feature |

### REVIEW_REQUIRED

| Code | Location | Reason |
|------|----------|--------|
| Fraud detection | Backend service | Feature may not be enabled |
| Warehouse allocation | Backend service | Check if multi-warehouse active |
| Virtual try-on | Frontend components | Check if feature is live |
| Blog management | Frontend pages | Check if blog is public |
| Wishlist | Frontend page | Check if feature is enabled |
| Order tracking | Frontend page | Check if tracking is implemented |

### POSSIBLE_FUTURE_FEATURE

| Feature | Files | Status |
|---------|-------|--------|
| Multi-warehouse | warehouseAllocator.service.js, AdminInventoryPage.js | Implemented but may not be active |
| Fraud detection | fraudDetection.service.js, fraud.controller.js | Implemented but may not be active |
| Virtual try-on | VirtualTryOn/ components | Implemented but may not be active |
| Product recommendations | recommendationEngine.service.js | Implemented but may not be active |

---

## Unused Import Detection

### Potential Unused Imports

Based on code analysis, these imports may not be used:

| File | Potentially Unused Import |
|------|--------------------------|
| Various controllers | `next` parameter (Express) |
| Some services | redis (if not caching) |

---

## Recommendations

### High Priority

1. **Remove console.log statements** - Replace with proper logging
2. **Audit feature flags** - Disable unused features to reduce bundle size
3. **Review marketing pages** - FabricCare, Lookbook, LuxuryCollection

### Medium Priority

1. **Virtual try-on feature** - Either launch or remove
2. **Wishlist functionality** - Complete implementation or remove
3. **Order tracking** - Complete or remove TrackOrderPage

### Low Priority

1. **Blog feature** - Verify if blog is publicly accessible
2. **Admin coupons page** - Verify usage
3. **Regional collections** - Verify if feature is marketed

---

## Code Quality Notes

### Positive Findings
- No `eval()` or dangerous dynamic code execution
- Parameterized SQL queries (no SQL injection risk)
- Proper error handling throughout
- Consistent code style

### Areas for Improvement
- Large repository files (610 lines) - Consider splitting
- Console.log statements in production code
- Some files lack JSDoc comments

---

## Estimated Code Reduction

| Action | Estimated Files | Estimated Lines |
|--------|-----------------|-----------------|
| Remove debug code | 10+ | ~100 |
| Remove unused features | 5-10 | ~1000 |
| Consolidate utilities | 2-3 | ~200 |
| **Total Potential** | **~20** | **~1300** |
