#!/bin/bash
# ── Cerebre Media Africa — One-command setup ──────────────────
# Usage: ./scripts/setup.sh
# Requires: Docker + Docker Compose

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${CYAN}[$1]${NC} $2"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }

echo ""
echo "  Cerebre Media Africa — Setup"
echo "  ──────────────────────────────"

# ── Prerequisites ─────────────────────────────────────────────
step "1/6" "Checking prerequisites"

if ! command -v docker &>/dev/null; then
  echo "  ✗ Docker not found. Install from https://docs.docker.com/get-docker/"
  exit 1
fi
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

if ! docker compose version &>/dev/null 2>&1; then
  echo "  ✗ Docker Compose v2 not found."
  exit 1
fi
ok "Docker Compose $(docker compose version --short)"

# ── Environment ───────────────────────────────────────────────
step "2/6" "Configuring environment"

if [ ! -f .env ]; then
  cp backend/.env.example .env
  # Generate a random JWT secret
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | head -c 32 | base64 | tr -dc 'a-zA-Z0-9' | head -c 44)
  sed -i "s/your_super_secret_jwt_key_change_in_production/$JWT_SECRET/" .env
  ok "Created .env with generated JWT_SECRET"
  warn "ANTHROPIC_API_KEY is still unset — AI analysis will not work until you add it to .env"
else
  ok ".env already exists — skipping"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local
  ok "Created frontend/.env.local"
fi

# ── Build ─────────────────────────────────────────────────────
step "3/6" "Building Docker images (this takes 2-3 minutes on first run)"
docker compose build --quiet
ok "Images built"

# ── Start services ────────────────────────────────────────────
step "4/6" "Starting services"
docker compose up -d postgres redis
echo "  Waiting for Postgres..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U cerebre -d cerebre_media &>/dev/null && break
  sleep 1
done
ok "Postgres ready"

docker compose up -d backend worker frontend
echo "  Waiting for API..."
for i in $(seq 1 30); do
  curl -sf http://localhost:4000/health &>/dev/null && break
  sleep 2
done
ok "API ready"

# ── Migrate + Seed ────────────────────────────────────────────
step "5/6" "Applying database schema and seeding demo data"
docker compose exec -T backend node src/db/db.js migrate
ok "Schema applied"

docker compose exec -T backend node src/db/seed.js
ok "Demo data seeded"

# ── Done ──────────────────────────────────────────────────────
step "6/6" "All done!"
echo ""
echo -e "  ${GREEN}Cerebre Media Africa is running${NC}"
echo ""
echo "  Frontend  →  http://localhost:3000"
echo "  API       →  http://localhost:4000"
echo ""
echo "  Demo login:"
echo "  Email:     demo@cerebre.media"
echo "  Password:  demo1234"
echo ""
echo "  To stop:   docker compose down"
echo "  Logs:      docker compose logs -f"
echo ""
