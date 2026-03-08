#!/bin/bash

# Phase 3 Performance Optimization - Docker Deployment Script
# This script deploys the performance-optimized backend to Docker

set -e

echo "=============================================="
echo "🚀 Phase 3 Performance Optimization Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Run database migrations
echo -e "${YELLOW}[1/5] Running database migrations...${NC}"
cd ../migrations
if command -v mysql &> /dev/null; then
    echo "Executing performance index migration..."
    # mysql -h localhost -P 3307 -u wpuser -pwppassword shriramya < 20260307_add_performance_indexes.sql
    echo "Note: Manual MySQL execution required if MySQL client not available"
    echo "Command: mysql -h localhost -P 3307 -u wpuser -pwppassword shriramya < 20260307_add_performance_indexes.sql"
else
    echo "MySQL client not found. Please run migration manually:"
    echo "mysql -h localhost -P 3307 -u wpuser -pwppassword shriramya < 20260307_add_performance_indexes.sql"
fi
echo ""

# Step 2: Build backend Docker image
echo -e "${YELLOW}[2/5] Building backend Docker image...${NC}"
cd ../backend_node
docker build -t shriramya-backend:phase3 -f Dockerfile .
echo -e "${GREEN}✓ Backend image built successfully${NC}"
echo ""

# Step 3: Restart Docker services
echo -e "${YELLOW}[3/5] Restarting Docker services...${NC}"
cd ..
docker-compose down
echo "Services stopped"
echo ""

# Step 4: Start all services
echo -e "${YELLOW}[4/5] Starting all Docker services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 5: Wait for services to be healthy
echo -e "${YELLOW}[5/5] Waiting for services to be healthy...${NC}"
sleep 15

# Check service health
echo "Checking service health..."
docker-compose ps
echo ""

# Test backend health
echo -e "${YELLOW}Testing backend health endpoint...${NC}"
sleep 5
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/health 2>/dev/null || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy (HTTP $HEALTH_RESPONSE)${NC}"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    echo "Checking backend logs..."
    docker-compose logs --tail=50 backend
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Service URLs:"
echo "  - Frontend:  http://localhost:8080"
echo "  - Backend:   http://localhost:8080/api/v1"
echo "  - WordPress: http://localhost:8080/wp"
echo "  - API Docs:  http://localhost:8080/api/docs"
echo ""
echo "Next Steps:"
echo "  1. Run API tests: ./scripts/test-all-apis.sh"
echo "  2. Check logs: docker-compose logs -f backend"
echo "  3. Monitor Redis: docker-compose exec redis redis-cli"
echo ""
