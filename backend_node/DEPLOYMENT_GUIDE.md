# ShriRamya Ecommerce Platform - Docker Deployment Guide

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Compose installed (included with Docker Desktop)
- At least 4GB RAM available for containers
- Ports 3306, 6379, 27017, 8000 available

---

## 🚀 Quick Start (Local Development)

### Option 1: Using PowerShell Script (Windows)

```powershell
# Navigate to backend directory
cd c:\Users\Lenovo\shriramya\ShriRamya\backend_node

# Deploy using PowerShell script
.\scripts\deploy.ps1

# Or use the simplified docker-compose directly
docker-compose -f docker-compose.local.yml up -d
```

### Option 2: Using Bash Script (Linux/Mac)

```bash
cd backend_node

# Make script executable
chmod +x scripts/deploy.sh

# Deploy
./scripts/deploy.sh
```

### Option 3: Manual Commands

```bash
# 1. Build images
docker-compose -f docker-compose.local.yml build

# 2. Start services
docker-compose -f docker-compose.local.yml up -d

# 3. View logs
docker-compose -f docker-compose.local.yml logs -f

# 4. Run migrations
docker-compose -f docker-compose.local.yml exec backend npm run migrate
```

---

## 🔧 Production Deployment

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your production values
# Required variables:
# - Database credentials
# - JWT_SECRET
# - WooCommerce credentials
# - Razorpay credentials
# - SMTP settings
# - CDN_BASE_URL
```

### 2. Build Production Image

```bash
# Build with production optimizations
docker build -f Dockerfile.production -t shriramya-backend:latest .
```

### 3. Start Production Stack

```bash
# Start all services (including monitoring)
docker-compose -f docker-compose.production.yml up -d

# Or without monitoring services
docker-compose -f docker-compose.production.yml up -d --profile=""
```

---

## 📊 Service URLs

### Local Development
| Service | URL | Port |
|---------|-----|------|
| API | http://localhost:8000 | 8000 |
| API Docs | http://localhost:8000/api/docs | 8000 |
| MySQL | localhost | 3306 |
| Redis | localhost | 6379 |
| MongoDB | localhost | 27017 |

### Production Stack (with monitoring)
| Service | URL | Port |
|---------|-----|------|
| API (via NGINX) | http://localhost:80 | 80 |
| API (HTTPS) | https://localhost:443 | 443 |
| BullMQ Dashboard | http://localhost:3000 | 3000 |
| Grafana | http://localhost:3001 | 3001 |
| Prometheus | http://localhost:9090 | 9090 |

---

## 🔍 Verification Steps

### 1. Check Container Status

```bash
docker-compose -f docker-compose.local.yml ps
```

Expected output:
```
NAME                    STATUS         PORTS
shriramya-backend       Up (healthy)   0.0.0.0:8000->8000/tcp
shriramya-mysql         Up (healthy)   0.0.0.0:3306->3306/tcp
shriramya-redis         Up (healthy)   0.0.0.0:6379->6379/tcp
shriramya-mongo         Up (healthy)   0.0.0.0:27017->27017/tcp
```

### 2. Check Health Endpoint

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Run Database Migrations

```bash
docker-compose -f docker-compose.local.yml exec backend npm run migrate
```

### 4. Test API Documentation

```bash
# Open in browser
http://localhost:8000/api/docs
```

---

## 🛠️ Common Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.local.yml logs --tail=100 backend
```

### Restart Services

```bash
# All services
docker-compose -f docker-compose.local.yml restart

# Specific service
docker-compose -f docker-compose.local.yml restart backend
```

### Stop Services

```bash
# Stop all
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.local.yml down -v
```

### Rebuild Containers

```bash
# Rebuild with no cache
docker-compose -f docker-compose.local.yml build --no-cache

# Rebuild and restart
docker-compose -f docker-compose.local.yml up -d --build
```

### Access Container Shell

```bash
# Backend container
docker-compose -f docker-compose.local.yml exec backend sh

# MySQL container
docker-compose -f docker-compose.local.yml exec mysql bash

# Redis CLI
docker-compose -f docker-compose.local.yml exec redis redis-cli

# MongoDB shell
docker-compose -f docker-compose.local.yml exec mongo mongosh -u admin -p admin123
```

---

## 🗄️ Database Management

### MySQL Backup

