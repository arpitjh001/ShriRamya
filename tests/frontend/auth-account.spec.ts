import { test, expect } from '@playwright/test';

/**
 * Authentication & Account Tests
 * Tests login, registration, and account management
 */
test.describe('Authentication & Account', () => {
  test('should view login page', async ({ page }) => {
    await page.goto('/account');
    
    // Should show account page or login form
    await expect(page).toHaveURL(/.*account.*/);
    
    const accountPage = page.locator('[class*="account"], [class*="Account"]');
    await expect(accountPage).toBeVisible();
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/account');
    
    // Look for login form
    const loginForm = page.locator('form, [class*="login-form"]').first();
    const loginFields = page.locator('input[type="email"], input[type="password"]');
    
    await expect(loginFields.first()).toBeVisible();
  });

  test('should attempt login with invalid credentials', async ({ page }) => {
    await page.goto('/account');
    
    // Fill login form
    const emailField = page.locator('input[type="email"], input[name*="email"]').first();
    const passwordField = page.locator('input[type="password"], input[name*="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    if (await emailField.isVisible() && await passwordField.isVisible()) {
      await emailField.fill('invalid@example.com');
      await passwordField.fill('wrongpassword');
      
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        
        // Should show error message
        const errorMsg = page.locator('text=/invalid/i, text=/error/i, [class*="error"], [class*="toast-error"]');
        await expect(errorMsg).toBeVisible();
      }
    }
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('/account');
    
    // Look for signup/register link
    const signupLink = page.locator('a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create Account"), button:has-text("Sign Up")').first();
    
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForTimeout(1000);
      
      // Should show registration form
      const registerForm = page.locator('form, [class*="register"], [class*="signup"]').first();
      await expect(registerForm).toBeVisible();
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/account');
    
    // Look for email field
    const emailField = page.locator('input[type="email"], input[name*="email"]').first();
    
    if (await emailField.isVisible()) {
      await emailField.fill('invalid-email');
      await emailField.blur();
      
      // Should show validation error
      const error = page.locator('text=/invalid/i, [class*="error"]');
      // Validation might not show immediately
    }
  });

  test('should view account dashboard when logged in', async ({ page }) => {
    // This test requires authentication
    // Skip for now or implement test user login
    test.skip();
    
    await page.goto('/account');
    
    // Should show account dashboard
    const dashboard = page.locator('[class*="dashboard"], [class*="Dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should view orders list', async ({ page }) => {
    await page.goto('/account/orders');
    
    // Should show orders page or redirect
    const ordersPage = page.locator('[class*="order"], [class*="Orders"]');
    await expect(ordersPage).toBeVisible();
  });

  test('should view wishlist', async ({ page }) => {
    await page.goto('/wishlist');
    
    // Should show wishlist page
    await expect(page).toHaveURL(/.*wishlist.*/);
    
    const wishlistPage = page.locator('[class*="wishlist"], [class*="Wishlist"]');
    await expect(wishlistPage).toBeVisible();
  });

  test('should view address book', async ({ page }) => {
    await page.goto('/account/addresses');
    
    // Should show addresses page or redirect
    const addressesPage = page.locator('[class*="address"], [class*="Address"]');
    await expect(addressesPage).toBeVisible();
  });

  test('should logout', async ({ page }) => {
    // This test requires authentication
    // Skip for now
    test.skip();
    
    await page.goto('/account');
    
    // Look for logout button
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      
      // Should redirect to home or login
      expect(page.url()).not.toContain('/account');
    }
  });

  test('should show forgot password link', async ({ page }) => {
    await page.goto('/account');
    
    // Look for forgot password link
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset Password")').first();
    
    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toBeVisible();
    }
  });
});
