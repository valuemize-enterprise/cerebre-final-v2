# ═══════════════════════════════════════════════════════════
# Cerebre Media Africa — Makefile
# Usage: make <target>
# ═══════════════════════════════════════════════════════════

.PHONY: help dev prod stop logs db-migrate db-seed db-reset \
        install build test clean shell-api shell-worker shell-db

# Default target
.DEFAULT_GOAL := help

help: ## Show this help
	@echo ""
	@echo "  Cerebre Media Africa — dev commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Development ───────────────────────────────────────────────
dev: ## Start all services in dev mode (Docker)
	docker compose up --build

dev-detached: ## Start all services detached
	docker compose up --build -d

stop: ## Stop all containers
	docker compose down

restart: ## Restart all containers
	docker compose restart

logs: ## Tail logs from all services
	docker compose logs -f

logs-api: ## Tail API server logs only
	docker compose logs -f backend

logs-worker: ## Tail worker logs only
	docker compose logs -f worker

# ── Production ────────────────────────────────────────────────
prod: ## Start production stack (requires certs in nginx/certs/)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-stop: ## Stop production stack
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-deploy: ## Pull and redeploy production (zero-downtime rolling)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps backend worker frontend

# ── Database ──────────────────────────────────────────────────
db-migrate: ## Run database migrations
	docker compose exec backend node src/db/migrate.js

db-seed: ## Seed demo data
	docker compose exec backend node src/db/seed.js

db-reset: ## ⚠ Drop and recreate schema + seed (dev only)
	@echo "⚠  This will DESTROY all data. Press Ctrl+C to cancel, Enter to continue..."
	@read _
	docker compose exec postgres psql -U cerebre -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	docker compose exec backend node src/db/db.js migrate
	docker compose exec backend node src/db/seed.js

db-shell: ## Open PostgreSQL interactive shell
	docker compose exec postgres psql -U cerebre -d cerebre_media

db-backup: ## Backup database to ./backups/
	@mkdir -p backups
	docker compose exec postgres pg_dump -U cerebre cerebre_media > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup saved to backups/"

# ── Local dev (without Docker) ────────────────────────────────
install: ## Install all dependencies
	cd backend && npm install
	cd frontend && npm install

dev-local-api: ## Run API server locally
	cd backend && npm run dev

dev-local-worker: ## Run worker locally
	cd backend && npm run worker

dev-local-frontend: ## Run Next.js locally
	cd frontend && npm run dev

# ── Build ─────────────────────────────────────────────────────
build: ## Build all Docker images
	docker compose build

build-frontend: ## Build frontend only
	docker compose build frontend

build-backend: ## Build backend only
	docker compose build backend

# ── Shell access ──────────────────────────────────────────────
shell-api: ## Shell into API container
	docker compose exec backend sh

shell-worker: ## Shell into worker container
	docker compose exec worker sh

# ── Utilities ─────────────────────────────────────────────────
health: ## Check service health
	@echo "API:" && curl -sf http://localhost:4000/health | python3 -m json.tool || echo "FAIL"
	@echo "Frontend:" && curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "FAIL"

clean: ## Remove containers, volumes, and build cache
	docker compose down -v --rmi local
	rm -rf frontend/.next backend/logs

ps: ## Show running containers
	docker compose ps
