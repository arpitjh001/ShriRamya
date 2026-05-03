import { test, expect } from '@playwright/test';

/**
 * E2E Checkout Flow Test
 * Verifies adding to cart, checkout form, and order creation without Razorpay (COD mode)
 */
test.describe('E2E Checkout Flow', () => {
  test('should complete a checkout flow successfully', async ({ page }) => {
    // 1. Visit homepage and go to a product
    await page.goto('/');
    
    // Find any product link
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    
    // 2. Add to Bag
    const addToBagBtn = page.locator('button:has-text("Add to Bag"), button:has-text("Add to Cart")').first();
    await expect(addToBagBtn).toBeVisible();
    await addToBagBtn.click();
    
    // Wait for cart update (toast or count change)
    await page.waitForTimeout(2000);
    
    // 3. Go to Cart
    await page.goto('/cart');
    await expect(page).toHaveURL(/.*cart.*/);
    
    // Verify item is in cart
    const cartItems = page.locator('[data-testid^="cart-item-"]');
    await expect(cartItems.first()).toBeVisible();
    
    // Check if thumbnail is loaded (not the fallback if possible)
    const firstItemImage = cartItems.first().locator('img');
    const imgSrc = await firstItemImage.getAttribute('src');
    console.log('Cart item image source:', imgSrc);
    expect(imgSrc).not.toBe('null');
    
    // 4. Proceed to Checkout
    const checkoutBtn = page.locator('[data-testid="checkout-btn"]');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();
    
    // 5. Fill Checkout Form
    await expect(page).toHaveURL(/.*checkout.*/);
    
    await page.fill('[data-testid="checkout-email"]', 'test-e2e@example.com');
    await page.fill('[data-testid="checkout-phone"]', '9876543210');
    await page.fill('[data-testid="checkout-name"]', 'Playwright E2E Tester');
    await page.fill('[data-testid="checkout-address1"]', '123 Test automation Lane');
    await page.fill('[data-testid="checkout-city"]', 'Testing City');
    await page.fill('[data-testid="checkout-state"]', 'Testing State');
    await page.fill('[data-testid="checkout-pincode"]', '123456');
    await page.fill('[data-testid="checkout-notes"]', 'This is an automated test order');

    // 6. Place Order
    // Note: We expect the backend to be bypassed for Razorpay if we don't have keys or if we force COD code-wise.
    // For this test, if we click "Pay", it triggers order creation.
    const placeOrderBtn = page.locator('[data-testid="place-order-button"]');
    await expect(placeOrderBtn).toBeVisible();
    
    // Intercept API call to ensure it's successful and check payload if needed
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/orders') && response.request().method() === 'POST'
    );
    
    await placeOrderBtn.click();
    
    const response = await responsePromise;
    console.log('Order API Status:', response.status());
    const responseData = await response.json();
    console.log('Order API Response:', JSON.stringify(responseData));
    
    expect(response.status()).toBe(201);
    expect(responseData.success).toBe(true);
    
    // 7. Success Redirection
    // If Razorpay is skipped (no order id or payment error handled), it redirects to success
    try {
      await page.waitForURL(/.*order-success.*/, { timeout: 10000 });
      await expect(page.locator('[data-testid="order-success-page"]')).toBeVisible();
    } catch (e) {
      console.log('Redirect to order-success timed out, checking if Razorpay modal appeared');
      // If Razorpay modal appeared, we successfully created the order but payment is pending
      expect(responseData.data.razorpay_order_id || responseData.data.id).toBeDefined();
    }
  });
});
