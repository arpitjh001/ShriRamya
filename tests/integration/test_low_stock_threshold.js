/**
 * Test script to verify low stock threshold feature
 * Tests:
 * 1. Create product with lowStockThreshold
 * 2. Verify lowStockThreshold is saved in MongoDB
 * 3. Retrieve product and confirm threshold is returned
 * 4. Update product threshold and verify update works
 */

const fetch = global.fetch; // Use built-in fetch available in Node 18+

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:5000/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || 'test-token'; // Would need actual admin token in production

async function testLowStockThreshold() {
  try {
    console.log('\n=== Testing Low Stock Threshold Feature ===\n');

    // Test 1: Create product with lowStockThreshold
    console.log('Test 1: Creating product with lowStockThreshold=15...');
    const createResponse = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        name: 'Test Product - Low Stock Threshold',
        description: 'Testing low stock threshold feature',
        basePrice: 100,
        lowStockThreshold: 15,
        variants: [
          {
            color: 'Red',
            size: 'L',
            sku: 'TEST-RED-L-' + Date.now(),
            stock: 20,
            lowStockThreshold: 5, // Variant-level threshold
          }
        ]
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Failed to create product:', createResponse.status, error);
      return;
    }

    const productData = await createResponse.json();
    const productId = productData.data?.id || productData.data?._id;
    
    console.log('✅ Product created successfully with ID:', productId);
    console.log('   lowStockThreshold value:', productData.data?.lowStockThreshold);

    if (productData.data?.lowStockThreshold === 15) {
      console.log('✅ PASS: lowStockThreshold correctly saved as 15');
    } else {
      console.log('❌ FAIL: lowStockThreshold not saved correctly. Got:', productData.data?.lowStockThreshold);
    }

    // Test 2: Retrieve product and verify lowStockThreshold
    console.log('\nTest 2: Retrieving product and verifying lowStockThreshold...');
    const getResponse = await fetch(`${API_BASE}/products/${productId}`);
    
    if (!getResponse.ok) {
      console.error('❌ Failed to retrieve product:', getResponse.status);
      return;
    }

    const retrievedProduct = await getResponse.json();
    console.log('✅ Product retrieved successfully');
    console.log('   lowStockThreshold value:', retrievedProduct.data?.lowStockThreshold);

    if (retrievedProduct.data?.lowStockThreshold === 15) {
      console.log('✅ PASS: lowStockThreshold correctly retrieved as 15');
    } else {
      console.log('❌ FAIL: lowStockThreshold not retrieved correctly. Got:', retrievedProduct.data?.lowStockThreshold);
    }

    // Test 3: Update product threshold
    console.log('\nTest 3: Updating product lowStockThreshold to 20...');
    const updateResponse = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        lowStockThreshold: 20,
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update product:', updateResponse.status, error);
      return;
    }

    const updatedProduct = await updateResponse.json();
    console.log('✅ Product updated successfully');
    console.log('   lowStockThreshold value:', updatedProduct.data?.lowStockThreshold);

    if (updatedProduct.data?.lowStockThreshold === 20) {
      console.log('✅ PASS: lowStockThreshold correctly updated to 20');
    } else {
      console.log('❌ FAIL: lowStockThreshold not updated correctly. Got:', updatedProduct.data?.lowStockThreshold);
    }

    console.log('\n=== All Low Stock Threshold Tests Complete ===\n');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run tests
testLowStockThreshold();
