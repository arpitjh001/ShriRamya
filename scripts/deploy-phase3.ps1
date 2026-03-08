# Phase 3 Performance Optimization - Docker Deployment Script (PowerShell)
# This script deploys the performance-optimized backend to Docker on Windows

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🚀 Phase 3 Performance Optimization Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Display migration instructions
Write-Host "[1/6] Database Migration Instructions" -ForegroundColor Yellow
Write-Host "Run the following MySQL command to add performance indexes:" -ForegroundColor White
Write-Host "mysql -h localhost -P 3307 -u wpuser -pwppassword shriramya < migrations/20260307_add_performance_indexes.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: This step is optional but recommended for optimal performance." -ForegroundColor Yellow
Write-Host ""

# Step 2: Build backend Docker image
Write-Host "[2/6] Building backend Docker image..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\backend_node"
docker build -t shriramya-backend:phase3 -f Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend image build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend image built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Stop existing services
Write-Host "[3/6] Stopping existing Docker services..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\.."
docker-compose down
Write-Host "✓ Services stopped" -ForegroundColor Green
Write-Host ""

# Step 4: Start all services
Write-Host "[4/6] Starting all Docker services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Services started" -ForegroundColor Green
Write-Host ""

# Step 5: Wait for services to be healthy
Write-Host "[5/6] Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check service health
Write-Host "Checking service health..." -ForegroundColor White
docker-compose ps
Write-Host ""

# Step 6: Test backend health
Write-Host "[6/6] Testing backend health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -Method Get -UseBasicParsing -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✓ Backend is healthy (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend health check failed (HTTP $($healthResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Backend health check failed - Service may still be starting" -ForegroundColor Red
    Write-Host "Checking backend logs..." -ForegroundColor Yellow
    docker-compose logs --tail 50 backend
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  - Frontend:  http://localhost:8080" -ForegroundColor White
Write-Host "  - Backend:   http://localhost:8080/api/v1" -ForegroundColor White
Write-Host "  - WordPress: http://localhost:8080/wp" -ForegroundColor White
Write-Host "  - API Docs:  http://localhost:8080/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run API tests: .\backend_node\scripts\test-all-apis.ps1" -ForegroundColor White
Write-Host "  2. Check logs: docker-compose logs -f backend" -ForegroundColor White
Write-Host "  3. Monitor Redis: docker-compose exec redis redis-cli" -ForegroundColor White
Write-Host ""
