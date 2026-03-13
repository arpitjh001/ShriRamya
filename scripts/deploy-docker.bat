#!/bin/bash

# Shri Ramya Platform - Docker Deployment Script
# Date: March 12, 2026
# Purpose: Deploy all recent fixes to Docker

set -e  # Exit on error

echo "=========================================="
echo "🚀 Shri Ramya Docker Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="shriramya"
BACKEND_DIR="backend_node"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    log_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_info "Docker and Docker Compose are installed"
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    log_info "Containers stopped"
}

# Build images
build_images() {
    log_info "Building Docker images..."
    
    # Build backend with no cache to get latest changes
    log_info "Building backend image..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache backend
    
    # Build frontend
    log_info "Building frontend image..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build frontend
    
    log_info "Images built successfully"
}

# Start services
start_services() {
    log_info "Starting all services..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
    
    log_info "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for MySQL
    log_info "Waiting for MySQL..."
    sleep 10
    
    # Wait for MongoDB
    log_info "Waiting for MongoDB..."
    sleep 5
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    sleep 3
    
    # Wait for backend
    log_info "Waiting for backend..."
    sleep 10
    
    log_info "All services should be ready"
}

# Run backend tests
run_tests() {
    log_info "Running backend tests..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec -T backend npm test || {
        log_warn "Some tests failed, but continuing deployment..."
    }
}

# Check service health
check_health() {
    log_info "Checking service health..."
    
    # Check backend health
    log_info "Checking backend health endpoint..."
    curl -s http://localhost:8001/api/v1/health | head -20 || {
        log_warn "Backend health check failed"
    }
    
    echo ""
    
    # Check frontend (via nginx)
    log_info "Checking frontend via nginx..."
    curl -s http://localhost:8080/ | head -5 || {
        log_warn "Frontend check failed"
    }
    
    echo ""
}

# Show container status
show_status() {
    log_info "Container Status:"
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

# Show logs
show_logs() {
    log_info "Recent backend logs:"
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs --tail=20 backend
}

# Main deployment
main() {
    echo ""
    log_info "Starting deployment process..."
    echo ""
    
    # Step 1: Check Docker
    check_docker
    
    # Step 2: Stop existing containers
    stop_containers
    
    # Step 3: Build images
    build_images
    
    # Step 4: Start services
    start_services
    
    # Step 5: Wait for services
    wait_for_services
    
    # Step 6: Check health
    check_health
    
    # Step 7: Show status
    show_status
    
    # Step 8: Show logs
    show_logs
    
    echo ""
    log_info "=========================================="
    log_info "✅ Deployment Complete!"
    log_info "=========================================="
    echo ""
    log_info "Services available at:"
    log_info "  - Frontend: http://localhost:8080"
    log_info "  - Backend API: http://localhost:8001/api/v1"
    log_info "  - API Docs: http://localhost:8001/api/docs"
    log_info "  - MySQL: localhost:3307"
    log_info "  - MongoDB: localhost:27017"
    log_info "  - Redis: localhost:6379"
    echo ""
    log_info "To view logs: docker-compose -p $PROJECT_NAME logs -f"
    log_info "To stop: docker-compose -p $PROJECT_NAME down"
    echo ""
}

# Run main function
main
