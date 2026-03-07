# ShriRamya Ecommerce Platform - Docker Deployment Script (PowerShell)
# Usage: .\scripts\deploy.ps1 [dev|staging|production]

param(
    [string]$Environment = "dev",
    [string]$Action = "deploy"
)

$PROJECT_NAME = "shriramya"
$DOCKER_COMPOSE_FILE = "docker-compose.production.yml"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 ShriRamya Docker Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host "Project: $PROJECT_NAME" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

function Log-Info {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Check-Prerequisites {
    Log-Info "Checking prerequisites..."
    
    try {
        $dockerVersion = docker --version
        Log-Info "Docker found: $dockerVersion"
    } catch {
        Log-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    try {
        $composeVersion = docker-compose --version
        Log-Info "Docker Compose found: $composeVersion"
    } catch {
        Log-Error "Docker Compose is not installed."
        exit 1
    }
}

function Check-EnvFile {
    if (-not (Test-Path ".env")) {
        Log-Warn ".env file not found"
        
        if (Test-Path ".env.example") {
            Log-Info "Creating .env from .env.example..."
            Copy-Item ".env.example" ".env"
            Log-Warn ".env file created. Please update it with your configuration."
            Log-Warn "Deployment paused. Update .env file and run this script again."
            exit 0
        } else {
            Log-Error ".env.example not found. Please create .env file manually."
            exit 1
        }
    }
    
    Log-Info ".env file found"
}

function Stop-ExistingContainers {
    Log-Info "Stopping existing containers..."
    docker-compose -f $DOCKER_COMPOSE_FILE down --remove-orphans 2>$null
}

function Build-Images {
    Log-Info "Building Docker images..."
    
    if ($Environment -eq "production") {
        docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache
    } else {
        docker-compose -f $DOCKER_COMPOSE_FILE build
    }
    
    Log-Info "Docker images built successfully"
}

function Start-Services {
    Log-Info "Starting services..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    Log-Info "Services started"
}

function Wait-ForServices {
    Log-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    
    # Wait for MySQL
    Log-Info "Waiting for MySQL..."
    for ($i = 1; $i -le 30; $i++) {
        $result = docker exec shriramya-mysql mysqladmin ping -h localhost --silent 2>$null
        if ($result -like "alive") {
            Log-Info "MySQL is ready"
            break
        }
        Start-Sleep -Seconds 2
    }
    
    # Wait for Redis
    Log-Info "Waiting for Redis..."
    for ($i = 1; $i -le 10; $i++) {
        $result = docker exec shriramya-redis redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Log-Info "Redis is ready"
            break
        }
        Start-Sleep -Seconds 1
    }
    
    # Wait for MongoDB
    Log-Info "Waiting for MongoDB..."
    for ($i = 1; $i -le 10; $i++) {
        $result = docker exec shriramya-mongo mongosh --eval "db.adminCommand('ping')" 2>$null
        if ($result -like "*ok*") {
            Log-Info "MongoDB is ready"
            break
        }
        Start-Sleep -Seconds 1
    }
}

function Run-Migrations {
    Log-Info "Running database migrations..."
    
    try {
        docker-compose -f $DOCKER_COMPOSE_FILE exec -T backend npm run migrate
        Log-Info "Database migrations completed"
    } catch {
        Log-Warn "Migration failed or already ran. Continuing..."
    }
}

function Show-Status {
    Write-Host ""
    Log-Info "========================================"
    Log-Info "Deployment Status"
    Log-Info "========================================"
    
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    Write-Host ""
    Log-Info "========================================"
    Log-Info "Service URLs"
    Log-Info "========================================"
    Log-Info "API: http://localhost:8000"
    Log-Info "API Docs: http://localhost:8000/api/docs"
    Log-Info "Health Check: http://localhost:8000/api/v1/health"
    Log-Info "BullMQ Dashboard: http://localhost:3000"
    Log-Info "Grafana: http://localhost:3001"
    Log-Info "Prometheus: http://localhost:9090"
    
    Write-Host ""
    Log-Info "========================================"
    Log-Info "Useful Commands"
    Log-Info "========================================"
    Log-Info "View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    Log-Info "Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    Log-Info "Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
    Log-Info "Rebuild: .\scripts\deploy.ps1 -Action rebuild"
    Write-Host ""
}

# Main deployment flow
switch ($Action) {
    "rebuild" {
        Log-Info "Rebuilding all images..."
        docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache
        Stop-ExistingContainers
        Build-Images
        Start-Services
        Wait-ForServices
        Run-Migrations
    }
    "stop" {
        Log-Info "Stopping all services..."
        docker-compose -f $DOCKER_COMPOSE_FILE down
        exit 0
    }
    "restart" {
        Log-Info "Restarting services..."
        docker-compose -f $DOCKER_COMPOSE_FILE restart
        exit 0
    }
    "logs" {
        docker-compose -f $DOCKER_COMPOSE_FILE logs -f
        exit 0
    }
    "status" {
        docker-compose -f $DOCKER_COMPOSE_FILE ps
        exit 0
    }
    default {
        Stop-ExistingContainers
        Build-Images
        Start-Services
        Wait-ForServices
        Run-Migrations
    }
}

Show-Status
