-- ════════════════════════════════════════════════════════════
-- Cerebre Intelligence Platform — Enterprise Schema
-- This is a COMPLETE, self-contained additive migration
-- Run after v1 + v2 schemas
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text search

-- ── MULTI-WORKSPACE / MULTI-BRAND ────────────────────────────
-- One client organisation can have multiple brands
CREATE TABLE IF NOT EXISTS organisations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,  -- used in white-label URLs
  -- White-label configuration
  primary_color VARCHAR(7) DEFAULT '#7c3aed',
  logo_url      VARCHAR(500),
  favicon_url   VARCHAR(500),
  custom_domain VARCHAR(255),   -- e.g. analytics.clientbrand.com
  -- License
  license_tier  VARCHAR(50) DEFAULT 'professional',
  -- 'starter' | 'professional' | 'enterprise' | 'unlimited'
  license_seats INTEGER DEFAULT 5,
  license_expires_at TIMESTAMPTZ,
  -- Feature flags (controls what features are ON for this org)
  features      JSONB DEFAULT '{
    "brand_health": true,
    "predictive": true,
    "crisis_alerts": true,
    "competitor_tracking": true,
    "crm_integration": true,
    "budget_optimizer": true,
    "content_briefs": true,
    "audience_intelligence": true,
    "report_builder": true,
    "api_access": false,
    "sso": false,
    "white_label": false
  }',
  timezone      VARCHAR(100) DEFAULT 'Africa/Lagos',
  currency      VARCHAR(10) DEFAULT 'NGN',
  country       VARCHAR(100) DEFAULT 'Nigeria',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Brands (a client company can have multiple product brands)
CREATE TABLE IF NOT EXISTS brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  industry        VARCHAR(200) NOT NULL,
  sub_industry    VARCHAR(200),   -- more specific classification
  description     TEXT,
  target_audience TEXT,           -- who is the brand trying to reach?
  brand_voice     VARCHAR(100),   -- 'professional' | 'playful' | 'luxury' | etc.
  website         VARCHAR(500),
  logo_url        VARCHAR(500),
  -- Active platforms (only platforms the brand actually uses)
  active_platforms JSONB DEFAULT '[]',
  -- e.g. ["instagram", "tiktok", "email"] — NOT forced to use all
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_org ON brands(organisation_id);

-- ── ROLE-BASED ACCESS CONTROL ────────────────────────────────
-- Roles designed for corporate hierarchy
CREATE TABLE IF NOT EXISTS user_roles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES brands(id),  -- NULL = access all brands
  role            VARCHAR(50) NOT NULL,
  -- 'owner'       → full access, billing, user management
  -- 'ceo'         → executive view only (read-only, high-level KPIs)
  -- 'cmo'         → full strategic access, can approve content
  -- 'analyst'     → create reports, upload data, run analysis
  -- 'viewer'      → read-only dashboard access (for board members)
  -- 'client'      → limited view, white-labelled, no competitor data
  -- 'admin'       → system administration
  permissions     JSONB DEFAULT '{}',
  -- Fine-grained overrides: {can_export: true, can_see_competitors: false}
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, user_id, brand_id)
);

-- ── DYNAMIC PRIORITY GOALS SYSTEM ────────────────────────────
-- Goals can be reprioritised at any time
-- AI ALWAYS reads the priority order before generating any output

CREATE TABLE IF NOT EXISTS priority_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,

  -- Priority (AI pays MORE attention to lower-numbered goals)
  priority_rank   INTEGER NOT NULL DEFAULT 1,  -- 1 = highest priority
  is_active       BOOLEAN DEFAULT true,

  -- Goal definition (flexible for any industry)
  goal_category   VARCHAR(100) NOT NULL,
  -- Any category: 'revenue', 'brand_awareness', 'lead_gen', 'retention',
  -- 'market_share', 'product_launch', 'crisis_recovery', 'expansion',
  -- 'reputation', 'talent_acquisition', 'investor_relations', etc.

  custom_category VARCHAR(200),  -- if goal_category = 'custom'

  -- What platforms this goal applies to (empty = all active platforms)
  relevant_platforms JSONB DEFAULT '[]',

  -- Target (flexible — any metric, any unit)
  target_metric   VARCHAR(200),  -- any KPI the brand cares about
  target_value    NUMERIC(20, 4),
  target_unit     VARCHAR(100),
  baseline_value  NUMERIC(20, 4),
  current_value   NUMERIC(20, 4),
  progress_pct    NUMERIC(6,2) DEFAULT 0,

  -- Time horizon
  horizon         VARCHAR(30),
  deadline        DATE,

  -- AI output
  ai_strategy     TEXT,
  ai_tactics      JSONB DEFAULT '[]',
  ai_kpis         JSONB DEFAULT '[]',
  ai_risks        JSONB DEFAULT '[]',

  status          VARCHAR(30) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_priority_goals_brand    ON priority_goals(brand_id, priority_rank);
