# Changelog

All notable changes to Cerebre Media Africa are documented here.

## [1.0.0] — 2025-04-14

### Added

**Backend**
- Full Express API with JWT authentication and bcrypt password hashing
- PDF parsing via `pdf-parse` and image OCR via Tesseract.js with sharp pre-processing
- Data normalisation engine — maps 100+ metric/platform label variants to canonical schema
- Date range detection — ISO, "March 2025", "Q1 2024" formats
- Number parsing — handles 1.2M, 45%, ₦2.5k, €1,234, commas
- Claude AI analysis engine — 9-section structured JSON output via `claude-sonnet-4`
- Bull queue with Redis backing — OCR worker auto-chains to AI analysis worker
- Per-user Redis rate limiting — 10 AI analyses/hr, 5 retries/15min, 30 uploads/hr
- Report sharing — generates expiring public tokens, serves read-only without auth
- Job retry endpoint — resets failed files and re-queues OCR
- Admin API — system stats, user management (activate/deactivate/promote), bulk retry
- PostgreSQL schema with 7 tables and idempotent migration runner
- Seed script with 6 months × 6 platforms of realistic demo data
- `validate-env.js` — fail-fast startup with clear error messages

**Frontend (Next.js 14 App Router)**
- 16 pages: dashboard, upload, reports list/detail, history, platforms overview/detail, settings, notifications, search, share, admin, compare, login, register
- Real-time WebSocket job progress via Socket.io
- Drag-and-drop file upload with client-side validation
- Polling fallback for files without WebSocket coverage
- Report export as CSV or JSON
- Report sharing with clipboard copy
- Funnel visualiser with animated bars and drop-off percentages
- Content analysis component with best/worst content cards and patterns
- Notification centre with live event feed and unread badge
- Admin panel with job queue health and user management table
- Skeleton loading states for every major page
- Route-level `loading.tsx` and `error.tsx` boundaries
- `not-found.tsx` global 404 page
- Cookie sync for Next.js middleware server-side auth gating
- Search page with debounced client-side filtering across reports and platforms

**Infrastructure**
- Docker Compose for dev (Postgres, Redis, API, Worker, Frontend)
- `docker-compose.prod.yml` overlay — Nginx, 2× workers, memory limits, log rotation
- GitHub Actions CI — backend (with live Postgres/Redis), TypeScript check, Next.js build, Docker build
- Makefile with 20+ targets: `make dev`, `make db-seed`, `make db-reset`, `make health`, `make prod-deploy`
- Nginx config with WebSocket upgrade, SSL headers, 180s AI call timeout, static asset caching
- Health check script with `--wait` mode for CI/deployment pipelines

**Testing**
- 19 backend unit tests for normalization engine (parseMetricValue, parseDateRange, detectPlatform)
- 14 frontend utility tests for formatters, delta calculations, platform colour registry
- All 33 tests pass

### Technical notes
- Node 22 / native fetch — `node-fetch` dependency removed
- Express route ordering enforced — specific routes always before `/:param`
- `violet-` → `brand-` Tailwind class consistency enforced throughout
- TypeScript strict mode on frontend
- Per-user rate limiting uses Redis sliding window with graceful fallback
