# Quick Reference - Docker Deployment Guide

## 🚀 Quick Start

### Start All Services
```bash
docker compose up -d
```

### Stop All Services
```bash
docker compose down
```

### View Container Logs
```bash
# All services
docker compose logs -f

# Specific service
docker logs -f shriramya-backend-1
docker logs -f shriramya-frontend-1
```

---

## 🧪 Running Tests

### Run Full Deployment Test Suite
```bash
python test_deployment.py
```

**What it tests:**
- ✓ Backend health check
- ✓ API endpoints (products, categories)
- ✓ User authentication (register/login)
- ✓ Current user retrieval
- ✓ Shopping cart operations
- ✓ Frontend accessibility

**Expected Output:**
```
Success Rate: 100.0%
✓ ALL TESTS PASSED
```

---

## 📊 Service Endpoints

### Frontend
- **URL:** http://localhost:3000
- **Type:** React SPA
- **Status:** ✓ Running

### Backend API
- **URL:** http://localhost:8000
- **Base API:** http://localhost:8000/api
- **Type:** FastAPI
- **Status:** ✓ Running

### API Endpoints Reference
```
GET    /api/                    Root endpoint
GET    /api/health              Health check
GET    /api/products            Get products list
GET    /api/products/{id}       Get product details
GET    /api/categories          Get categories
GET    /api/recommendations/{id} Get recommendations

POST   /api/auth/register       Register new user
POST   /api/auth/login          User login
GET    /api/auth/me             Get current user

GET    /api/cart                Get cart
POST   /api/cart                Add to cart
PATCH  /api/cart/item/{id}      Update quantity
DELETE /api/cart/item/{id}      Remove from cart
DELETE /api/cart                Clear cart

POST   /api/tryon/upload        Upload try-on image
GET    /api/tryon/status/{id}   Get try-on status
GET    /api/tryon/result/{id}   Get try-on result
DELETE /api/tryon/{id}          Delete try-on
```

### WordPress/WooCommerce
- **URL:** http://localhost:8081
- **Type:** WordPress
- **Status:** ✓ Running

### Nginx (Reverse Proxy)
- **URL:** http://localhost
- **Type:** Nginx
- **Status:** ✓ Running

---

## 🗄️ Database Services

### MongoDB
- **Host:** localhost (or mongodb in Docker network)
- **Port:** 27017
- **Database:** shriramya
- **Access:** No authentication required in dev
- **Collections:**
  - products
  - users
  - carts
  - orders (optional)

**Test Connection:**
```bash
docker exec shriramya-mongodb-1 mongosh
```

### MySQL
- **Host:** localhost
- **Port:** 3306
- **Database:** shriramya
- **User:** wpuser
- **Password:** wppassword
- **Root Password:** rootpassword

**Test Connection:**
```bash
docker exec shriramya-mysql-1 mysql -u root -prootpassword -e "SELECT 1"
```

---

## 🔧 Common Operations

### Check Docker Compose Status
```bash
docker compose ps
```

### View Real-time Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Rebuild Services
```bash
# Rebuild and restart
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
docker compose up -d --build frontend
```

### Clean Up Everything
```bash
# Stop and remove all containers
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v

# Remove images
docker rmi shriramya-backend shriramya-frontend
```

### Access Container Shell
```bash
# Backend Python shell
docker exec -it shriramya-backend-1 /bin/bash

# Frontend Node shell
docker exec -it shriramya-frontend-1 /bin/sh

# MongoDB shell
docker exec -it shriramya-mongodb-1 mongosh
```

---

## 🌐 Sample API Calls

### Get Products
```bash
curl http://localhost:8000/api/products?limit=5
```

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "1234567890",
    "password": "SecurePass123!"
  }'
```

### Login User
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User (with token)
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN_HERE"
```

### Add to Cart
```bash
curl -X POST "http://localhost:8000/api/cart?session_id=SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_id",
    "quantity": 1
  }'
```

---

## 📈 Monitoring & Debugging

### Check Service Health
```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend health
curl http://localhost:3000 | head -5

# WordPress health
curl http://localhost:8081
```

### Docker Resource Usage
```bash
docker stats

# Specific container
docker stats shriramya-backend-1
```

### View Container IP
```bash
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)
```

### Check Environment Variables in Container
```bash
docker exec shriramya-backend-1 env | sort
```

---

## ⚙️ Configuration Files

### Docker Compose
- **File:** `docker-compose.yml`
- **Services:** Backend, Frontend, MongoDB, MySQL, WordPress, Nginx
- **Volumes:** mysql_data, wordpress_data, mongo_data
- **Networks:** Default bridge

### Backend Configuration
- **Dockerfile:** `backend/Dockerfile`
- **Requirements:** `backend/requirements.txt`
- **Env File:** `backend/.env`
- **Main App:** `backend/main.py`

### Frontend Configuration
- **Dockerfile:** `frontend/Dockerfile`
- **Package Manager:** Yarn
- **Config:** `frontend/package.json`
- **Main App:** `frontend/src/App.js`

### Nginx Configuration
- **Config File:** `nginx/nginx.conf`
- **Purpose:** Reverse proxy, routing, SSL (future)

---

## 🛠️ Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://mongodb:27017/
DB_NAME=shriramya
JWT_SECRET=your-secret-key
WOOCOMMERCE_URL=http://wordpress
WOOCOMMERCE_CONSUMER_KEY=your-key
WOOCOMMERCE_CONSUMER_SECRET=your-secret
CORS_ORIGINS=*
```

### Frontend
- Uses `backend/.env` variables
- Build-time environment variables via REACT_APP_ prefix

---

## 📋 Troubleshooting

### Services Not Starting
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Rebuild
docker compose up -d --build
```

### Database Connection Issues
```bash
# Test MongoDB
docker exec shriramya-mongodb-1 mongosh --eval "db.adminCommand('ping')"

# Test MySQL
docker exec shriramya-mysql-1 mysql -u wpuser -pwppassword -e "SELECT 1"
```

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Change port in docker-compose.yml or kill process
```

### Memory Issues
```bash
# Check memory usage
docker stats

# Increase Docker memory limit in Desktop settings
```

### Frontend Not Building
```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose up -d --build frontend
```

---

## ✅ Verification Checklist

- [ ] All containers running: `docker compose ps`
- [ ] Backend health: `curl http://localhost:8000/api/health`
- [ ] Frontend accessible: http://localhost:3000
- [ ] MongoDB connected: `docker exec ... mongosh`
- [ ] MySQL working: `docker exec ... mysql ...`
- [ ] Tests passing: `python test_deployment.py`
- [ ] API endpoints responding: curl tests
- [ ] No critical errors in logs: `docker compose logs`

---

## 📞 Support & Resources

### Useful Commands Reference
```bash
# Full system health check
./test_deployment.py

# View deployment report
cat DEPLOYMENT_TEST_REPORT.md

# Update and restart
git pull && docker compose up -d --build

# Emergency restart
docker compose down && docker compose up -d
```

### Common Issues & Solutions
| Issue | Solution |
|-------|----------|
| Containers won't start | Check logs, verify ports free, rebuild with `--build` |
| API returns 502 | Backend might be down, check logs |
| Frontend blank | Check browser console, verify API is running |
| Database errors | Increase memory, check container logs |

---

**Last Updated:** February 21, 2026  
**Platform:** Docker Desktop on Windows  
**Status:** ✓ All Services Operational
