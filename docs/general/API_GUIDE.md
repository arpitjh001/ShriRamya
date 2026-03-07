# API Documentation Guide (Hardened v2)

## Authentication Endpoints

### 1. User Registration
`POST /api/v1/auth/register`
*   **Purpose**: Create a new customer or admin account.
*   **Headers**: `X-Device-Id: <unique_id>`
*   **Body**:
    ```json
    { "email": "user@example.com", "password": "SecurePassword123!", "name": "John Doe" }
    ```
*   **Response**: `201 Created` + `Set-Cookie` (refresh_token) + Access Token.

### 2. User Login
`POST /api/v1/auth/login`
*   **Headers**: `X-Device-Id: <unique_id>`
*   **Body**: `{ "email": "...", "password": "..." }`
*   **Response**: `200 OK` + `Set-Cookie` (refresh_token) + Access Token.

### 3. Token Refresh
`POST /api/v1/auth/refresh`
*   **Purpose**: Exchange expired Access Token for a new one using the Refresh Token cookie.
*   **Headers**: `X-Device-Id: <unique_id>`
*   **Cookies**: `refresh_token=...`
*   **Response**: `200 OK` + New Access Token + Rotated Refresh Token Cookie.

---

## Product & Category Endpoints

### Get All Products
`GET /api/v1/products`
*   **Performance**: Served via MongoDB Read-Model (Sub-50ms).
*   **Query Params**: `per_page`, `page`, `category`.

### Create Variable Product (Admin Only)
`POST /api/v1/products`
*   **Auth**: `Bearer <token>` (Role: admin)
*   **Body Snippet**:
    ```json
    {
      "name": "Luxury Saree",
      "type": "variable",
      "regular_price": 5000,
      "attributes": [
        { "name": "Color", "options": ["Gold", "Red"] },
        { "name": "Size", "options": ["M", "L"] }
      ],
      "variations": [
        { "attributes": [ { "name": "Color", "option": "Gold" } ], "price": 5500 }
      ]
    }
    ```

---

## Error Codes
| Status | Code | Meaning |
| :--- | :--- | :--- |
| 401 | UNAUTHORIZED | Token expired, invalid signature, or replay detected. |
| 403 | FORBIDDEN | Authenticated but lacks "admin" role. |
| 429 | TOO_MANY_REQUESTS | Rate limit hit (auth endpoints). |

## Webhook Validation
`POST /api/v1/webhooks/woocommerce`
*   **Required Header**: `X-WC-Webhook-Signature`
*   **Logic**: HMAC-SHA256(Payload, Webhook_Secret).
