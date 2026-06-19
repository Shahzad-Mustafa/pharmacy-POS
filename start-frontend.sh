#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

kill -9 $(lsof -ti:5173) 2>/dev/null

cd "$PROJECT_DIR"
pnpm --filter @workspace/pharmacy-pos run dev
