# WooCommerce Headless Integration Guide

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App  │────▶│  FastAPI Backend  │────▶│ WooCommerce     │
│  (Frontend)  │◀────│  /api/wc/*        │◀────│ REST API v3     │
└──────────────┘     └──────────────────┘     └─────────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐        ┌──────────────┐
                     │   MongoDB    │        │    MySQL     │
                     │  (fallback)  │        │ (WooCommerce)│
                     └──────────────┘        └──────────────┘
```

The React frontend communicates **only** with the FastAPI backend. The backend acts as a proxy/orchestrator for WooCommerce REST API, with MongoDB as a fallback data store.

---

## Quick Start

### 1. Start Services
```bash
docker-compose up -d
```

### 2. Configure WordPress + WooCommerce

1. **Open WordPress Admin**: http://localhost:8081/wp-admin
2. **Complete WordPress Setup** (first-time only)
3. **Install WooCommerce Plugin**: Plugins → Add New → Search "WooCommerce" → Install & Activate
4. **Set Permalinks**: Settings → Permalinks → Select "Post name" → Save

### 3. Generate WooCommerce REST API Keys

1. Go to: WooCommerce → Settings → Advanced → REST API
2. Click **Add Key**
3. Set:
   - Description: `Shri Ramya Headless`
   - User: Your admin user
   - Permissions: **Read/Write**
4. Click **Generate API Key**
5. Copy the **Consumer Key** (`ck_...`) and **Consumer Secret** (`cs_...`)

### 4. Configure Backend

Create or update `backend/.env`:
```env
MONGO_URL=mongodb://mongodb:27017/
DB_NAME=shriramya
WOOCOMMERCE_URL=http://wordpress
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
WOOCOMMERCE_VERIFY_SSL=False
JWT_SECRET=shri-ramya-secret-key-2025
```

Or set as environment variables in `docker-compose.yml`.

### 5. Restart Backend
```bash
docker-compose restart backend
```

### 6. Verify
```bash
python setup_woocommerce.py
```

---

## API Endpoints

All WooCommerce headless endpoints are under `/api/wc/`:

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/products` | List products (pagination, search, filter) |
| GET | `/api/wc/products/{id}` | Get single product |
| POST | `/api/wc/products` | Create product |
| PUT | `/api/wc/products/{id}` | Update product |
| DELETE | `/api/wc/products/{id}` | Delete product |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/categories` | List categories |
| POST | `/api/wc/categories` | Create category |
| DELETE | `/api/wc/categories/{id}` | Delete category |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/orders` | List orders |
| GET | `/api/wc/orders/{id}` | Get order details |
| POST | `/api/wc/orders` | Create order |
| PATCH | `/api/wc/orders/{id}/status` | Update order status |
| POST | `/api/wc/orders/{id}/paid` | Mark order as paid |
| POST | `/api/wc/orders/{id}/notes` | Add order note |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/customers` | List customers |
| GET | `/api/wc/customers/{id}` | Get customer |
| POST | `/api/wc/customers` | Create/sync customer |
| PUT | `/api/wc/customers/{id}` | Update customer |
| GET | `/api/wc/customers/lookup/{email}` | Find customer by email |

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/coupons` | List coupons |
| POST | `/api/wc/coupons` | Create coupon |
| GET | `/api/wc/coupons/validate/{code}` | Validate coupon |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wc/reports/sales` | Sales report |
| GET | `/api/wc/reports/top-sellers` | Top selling products |

---

## Admin Dashboard

Access the WooCommerce management dashboard at:
```
http://localhost:3000/admin/woocommerce
```

Features:
- **Products Tab**: Create, edit, delete products with ethnic wear fields
- **Orders Tab**: View orders, update statuses (pending → processing → completed)
- **Customers Tab**: View registered customers and their order history
- **Coupons Tab**: Create discount coupons (percentage, fixed cart, fixed product)

---

## Files Structure

```
backend/
├── main.py                  # Main FastAPI app (imports wc_routes)
├── woocommerce_service.py   # WooCommerce REST API service layer
├── wc_routes.py             # FastAPI router for /api/wc/* endpoints
├── .env.example             # Environment template
└── requirements.txt         # Python dependencies

frontend/src/
├── lib/
│   ├── api.js               # Base API client
│   ├── wcApi.js              # WooCommerce-specific API functions
│   └── productTransformer.js # Product data normalization
├── pages/
│   └── AdminWooCommercePage.js  # Admin WC dashboard
└── App.js                   # Routes (includes /admin/woocommerce)

setup_woocommerce.py         # Setup helper script
docker-compose.yml           # Docker services
nginx/nginx.conf             # Reverse proxy config
```

---

## How It Works

### Product Flow
1. Admin creates product via Dashboard → `POST /api/wc/products`
2. Backend calls WooCommerce REST API → product stored in WordPress/MySQL
3. Customer browses products → `GET /api/products` (tries WC first, falls back to MongoDB)

### Order Flow
1. Customer adds items to cart (MongoDB)
2. At checkout, order is created in WooCommerce → `POST /api/wc/orders`
3. Payment via Razorpay
4. On success, order marked paid → `POST /api/wc/orders/{id}/paid`
5. Admin updates status via dashboard

### Customer Sync
1. User registers in the app (MongoDB + JWT)
2. On first order, customer synced to WooCommerce
3. WooCommerce tracks order history and spending
