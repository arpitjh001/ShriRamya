# Shri Ramya - Luxury Ethnic Fashion (Node.js Edition)

Welcome to the **Shri Ramya** project. This repository has been fully migrated from FastAPI to a robust **Node.js (Express)** architecture.

## 🏗️ Tech Stack
- **Frontend**: React.js (located in `/frontend`)
- **Backend**: Node.js / Express (located in `/backend_node`)
- **Database**:
  - **MongoDB**: For user accounts, orders, and persistent session data.
  - **MySQL**: Native CMS for blogs, products, and categories.
- **CMS**: Native MySQL-based Content Management System

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or hosted)
- MySQL (local or hosted)

### Quick Start (Local)
1. Configure `backend_node/.env` (Mongo + `JWT_SECRET` required at minimum).
2. Start the backend:
   ```bash
   cd backend_node
   npm install
   npm run dev
   ```
3. Start the frontend:
   ```bash
   cd frontend
   yarn install
   yarn dev
   ```
4. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000/api/v1

## 🤖 AI Development (Claude Code Proxy)
This project integrates the **Antigravity Claude Proxy**, enabling you to use **Claude Code CLI** or other Anthropic-compatible tools with Google Antigravity / Gemini models.

### Setup
1. Start the proxy:
   ```bash
   cd ai-proxy
   npm install
   npm run dev
   ```
2. Visit http://localhost:8080.
3. Go to the **Accounts** tab and link your Google Account.
4. Configure your CLI (e.g. `claude-code`) to use `http://localhost:8080` as the `ANTHROPIC_BASE_URL`.

## 📡 API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/login` - Login and receive JWT
- `POST /api/v1/auth/register` - Create a new user

### Products
- `GET /api/v1/products` - List all products (cached)
- `POST /api/v1/products` - Create a new product (Admin Only)
- `GET /api/v1/products/categories` - List categories
- `POST /api/v1/products/categories` - Create a new category (Admin Only)

### Orders
- `GET /api/v1/orders` - List all orders (Admin Only)
- `POST /api/v1/orders` - Create a new order

### Health Check
- `GET /api/v1/health` - Check system status

## 🧪 Testing
The backend includes a comprehensive Jest + Supertest suite.
```bash
cd backend_node
npm install
npm test
```

## 📜 Documentation
- [System Architecture](./docs/architecture/SYSTEM_AUDIT_ARCHITECTURE_MAP.md)
- [API Documentation](./docs/api/API_AUDIT_REPORT.md)
- [Setup Guide](./docs/setup/CONTINUE_SETUP_GUIDE.md)
- [Security Audit](./docs/security/security-audit-report.md)

---
**Shri Ramya** - Redefining Luxury Ethnic Fashion.
