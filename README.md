# Shri Ramya - Luxury Ethnic Fashion (Node.js Edition)

Welcome to the **Shri Ramya** project. This repository has been fully migrated from FastAPI to a robust **Node.js (Express)** architecture.

## 🏗️ Tech Stack
- **Frontend**: React.js (located in `/frontend`)
- **Backend**: Node.js / Express (located in `/backend_node`)
- **Database**: 
  - **MongoDB**: For user accounts, orders, and persistent session data.
  - **MySQL**: Powering the WordPress/WooCommerce CMS.
- **CMS**: WordPress + WooCommerce (Headless mode)
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Quick Start (Docker)
1. Clone the repository.
2. Ensure you have the `.env` file configured in `./backend_node/.env`.
3. Run the following command:
   ```bash
   docker-compose up --build -d
   ```
4. Access the application:
   - **Frontend**: [http://localhost:8080](http://localhost:8080)
   - **Backend API**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
   - **WordPress Admin**: [http://localhost:8080/wp/wp-admin](http://localhost:8080/wp/wp-admin)
   - **Anthropic Proxy**: [http://localhost:8081](http://localhost:8081) (Dashboard for linking accounts)

## 🤖 AI Development (Claude Code Proxy)
This project integrates the **Antigravity Claude Proxy**, enabling you to use **Claude Code CLI** or other Anthropic-compatible tools with Google Antigravity / Gemini models.

### Setup
1. Start the services with `docker-compose up -d`.
2. Visit [http://localhost:8081](http://localhost:8081).
3. Go to the **Accounts** tab and link your Google Account.
4. Configure your CLI (e.g. `claude-code`) to use `http://localhost:8081` as the `ANTHROPIC_BASE_URL`.

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
- [Final API Test Report](./API_FINAL_TEST_REPORT.md)
- [WooCommerce Headless Guide](./WOOCOMMERCE_HEADLESS_GUIDE.md)

---
**Shri Ramya** - Redefining Luxury Ethnic Fashion.