CREATE INDEX idx_priority_goals_active   ON priority_goals(brand_id) WHERE is_active = true;

-- ── BRAND HEALTH SYSTEM ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_health_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  period_date     DATE NOT NULL,

  -- Composite health score (0-100)
  overall_score   NUMERIC(5,2),
  score_trend     VARCHAR(20),  -- 'improving' | 'stable' | 'declining' | 'at_risk'

  -- Component scores (all 0-100)
  visibility_score     NUMERIC(5,2),  -- reach + impressions trend
  engagement_score     NUMERIC(5,2),  -- engagement quality + consistency
  sentiment_score      NUMERIC(5,2),  -- positive vs negative perception
  content_score        NUMERIC(5,2),  -- content quality + resonance
  audience_score       NUMERIC(5,2),  -- audience growth + loyalty
  competitor_score     NUMERIC(5,2),  -- relative to competitors
  conversion_score     NUMERIC(5,2),  -- social → business outcomes
  consistency_score    NUMERIC(5,2),  -- posting regularity + brand voice

  -- Platform-level health (per active platform only)
  platform_scores      JSONB DEFAULT '{}',
  -- { instagram: { score: 78, trend: "improving", issues: [...] } }

  -- AI narrative
  health_summary       TEXT,
  strengths            JSONB DEFAULT '[]',
  vulnerabilities      JSONB DEFAULT '[]',
  immediate_actions    JSONB DEFAULT '[]',

  -- Data quality
  data_completeness_pct NUMERIC(5,2),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, period_date)
);

CREATE INDEX idx_health_brand_date ON brand_health_scores(brand_id, period_date DESC);

-- ── PREDICTIVE ANALYTICS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  prediction_for  DATE NOT NULL,  -- what date this prediction covers

  -- Predicted metrics (with confidence intervals)
  predicted_metrics JSONB NOT NULL,
  -- {
  --   impressions: { predicted: 1200000, low: 900000, high: 1500000, confidence: 0.78 },
  --   leads: { predicted: 450, low: 380, high: 520, confidence: 0.72 },
  --   engagement_rate: { predicted: 0.042, ... }
  -- }

  -- Platform-specific predictions
  platform_predictions JSONB DEFAULT '{}',

  -- Goal trajectory (will goals be met?)
  goal_trajectories JSONB DEFAULT '[]',
  -- [{ goal_id, goal_title, predicted_pct, will_achieve, days_to_achieve }]

  -- Recommended actions to improve trajectory
  optimization_actions JSONB DEFAULT '[]',

  -- Budget reallocation suggestions
  budget_recommendations JSONB DEFAULT '{}',

  -- Confidence level
  model_confidence  NUMERIC(5,4),
  data_points_used  INTEGER,

  is_actioned     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── CRISIS DETECTION & ALERTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  is_active       BOOLEAN DEFAULT true,

  -- Trigger conditions
  trigger_type    VARCHAR(100) NOT NULL,
  -- 'metric_drop' | 'sentiment_spike' | 'engagement_crash' | 'follower_loss'
  -- 'viral_post' | 'competitor_surge' | 'goal_at_risk' | 'crisis_keyword'
  -- 'budget_burn' | 'anomaly_detected'

  condition_config JSONB NOT NULL,
  -- { metric: 'engagement_rate', threshold: -0.30, direction: 'decrease', window_days: 7 }

  severity        VARCHAR(20) DEFAULT 'medium',  -- 'critical' | 'high' | 'medium' | 'low'

  -- Notification targets
  notify_channels JSONB DEFAULT '["in_app"]',
  -- ["in_app", "email", "slack", "whatsapp", "sms"]
  notify_roles    JSONB DEFAULT '["cmo", "analyst"]',

  cooldown_hours  INTEGER DEFAULT 24,
  last_triggered  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  alert_rule_id   UUID REFERENCES alert_rules(id),

  severity        VARCHAR(20) NOT NULL,
  title           VARCHAR(300) NOT NULL,
  body            TEXT,
  platform        VARCHAR(100),

  -- What triggered it
  trigger_data    JSONB DEFAULT '{}',
  -- { metric: 'engagement_rate', value: 0.012, threshold: 0.020, drop_pct: 40 }

  -- AI-generated context and recommended actions
  ai_context      TEXT,
  ai_actions      JSONB DEFAULT '[]',

  status          VARCHAR(30) DEFAULT 'active',  -- 'active' | 'acknowledged' | 'resolved' | 'dismissed'
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_brand    ON alerts(brand_id, created_at DESC);
CREATE INDEX idx_alerts_status   ON alerts(brand_id, status);

