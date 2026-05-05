-- ═══════════════════════════════════════════════════════════
-- Cerebre Media Africa v2 — Extended Schema
-- Additive to v1 schema — run after v1 schema.sql
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Companies / Workspaces ────────────────────────────────────
-- A user can belong to one company workspace
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  industry        VARCHAR(100),    -- e.g. 'fmcg', 'fintech', 'ecommerce', 'media'
  company_size    VARCHAR(50),     -- 'startup', 'sme', 'enterprise'
  website         VARCHAR(500),
  country         VARCHAR(100) DEFAULT 'Nigeria',
  logo_url        VARCHAR(500),
  onboarding_done BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Update users to reference company
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title  VARCHAR(200);

-- ── Business Goals ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES users(id),

  -- Goal definition
  goal_type       VARCHAR(100) NOT NULL,
  -- brand_awareness | lead_generation | sales_conversion |
  -- community_growth | customer_retention | website_traffic |
  -- content_engagement | app_downloads | event_promotion | custom

  title           VARCHAR(500) NOT NULL,
  description     TEXT,

  -- Time horizon
  horizon         VARCHAR(20) NOT NULL,  -- 'monthly' | 'quarterly' | 'yearly'
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,

  -- Quantified targets
  primary_metric  VARCHAR(100),  -- e.g. 'impressions', 'leads', 'revenue'
  target_value    NUMERIC(20, 4),
  baseline_value  NUMERIC(20, 4),  -- current value at goal creation
  current_value   NUMERIC(20, 4),  -- updated by AI
  unit            VARCHAR(50),     -- 'count', 'percentage', 'naira', 'usd'

  -- Platform focus (null = all platforms)
  target_platforms JSONB DEFAULT '[]',  -- ["instagram", "tiktok"]

  -- AI-generated breakdown
  monthly_targets  JSONB DEFAULT '[]',  -- [{month, target, achieved, status}]
  quarterly_targets JSONB DEFAULT '[]',

  status          VARCHAR(50) DEFAULT 'active',  -- active | achieved | at_risk | missed
  progress_pct    NUMERIC(5,2) DEFAULT 0,

  ai_strategy     TEXT,      -- AI-generated strategy for this goal
  ai_last_updated TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_company ON business_goals(company_id);
CREATE INDEX idx_goals_status  ON business_goals(status);
CREATE INDEX idx_goals_period  ON business_goals(period_start, period_end);

-- ── Platform-specific metric schemas ─────────────────────────
-- Extended granular metrics per platform — JSONB stores the unique fields

CREATE TABLE IF NOT EXISTS platform_metrics_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  file_id         UUID,   -- references report_files if from upload
  platform        VARCHAR(100) NOT NULL,
  report_period_start DATE,
  report_period_end   DATE,

  -- ── Universal metrics (all platforms) ────────────────────
  impressions     BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  followers_total BIGINT DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  followers_lost  INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  comments        INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  posts_published INTEGER DEFAULT 0,

  -- ── Traffic & conversion ──────────────────────────────────
  website_visits  INTEGER DEFAULT 0,
  sessions        INTEGER DEFAULT 0,
  bounce_rate     NUMERIC(8,4) DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  conversion_rate NUMERIC(8,4) DEFAULT 0,
  revenue         NUMERIC(15,2) DEFAULT 0,

  -- ── Paid metrics ─────────────────────────────────────────
  ad_spend        NUMERIC(15,2) DEFAULT 0,
  cpc             NUMERIC(10,4) DEFAULT 0,
  cpm             NUMERIC(10,4) DEFAULT 0,
  cpa             NUMERIC(10,4) DEFAULT 0,   -- cost per acquisition
  roas            NUMERIC(10,4) DEFAULT 0,
  roi             NUMERIC(10,4) DEFAULT 0,   -- % return

  -- ── Platform-specific (JSONB) ─────────────────────────────
  -- Instagram: {reels_views, reels_plays, stories_views, stories_replies,
  --             profile_visits, website_clicks_bio, ig_shopping_clicks,
  --             reel_avg_watch_pct, carousel_swipe_rate}
  -- TikTok: {fyp_views, profile_views, video_completions, avg_watch_time,
  --          duet_count, stitch_count, live_viewers, gifts_received}
  -- LinkedIn: {post_impressions, unique_visitors, page_followers,
  --            sponsored_ctr, inmail_open_rate, talent_brand_index}
  -- YouTube: {views, watch_time_hours, avg_view_duration, ctr_thumbnail,
  --           subscribers_gained, revenue_estimated, shorts_views}
  -- Twitter/X: {tweet_impressions, profile_visits, mentions, link_clicks,
  --             retweets, quote_tweets, spaces_listeners}
  -- Email: {list_size, open_rate, click_rate, unsubscribes,
  --         bounce_rate, spam_rate, revenue_per_email, deliverability_rate}
  -- Google Ads: {quality_score, impression_share, search_top_is,
  --              wasted_spend, smart_bidding_conversions, pmax_performance}
  -- Facebook: {page_views, video_views_3s, video_avg_watch, organic_reach,
  --            paid_reach, event_responses, check_ins}
  platform_specific JSONB DEFAULT '{}',

  -- ── Content breakdown ────────────────────────────────────
  top_content     JSONB DEFAULT '[]',
  content_mix     JSONB DEFAULT '{}',  -- {reels: 40, carousels: 30, static: 30}

  -- ── Goals tracking ───────────────────────────────────────
  goal_id         UUID REFERENCES business_goals(id),
  goal_contribution NUMERIC(8,4),  -- % of goal this period contributed

  raw_normalized  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_v2_company   ON platform_metrics_v2(company_id);
