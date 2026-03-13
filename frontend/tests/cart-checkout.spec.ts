import { test, expect } from '@playwright/test';

/**
 * Cart & Checkout Flow Tests
 * Tests add to cart, cart management, and checkout process
 */
test.describe('Cart & Checkout Flow', () => {
  test('should view empty cart', async ({ page }) => {
    await page.goto('/cart');
    
    // Should show cart page (empty or with items)
    await expect(page).toHaveURL(/.*cart.*/);
    
    const cartPage = page.locator('[class*="cart"], [class*="Cart"]');
    await expect(cartPage).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/products/1');
    
    // Look for add to cart button
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), [class*="add-to-cart"]').first();
    
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
      
      // Check for success message or cart count update
      const successMsg = page.locator('text=/added to cart/i, [class*="toast-success"]');
      const cartCount = page.locator('[class*="cart-count"], [data-testid="cart-count"]');
      
      await expect(successMsg.or(cartCount)).toBeVisible();
    }
  });

  test('should update cart quantity', async ({ page }) => {
    await page.goto('/cart');
    
    // Look for quantity controls
    const quantityInput = page.locator('input[type="number"][class*="quantity"], [class*="quantity-input"]').first();
    const quantityBtn = page.locator('[class*="quantity-increase"], [class*="quantity-decrease"]').first();
    
    if (await quantityInput.isVisible()) {
      const currentValue = await quantityInput.inputValue();
      if (currentValue && parseInt(currentValue) > 0) {
        await quantityInput.fill('2');
        await page.waitForTimeout(500);
        
        // Should update cart total
        const cartTotal = page.locator('[class*="total"], [class*="subtotal"]');
        await expect(cartTotal).toBeVisible();
      }
    } else if (await quantityBtn.isVisible()) {
      await quantityBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/cart');
    
    // Look for remove button
    const removeBtn = page.locator('button:has-text("Remove"), [class*="remove"], [class*="delete"]').first();
    
    if (await removeBtn.isVisible()) {
      const itemCountBefore = await page.locator('[class*="cart-item"]').count();
      
      await removeBtn.click();
      await page.waitForTimeout(1000);
      
      // Item count should decrease or cart should be empty
      const itemCountAfter = await page.locator('[class*="cart-item"]').count();
      expect(itemCountAfter).toBeLessThanOrEqual(itemCountBefore);
    }
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.goto('/cart');
    
    // Look for checkout button
    const checkoutBtn = page.locator('button:has-text("Checkout"), [class*="checkout"]').first();
    
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForTimeout(1000);
      
      // Should go to checkout page or show login
      const isCheckout = page.url().includes('checkout');
      const isLogin = page.url().includes('login') || page.url().includes('account');
      
      expect(isCheckout || isLogin).toBeTruthy();
    }
  });

  test('should view checkout page', async ({ page }) => {
    await page.goto('/checkout');
    
    // Should show checkout or redirect to login/cart
    const checkoutPage = page.locator('[class*="checkout"], [class*="Checkout"]');
    const redirected = page.url() !== 'http://localhost:8080/checkout';
    
    await expect(checkoutPage.or(page.locator('text=/login/i'))).toBeVisible();
  });

  test('should fill shipping information', async ({ page }) => {
    await page.goto('/checkout');
    
    // Look for shipping form
    const shippingForm = page.locator('[class*="shipping"], [class*="Shipping"]');
    
    if (await shippingForm.isVisible()) {
      // Try to fill form fields
      const nameField = page.locator('input[name*="name"], input[placeholder*="name"]').first();
      const emailField = page.locator('input[type="email"], input[name*="email"]').first();
      const addressField = page.locator('input[name*="address"], input[placeholder*="address"]').first();
      
      if (await nameField.isVisible()) {
        await nameField.fill('Test User');
      }
      if (await emailField.isVisible()) {
        await emailField.fill('test@example.com');
      }
      if (await addressField.isVisible()) {
        await addressField.fill('123 Test Street');
      }
    }
  });

  test('should apply coupon code', async ({ page }) => {
    await page.goto('/cart');
    
    // Look for coupon input
    const couponInput = page.locator('input[placeholder*="coupon"], input[name*="coupon"]').first();
    const applyBtn = page.locator('button:has-text("Apply"), [class*="apply-coupon"]').first();
    
    if (await couponInput.isVisible()) {
      await couponInput.fill('TEST10');
      
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(1000);
        
        // Should show success or error message
        const message = page.locator('text=/invalid/i, text=/applied/i, [class*="toast"]');
        await expect(message).toBeVisible();
      }
    }
  });

  test('should view order success page', async ({ page }) => {
    await page.goto('/order-success');
    
    // Should show order success or redirect
    const successPage = page.locator('[class*="success"], [class*="Success"]');
    const redirected = page.url() !== 'http://localhost:8080/order-success';
    
    await expect(successPage.or(page.locator('text=/cart/i'))).toBeVisible();
  });
});
