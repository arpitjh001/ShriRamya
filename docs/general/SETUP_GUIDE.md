# Shri Ramya - Node.js Headless eCommerce Setup Guide

## Project Overview
Shri Ramya is a luxury ethnic fashion brand. The project uses a headless architecture with a **Node.js (Express)** backend and a **React** frontend, integrated with **WooCommerce** for product management.

## Architecture

### Backend (Node.js)
- **Location**: `/backend_node`
- **Framework**: Express.js
- **Database**: MongoDB (User/Order data) & MySQL (WooCommerce data)
- **Features**:
  - JWT Authentication (Bcrypt hashing)
  - WooCommerce REST API Integration
  - WordPress/Blog Integration
  - Razorpay Payment Intent Flow
  - Joi-based Request Validation

### Frontend (React)
- **Location**: `/frontend`
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **Features**: Product catalog, variations (color/size), cart, checkout, and admin dashboard.

---

## Setup Instructions

### 1. Environment Configuration
Navigate to `backend_node` and create a `.env` file based on the provided keys in the README.
Key variables:
- `MONGO_URL`: Connection string for MongoDB.
- `MYSQL_HOST/USER/PASS`: Credentials for the WordPress database.
- `WOOCOMMERCE_URL`: Your WordPress/WooCommerce base URL.
- `WOOCOMMERCE_CONSUMER_KEY/SECRET`: REST API keys from WooCommerce settings.

### 2. Database Seeding
To ensure an admin user is available:
```bash
cd backend_node
node src/utils/seedAdmin.js
```

### 3. Running with Docker (Recommended)
From the root directory:
```bash
docker-compose up --build -d
```
All ports are pre-configured:
- Nginx Proxy: `8080`
- API Direct: `8000`
- MySQL: `3307` (mapped from 3306)
- MongoDB: `27017`

---

## API Endpoints (v1)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Products
- `GET /api/v1/products`
- `POST /api/v1/products` (Admin Only) - Requires `name`, `price`, `color`, `size`, `stock`.
- `GET /api/v1/products/categories`
- `POST /api/v1/products/categories` (Admin Only)

### Orders
- `GET /api/v1/orders` (Admin Only)
- `POST /api/v1/orders` (Public/Auth)

### Health Check
- `GET /api/v1/health`

---

## Development & Maintenance

### Running Tests
We use Jest and Supertest. All integration tests are located in `backend_node/tests`.
```bash
npm test
```

### Adding New Features
1. Define validations in `src/validations`.
2. Implement service logic in `src/services`.
3. Add controller in `src/controllers`.
4. Register route in `src/routes/v1`.

---
**Shri Ramya** - Redefining Luxury Ethnic Fashion with Node.js.