-- ═══════════════════════════════════════════════════════════════
-- Cerebre Intelligence Platform — MASTER SCHEMA
-- Run this ONCE to set up your entire database.
-- Includes v1 base + v2 goals/CRM + enterprise + pro tables.
-- ═══════════════════════════════════════════════════════════════

-- Run schema files in order:
-- 1. schema.sql       (v1 base tables)
-- 2. schema_v2.sql    (goals, scorecards, competitors, CRM)
-- 3. schema_enterprise.sql  (brand health, alerts, multi-org)
-- 4. schema_pro.sql         (campaigns, calendar, AI conversations)
-- 5. schema_extended.sql    (social commerce, geo, hashtags, UTM)

-- TIP: In Supabase SQL Editor, run each file one at a time.
-- If you get errors about tables already existing, that is fine — it means you already ran part of the schema.
