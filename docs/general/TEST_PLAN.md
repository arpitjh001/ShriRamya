# Hardened System Test Plan

Use this guide to verify security and functionality in your local environment before deployment.

## 1. Security Tests (Attack Simulation)

### Test A: Replay Attack (Refresh Token)
1. Login to get `refresh_token_A`.
2. Perform a refresh to get `access_token` + `refresh_token_B`.
3. Try to use `refresh_token_A` again.
*   **Expectation**: 401 Unauthorized + Redis should wipe the family key for that device. Both tokens should now be invalid.

### Test B: Webhook Spoof
1. Send a POST to `/api/v1/webhooks/woocommerce` with a fake payload.
2. Provide a random string as `X-WC-Webhook-Signature`.
*   **Expectation**: 401 Invalid Signature.

### Test C: Brute Force Protection
1. Hit `/api/v1/auth/login` with wrong password 11 times.
*   **Expectation**: 429 Too Many Requests after the 10th attempt.

## 2. Functional Tests (Product Engine)

### Test D: Create Complex Product
1. Register as Admin.
2. Create Category (ID returned).
3. Create Variable Product with 2 Size attributes.
*   **Expectation**: Parent product created in WC → Sync to MongoDB → 2 Variations created in WC.

## 3. Consistency Tests
1. Update a product price via Webhook payload simulation.
2. Immediately `GET /api/v1/products/:id`.
*   **Expectation**: Price in MongoDB is updated within milliseconds.

---
**Verification Tool**: Use Postman or the provided `curl` commands in `API_GUIDE.md`.
