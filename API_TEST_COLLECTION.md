# Shri Ramya - API Test Collection

This document contains a complete collection of `curl` commands to manually test all APIs in the system.

## 🎯 Backend Base URL
For testing purposes, we assume the backend is running at:
`http://localhost:8000/api/v1`

---

## 🔐 1️⃣ Authentication APIs

# Register user
curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
           "email": "tester@example.com",
           "name": "Test User",
           "password": "Password123!",
           "phone": "+919876543210"
         }'

# Login user
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
           "email": "tester@example.com",
           "password": "Password123!"
         }'

# Get current user profile (Requires Token)
curl -X GET "http://localhost:8000/api/v1/auth/me" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Invalid login test (Wrong password)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
           "email": "tester@example.com",
           "password": "WrongPassword"
         }'

# Expired token test (Example format with dummy expired token)
curl -X GET "http://localhost:8000/api/v1/auth/me" \
     -H "Authorization: Bearer EXPIRED_TOKEN_HERE"

---

## 🛍️ 2️⃣ Product & Category APIs (FastAPI Layer)

# List all products
curl -X GET "http://localhost:8000/api/v1/products/"

# Filter by category
curl -X GET "http://localhost:8000/api/v1/products/?category=Sarees"

# Get product by ID
curl -X GET "http://localhost:8000/api/v1/products/23"

# Create a new product (Admin Only)
curl -X POST "http://localhost:8000/api/v1/products/" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "New Designer Saree",
           "regular_price": "4999",
           "description": "Exquisite silk saree for festive occasions",
           "short_description": "Silk Saree",
           "categories": [{"id": 15}]
         }'

# Update an existing product (Admin Only)
curl -X PUT "http://localhost:8000/api/v1/products/23" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Updated Saree Name",
           "regular_price": "5499"
         }'

# Delete a product (Admin Only)
curl -X DELETE "http://localhost:8000/api/v1/products/23" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# --- Category Management ---

# List all categories
curl -X GET "http://localhost:8000/api/v1/products/categories"

# Create a new category (Admin Only)
curl -X POST "http://localhost:8000/api/v1/products/categories" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Winter Collection",
           "slug": "winter-collection",
           "description": "Warm ethnic wear"
         }'

# Update a category (Admin Only)
curl -X PUT "http://localhost:8000/api/v1/products/categories/15" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Updated Winter Collection"
         }'

# Delete a category (Admin Only)
curl -X DELETE "http://localhost:8000/api/v1/products/categories/15" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

---

## 🛒 3️⃣ Cart APIs

# Get cart
curl -X GET "http://localhost:8000/api/v1/cart/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update/Add items to cart
curl -X POST "http://localhost:8000/api/v1/cart/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '[
           {
             "product_id": 23,
             "quantity": 2
           },
           {
             "product_id": 45,
             "quantity": 1
           }
         ]'

# Clear entire cart
curl -X DELETE "http://localhost:8000/api/v1/cart/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

---

## 📦 4️⃣ Order APIs

# List user orders
curl -X GET "http://localhost:8000/api/v1/orders/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get order by ID
curl -X GET "http://localhost:8000/api/v1/orders/101" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new order
curl -X POST "http://localhost:8000/api/v1/orders/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "billing": {
             "first_name": "Test",
             "last_name": "User",
             "address_1": "123 Main St",
             "city": "Mumbai",
             "state": "MH",
             "postcode": "400001",
             "country": "IN",
             "email": "tester@example.com",
             "phone": "9876543210"
           },
           "shipping": {
             "first_name": "Test",
             "last_name": "User",
             "address_1": "123 Main St",
             "city": "Mumbai",
             "state": "MH",
             "postcode": "400001",
             "country": "IN"
           },
           "line_items": [
             {
               "product_id": 23,
               "quantity": 1
             }
           ],
           "payment_method": "razorpay",
           "payment_method_title": "Razorpay"
         }'

# Update an order (Admin Only - e.g., Mark as Processing)
curl -X PUT "http://localhost:8000/api/v1/orders/101" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "status": "processing"
         }'

# Delete an order (Admin Only)
curl -X DELETE "http://localhost:8000/api/v1/orders/101" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

---

## 👥 5️⃣ Customer APIs (Admin Management)

# List all customers (Admin Only)
curl -X GET "http://localhost:8000/api/v1/customers/" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get customer by ID (Admin Only)
curl -X GET "http://localhost:8000/api/v1/customers/5" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Create a new customer record (Admin Only)
curl -X POST "http://localhost:8000/api/v1/customers/" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "email": "newcust@example.com",
           "first_name": "New",
           "last_name": "Customer",
           "username": "newcust_user"
         }'

# Update customer details (Admin Only)
curl -X PUT "http://localhost:8000/api/v1/customers/5" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "first_name": "UpdatedFirstName"
         }'

# Delete a customer (Admin Only)
curl -X DELETE "http://localhost:8000/api/v1/customers/5" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

---

## 📰 6️⃣ Blog APIs

# List all blog posts
curl -X GET "http://localhost:8000/api/v1/blog/posts"

# Get a specific blog post
curl -X GET "http://localhost:8000/api/v1/blog/posts/1"

# Create a blog post (Admin Only)
curl -X POST "http://localhost:8000/api/v1/blog/posts" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "title": "Style Guide 2026",
           "content": "Explore the latest trends in ethnic wear...",
           "status": "publish"
         }'

# Update a blog post (Admin Only)
curl -X PUT "http://localhost:8000/api/v1/blog/posts/1" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "title": "Updated Style Guide Title"
         }'

# Delete a blog post (Admin Only)
curl -X DELETE "http://localhost:8000/api/v1/blog/posts/1" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"

---

## 💳 7️⃣ Webhooks & Payments

# Razorpay Webhook Simulation
curl -X POST "http://localhost:8000/api/v1/webhooks/razorpay" \
     -H "Content-Type: application/json" \
     -H "X-Razorpay-Signature: DUMMY_SIGNATURE" \
     -d '{
           "event": "order.paid",
           "payload": {
             "payment": {
               "entity": {
                 "id": "pay_OXXXXXX",
                 "amount": 499900,
                 "order_id": "order_OXXXXXX"
               }
             }
           }
         }'

# WooCommerce Webhook Simulation
curl -X POST "http://localhost:8000/api/v1/webhooks/woocommerce" \
     -H "Content-Type: application/json" \
     -d '{
           "action": "updated",
           "arg": "product"
         }'

---

## 🛒 8️⃣ Direct WooCommerce REST API Testing (Legacy/External)
(Requires Consumer Key and Secret from .env)

# List WC products directly
curl -X GET "http://localhost/wp-json/wc/v3/products" -u "ck_xxx:cs_xxx"

# Create WC product directly
curl -X POST "http://localhost/wp-json/wc/v3/products" -u "ck_xxx:cs_xxx" \
     -H "Content-Type: application/json" \
     -d '{ "name": "Direct WC Product", "type": "simple", "regular_price": "100" }'

---

## 🩺 9️⃣ Health Check

# API Health Status
curl -X GET "http://localhost:8000/health"
