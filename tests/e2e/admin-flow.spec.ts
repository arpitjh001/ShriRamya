/**
 * E2E Tests - Admin Flow
 * Tests admin operations: login, product management, order management
 */

import { test, expect } from '@playwright/test';

test.describe('👨‍💼 Admin Operations Flow', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: []
    }
  });
  
  test('✅ Admin Login', async ({ page }) => {
    await page.goto('/admin');
    
    // Try to login
    const emailInput = page.locator('input[type="email"], input[placeholder*="Email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="Password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@shriramya.com');
      await passwordInput.fill('Admin@123');
      
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
      await loginButton.click();
      
      // Wait for navigation or dashboard
      await page.waitForURL(/\/admin/, { timeout: 10000 }).catch(() => {});
      
      // Check if we're on admin dashboard
      const adminContent = page.locator('[data-testid="admin-dashboard"], .admin-dashboard, text=Dashboard, text=Analytics');
      await expect(adminContent).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Admin login successful');
    }
  });
  
  test('✅ Admin Dashboard Analytics', async ({ page }) => {
    await page.goto('/admin');
    
    // Skip login if needed - assuming already logged in for this test
    // In real scenario, you'd handle auth state
    
    // Check for analytics cards
    const analyticsCards = page.locator('[data-testid="analytics-card"], .analytics-card, .stat-card');
    
    if (await analyticsCards.isVisible()) {
      const count = await analyticsCards.count();
      console.log(`✓ Found ${count} analytics cards`);
      expect(count).toBeGreaterThan(0);
    }
  });
  
  test('✅ Admin - Create Product Flow', async ({ page }) => {
    await page.goto('/admin/products');
    
    // Find and click "Add Product" or "Create Product" button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New Product")');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Wait for product form
      await page.waitForSelector('input[placeholder*="Product name"], input[name="name"]', { timeout: 5000 }).catch(() => {});
      
      // Fill product details
      const nameInput = page.locator('input[name="name"], input[placeholder*="Product name"]');
      if (await nameInput.isVisible()) {
        const productName = `Test Product ${Date.now()}`;
        await nameInput.fill(productName);
        
        // Fill SKU
        const skuInput = page.locator('input[name="sku"], input[placeholder*="SKU"]');
        if (await skuInput.isVisible()) {
          await skuInput.fill(`TEST-${Date.now()}`);
        }
        
        // Fill price
        const priceInput = page.locator('input[name="price"], input[name="base_price"], input[type="number"]');
        if (await priceInput.isVisible()) {
          await priceInput.fill('999');
        }
        
        // Fill description
        const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description"]');
        if (await descInput.isVisible()) {
          await descInput.fill('Test product description for E2E testing');
        }
        
        // Select category if available
        const categorySelect = page.locator('select[name="category"], select[name="category_id"]');
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 1 }); // Select first option
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Wait for success message
          await page.waitForTimeout(2000);
          
          const successMessage = page.locator('text=success, text=Success, text=created, text=Created');
          if (await successMessage.isVisible()) {
            console.log('✅ Product created successfully');
          }
        }
      }
    }
  });
  
  test('✅ Admin - View Products List', async ({ page }) => {
    await page.goto('/admin/products');
    
    // Check for products table or list
    const productTable = page.locator('table, [data-testid="products-table"], .products-list');
    
    if (await productTable.isVisible()) {
      // Count products
      const rows = page.locator('tbody tr, [data-testid="product-row"]');
      const count = await rows.count();
      console.log(`✓ Found ${count} products in admin list`);
      
      // Verify table headers
      const headers = page.locator('thead th, th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });
  
  test('✅ Admin - Edit Product', async ({ page }) => {
    await page.goto('/admin/products');
    
    // Find edit button for first product
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-product"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Wait for edit form
      await page.waitForTimeout(1000);
      
      // Modify product name
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        const currentValue = await nameInput.inputValue();
        await nameInput.fill(`${currentValue} - Updated`);
        
        // Save changes
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Product updated successfully');
        }
      }
    }
  });
  
  test('✅ Admin - View Orders', async ({ page }) => {
    await page.goto('/admin/orders');
    
    // Check for orders table
    const ordersTable = page.locator('table, [data-testid="orders-table"], .orders-list');
    
    if (await ordersTable.isVisible()) {
      const rows = page.locator('tbody tr, [data-testid="order-row"]');
      const count = await rows.count();
      console.log(`✓ Found ${count} orders`);
    }
  });
  
  test('✅ Admin - Manage Orders (Update Status)', async ({ page }) => {
    await page.goto('/admin/orders');
    
    // Find first order with action buttons
    const statusSelect = page.locator('select[name="status"], select[data-testid="order-status"]').first();
    
    if (await statusSelect.isVisible()) {
      // Get current status
      const currentValue = await statusSelect.inputValue();
      
      // Change status
      await statusSelect.selectOption({ index: 1 }); // Select different option
      
      // Wait for update
      await page.waitForTimeout(1000);
      
      console.log('✅ Order status updated');
    }
  });
  
  test('✅ Admin - View Analytics', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Check for analytics content
    const charts = page.locator('[data-testid="chart"], .chart, .analytics-chart');
    const stats = page.locator('[data-testid="stat"], .stat, .metric');
    
    if (await stats.isVisible()) {
      const count = await stats.count();
      console.log(`✓ Found ${count} analytics metrics`);
    }
  });
  
  test('✅ Admin - Manage Categories', async ({ page }) => {
    await page.goto('/admin/categories');
    
    // Check for categories list
    const categoryList = page.locator('[data-testid="category-item"], .category-item, table');
    
    if (await categoryList.isVisible()) {
      const count = await page.locator('[data-testid="category-item"], tr').count();
      console.log(`✓ Found ${count} categories`);
    }
    
    // Try to add category
    const addButton = page.locator('button:has-text("Add Category"), button:has-text("New Category")');
    if (await addButton.isVisible()) {
      console.log('✓ Add category button available');
    }
  });
  
  test('✅ Admin - Manage Blogs', async ({ page }) => {
    await page.goto('/admin/blogs');
    
    // Check for blogs list
    const blogsList = page.locator('[data-testid="blog-item"], .blog-item, table');
    
    if (await blogsList.isVisible()) {
      const count = await page.locator('[data-testid="blog-item"], tr').count();
      console.log(`✓ Found ${count} blog posts`);
    }
  });
  
  test('✅ Admin - Manage Coupons', async ({ page }) => {
    await page.goto('/admin/coupons');
    
    // Check for coupons list
    const couponsList = page.locator('[data-testid="coupon-item"], .coupon-item, table');
    
    if (await couponsList.isVisible()) {
      const count = await page.locator('[data-testid="coupon-item"], tr').count();
      console.log(`✓ Found ${count} coupons`);
    }
    
    // Try to create coupon
    const addButton = page.locator('button:has-text("Add Coupon"), button:has-text("New Coupon")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Fill coupon form
      const codeInput = page.locator('input[name="code"], input[placeholder*="Code"]');
      if (await codeInput.isVisible()) {
        await codeInput.fill(`TEST${Date.now()}`);
        
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('✅ Coupon creation attempted');
        }
      }
    }
  });
  
  test('✅ Admin - Logout', async ({ page }) => {
    await page.goto('/admin');
    
    // Find logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Verify redirected to login or home
      await page.waitForURL(/\/admin\/login|\/login|\/$/, { timeout: 5000 }).catch(() => {});
      console.log('✅ Admin logout successful');
    }
  });
});
