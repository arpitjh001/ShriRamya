# Shri Ramya Platform - Docker Deployment Script (PowerShell)
# Date: March 12, 2026
# Purpose: Deploy all recent fixes to Docker on Windows

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Shri Ramya Docker Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ComposeFile = "docker-compose.yml"
$ProjectName = "shriramya"
$BackendDir = "backend_node"

# Functions
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check Docker
function Test-Docker {
    Log-Info "Checking Docker installation..."
    try {
        $dockerVersion = docker --version
        Log-Info "Docker installed: $dockerVersion"
        
        $composeVersion = docker-compose --version
        Log-Info "Docker Compose installed: $composeVersion"
    } catch {
        Log-Error "Docker is not installed or not in PATH"
        exit 1
    }
}

# Stop containers
function Stop-Containers {
    Log-Info "Stopping existing containers..."
    docker-compose -f $ComposeFile -p $ProjectName down
    Log-Info "Containers stopped"
}

# Build images
function Build-Images {
    Log-Info "Building Docker images..."
    
    Log-Info "Building backend image (no cache for latest changes)..."
    docker-compose -f $ComposeFile -p $ProjectName build --no-cache backend
    
    Log-Info "Building frontend image..."
    docker-compose -f $ComposeFile -p $ProjectName build frontend
    
    Log-Info "Images built successfully"
}

# Start services
function Start-Services {
    Log-Info "Starting all services..."
    docker-compose -f $ComposeFile -p $ProjectName up -d
    Log-Info "Services started"
}

# Wait for services
function Wait-Services {
    Log-Info "Waiting for services to be ready..."
    
    Log-Info "Waiting for MySQL (10s)..."
    Start-Sleep -Seconds 10
    
    Log-Info "Waiting for MongoDB (5s)..."
    Start-Sleep -Seconds 5
    
    Log-Info "Waiting for backend (10s)..."
    Start-Sleep -Seconds 10
    
    Log-Info "Services should be ready"
}

# Check health
function Check-Health {
    Log-Info "Checking backend health..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/health" -TimeoutSec 5 -UseBasicParsing
        Log-Info "Backend health: $($response.StatusCode) OK"
        Write-Host $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    } catch {
        Log-Warn "Backend health check failed: $_"
    }
    
    Write-Host ""
    
    Log-Info "Checking frontend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 5 -UseBasicParsing
        Log-Info "Frontend: $($response.StatusCode) OK"
    } catch {
        Log-Warn "Frontend check failed: $_"
    }
}

# Show status
function Show-Status {
    Write-Host ""
    Log-Info "Container Status:"
    docker-compose -f $ComposeFile -p $ProjectName ps
    
    Write-Host ""
    Log-Info "Recent backend logs:"
    docker-compose -f $ComposeFile -p $ProjectName logs --tail=30 backend
}

# Run tests
function Run-Tests {
    Log-Info "Running backend tests..."
    docker-compose -f $ComposeFile -p $ProjectName exec -T backend npm test
    if ($LASTEXITCODE -ne 0) {
        Log-Warn "Some tests failed, but continuing..."
    }
}

# Main deployment
function Main {
    Write-Host ""
    Log-Info "Starting deployment process..."
    Write-Host ""
    
    # Step 1: Check Docker
    Test-Docker
    
    # Step 2: Stop containers
    Stop-Containers
    
    # Step 3: Build images
    Build-Images
    
    # Step 4: Start services
    Start-Services
    
    # Step 5: Wait for services
    Wait-Services
    
    # Step 6: Check health
    Check-Health
    
    # Step 7: Show status
    Show-Status
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Services available at:" -ForegroundColor Cyan
    Write-Host "  - Frontend: http://localhost:8080"
    Write-Host "  - Backend API: http://localhost:8001/api/v1"
    Write-Host "  - API Docs: http://localhost:8001/api/docs"
    Write-Host "  - MySQL: localhost:3307"
    Write-Host "  - MongoDB: localhost:27017"
    Write-Host "  - Redis: localhost:6379"
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Cyan
    Write-Host "  - View logs: docker-compose -p $ProjectName logs -f"
    Write-Host "  - Stop all: docker-compose -p $ProjectName down"
    Write-Host "  - Restart: docker-compose -p $ProjectName restart"
    Write-Host "  - View status: docker-compose -p $ProjectName ps"
    Write-Host ""
}

# Run main
Main
