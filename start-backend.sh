#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill -9 $(lsof -ti:8000) 2>/dev/null

cd "$PROJECT_DIR/artifacts/api-server"
"$PROJECT_DIR/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload
