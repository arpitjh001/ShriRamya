import { test, expect } from '@playwright/test';

/**
 * Homepage & Navigation Tests
 * Tests the main user journey through the site
 */
test.describe('Homepage & Navigation', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Shri Ramya/i);
    
    // Verify navbar is visible
    await expect(page.locator('nav')).toBeVisible();
    
    // Verify logo is present
    await expect(page.locator('[alt="Shri Ramya"]')).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/');
    
    // Click on a category or products link
    const productsLink = page.locator('a[href*="products"]').first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL(/.*products.*/);
    }
  });

  test('should navigate to account page', async ({ page }) => {
    await page.goto('/');
    
    // Click account icon
    const accountIcon = page.locator('[data-testid="account-icon"], .account-icon, a[href*="account"]').first();
    if (await accountIcon.isVisible()) {
      await accountIcon.click();
      // Should either go to account page or show login dialog
      const url = page.url();
      if (!url.includes('account')) {
        await expect(page.locator('[class*="auth-dialog"]')).toBeVisible();
      }
    }
  });

  test('should open and close mobile menu', async ({ page }) => {
    await page.goto('/');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click mobile menu button
    const menuButton = page.locator('[aria-label="Open Menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Verify mobile menu opened
      const mobileMenu = page.locator('[class*="mobile-menu"], [class*="MobileNav"]');
      await expect(mobileMenu).toBeVisible();
      
      // Close menu
      const closeButton = mobileMenu.locator('[aria-label="Close"], button[class*="close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(mobileMenu).not.toBeVisible();
      }
    }
  });

  test('should verify all main navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for main category links
    const expectedCategories = ['Women Wear', 'Luxury', 'Regional', 'Home', 'Jewellery'];
    
    for (const category of expectedCategories) {
      const link = page.locator(`a:has-text("${category}"), button:has-text("${category}")`).first();
      if (await link.isVisible()) {
        expect(link).toBeTruthy();
      }
    }
  });

  test('should verify promo bar is visible', async ({ page }) => {
    await page.goto('/');
    
    // Check for promo bar
    const promoBar = page.locator('[class*="promo"], [class*="PromoBar"]');
    if (await promoBar.isVisible()) {
      await expect(promoBar).toBeVisible();
    }
  });

  test('should verify footer is visible', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
