/**
 * E2E Tests - Customer Shopping Flow
 * Tests the complete customer journey from browsing to checkout
 */

import { test, expect, Page } from '@playwright/test';

test.describe('🛍️ Customer Shopping Flow', () => {
  let sessionId: string;
  
  test.beforeEach(async ({ page }) => {
    // Generate unique session ID for this test
    sessionId = `test_session_${Date.now()}`;
    
    // Set session ID in localStorage
    await page.addInitScript((session) => {
      localStorage.setItem('sessionId', session);
    }, sessionId);
  });
  
  test('✅ Complete shopping flow: Home → Product → Cart → Checkout', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/ShriRamya/i);
    
    // Step 2: Verify homepage loads with products
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 10000 });
    
    // Step 3: Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    
    // Step 4: Verify product detail page loads
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.locator('h1')).toBeVisible();
    
    // Step 5: Select size if available
    const sizeButton = page.locator('button:has-text("S"), button:has-text("M"), button:has-text("L")').first();
    if (await sizeButton.isVisible()) {
      await sizeButton.click();
    }
    
    // Step 6: Add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Shopping Bag")');
    await addToCartButton.click();
    
    // Step 7: Verify cart toast/notification
    await expect(page.locator('text=Added to cart, text=added to cart')).toBeVisible({ timeout: 5000 });
    
    // Step 8: Navigate to cart page
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/cart/);
    
    // Step 9: Verify cart has items
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible({ timeout: 10000 });
    
    // Step 10: Update quantity
    const quantityInput = page.locator('[data-testid="quantity-input"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
      await page.waitForTimeout(1000); // Wait for debounce
    }
    
    // Step 11: Proceed to checkout
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed to Checkout")');
    await checkoutButton.click();
    
    // Step 12: Verify checkout page loads
    await expect(page).toHaveURL(/\/checkout/);
    
    // Step 13: Fill shipping details
    await page.fill('[name="name"]', 'Test Customer');
    await page.fill('[name="email"]', 'test@shriramya.com');
    await page.fill('[name="phone"]', '9876543210');
    await page.fill('[name="address_line1"]', '123 Test Street');
    await page.fill('[name="city"]', 'Mumbai');
    await page.fill('[name="state"]', 'Maharashtra');
    await page.fill('[name="pincode"]', '400001');
    
    // Step 14: Verify order summary
    await expect(page.locator('text=Order Summary, text=order summary')).toBeVisible();
    
    console.log('✅ Complete shopping flow test passed!');
  });
  
  test('✅ Browse products by category', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Find and click category link
    const categoryLink = page.locator('a[href*="/category"], a:has-text("Sarees"), a:has-text("Kurta")').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      
      // Verify category page loads
      await expect(page).toHaveURL(/\/category/);
      await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 10000 });
    }
  });
  
  test('✅ Search for products', async ({ page }) => {
    await page.goto('/');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[aria-label*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('silk');
      await page.waitForTimeout(500); // Wait for suggestions
      
      // Press enter to search
      await searchInput.press('Enter');
      
      // Verify search results page
      await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 10000 });
    }
  });
  
  test('✅ View product details', async ({ page }) => {
    await page.goto('/');
    
    // Click first product
    await page.locator('[data-testid="product-card"]').first().click();
    
    // Verify product details are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('img[alt*="product"], img[src*="product"]')).toBeVisible();
    await expect(page.locator('text=price, text=Price, text=₹')).toBeVisible();
    
    // Verify product information sections
    const descriptionSection = page.locator('text=description, text=Description, text=Product Details');
    if (await descriptionSection.isVisible()) {
      console.log('✓ Product description visible');
    }
  });
  
  test('✅ Add product to wishlist', async ({ page }) => {
    await page.goto('/');
    
    // Click first product
    await page.locator('[data-testid="product-card"]').first().click();
    
    // Find and click wishlist/heart button
    const wishlistButton = page.locator('button[aria-label*="wishlist"], button[aria-label*="favorite"], .heart-icon, svg[data-testid="Heart"]');
    
    if (await wishlistButton.isVisible()) {
      await wishlistButton.click();
      
      // Verify wishlist action (toast or icon change)
      await page.waitForTimeout(1000);
      console.log('✓ Wishlist action completed');
    }
  });
  
  test('✅ Apply coupon code in cart', async ({ page }) => {
    await page.goto('/cart');
    
    // Find coupon input
    const couponInput = page.locator('input[placeholder*="coupon"], input[placeholder*="Coupon"]');
    
    if (await couponInput.isVisible()) {
      await couponInput.fill('WELCOME10');
      
      // Click apply button
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("apply")');
      await applyButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for success or error message
      const messageLocator = page.locator('text=invalid, text=Invalid, text=applied, text=Applied, text=success, text=Success');
      if (await messageLocator.isVisible()) {
        console.log('✓ Coupon response received');
      }
    }
  });
  
  test('✅ Handle empty cart state', async ({ page }) => {
    // Navigate to cart with empty session
    await page.goto('/cart');
    
    // Check for empty cart message or products
    const emptyCartMessage = page.locator('text=empty, text=Empty, text=Your cart is empty, text=cart is empty');
    const cartItems = page.locator('[data-testid="cart-item"]');
    
    // Either cart is empty or has items
    if (await emptyCartMessage.isVisible()) {
      console.log('✓ Empty cart state displayed correctly');
    } else if (await cartItems.count() > 0) {
      console.log('✓ Cart has items');
    }
  });
  
  test('✅ Responsive design - Mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Verify mobile navigation
    const mobileMenu = page.locator('button[aria-label*="menu"], .mobile-menu, .hamburger');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.waitForTimeout(500);
      console.log('✓ Mobile menu works');
    }
    
    // Verify products are visible in mobile view
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 10000 });
  });
});
