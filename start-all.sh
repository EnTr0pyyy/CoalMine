#!/usr/bin/env bash

# =====================================================================
#           COALGOV - SMART MINE GOVERNANCE PLATFORM
#                 (Start All Services Script)
# =====================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "====================================================================="
echo "          COALGOV - SMART MINE GOVERNANCE PLATFORM"
echo "              (Full-Stack Services Launcher)"
echo "====================================================================="
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all CoalGov services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# 0. Ensure environment files exist from .env.example
if [ ! -f "$ROOT_DIR/Backend/.env" ] && [ -f "$ROOT_DIR/Backend/.env.example" ]; then
    cp "$ROOT_DIR/Backend/.env.example" "$ROOT_DIR/Backend/.env"
    echo "📄 Auto-created Backend/.env from .env.example"
fi
if [ ! -f "$ROOT_DIR/Frontend/.env" ] && [ -f "$ROOT_DIR/Frontend/.env.example" ]; then
    cp "$ROOT_DIR/Frontend/.env.example" "$ROOT_DIR/Frontend/.env"
    echo "📄 Auto-created Frontend/.env from .env.example"
fi
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "📄 Auto-created .env from .env.example"
fi

# 1. Check Ollama (Optional Local LLM)
echo "[1/4] Checking Ollama service..."
if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "    ✅ Ollama is running and ready."
else
    echo "    ℹ️ Ollama is not running. (Optional for local LLM copilot)"
fi

# 2. Start ML FastAPI Service (Port 8001) if Python venv exists
if [ -d "$ROOT_DIR/ML/venv" ]; then
    echo "[2/4] Starting ML FastAPI Service on port 8001..."
    (
        cd "$ROOT_DIR/ML"
        export HF_HUB_OFFLINE=1
        source venv/bin/activate 2>/dev/null || true
        python3 -m uvicorn main:app --host 0.0.0.0 --port 8001
    ) &
    sleep 2
else
    echo "[2/4] Skipping ML service (virtual environment not initialized)."
fi

# 3. Start Node.js Backend (Port 5000)
echo "[3/4] Starting Node.js Backend on port 5000..."
(
    cd "$ROOT_DIR/Backend"
    node src/index.js
) &
sleep 3

# 4. Start React Frontend (Port 5173)
echo "[4/4] Starting React Frontend on port 5173..."
(
    cd "$ROOT_DIR/Frontend"
    npm run dev
) &

echo ""
echo "====================================================================="
echo " All services started!"
echo ""
echo " - Frontend:   http://localhost:5173"
echo " - Backend:    http://localhost:5000"
echo " - Health:     http://localhost:5000/health"
echo " - ML Service: http://localhost:8001 (Docs: http://localhost:8001/docs)"
echo ""
echo " Press Ctrl+C at any time to stop all services."
echo "====================================================================="
echo ""

wait
