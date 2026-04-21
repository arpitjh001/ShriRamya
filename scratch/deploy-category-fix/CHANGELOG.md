# Changelog

## [Unreleased]
### Fixed
- **API & DB (Default Variant Architecture)**: Enforced a strict default variant system allowing products to be created seamlessly without variations. `v1/products` API now guarantees default variant injection so that frontend interactions and cart logic operate correctly even when explicit colors/sizes aren't selected. Frontend Admin module upgraded to translate generic 'Stock' to default variant models.
- **API (Cart Add)**: Fixed an issue where the `v1/cart/add` API endpoint would throw a `variantId must be a number` error when a product without variants was added to the cart. Adjusted the Joi validation schema `backend_node/src/validations/cart.validation.js` to explicitly `.allow(null, '')` for `variantId` and `productId`.
- **UI (Wishlist Icon)**: Verified the presence of the Wishlist icon in the `NavIcons` component.
- **Testing (E2E)**: Fixed test regressions in the `cart-checkout` Playwright tests by replacing brittle class selectors with robust `data-testid` attributes (after the frontend migrated to Tailwind CSS). Tests now run stably.
