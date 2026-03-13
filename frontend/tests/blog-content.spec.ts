import { test, expect } from '@playwright/test';

/**
 * Blog & Content Pages Tests
 * Tests blog listing, blog posts, and content pages
 */
test.describe('Blog & Content Pages', () => {
  test('should load blog listing page', async ({ page }) => {
    await page.goto('/blog');
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*blog.*/);
    
    // Should show blog posts or empty state
    const blogList = page.locator('[class*="blog-list"], [class*="BlogList"]');
    const noPosts = page.locator('text=/no blog/i, text=/no posts/i');
    
    await expect(blogList.or(noPosts)).toBeVisible();
  });

  test('should view individual blog post', async ({ page }) => {
    await page.goto('/blog/1');
    
    // Should show blog post or redirect
    const blogPost = page.locator('[class*="blog-post"], [class*="BlogPost"], article');
    const notFound = page.locator('text=/not found/i, text=/404/i');
    
    await expect(blogPost.or(notFound)).toBeVisible();
  });

  test('should filter blogs by category', async ({ page }) => {
    await page.goto('/blog');
    
    // Look for category filters
    const categoryFilter = page.locator('[class*="category-filter"], [class*="CategoryFilter"], a[href*="category"]').first();
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.waitForTimeout(1000);
      
      // URL should change or posts should filter
      expect(page.url()).toContain('category') || expect(page.url()).not.toEqual('http://localhost:8080/blog');
    }
  });

  test('should search blogs', async ({ page }) => {
    await page.goto('/blog');
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // Should show search results
      const results = page.locator('[class*="blog"], article');
      await expect(results.first()).toBeVisible();
    }
  });

  test('should load about page', async ({ page }) => {
    await page.goto('/about');
    
    // Should show about page
    await expect(page).toHaveURL(/.*about.*/);
    
    const aboutPage = page.locator('[class*="about"], [class*="About"], main');
    await expect(aboutPage).toBeVisible();
  });

  test('should load contact page', async ({ page }) => {
    await page.goto('/contact');
    
    // Should show contact page
    await expect(page).toHaveURL(/.*contact.*/);
    
    const contactPage = page.locator('[class*="contact"], [class*="Contact"]');
    await expect(contactPage).toBeVisible();
    
    // Should have contact form
    const contactForm = page.locator('form, input[name*="name"], input[name*="email"]').first();
    await expect(contactForm).toBeVisible();
  });

  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact');
    
    // Fill contact form
    const nameField = page.locator('input[name*="name"], input[placeholder*="name"]').first();
    const emailField = page.locator('input[type="email"], input[name*="email"]').first();
    const messageField = page.locator('textarea[name*="message"], textarea[placeholder*="message"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
    
    if (await nameField.isVisible() && await emailField.isVisible() && await messageField.isVisible()) {
      await nameField.fill('Test User');
      await emailField.fill('test@example.com');
      await messageField.fill('Test message');
      
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        
        // Should show success message
        const successMsg = page.locator('text=/success/i, text=/sent/i, [class*="toast-success"]');
        await expect(successMsg).toBeVisible();
      }
    }
  });

  test('should load lookbook page', async ({ page }) => {
    await page.goto('/lookbook');
    
    // Should show lookbook page
    await expect(page).toHaveURL(/.*lookbook.*/);
    
    const lookbookPage = page.locator('[class*="lookbook"], [class*="Lookbook"]');
    await expect(lookbookPage).toBeVisible();
  });

  test('should load fabric care page', async ({ page }) => {
    await page.goto('/fabric-care');
    
    // Should show fabric care page
    await expect(page).toHaveURL(/.*fabric.*/);
    
    const fabricPage = page.locator('[class*="fabric"], [class*="Fabric"]');
    await expect(fabricPage).toBeVisible();
  });

  test('should load regional collections page', async ({ page }) => {
    await page.goto('/regional-collections');
    
    // Should show regional collections page
    await expect(page).toHaveURL(/.*regional.*/);
    
    const regionalPage = page.locator('[class*="regional"], [class*="Regional"]');
    await expect(regionalPage).toBeVisible();
  });

  test('should load luxury collection page', async ({ page }) => {
    await page.goto('/luxury-collection');
    
    // Should show luxury collection page
    await expect(page).toHaveURL(/.*luxury.*/);
    
    const luxuryPage = page.locator('[class*="luxury"], [class*="Luxury"]');
    await expect(luxuryPage).toBeVisible();
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    
    // Should show 404 page
    const notFound = page.locator('text=/404/i, text=/not found/i');
    const notFoundPage = page.locator('[class*="not-found"], [class*="NotFound"]');
    
    await expect(notFound.or(notFoundPage)).toBeVisible();
  });
});
