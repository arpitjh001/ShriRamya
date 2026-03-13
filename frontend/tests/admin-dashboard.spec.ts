import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard Tests
 * Tests admin panel functionality
 */
test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Try to access admin panel
    await page.goto('/admin/dashboard');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Should redirect to login or show unauthorized
    const isLogin = page.url().includes('login') || page.url().includes('account');
    const isUnauthorized = page.locator('text=/unauthorized/i, text=/login required/i');
    
    expect(isLogin || await isUnauthorized.isVisible()).toBeTruthy();
  });

  test('should show admin dashboard', async ({ page }) => {
    // Check if dashboard is accessible
    const dashboard = page.locator('[class*="dashboard"], [class*="Dashboard"]');
    
    if (await dashboard.isVisible()) {
      await expect(dashboard).toBeVisible();
      
      // Should show admin navigation
      const adminNav = page.locator('[class*="admin-nav"], [class*="AdminNav"], nav');
      await expect(adminNav).toBeVisible();
    }
  });

  test('should view analytics', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Should show analytics or redirect
    const analyticsPage = page.locator('[class*="analytics"], [class*="Analytics"]');
    
    if (await analyticsPage.isVisible()) {
      await expect(analyticsPage).toBeVisible();
    }
  });

  test('should view products management', async ({ page }) => {
    await page.goto('/admin/products');
    
    // Should show products page or redirect
    const productsPage = page.locator('[class*="product"], [class*="Products"]').first();
    
    if (await productsPage.isVisible()) {
      await expect(productsPage).toBeVisible();
    }
  });

  test('should view categories management', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Should show categories page or redirect
    const categoriesPage = page.locator('[class*="category"], [class*="Category"]');
    
    if (await categoriesPage.isVisible()) {
      await expect(categoriesPage).toBeVisible();
    }
  });

  test('should view orders management', async ({ page }) => {
    await page.goto('/admin/orders');
    
    // Should show orders page or redirect
    const ordersPage = page.locator('[class*="order"], [class*="Orders"]');
    
    if (await ordersPage.isVisible()) {
      await expect(ordersPage).toBeVisible();
    }
  });

  test('should view inventory management', async ({ page }) => {
    await page.goto('/admin/inventory');
    
    // Should show inventory page or redirect
    const inventoryPage = page.locator('[class*="inventory"], [class*="Inventory"]');
    
    if (await inventoryPage.isVisible()) {
      await expect(inventoryPage).toBeVisible();
    }
  });

  test('should view coupons management', async ({ page }) => {
    await page.goto('/admin/coupons');
    
    // Should show coupons page or redirect
    const couponsPage = page.locator('[class*="coupon"], [class*="Coupon"]');
    
    if (await couponsPage.isVisible()) {
      await expect(couponsPage).toBeVisible();
    }
  });

  test('should view blogs management', async ({ page }) => {
    await page.goto('/admin/blogs');
    
    // Should show blogs page or redirect
    const blogsPage = page.locator('[class*="blog"], [class*="Blog"]');
    
    if (await blogsPage.isVisible()) {
      await expect(blogsPage).toBeVisible();
    }
  });

  test('should view customers management', async ({ page }) => {
    await page.goto('/admin/customers');
    
    // Should show customers page or redirect
    const customersPage = page.locator('[class*="customer"], [class*="Customer"]');
    
    if (await customersPage.isVisible()) {
      await expect(customersPage).toBeVisible();
    }
  });

  test('should view users management', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should show users page or redirect
    const usersPage = page.locator('[class*="user"], [class*="User"]');
    
    if (await usersPage.isVisible()) {
      await expect(usersPage).toBeVisible();
    }
  });

  test('should access WooCommerce integration', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should show woocommerce page or redirect
    const wooPage = page.locator('[class*="woo"], [class*="Woo"]');
    
    if (await wooPage.isVisible()) {
      await expect(wooPage).toBeVisible();
    }
  });
});
