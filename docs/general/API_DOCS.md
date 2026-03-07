# Shri Ramya API Documentation (v1)

This document provides a comprehensive overview of the available REST API endpoints for the Shri Ramya backend.

**Base URL**: `http://localhost:8000/api/v1` (Direct) or `http://localhost:8080/api/v1` (Nginx Proxy)

---

## 🔐 Authentication

### POST `/auth/register`
Create a new customer account.
- **Body**: `{ email, password, name, phone }`
- **Response**: `201 Created` with user object and JWT access token.

### POST `/auth/login`
Authenticate an existing user.
- **Body**: `{ email, password }`
- **Response**: `200 OK` with user object and JWT access token.

---

## 🛍️ Products

### GET `/products`
Retrieve a list of products. Supports WooCommerce-style filters.
- **Query Params**: `category`, `page`, `per_page`
- **Response**: `200 OK` with array of product objects.

### GET `/products/categories`
List all product categories.
- **Response**: `200 OK` with array of categories.

### GET `/products/:product_id`
Get detailed information for a single product.

### POST `/products` (Admin Only)
Create a new product in the WooCommerce catalog.
- **Auth**: Required (Bearer Token, Role: Admin)
- **Body**:
  ```json
  {
    "name": "Banarasi Silk Saree",
    "description": "Premium handwoven silk...",
    "price": 12000,
    "category": "Sarees",
    "color": "Royal Blue",
    "size": "Free Size",
    "stock": 5
  }
  ```

### POST `/products/categories` (Admin Only)
Create a new product category.
- **Auth**: Required (Bearer Token, Role: Admin)
- **Body**: `{ "name": "Lehengas" }`

---

## 📦 Orders

### GET `/orders` (Admin Only)
List all orders in the system.
- **Auth**: Required (Bearer Token, Role: Admin)

### POST `/orders`
Create a new order (supports guest and authenticated checkout).
- **Body**: Matches WooCommerce `create order` schema.

---

## 🩺 System

### GET `/health`
Check API health and database connectivity.
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-03-01T20:00:00.000Z"
  }
  ```

---

## 🛠️ Error Responses
All errors follow this JSON format:
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": "Stack trace (Development only)"
}
```

## 🧪 Development
To run the automated test suite and verify all endpoints:
```bash
cd backend_node
npm test
```
