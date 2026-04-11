#!/usr/bin/env bash
set -euo pipefail

# Shri Ramya Startup Script (Local, no Docker)
# Starts backend + frontend locally. Databases (MongoDB/MySQL/Redis) must be running separately.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists node; then
  echo "Error: Node.js is not installed."
  exit 1
fi

if ! command_exists npm; then
  echo "Error: npm is not available."
  exit 1
fi

frontend_cmd=(yarn dev)
if ! command_exists yarn; then
  echo "Warning: yarn is not installed. Falling back to 'npm run dev' for the frontend."
  frontend_cmd=(npm run dev)
fi

if [ ! -f "backend_node/.env" ]; then
  echo "Warning: backend_node/.env not found."
  if [ -f "backend_node/.env.example" ]; then
    echo "Creating backend_node/.env from backend_node/.env.example..."
    cp backend_node/.env.example backend_node/.env
  else
    echo "Error: backend_node/.env.example not found. Create backend_node/.env before starting."
    exit 1
  fi
fi

echo "Starting Shri Ramya (local)..."
echo "Make sure MongoDB + MySQL are running."
echo "Backend:  http://localhost:8000/api/v1"
echo "Frontend: http://localhost:3000"
echo ""

cleanup() {
  echo ""
  echo "Stopping..."
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup INT TERM EXIT

(cd backend_node && npm run dev) &
BACKEND_PID=$!

(cd frontend && "${frontend_cmd[@]}") &
FRONTEND_PID=$!

sleep 3
if [ -f "./scripts/api_check.sh" ]; then
  ./scripts/api_check.sh "http://localhost:8000/api/v1" || true
fi

wait