-- ── CONTENT INTELLIGENCE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_briefs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES users(id),

  title           VARCHAR(300) NOT NULL,
  platform        VARCHAR(100) NOT NULL,
  content_type    VARCHAR(100),
  -- 'reel' | 'carousel' | 'static' | 'story' | 'video' | 'thread' | 'email' | 'ad'

  -- AI-generated brief based on performance data
  objective       TEXT,           -- what this content should achieve
  target_audience TEXT,
  key_message     TEXT,
  hook_suggestions JSONB DEFAULT '[]',
  content_angles  JSONB DEFAULT '[]',
  hashtag_strategy JSONB DEFAULT '{}',
  best_posting_time VARCHAR(100),
  format_specs    JSONB DEFAULT '{}',
  -- { duration: '15-30s', ratio: '9:16', text_overlay: 'minimal' }

  -- Goals this content brief serves
  goal_ids        UUID[],

  -- Predicted performance
  predicted_reach INTEGER,
  predicted_engagement_rate NUMERIC(8,4),

  status          VARCHAR(30) DEFAULT 'draft',
  -- 'draft' | 'approved' | 'in_production' | 'published' | 'archived'
  approved_by     UUID REFERENCES users(id),
  published_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIENCE INTELLIGENCE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS audience_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform        VARCHAR(100),  -- NULL = cross-platform aggregate
  period_date     DATE NOT NULL,

  -- Demographics
  total_audience      BIGINT DEFAULT 0,
  age_distribution    JSONB DEFAULT '{}',
  -- { '18-24': 0.28, '25-34': 0.35, '35-44': 0.22, '45+': 0.15 }
  gender_split        JSONB DEFAULT '{}',
  -- { male: 0.45, female: 0.52, other: 0.03 }

  -- Geography
  top_locations       JSONB DEFAULT '[]',
  -- [{ location: 'Lagos, Nigeria', pct: 0.44 }]
  country_split       JSONB DEFAULT '{}',

  -- Behaviour
  peak_activity_times JSONB DEFAULT '[]',
  device_split        JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  -- { video: 0.62, carousel: 0.21, static: 0.17 }

  -- Audience quality signals
  fake_follower_estimate NUMERIC(5,4),
  audience_authenticity_score NUMERIC(5,2),
  brand_affinity_score NUMERIC(5,2),

  -- AI insights
  audience_persona    TEXT,
  engagement_patterns TEXT,
  growth_quality      VARCHAR(50),  -- 'organic' | 'mixed' | 'suspect'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, period_date)
);