```bash
# Create backup
docker exec shriramya-mysql mysqldump -u root -proot123 shriramya_ecommerce > backup.sql

# Restore backup
docker exec -i shriramya-mysql mysql -u root -proot123 shriramya_ecommerce < backup.sql
```

### MongoDB Backup

```bash
# Create backup
docker exec shriramya-mongo mongodump -u admin -p admin123 --out /data/backup

# Copy backup to host
docker cp shriramya-mongo:/data/backup ./backup
```

### Redis Data

```bash
# Save Redis data
docker exec shriramya-redis redis-cli BGSAVE
```

---

## 🔐 Security Considerations

### Production Checklist

- [ ] Change all default passwords in .env
- [ ] Set secure JWT_SECRET (min 32 characters)
- [ ] Enable COOKIE_SECURE=true
- [ ] Configure proper CORS_ORIGINS
- [ ] Use SSL certificates for NGINX
- [ ] Enable firewall rules
- [ ] Set up regular backups
- [ ] Configure log rotation
- [ ] Enable monitoring alerts
- [ ] Restrict database access

### SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/CN=localhost"

# For production, use Let's Encrypt or your CA
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.local.yml logs backend

# Check if ports are in use
netstat -ano | findstr :8000
netstat -ano | findstr :3306
netstat -ano | findstr :6379
netstat -ano | findstr :27017

# Kill process using port (Windows)
taskkill /F /PID <process_id>
```

### Database Connection Failed

```bash
# Check if database is ready
docker-compose -f docker-compose.local.yml exec mysql mysqladmin ping -h localhost

# Restart database
docker-compose -f docker-compose.local.yml restart mysql

# Check backend logs for connection errors
docker-compose -f docker-compose.local.yml logs backend | grep -i error
```

### Migrations Fail

```bash
# Run migrations manually
docker-compose -f docker-compose.local.yml exec backend npm run migrate

# Check migration status
docker-compose -f docker-compose.local.yml exec backend node -e "require('./src/utils/dbMigration').runMigrations()"
```

### Out of Memory

```bash
# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > Increase to 4GB+

# Or limit individual services in docker-compose.yml
# See deploy.memory in service configuration
```

---

## 📈 Monitoring

### View Queue Status

```bash
# Access BullMQ Dashboard
# http://localhost:3000

# Or via CLI
docker-compose -f docker-compose.production.yml exec bullboard sh
```

### View Analytics

```bash
# Grafana Dashboard
# http://localhost:3001
# Default login: admin / admin123

# Prometheus Metrics
# http://localhost:9090
```

### Performance Metrics

```bash
# Container stats
docker stats

# Specific container
docker stats shriramya-backend
```

---

## 🔄 Update Deployment

### Update Code

```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.local.yml up -d --build

# Run new migrations
docker-compose -f docker-compose.local.yml exec backend npm run migrate
```

### Update Dependencies

```bash
# Rebuild with no cache
docker-compose -f docker-compose.local.yml build --no-cache

# Restart all services
docker-compose -f docker-compose.local.yml up -d --force-recreate
```

---

## 📝 Environment Variables Reference

### Required Variables

```env
# Application
NODE_ENV=development
PORT=8000

# MongoDB
MONGO_URL=mongodb://admin:admin123@localhost:27017
DB_NAME=shriramya

# MySQL
MYSQL_HOST=localhost
MYSQL_USER=shriramya
MYSQL_PASSWORD=shriramya123
MYSQL_DATABASE=shriramya_ecommerce

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# WooCommerce
WOOCOMMERCE_URL=https://your-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxx
```

### Optional Variables

```env
# CDN
CDN_BASE_URL=https://cdn.yourdomain.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# SMS
SMS_PROVIDER=twilio
SMS_API_KEY=your-key
SMS_SENDER_ID=YourBrand

# Payment
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

---

## 🎯 Post-Deployment Checklist

- [ ] All containers running (docker-compose ps)
- [ ] Health endpoint responding
- [ ] Database migrations completed
- [ ] API documentation accessible
- [ ] Uploads directory writable
- [ ] Redis caching working
- [ ] Background queues processing
- [ ] Logs being captured
- [ ] Backups configured
- [ ] Monitoring enabled

---

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f backend`
- Review documentation: `PHASE9_README.md`
- API endpoints: `API_ENDPOINTS.md`

---

**Version:** 2.0.0  
**Last Updated:** 2024  
**Platform:** ShriRamya Ecommerce