CREATE INDEX idx_v2_platform  ON platform_metrics_v2(platform);
CREATE INDEX idx_v2_period    ON platform_metrics_v2(report_period_start, report_period_end);
CREATE INDEX idx_v2_goal      ON platform_metrics_v2(goal_id);

-- ── Monthly Scorecards ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scorecards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Period
  period_type     VARCHAR(20) NOT NULL,  -- 'monthly' | 'quarterly' | 'yearly'
  period_label    VARCHAR(100),          -- "March 2025", "Q1 2025"
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,

  -- ── ROI metrics ──────────────────────────────────────────
  total_ad_spend        NUMERIC(15,2) DEFAULT 0,
  total_revenue_attributed NUMERIC(15,2) DEFAULT 0,
  blended_roas          NUMERIC(10,4) DEFAULT 0,
  roi_percentage        NUMERIC(10,4) DEFAULT 0,
  cost_per_lead         NUMERIC(10,4) DEFAULT 0,
  cost_per_acquisition  NUMERIC(10,4) DEFAULT 0,
  cost_savings          NUMERIC(15,2) DEFAULT 0,   -- vs previous period

  -- ── Lead attribution ──────────────────────────────────────
  total_leads           INTEGER DEFAULT 0,
  leads_by_platform     JSONB DEFAULT '{}',  -- {instagram: 120, facebook: 80}
  lead_quality_score    NUMERIC(5,2),        -- AI-assigned 0–100
  attribution_model     VARCHAR(50) DEFAULT 'last_touch',

  -- ── Reach & awareness ────────────────────────────────────
  total_impressions     BIGINT DEFAULT 0,
  total_reach           BIGINT DEFAULT 0,
  share_of_voice        NUMERIC(8,4),       -- % vs competitors
  brand_sentiment_score NUMERIC(5,2),        -- AI-assessed 0–100

  -- ── Acquisition & retention ──────────────────────────────
  new_followers_total   INTEGER DEFAULT 0,
  customer_acquisition_cost NUMERIC(10,4) DEFAULT 0,
  churn_rate            NUMERIC(8,4),
  retention_rate        NUMERIC(8,4),
  customer_lifetime_value NUMERIC(15,2),

  -- ── Goals performance ────────────────────────────────────
  goals_on_track        INTEGER DEFAULT 0,
  goals_at_risk         INTEGER DEFAULT 0,
  goals_missed          INTEGER DEFAULT 0,
  overall_goal_score    NUMERIC(5,2),       -- 0–100

  -- ── AI-generated sections ─────────────────────────────────
  executive_summary     TEXT,
  performance_grade     VARCHAR(5),         -- A+, A, B+, B, C+, C, D, F
  key_wins              JSONB DEFAULT '[]',
  key_concerns          JSONB DEFAULT '[]',
  platform_grades       JSONB DEFAULT '{}', -- {instagram: "A", tiktok: "B+"}
  recommendations       JSONB DEFAULT '[]',
  next_period_targets   JSONB DEFAULT '{}',

  -- ── Raw data ─────────────────────────────────────────────
  raw_metrics_snapshot  JSONB DEFAULT '{}',
  generated_by_ai       BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scorecards_company ON scorecards(company_id);
CREATE INDEX idx_scorecards_period  ON scorecards(period_start DESC);

