# Contributing to Cerebre Media Africa

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

---

## Local setup

```bash
# 1. Clone
git clone <repo-url>
cd cerebre-media

# 2. Configure
cp backend/.env.example .env
# Fill in at minimum:
#   JWT_SECRET (32+ random chars)
#   ANTHROPIC_API_KEY

# 3. Start services
make dev          # uses Docker Compose

# 4. Seed demo data
make db-seed

# 5. Open http://localhost:3000
# Login: demo@cerebre.media / demo1234
```

### Running without Docker

```bash
# Terminal 1 — API
cd backend && npm install && npm run dev

# Terminal 2 — Worker
cd backend && npm run worker

# Terminal 3 — Frontend
cd frontend && npm install && npm run dev
```

---

## Project structure

```
cerebre-media/
├── backend/
│   └── src/
│       ├── config/          # Env validation, constants
│       ├── db/              # Schema, migrations, seed
│       ├── middleware/      # Auth, upload, rate limiting, errors
│       ├── routes/          # Express route handlers
│       ├── services/        # OCR, AI, normalization, storage, auth
│       ├── workers/         # Bull job processors
│       └── utils/           # Logger
├── frontend/
│   └── src/
│       ├── app/             # Next.js app router pages
│       ├── components/      # React components
│       ├── hooks/           # Custom React hooks
│       └── lib/             # API client, Zustand store, TypeScript types
├── nginx/                   # Production nginx config
├── scripts/                 # Health check, utilities
└── Makefile                 # Dev commands
```

---

## Key architectural decisions

### Express route ordering
In `reports.routes.js`, **all specific routes must be registered before `/:reportId`**. Express matches routes in declaration order — if `/:reportId` comes first, it will swallow `/summary/dashboard`, `/history/metrics`, etc.

### Bull job queue pattern
Files follow the pipeline: `upload → OCR worker → normalization → AI analysis worker`. Each step is a separate Bull job. The OCR worker auto-enqueues the AI analysis job on success. Workers run in a separate process (`npm run worker`) so they don't block the API.

### AI prompt structure
The analyst prompt in `ai.service.js` expects Claude to return a single JSON object matching a strict 9-section schema. The response is parsed and each section stored in a separate JSONB column in `analysis_reports`. Never modify the prompt schema without updating the database columns and TypeScript types.

### Authentication
JWT is stored in `localStorage` and also synced to a cookie via `useCookieSync()` in the layout. The cookie allows Next.js middleware to gate routes server-side. Both must be kept in sync.

---

## Adding a new platform

1. Add the canonical name to `config/index.js` `platforms` object
2. Add aliases in `normalization.service.js` `PLATFORM_ALIASES`
3. Add colour and label to `PLATFORM_META` in `frontend/src/app/platforms/page.tsx`
4. Add the same colour to `PLATFORM_COLORS` in `history/page.tsx` and `dashboard/page.tsx`

---

## Adding a new API route

1. Create `backend/src/routes/yourfeature.routes.js`
2. Add `require('./routes/yourfeature.routes')` in `server.js`
3. Mount with `app.use('/api/yourfeature', yourfeatureRoutes)`
4. Add typed client methods to `frontend/src/lib/api.ts`

---

## Environment variables

See `backend/.env.example` for the full list. Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — minimum 32 chars
- `ANTHROPIC_API_KEY` — from console.anthropic.com

The `validate-env.js` script runs on startup and exits with a clear error if any required var is missing.

---

## Database changes

Add a new `.sql` file to `backend/src/db/` with a numeric prefix (e.g. `002_add_tags.sql`). The `migrate.js` runner applies files in alphabetical order and tracks applied migrations in the `_migrations` table.

Never edit `schema.sql` directly after initial deployment — use migration files.

---

## Pull request checklist

- [ ] TypeScript compiles without errors (`cd frontend && npx tsc --noEmit`)
- [ ] No `console.log` left in production code (use `logger` instead)
- [ ] New backend routes have authentication middleware
- [ ] New expensive endpoints have rate limiting
- [ ] Environment variables documented in `.env.example`
- [ ] DB changes use a migration file, not direct schema edits
- [ ] No `violet-` Tailwind classes — use `brand-` instead
