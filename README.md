# Cerebre Intelligence Platform v2.0 — Pro Enterprise

AI-powered marketing intelligence for corporations. Full real-time platform integrations,
industry-specific dashboards (banking, FMCG, restaurant, retail), and 53 feature pages.

## ⚡ Quick start — first time setup

1. Open **DEPLOYMENT-GUIDE.html** in your browser
2. Follow the 10-step guide (45 minutes total, zero coding required)

## Required environment variables (Railway backend)

| Variable | Where to get it | Required |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → URI | ✅ |
| `REDIS_URL` | Upstash → Database → Details | ✅ |
| `JWT_SECRET` | Make up 40+ random chars | ✅ |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | ✅ |
| `AWS_ACCESS_KEY_ID` | Cloudflare R2 → API Tokens | ✅ |
| `AWS_SECRET_ACCESS_KEY` | Cloudflare R2 → API Tokens | ✅ |
| `S3_BUCKET_NAME` | `cerebre-media-files` | ✅ |
| `S3_ENDPOINT` | `https://[account-id].r2.cloudflarestorage.com` | ✅ |
| `AWS_REGION` | `auto` | ✅ |
| `FRONTEND_URL` | Your Vercel URL (add after deploy) | ✅ |

## Database setup (Supabase SQL Editor — run in this order)

```
backend/src/db/schema.sql           → v1 base tables
backend/src/db/schema_v2.sql        → goals, scorecards, competitors, CRM
backend/src/db/schema_enterprise.sql → brand health, alerts, RBAC, multi-org
backend/src/db/schema_pro.sql       → campaigns, calendar, AI conversations
backend/src/db/schema_extended.sql  → social commerce, geo, hashtags, UTM, SOV
backend/src/db/schema_realtime.sql  → platform connections, live metrics
```

## Feature summary (53 pages)

**Setup:** Setup wizard, Connect platforms, API Keys management
**Analysis:** Dashboard, Reports, History, Upload, Ask Your Data
**Strategy:** Priority Goals, Campaigns, Scorecards, Content Calendar
**Brand:** Brand Health, Share of Voice, AI Search Visibility, Maturity Assessment
**Market:** Benchmarks, Cultural Calendar, Geo Intelligence, Seasonal Intelligence
**Budget:** ROI Calculator, Spend Heatmap, Budget Optimiser, UTM Builder
**Advanced:** Predictive Analytics, A/B Experiments, Influencer Tracker, Automations
**Tools:** Voice Guardian, Weekly Digest, Board Deck, Data Health, Hashtags
**Industry:** Banking, FMCG, Restaurant, Retail dashboards
**Integrations:** WordPress plugin, Webhooks, Email marketing, CRM
**Real-time:** Live dashboard, Real-time GA4 users, Industry Intelligence
**Settings:** API Keys, Notifications, Platform config, Profile

## Tech stack

Next.js 14 · Express · Claude AI (Anthropic) · Tesseract OCR · PostgreSQL · Redis · Cloudflare R2 · Socket.io · Docker
