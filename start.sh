#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill anything already on these ports
kill -9 $(lsof -ti:8000) 2>/dev/null
kill -9 $(lsof -ti:5173) 2>/dev/null

echo "Starting RxPOS..."
echo ""

# Backend
cd "$PROJECT_DIR/artifacts/api-server"
source "$PROJECT_DIR/venv/bin/activate"
"$PROJECT_DIR/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID) → http://localhost:8000/api/docs"

# Frontend
cd "$PROJECT_DIR"
pnpm --filter @workspace/pharmacy-pos run dev &
FRONTEND_PID=$!
echo "Frontend started (PID $FRONTEND_PID) → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Stop both on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
