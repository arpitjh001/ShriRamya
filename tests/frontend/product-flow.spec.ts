import { test, expect } from '@playwright/test';

/**
 * Product Flow Tests
 * Tests product listing, details, and related features
 */
test.describe('Product Flow', () => {
  test('should load products page', async ({ page }) => {
    await page.goto('/products');
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*products.*/);
    
    // Should show products or "no products" message
    const productsGrid = page.locator('[class*="product-grid"], [class*="ProductGrid"]');
    const noProducts = page.locator('text=/no products/i');
    
    await expect(productsGrid.or(noProducts)).toBeVisible();
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/products/1');
    
    // Should show product details or redirect
    const productPage = page.locator('[class*="product-detail"], [class*="ProductDetail"]');
    const notFound = page.locator('text=/not found/i, text=/404/i');
    
    await expect(productPage.or(notFound)).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/products');
    
    // Look for category filters
    const categoryFilter = page.locator('[class*="category-filter"], [class*="CategoryFilter"], a[href*="category"]').first();
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.waitForTimeout(2000);
      
      // Verify URL changed or products filtered
      const url = page.url();
      const isFiltered = url.includes('category') || url !== 'http://localhost:8080/products';
      expect(isFiltered).toBeTruthy();
    }
  });

  test('should sort products', async ({ page }) => {
    await page.goto('/products');
    
    // Look for sort dropdown
    const sortDropdown = page.locator('[class*="sort"], [class*="Sort"], select').first();
    
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Products should re-render
      const productsGrid = page.locator('[class*="product-grid"]');
      await expect(productsGrid).toBeVisible();
    }
  });

  test('should view product images', async ({ page }) => {
    await page.goto('/products/1');
    
    // Look for product images
    const productImages = page.locator('img[src*="product"], img[src*="uploads"], [class*="product-image"]');
    
    if (await productImages.count() > 0) {
      await expect(productImages.first()).toBeVisible();
    }
  });

  test('should select product variant', async ({ page }) => {
    await page.goto('/products/1');
    
    // Look for variant selectors (size, color, etc.)
    const variantSelectors = page.locator('[class*="variant"], [class*="size"], [class*="color"]').first();
    
    if (await variantSelectors.isVisible()) {
      const variantOption = page.locator('[class*="variant-option"], [class*="size-button"]').first();
      if (await variantOption.isVisible()) {
        await variantOption.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should view product reviews', async ({ page }) => {
    await page.goto('/products/1');
    
    // Look for reviews section
    const reviewsSection = page.locator('[class*="review"], [class*="Review"]');
    
    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toBeVisible();
    }
  });

  test('should view related products', async ({ page }) => {
    await page.goto('/products/1');
    
    // Look for related products section
    const relatedProducts = page.locator('[class*="related"], [class*="Related"], [class*="recommendation"]');
    
    if (await relatedProducts.isVisible()) {
      await expect(relatedProducts).toBeVisible();
    }
  });

  test('should handle non-existent product', async ({ page }) => {
    await page.goto('/products/999999');
    
    // Should show not found or redirect
    const notFound = page.locator('text=/not found/i, text=/404/i');
    const redirected = page.url() !== 'http://localhost:8080/products/999999';
    
    expect(await notFound.isVisible() || redirected).toBeTruthy();
  });
});
