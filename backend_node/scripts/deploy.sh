#!/bin/bash

# ShriRamya Ecommerce Platform - Docker Deployment Script
# Usage: ./scripts/deploy.sh [dev|staging|production]

set -e

ENVIRONMENT=${1:-dev}
PROJECT_NAME="shriramya"

echo "========================================"
echo "🚀 ShriRamya Docker Deployment"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Project: $PROJECT_NAME"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_info "Docker version: $(docker --version)"
    log_info "Docker Compose version: $(docker-compose --version)"
}

check_env_file() {
    if [ ! -f .env ]; then
        log_warn ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info ".env file created. Please update it with your configuration."
            log_warn "Deployment paused. Update .env file and run this script again."
            exit 0
        else
            log_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    log_info ".env file found"
}

stop_existing_containers() {
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down --remove-orphans 2>/dev/null || true
}

build_images() {
    log_info "Building Docker images..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.production.yml build --no-cache
    else
        docker-compose -f docker-compose.production.yml build
    fi
    
    log_info "Docker images built successfully"
}

start_services() {
    log_info "Starting services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.production.yml up -d
    else
        # Start without monitoring services for dev
        docker-compose -f docker-compose.production.yml up -d --without-dependencies
    fi
    
    log_info "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Wait for MySQL
    log_info "Waiting for MySQL..."
    for i in {1..30}; do
        if docker exec shriramya-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            log_info "MySQL is ready"
            break
        fi
        sleep 2
    done
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    for i in {1..10}; do
        if docker exec shriramya-redis redis-cli ping 2>/dev/null | grep -q PONG; then
            log_info "Redis is ready"
            break
        fi
        sleep 1
    done
    
    # Wait for MongoDB
    log_info "Waiting for MongoDB..."
    for i in {1..10}; do
        if docker exec shriramya-mongo mongosh --eval "db.adminCommand('ping')" 2>/dev/null | grep -q ok; then
            log_info "MongoDB is ready"
            break
        fi
        sleep 1
    done
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Run migrations in backend container
    docker-compose -f docker-compose.production.yml exec -T backend npm run migrate || {
        log_warn "Migration failed or already ran. Continuing..."
    }
    
    log_info "Database migrations completed"
}

show_status() {
    echo ""
    log_info "========================================"
    log_info "Deployment Status"
    log_info "========================================"
    
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    log_info "========================================"
    log_info "Service URLs"
    log_info "========================================"
    log_info "API: http://localhost:8000"
    log_info "API Docs: http://localhost:8000/api/docs"
    log_info "Health Check: http://localhost:8000/api/v1/health"
    
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        log_info "BullMQ Dashboard: http://localhost:3000"
        log_info "Prometheus: http://localhost:9090"
        log_info "Grafana: http://localhost:3001"
    fi
    
    echo ""
    log_info "========================================"
    log_info "Useful Commands"
    log_info "========================================"
    log_info "View logs: docker-compose -f docker-compose.production.yml logs -f"
    log_info "Stop services: docker-compose -f docker-compose.production.yml down"
    log_info "Restart services: docker-compose -f docker-compose.production.yml restart"
    log_info "Rebuild: ./scripts/deploy.sh rebuild"
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    check_env_file
    
    case "${2:-}" in
        rebuild)
            log_info "Rebuilding all images..."
            docker-compose -f docker-compose.production.yml build --no-cache
            stop_existing_containers
            build_images
            start_services
            wait_for_services
            run_migrations
            ;;
        stop)
            log_info "Stopping all services..."
            docker-compose -f docker-compose.production.yml down
            exit 0
            ;;
        restart)
            log_info "Restarting services..."
            docker-compose -f docker-compose.production.yml restart
            exit 0
            ;;
        logs)
            docker-compose -f docker-compose.production.yml logs -f
            exit 0
            ;;
        *)
            stop_existing_containers
            build_images
            start_services
            wait_for_services
            run_migrations
            ;;
    esac
    
    show_status
}

# Run main function
main "$@"
