#!/bin/bash

# Shri Ramya Startup Script
# This script starts the entire application stack using Docker Compose.

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Shri Ramya Application Stack...${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Check for Docker
if ! command_exists docker; then
    echo -e "${RED}❌ Error: Docker is not installed.${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# 2. Check for Docker Compose
DOCKER_COMPOSE="docker-compose"
if ! command_exists docker-compose; then
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
    else
        echo -e "${RED}❌ Error: Docker Compose is not installed.${NC}"
        echo "Please install Docker Compose."
        exit 1
    fi
fi

# 3. Check for .env file
if [ ! -f "backend_node/.env" ]; then
    echo -e "${YELLOW}⚠️ Warning: backend_node/.env not found.${NC}"
    if [ -f "backend_node/.env.example" ]; then
        echo "Creating backend_node/.env from .env.example..."
        cp backend_node/.env.example backend_node/.env
        echo -e "${GREEN}✅ Created backend_node/.env. Please review it if you have specific configurations.${NC}"
    else
        echo -e "${RED}❌ Error: backend_node/.env.example not found.${NC}"
        echo "Please create a backend_node/.env file manually before starting."
        exit 1
    fi
fi

# 4. Start the application
echo -e "${BLUE}📦 Building and starting containers (this may take a minute)...${NC}"
$DOCKER_COMPOSE up --build -d

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Application started successfully!${NC}"
    echo -e "------------------------------------------------"
    echo -e "${BLUE}Main Entry (Nginx):${NC} http://localhost:8080"
    echo -e "${BLUE}Backend API:${NC}        http://localhost:8000/api/v1"
    echo -e "${BLUE}WordPress Admin:${NC}    http://localhost:8080/wp/wp-admin"
    echo -e "------------------------------------------------"
    echo -e "To view logs, run: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "To stop the app, run: ${YELLOW}docker-compose down${NC}"
    
    # Run a quick API health check if api_check.sh exists
    if [ -f "./api_check.sh" ]; then
        echo -e "\n${BLUE}🔍 Running health check...${NC}"
        sleep 5 # Give services a moment to warm up
        ./api_check.sh
    fi
else
    echo -e "${RED}❌ Failed to start the application containers.${NC}"
    echo "Check if there are any port conflicts (80, 8000, 3000, 8081, 3306)."
    exit 1
fi