-- ── Competitor Benchmarks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  industry        VARCHAR(100),
  website         VARCHAR(500),
  -- Social handles for tracking
  instagram_handle VARCHAR(100),
  twitter_handle   VARCHAR(100),
  tiktok_handle    VARCHAR(100),
  facebook_page    VARCHAR(200),
  linkedin_page    VARCHAR(200),
  youtube_channel  VARCHAR(200),
  notes           TEXT,
  is_primary      BOOLEAN DEFAULT false,  -- main competitor to track
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benchmark_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  competitor_id   UUID REFERENCES competitors(id),

  period_label    VARCHAR(100),
  period_start    DATE,
  period_end      DATE,

  -- Our metrics (snapshot from scorecards)
  our_metrics     JSONB DEFAULT '{}',
  -- Competitor metrics (manually entered or API-sourced)
  competitor_metrics JSONB DEFAULT '{}',

  -- Platform-level comparison
  platform_comparison JSONB DEFAULT '[]',
  -- [{platform, our_er, comp_er, our_followers, comp_followers, ...}]

  -- Industry averages (sourced by AI)
  industry_averages JSONB DEFAULT '{}',

  -- AI analysis
  competitive_position VARCHAR(50),  -- 'leader' | 'challenger' | 'follower' | 'niche'
  share_of_voice    NUMERIC(8,4),
  ai_insights       TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_benchmarks_company ON benchmark_reports(company_id);

-- ── CRM / Salesforce Integration ─────────────────────────────
CREATE TABLE IF NOT EXISTS crm_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform        VARCHAR(50) NOT NULL,  -- 'salesforce' | 'hubspot' | 'zoho' | 'pipedrive'
  status          VARCHAR(30) DEFAULT 'connected',
  -- OAuth / API credentials (encrypted at rest in production)
  access_token    TEXT,
  refresh_token   TEXT,
  instance_url    VARCHAR(500),   -- Salesforce instance URL
  token_expires_at TIMESTAMPTZ,
  last_sync_at    TIMESTAMPTZ,
  sync_enabled    BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  crm_connection_id UUID REFERENCES crm_connections(id),

  period_start    DATE,
  period_end      DATE,

  -- Pipeline
  total_pipeline_value  NUMERIC(15,2) DEFAULT 0,
  new_opportunities     INTEGER DEFAULT 0,
  closed_won           INTEGER DEFAULT 0,
  closed_lost          INTEGER DEFAULT 0,
  win_rate             NUMERIC(8,4) DEFAULT 0,

  -- Customer metrics
  total_customers      INTEGER DEFAULT 0,
  new_customers        INTEGER DEFAULT 0,
  churned_customers    INTEGER DEFAULT 0,
  reactivated_customers INTEGER DEFAULT 0,
  churn_rate           NUMERIC(8,4) DEFAULT 0,
  retention_rate       NUMERIC(8,4) DEFAULT 0,

  -- Acquisition
  customer_acquisition_cost NUMERIC(10,4) DEFAULT 0,
  avg_deal_size        NUMERIC(15,2) DEFAULT 0,
  customer_lifetime_value NUMERIC(15,2) DEFAULT 0,
  payback_period_months INTEGER,

  -- Attribution from social
  social_attributed_leads   INTEGER DEFAULT 0,
  social_attributed_revenue NUMERIC(15,2) DEFAULT 0,

  -- Raw CRM data
  raw_data        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_metrics_company ON crm_metrics(company_id);

-- ── Onboarding State ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_state (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  step_completed  INTEGER DEFAULT 0,
  -- 1: company profile
  -- 2: industry & size
  -- 3: annual goal set
  -- 4: platforms selected
  -- 5: first upload or CRM connected
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Platform configuration (which platforms a company tracks) ─
CREATE TABLE IF NOT EXISTS company_platforms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform    VARCHAR(100) NOT NULL,
  handle      VARCHAR(200),    -- @handle or page name
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, platform)
);

-- ── Churn & Acquisition tracking ─────────────────────────────
CREATE TABLE IF NOT EXISTS churn_acquisition_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  period_start    DATE,
  period_end      DATE,

  -- Acquisition channels
  acquisition_by_channel JSONB DEFAULT '{}',
  -- {organic_social: 120, paid_social: 80, email: 40, referral: 20}

  -- Acquisition costs per channel
  cac_by_channel  JSONB DEFAULT '{}',
  blended_cac     NUMERIC(10,4) DEFAULT 0,

  -- Churn
  total_churned   INTEGER DEFAULT 0,
  churn_reasons   JSONB DEFAULT '{}',
  -- {price: 30%, competitor: 25%, product: 20%, other: 25%}
  churn_rate      NUMERIC(8,4) DEFAULT 0,

  -- Social attribution to churn reduction
  social_retention_contribution NUMERIC(8,4),
  engagement_to_retention_corr  NUMERIC(6,4),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