-- ── BUDGET OPTIMIZATION ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,

  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  total_budget    NUMERIC(15,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'NGN',

  -- Current allocation (what was actually spent)
  current_allocation JSONB DEFAULT '{}',
  -- { instagram: { budget: 50000, spend: 48000, roas: 3.2 } }

  -- AI-recommended reallocation
  recommended_allocation JSONB DEFAULT '{}',
  ai_reasoning    TEXT,
  expected_improvement TEXT,  -- "Moving 15% from Facebook to TikTok is expected to increase leads by 23%"

  -- Savings identified
  waste_identified   NUMERIC(15,2) DEFAULT 0,
  savings_achieved   NUMERIC(15,2) DEFAULT 0,

  status          VARCHAR(30) DEFAULT 'draft',
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SOCIAL LISTENING ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listening_topics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  keywords        JSONB DEFAULT '[]',
  -- ["cerebre media", "#cerebre", "@cerebre_media"]
  topic_type      VARCHAR(50),
  -- 'brand_mention' | 'competitor' | 'industry_trend' | 'crisis_keyword' | 'campaign'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listening_mentions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES listening_topics(id),

  platform        VARCHAR(100),
  source_url      VARCHAR(1000),
  author_handle   VARCHAR(200),
  content_excerpt TEXT,
  reach_estimate  INTEGER DEFAULT 0,
  engagement      INTEGER DEFAULT 0,

  -- AI sentiment
  sentiment       VARCHAR(20),  -- 'very_positive'|'positive'|'neutral'|'negative'|'very_negative'
  sentiment_score NUMERIC(5,4), -- -1.0 to 1.0
  topics_detected JSONB DEFAULT '[]',
  is_crisis_flag  BOOLEAN DEFAULT false,

  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentions_brand_date ON listening_mentions(brand_id, published_at DESC);

-- ── CUSTOM REPORT BUILDER ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES brands(id),  -- NULL = org-wide template
  created_by      UUID REFERENCES users(id),

  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  is_public       BOOLEAN DEFAULT false,  -- available to all org users

  -- Report layout (array of widget configs)
  widgets         JSONB DEFAULT '[]',
  /*
  [
    { id: 'w1', type: 'kpi_row',      metrics: ['impressions','leads','roas'], period: 'current_month' },
    { id: 'w2', type: 'line_chart',   metric: 'engagement_rate', platforms: ['instagram','tiktok'], period: '6m' },
    { id: 'w3', type: 'goal_progress', goal_ids: [...] },
    { id: 'w4', type: 'brand_health', display: 'gauge' },
    { id: 'w5', type: 'ai_recommendations', goal_aligned: true },
    { id: 'w6', type: 'scorecard_table', period_type: 'monthly' },
    { id: 'w7', type: 'platform_breakdown', platforms: 'active_only' },
    { id: 'w8', type: 'competitor_matrix', competitors: [...] },
  ]
  */

  -- Export settings
  export_formats  JSONB DEFAULT '["pdf", "pptx", "csv"]',
  cover_page      JSONB DEFAULT '{}',
  -- { title: 'Q1 2025 Performance Report', logo: true, brand_colors: true }

  schedule        JSONB DEFAULT '{}',
  -- { frequency: 'monthly', send_to: ['cmo@company.com'], day_of_month: 1 }

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Generated report instances
CREATE TABLE IF NOT EXISTS generated_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID REFERENCES report_templates(id),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES users(id),

  period_label    VARCHAR(200),
  period_start    DATE,
  period_end      DATE,

  status          VARCHAR(30) DEFAULT 'generating',
  file_url        VARCHAR(1000),  -- S3/R2 URL of generated PDF/PPT
  file_format     VARCHAR(20),

  share_token     VARCHAR(64) UNIQUE,
  share_expires_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── ATTRIBUTION MODELING ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS attribution_journeys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  period_start    DATE,
  period_end      DATE,

  model_type      VARCHAR(50) DEFAULT 'data_driven',
  -- 'last_touch' | 'first_touch' | 'linear' | 'time_decay' | 'data_driven'

  -- Platform contribution to conversions
  platform_attribution JSONB DEFAULT '{}',
  /*
  {
    instagram: { touchpoints: 1240, conversions_attributed: 340, revenue_attributed: 1200000, assist_value: 800000 },
    email: { touchpoints: 890, conversions_attributed: 280, ... }
  }
  */

  -- Cross-platform journey patterns
  top_journeys    JSONB DEFAULT '[]',
  /* [
    { path: ["instagram", "google_ads", "email"], conversions: 145, avg_days: 12 }
  ] */

  ai_insights     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── ENTERPRISE AUDIT TRAIL ───────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID,
  brand_id        UUID,
  user_id         UUID REFERENCES users(id),
  session_id      VARCHAR(100),

  action          VARCHAR(200) NOT NULL,
  -- 'goal.created', 'report.exported', 'user.invited', etc.
  resource_type   VARCHAR(100),
  resource_id     UUID,

  changes         JSONB DEFAULT '{}',
  ip_address      INET,
  user_agent      VARCHAR(500),

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org  ON audit_log(organisation_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ── COMPETITOR INTELLIGENCE (enhanced) ───────────────────────
CREATE TABLE IF NOT EXISTS competitive_intelligence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  competitor_id   UUID REFERENCES competitors(id),
  period_date     DATE NOT NULL,

  -- Their estimated metrics (from public data)
  estimated_metrics JSONB DEFAULT '{}',
  share_of_voice_pct NUMERIC(8,4),
  share_of_engagement_pct NUMERIC(8,4),

  -- Their content strategy signals
  posting_frequency JSONB DEFAULT '{}',  -- { platform: posts_per_week }
  content_themes  JSONB DEFAULT '[]',
  top_performing_content JSONB DEFAULT '[]',

  -- Our position vs them
  position_score  NUMERIC(5,2),  -- 0-100, higher = better relative position
  trend           VARCHAR(30),   -- 'gaining' | 'stable' | 'losing'

  ai_analysis     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLATFORM-SPECIFIC CONFIGURATIONS ─────────────────────────
-- Records which platforms each brand is on and their handles
CREATE TABLE IF NOT EXISTS brand_platforms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform        VARCHAR(100) NOT NULL,
  handle          VARCHAR(300),
  profile_url     VARCHAR(500),
  is_active       BOOLEAN DEFAULT true,
  priority        INTEGER DEFAULT 0,  -- display order
  target_audience TEXT,  -- platform-specific audience note
  goals_for_platform JSONB DEFAULT '[]',  -- which goals this platform serves
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);
