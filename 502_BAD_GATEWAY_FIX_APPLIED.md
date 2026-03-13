# 502 Bad Gateway - Fix Applied

**Date:** March 13, 2026  
**Issue:** 502 Bad Gateway on API endpoints  
**Status:** ✅ **FIXED**

---

## Problem

NGINX was returning **502 Bad Gateway** errors when trying to access API endpoints through port 8080.

### Error in NGINX Logs
```
2026/03/13 04:30:38 [error] 30#30: *365 connect() failed (111: Connection refused) 
while connecting to upstream, client: 172.18.0.1, server: , 
request: "GET /api/v1/health HTTP/1.1", 
upstream: "http://172.18.0.6:8000/api/v1/health", host: "localhost:8080"
```

---

## Root Cause

**Stale Container IP Address**

1. Backend container was restarted during the WordPress removal and coupon fix updates
2. Docker assigned a **new IP address** to the backend container
3. NGINX was still trying to connect to the **old IP address** (`172.18.0.6:8000`)
4. Connection refused → **502 Bad Gateway**

### Network Issue

**Before Fix:**
```
NGINX (172.18.0.4) → Backend OLD IP (172.18.0.6:8000) ❌ Connection Refused → 502 Error
```

**After Fix:**
```
NGINX (172.18.0.4) → Backend NEW IP (172.18.0.7:8000) ✅ Connected → 200 OK
```

---

## Solution Applied

### Command Executed
```bash
docker-compose -f docker-compose.yml restart nginx backend
```

### What This Does
1. **Restarts backend container** - Gets fresh IP if needed
2. **Restarts NGINX** - Forces DNS re-resolution of `backend` hostname
3. **NGINX picks up new backend IP** via Docker's internal DNS
4. **API calls start working** through NGINX proxy

---

## Verification

### ✅ All APIs Working

| Endpoint | Status | Response |
|----------|--------|----------|
| `/api/v1/health` | ✅ 200 OK | `{"success":true,"status":"ok"}` |
| `/api/v1/products` | ✅ 200 OK | Returns 4 products |
| `/api/v1/categories` | ✅ 200 OK | Returns 4 categories |
| `/api/v1/orders` | ✅ Ready | Working |

### ✅ Container Status

| Container | Status | Notes |
|-----------|--------|-------|
| shriramya-frontend-1 | Up 2 minutes | ✅ Running |
| shriramya-backend-1 | Up 21 seconds | ✅ Restarted |
| shriramya-nginx-1 | Up 22 seconds | ✅ Restarted |
| shriramya-mysql-1 | Up 3 minutes | ✅ Running |
| shriramya-mongodb-1 | Up 12 minutes | ✅ Running |
| shriramya-redis-1 | Up 12 minutes | ✅ Running |

---

## How It Works

### Docker Service Discovery

1. **Docker Compose** creates a network named `shriramya_default`
2. Each service gets a **hostname** matching its service name
3. Containers reach each other via **service names** (not IPs)
4. **Docker DNS** resolves `backend` to the container's current IP

### NGINX Configuration

```nginx
location /api/ {
    proxy_pass http://backend:8000;  # ← Uses Docker DNS
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    # ... other headers
}
```

**Key Point:** `http://backend:8000` uses Docker's internal DNS, which resolves to the current container IP.

### Why Restart Fixes It

When containers restart:
1. Docker may assign a **new IP address**
2. NGINX needs to **re-resolve** the `backend` hostname
3. Restart forces NGINX to **refresh DNS cache**
4. NGINX connects to the **new IP**

---

## Prevention

### To Prevent Future 502 Errors:

#### 1. Use Docker Service Names ✅ (Already Done)
NGINX config uses `backend:8000` instead of hardcoded IP.

#### 2. Add Health Checks (Recommended)
```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

#### 3. Use depends_on with Conditions
```yaml
nginx:
  depends_on:
    backend:
      condition: service_healthy
```

#### 4. Quick Fix Script
```bash
#!/bin/bash
if ! curl -f http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "Backend unreachable via NGINX, restarting..."
    docker-compose -p shriramya restart nginx backend
fi
```

---

## Troubleshooting Guide

### If 502 Errors Return:

#### Step 1: Check Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

#### Step 2: Check Backend Logs
```bash
docker logs shriramya-backend-1
```
Look for: `"Server running on port 8000"`

#### Step 3: Check NGINX Logs
```bash
docker logs shriramya-nginx-1 --tail 50
```
Look for: `"connect() failed (111: Connection refused)"`

#### Step 4: Test Backend Directly
```bash
curl http://localhost:8001/api/v1/health
```
Should return health status.

#### Step 5: Restart Affected Containers
```bash
docker-compose restart nginx backend
```

#### Step 6: Verify Fix
```bash
curl http://localhost:8080/api/v1/health
```

---

## Access Points

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:8080 | 8080 |
| Backend API (Direct) | http://localhost:8001 | 8001 |
| Backend API (NGINX) | http://localhost:8080/api | 8080 |
| Admin Dashboard | http://localhost:8080/admin/dashboard | 8080 |

---

## Quick Reference Commands

```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Restart NGINX + Backend (fix 502)
docker-compose restart nginx backend

# View backend logs
docker logs shriramya-backend-1

# View NGINX logs
docker logs shriramya-nginx-1

# Test API directly
curl http://localhost:8001/api/v1/health

# Test API through NGINX
curl http://localhost:8080/api/v1/health

# Restart all services
docker-compose restart
```

---

## Success Criteria

✅ **502 errors resolved**  
✅ **All APIs accessible through NGINX**  
✅ **Backend responding correctly**  
✅ **NGINX proxying correctly**  
✅ **All containers running**  
✅ **No connection refused errors**

---

**Fix Applied:** March 13, 2026  
**Time to Fix:** < 1 minute  
**Status:** ✅ **RESOLVED**

---

**Note:** This is a common issue when Docker containers are restarted. The fix is simple - restart NGINX to refresh DNS resolution. Consider adding health checks and automatic restart scripts for production environments.
