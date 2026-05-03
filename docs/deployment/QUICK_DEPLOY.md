# 🚀 Quick Deploy - Phase 9 Changes

## Deploy to Docker (Windows)

### Step 1: Navigate to Backend Directory
```powershell
cd c:\Users\Lenovo\shriramya\ShriRamya\backend_node
```

### Step 2: Build Backend Image
```powershell
# Rebuild backend with Phase 9 changes
docker-compose build backend
```

### Step 3: Restart Backend Container
```powershell
# Restart with new image
docker-compose up -d backend
```

### Step 4: Run Database Migrations
```powershell
# Run migrations to create Phase 9 tables
docker-compose exec backend npm run migrate
```

### Step 5: Verify Deployment
```powershell
# Check container status
docker-compose ps

# View backend logs
docker-compose logs -f backend
```

---

## Quick Commands

### Deploy using PowerShell script
```powershell
.\scripts\deploy.ps1
```

### Deploy using Bash script (Git Bash)
```bash
./scripts/deploy.sh
```

### Manual deployment
```bash
cd c:\Users\Lenovo\shriramya\ShriRamya

# Rebuild backend
docker-compose build backend

# Restart services
docker-compose up -d backend

# Run migrations
docker-compose exec backend npm run migrate

# View logs
docker-compose logs -f backend
```

---

## Verify Phase 9 Features

### 1. Check Health Endpoint
```bash
curl http://localhost:8080/api/v1/health
```

### 2. Test Search API
```bash
curl http://localhost:8080/api/v1/search?q=saree
```

### 3. Check API Documentation
```
Open browser: http://localhost:8080/api/docs
```

### 4. Test Analytics Endpoint (Admin)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8080/api/v1/admin/analytics/overview
```

---

## Troubleshooting

### Backend won't start
```powershell
# Check logs
docker-compose logs backend

# Rebuild with no cache
docker-compose build --no-cache backend

# Restart
docker-compose up -d backend
```

### Migrations fail
```powershell
# Check database connection
docker-compose exec backend node -e "require('./src/config/db').connectMySQL().then(() => console.log('OK'))"

# Run migrations manually
docker-compose exec backend node scripts/run-migrations.js
```

### Port conflicts
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Stop conflicting process
taskkill /F /PID <PID>
```

---

## Rollback

If you need to rollback to the previous version:

```powershell
# Stop backend
docker-compose stop backend

# Remove new image
docker rmi shriramya-backend

# Rebuild with old code (git checkout)
git checkout HEAD -- backend_node
docker-compose build backend
docker-compose up -d backend
```

---

**Deployment Time:** ~5-10 minutes  
**Downtime:** Minimal (backend restarts with new image)  
**Data Loss:** None (volumes preserved)
