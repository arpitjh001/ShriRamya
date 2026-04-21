const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'shriramya_super_secure_jwt_secret_key_2026_production_ready';
const API_BASE = 'http://127.0.0.1:8000/api/v1';

// Generate a valid admin token
const token = jwt.sign({ sub: 1, role: 'admin', type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
const axiosInstance = axios.create({
    baseURL: API_BASE,
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

async function runTests() {
    let createdProductId;
    console.log("=== Phase 2: Native Product Engine CRUD Test ===");

    try {
        // 1. Create Product
        console.log("\\n[Test 1] Creating new product via POST /api/v1/products...");
        const createPayload = {
            name: "API Test Shirt",
            description: "A shirt created via API test.",
            basePrice: 15.50,
            status: "published",
            attributes: [
                { name: "Color", values: ["Green", "Purple"] },
                { name: "Size", values: ["S"] }
            ],
            variants: [
                {
                    sku: "TEST-GRN-S",
                    price: 15.50,
                    stock: 100,
                    attributes: { "Color": "Green", "Size": "S" }
                }
            ]
        };
        const createRes = await axiosInstance.post('/products', createPayload);
        createdProductId = createRes.data.data.id;
        console.log("✅ Product Created Successfully. ID:", createdProductId);

        // 2. Fetch Product
        console.log(`\\n[Test 2] Fetching product GET /api/v1/products/${createdProductId}...`);
        const getRes = await axiosInstance.get(`/products/${createdProductId}`);
        const fetchedProduct = getRes.data.data;
        if (fetchedProduct.name === "API Test Shirt" && fetchedProduct.variants.length === 1) {
            console.log("✅ Product Fetched Successfully.");
        } else {
            console.log("❌ Product Fetch Mismatch.");
        }

        // 3. Add a New Variant
        console.log(`\\n[Test 3] Adding a brand new variant POST /api/v1/products/${createdProductId}/variants...`);
        const variantPayload = {
            sku: "TEST-PUR-S",
            price: 17.00,
            stock: 50,
            attributes: { "Color": "Purple", "Size": "S" }
        };
        const addVarRes = await axiosInstance.post(`/products/${createdProductId}/variants`, variantPayload);
        console.log("✅ Variant Added Successfully. ID:", addVarRes.data.data.id);

        // 4. Update Product
        console.log(`\\n[Test 4] Updating product PUT /api/v1/products/${createdProductId}...`);
        const updatePayload = {
            name: "API Test Shirt - Updated",
            basePrice: 16.00
        };
        const updateRes = await axiosInstance.put(`/products/${createdProductId}`, updatePayload);
        if (updateRes.data.data.name === "API Test Shirt - Updated") {
            console.log("✅ Product Updated Successfully.");
        } else {
            console.log("❌ Product Update Failed.");
        }

        // 5. Test Constraints & Error Handling
        console.log("\\n[Test 5] Testing Constraints...");

        // a. Duplicate SKU
        console.log("   Attempting Duplicate SKU...");
        try {
            await axiosInstance.post(`/products/${createdProductId}/variants`, variantPayload);
            console.log("   ❌ Expected duplicate SKU to fail, but it succeeded.");
        } catch (err) {
            if (err.response && err.response.data.message.includes("already exists")) {
                console.log("   ✅ Duplicate SKU correctly blocked.");
            } else {
                console.log("   ⚠️ Unexpected error on duplicate SKU:", err.response?.data?.message || err.message);
            }
        }

        // b. Negative Stock via repository/service update directly or during variant creation
        console.log("   Attempting Negative Stock Constraint...");
        try {
            await axiosInstance.post(`/products/${createdProductId}/variants`, {
                sku: "TEST-NEG-STK",
                price: 12.00,
                stock: -10, // negative stock should ideally be blocked by validation or DB
                attributes: { "Color": "Green", "Size": "M" }
            });
            console.log("   ❌ Expected negative stock to fail, but it succeeded.");
        } catch (err) {
            if (err.response && (err.response.status === 400 || err.response.data.message.includes("stock"))) {
                console.log("   ✅ Negative stock blocked correctly (Validation/Constraint).", err.response.data.message);
            } else {
                console.log("   ⚠️ Unexpected error on negative stock:", err.response?.data?.message || err.message);
            }
        }

        // c. Duplicate Attribute Hash
        console.log("   Attempting Duplicate Attribute Hash...");
        try {
            await axiosInstance.post(`/products/${createdProductId}/variants`, {
                sku: "TEST-PUR-S-DIFF-SKU", // different sku but same attributes
                price: 20.00,
                stock: 5,
                attributes: { "Size": "S", "Color": "Purple" } // order swapped, should hash the same
            });
            console.log("   ❌ Expected duplicate attributes to fail, but it succeeded.");
        } catch (err) {
            if (err.response && err.response.data.message.includes("already exists for this product")) {
                console.log("   ✅ Duplicate attributes correctly blocked.");
            } else {
                console.log("   ⚠️ Unexpected error on duplicate attributes:", err.response?.data?.message || err.message);
            }
        }

        // 6. Delete Product
        console.log(`\\n[Test 6] Deleting product DELETE /api/v1/products/${createdProductId}...`);
        const deleteRes = await axiosInstance.delete(`/products/${createdProductId}`);
        console.log("✅ Product Deleted Successfully.");

        console.log("\\n🎉 All CRUD and Constraint tests completed!");

    } catch (error) {
        console.error("\\n❌ Test Failed Unexpectly:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTests();
