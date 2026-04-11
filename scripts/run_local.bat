@echo off
setlocal

REM Shri Ramya Startup Script (Local, no Docker)
REM Starts backend + frontend locally. Databases (MongoDB/MySQL/Redis) must be running separately.

pushd %~dp0..

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed.
  popd
  exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: npm is not available.
  popd
  exit /b 1
)

set FRONTEND_RUN=yarn dev
where yarn >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Warning: yarn is not installed. Falling back to "npm run dev" for the frontend.
  set FRONTEND_RUN=npm run dev
)

if not exist "backend_node\\.env" (
  echo Warning: backend_node\\.env not found.
  if exist "backend_node\\.env.example" (
    echo Creating backend_node\\.env from backend_node\\.env.example...
    copy /Y "backend_node\\.env.example" "backend_node\\.env" >nul
  ) else (
    echo Error: backend_node\\.env.example not found. Create backend_node\\.env before starting.
    popd
    exit /b 1
  )
)

echo Starting Shri Ramya (local)...
echo Make sure MongoDB + MySQL are running.
echo Backend:  http://localhost:8000/api/v1
echo Frontend: http://localhost:3000
echo.

start "Backend (dev)" cmd /k "cd /d backend_node && npm run dev"
start "Frontend (dev)" cmd /k "cd /d frontend && %FRONTEND_RUN%"

popd
endlocal
