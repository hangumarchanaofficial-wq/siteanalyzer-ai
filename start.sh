#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
LOG_LEVEL="${LOG_LEVEL:-info}"

export PORT="$APP_PORT"
export HOSTNAME="0.0.0.0"
export AUDIT_API_BASE_URL="${AUDIT_API_BASE_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}}"

python3 -m uvicorn backend.server:app \
  --host "$BACKEND_HOST" \
  --port "$BACKEND_PORT" \
  --log-level "$LOG_LEVEL" &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "${NEXT_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

node server.js &
NEXT_PID=$!

wait -n "$BACKEND_PID" "$NEXT_PID"
STATUS=$?

kill "$BACKEND_PID" "$NEXT_PID" 2>/dev/null || true
wait "$BACKEND_PID" "$NEXT_PID" 2>/dev/null || true

exit "$STATUS"
