#!/bin/bash
# ── Cerebre Media — Health Check Script ──────────────────────
# Usage: ./scripts/healthcheck.sh [--wait]
# Exit 0 = all healthy, Exit 1 = one or more failed

set -e

API_URL="${API_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
WAIT_MODE="${1}"
MAX_ATTEMPTS=30
SLEEP_SEC=2

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }
info() { echo -e "${YELLOW}  …${NC} $1"; }

check_service() {
  local name="$1"
  local url="$2"
  local attempt=1

  while [ $attempt -le $MAX_ATTEMPTS ]; do
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
      ok "$name ($url)"
      return 0
    fi

    if [ "$WAIT_MODE" == "--wait" ]; then
      info "$name not ready (attempt $attempt/$MAX_ATTEMPTS)..."
      sleep $SLEEP_SEC
      attempt=$((attempt + 1))
    else
      fail "$name unreachable ($url)"
      return 1
    fi
  done

  fail "$name failed after $MAX_ATTEMPTS attempts"
  return 1
}

echo ""
echo "Cerebre Media Africa — service health check"
echo "────────────────────────────────────────────"

FAILED=0

check_service "API server"   "$API_URL/health"    || FAILED=$((FAILED + 1))
check_service "Frontend"     "$FRONTEND_URL"       || FAILED=$((FAILED + 1))

# Check API health details
if curl -sf --max-time 5 "$API_URL/health" > /tmp/health.json 2>/dev/null; then
  DB_STATUS=$(python3 -c "import json,sys; d=json.load(open('/tmp/health.json')); print(d.get('db','unknown'))" 2>/dev/null || echo "unknown")
  if [ "$DB_STATUS" == "connected" ]; then
    ok "Database ($DB_STATUS)"
  else
    fail "Database ($DB_STATUS)"
    FAILED=$((FAILED + 1))
  fi
fi

echo "────────────────────────────────────────────"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All services healthy${NC}"
  exit 0
else
  echo -e "${RED}$FAILED service(s) failed${NC}"
  exit 1
fi
