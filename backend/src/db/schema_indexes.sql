-- ════════════════════════════════════════════════════════════════
-- PERFORMANCE FIX: Missing indexes identified in production audit
-- Run this AFTER all schema files in Supabase SQL Editor
--
-- Problems fixed:
-- 1. live_metrics had no index on (brand_id, created_at) — every
--    dashboard load was doing a full table scan
-- 2. webhook_events had no processed=false partial index —
--    the worker was scanning all events on every poll
-- 3. alerts had no index on (brand_id, status) — alert queries slow
-- 4. priority_goals missing compound index for active+rank sort
-- 5. platform_connections missing index for sync scheduler query
-- 6. ai_conversations missing updated_at index for recent sort
-- 7. campaigns missing status+brand index for filtered list views
-- ════════════════════════════════════════════════════════════════

-- ── live_metrics performance ──────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_metrics_brand_date
  ON live_metrics(brand_id, period_start DESC, platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_metrics_brand_platform_type
  ON live_metrics(brand_id, platform, metric_type, period_type);

-- ── webhook_events — partial index for unprocessed events only ─────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_unprocessed
  ON webhook_events(platform, created_at)
  WHERE processed = false;

-- ── alerts ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_brand_status_date
  ON alerts(brand_id, status, created_at DESC);

-- ── priority_goals — the most queried table (every AI call reads it) ──
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_priority_goals_brand_active
  ON priority_goals(brand_id, priority_rank ASC)
  WHERE is_active = true;

-- ── platform_connections — sync scheduler query ───────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_connections_sync_due
  ON platform_connections(last_sync_at ASC)
  WHERE sync_enabled = true AND status = 'connected';

-- ── brand_health_scores — dashboard reads latest record ───────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_health_latest
  ON brand_health_scores(brand_id, period_date DESC);

-- ── ai_conversations — recent conversations query ─────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_brand_recent
  ON ai_conversations(brand_id, created_at DESC);

-- ── campaigns — filtered list views ──────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_brand_status
  ON campaigns(brand_id, status, start_date DESC);

-- ── content_calendar — calendar view query ────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_brand_date
  ON content_calendar(brand_id, scheduled_at ASC);

-- ── api_keys_store — every authenticated API call checks this ─────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_brand_platform
  ON api_keys_store(brand_id, platform)
  WHERE is_active = true;

-- ── user_api_keys — webhook auth ──────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_api_keys_hash
  ON user_api_keys(key_hash);

-- ── saved_insights ────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_insights_brand
  ON saved_insights(brand_id, pinned DESC, created_at DESC);

-- ── influencers ───────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_influencers_brand_fit
  ON influencers(brand_id, brand_fit_score DESC);

-- ── ab_experiments ───────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiments_brand_status
  ON ab_experiments(brand_id, status, created_at DESC);

-- ── utm_links ────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_utm_brand_active
  ON utm_links(brand_id, created_at DESC)
  WHERE is_archived = false;

-- ── sharing — public read by token ────────────────────────────────────
-- Reports already has share_token, but needs a proper index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='analysis_reports' AND column_name='share_token') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_share_token
      ON analysis_reports(share_token)
      WHERE share_token IS NOT NULL;
  END IF;
END $$;

-- ── Verify indexes created ─────────────────────────────────────────────
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
