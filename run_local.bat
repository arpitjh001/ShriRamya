@echo off
setlocal

echo 🚀 Starting Shri Ramya Application Stack...

:: Check for docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Docker is not installed.
    echo Please install Docker from https://docs.docker.com/get-docker/
    exit /b 1
)

:: Check for docker-compose or docker compose
set DOCKER_COMPOSE=docker-compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    docker compose version >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set DOCKER_COMPOSE=docker compose
    ) else (
        echo ❌ Error: Docker Compose is not installed.
        exit /b 1
    )
)

:: Check for .env file
if not exist "backend\.env" (
    echo ⚠️ Warning: backend\.env not found.
    if exist "backend\.env.example" (
        echo Creating backend\.env from .env.example...
        copy backend\.env.example backend\.env
        echo ✅ Created backend\.env. Please review it if you have specific configurations.
    ) else (
        echo ❌ Error: backend\.env.example not found.
        exit /b 1
    )
)

:: Start the application
echo 📦 Building and starting containers (this may take a minute)...
%DOCKER_COMPOSE% up --build -d

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Application started successfully!
    echo ------------------------------------------------
    echo Main Entry (Nginx): http://localhost
    echo Frontend:           http://localhost (via Nginx) or http://localhost:3000
    echo Backend API:        http://localhost/api or http://localhost:8000
    echo WordPress Admin:    http://localhost/wp/wp-admin
    echo ------------------------------------------------
    echo To view logs, run: %DOCKER_COMPOSE% logs -f
    echo To stop the app, run: %DOCKER_COMPOSE% down
) else (
    echo ❌ Failed to start the application containers.
    exit /b 1
)

endlocal
