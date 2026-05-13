const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'shriramya_development_secret_2026';
const API_BASE = 'http://127.0.0.1:8000/api/v1';
const token = jwt.sign({ sub: 1, role: 'admin', type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

async function runErrorCheck() {
    try {
        console.log("Creating product...");
        const res = await axios.post(`${API_BASE}/products`, {
            name: "API Test Shirt",
            description: "A shirt created via API test.",
            basePrice: 15.50,
            status: "published",
            attributes: [{ name: "Color", values: ["Green"] }],
            variants: [{ sku: "TEST-GRN-S-2", price: 15.50, stock: 100, attributes: { "Color": "Green" } }]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", res.data);
    } catch (error) {
        if (error.response) {
            console.log("Error Status:", error.response.status);
            console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log("Error:", error.message);
        }
    }
}
runErrorCheck();
