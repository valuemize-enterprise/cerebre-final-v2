-- ═══════════════════════════════════════════════════════════════
-- Cerebre Pro Extended Schema — Additional Feature Tables
-- ═══════════════════════════════════════════════════════════════

-- ── SOCIAL COMMERCE INTELLIGENCE ─────────────────────────────
CREATE TABLE IF NOT EXISTS social_commerce_metrics (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id            UUID NOT NULL,
  platform            VARCHAR(100) NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,

  -- Instagram Shopping
  product_page_views  INTEGER DEFAULT 0,
  add_to_cart         INTEGER DEFAULT 0,
  checkout_initiated  INTEGER DEFAULT 0,
  purchases           INTEGER DEFAULT 0,
  revenue             NUMERIC(15,2) DEFAULT 0,
  avg_order_value     NUMERIC(10,2) DEFAULT 0,
  shopping_ctr        NUMERIC(8,4) DEFAULT 0,

  -- TikTok Shop
  tiktok_shop_clicks  INTEGER DEFAULT 0,
  tiktok_shop_orders  INTEGER DEFAULT 0,
  tiktok_live_sales   NUMERIC(15,2) DEFAULT 0,
  product_showcase_views INTEGER DEFAULT 0,

  -- WhatsApp Commerce
  catalog_shares      INTEGER DEFAULT 0,
  order_messages      INTEGER DEFAULT 0,
  wa_revenue          NUMERIC(15,2) DEFAULT 0,

  -- Link-in-bio conversion
  bio_link_clicks     INTEGER DEFAULT 0,
  bio_link_conversions INTEGER DEFAULT 0,
  bio_link_revenue    NUMERIC(15,2) DEFAULT 0,

  -- Attribution
  assisted_conversions INTEGER DEFAULT 0,
  direct_conversions  INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_commerce_brand ON social_commerce_metrics(brand_id, period_start DESC);

-- ── GEO-INTELLIGENCE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geo_performance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id      UUID NOT NULL,
  platform      VARCHAR(100),
  period_start  DATE,
  period_end    DATE,
  -- Location hierarchy (Nigeria-centric)
  country       VARCHAR(100) NOT NULL,
  state         VARCHAR(100),
  city          VARCHAR(100),
  -- Metrics
  impressions   BIGINT DEFAULT 0,
  reach         INTEGER DEFAULT 0,
  engagement    INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  followers_pct NUMERIC(6,4) DEFAULT 0,  -- % of audience from this location
  leads         INTEGER DEFAULT 0,
  conversions   INTEGER DEFAULT 0,
  revenue       NUMERIC(15,2) DEFAULT 0,
  -- Index vs national average (100 = average, >100 = above, <100 = below)
  performance_index INTEGER DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_geo_brand ON geo_performance(brand_id, country, state);

-- ── HASHTAG INTELLIGENCE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hashtag_analytics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id          UUID NOT NULL,
  platform          VARCHAR(100) NOT NULL,
  hashtag           VARCHAR(200) NOT NULL,
  snapshot_date     DATE NOT NULL,
  -- Volume signals
  post_count        BIGINT DEFAULT 0,         -- total posts using this tag
  weekly_velocity   INTEGER DEFAULT 0,        -- posts this week
  -- Performance when brand uses it
  brand_uses        INTEGER DEFAULT 0,
  brand_avg_reach   NUMERIC(12,2) DEFAULT 0,
  brand_avg_er      NUMERIC(8,4) DEFAULT 0,
  -- Classification
  category          VARCHAR(100),             -- 'branded' | 'campaign' | 'community' | 'trending' | 'niche'
  difficulty        VARCHAR(20) DEFAULT 'medium',  -- 'low' | 'medium' | 'high'
  opportunity_score NUMERIC(5,2),            -- 0-100 (high = good opportunity)
  trend_status      VARCHAR(30) DEFAULT 'stable',  -- 'rising' | 'stable' | 'declining'
  -- AI insights
  ai_recommendation TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, hashtag, snapshot_date)
);

-- ── UTM LINK BUILDER & TRACKER ────────────────────────────────
CREATE TABLE IF NOT EXISTS utm_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  -- Link details
  destination_url VARCHAR(2000) NOT NULL,
  short_url       VARCHAR(200),
  full_utm_url    VARCHAR(3000) NOT NULL,
  -- UTM parameters
  utm_source      VARCHAR(200) NOT NULL,
  utm_medium      VARCHAR(200) NOT NULL,
  utm_campaign    VARCHAR(300),
  utm_content     VARCHAR(300),
  utm_term        VARCHAR(300),
  -- Assignment
  campaign_id     UUID REFERENCES campaigns(id),
  platform        VARCHAR(100),
  -- Performance (synced from GA4)
  clicks          INTEGER DEFAULT 0,
  sessions        INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  revenue         NUMERIC(15,2) DEFAULT 0,
  bounce_rate     NUMERIC(8,4) DEFAULT 0,
  -- Labels
  name            VARCHAR(300),  -- human-friendly name
  tags            JSONB DEFAULT '[]',
  is_archived     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_utm_brand    ON utm_links(brand_id, created_at DESC);
CREATE INDEX idx_utm_campaign ON utm_links(campaign_id);

-- ── AI SEARCH VISIBILITY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_search_visibility (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  checked_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Query tested
  query           VARCHAR(500) NOT NULL,
  query_intent    VARCHAR(100),  -- 'brand_search' | 'competitor_compare' | 'industry_info'
  -- AI search engines checked
  platform        VARCHAR(100) NOT NULL,  -- 'chatgpt' | 'perplexity' | 'gemini' | 'claude' | 'google_ai'
  -- Visibility result
  brand_mentioned BOOLEAN DEFAULT false,
  mention_type    VARCHAR(50),   -- 'featured' | 'listed' | 'recommended' | 'not_mentioned'
  mention_sentiment VARCHAR(30),  -- 'positive' | 'neutral' | 'negative'
  position_in_response INTEGER,  -- 1=first mentioned, NULL=not mentioned
  -- Context
  response_excerpt TEXT,
  competitors_mentioned JSONB DEFAULT '[]',  -- who appeared instead
  -- Trend
  vs_last_check   VARCHAR(30)  -- 'improved' | 'same' | 'declined'
);
CREATE INDEX idx_ai_search_brand ON ai_search_visibility(brand_id, checked_at DESC);

-- ── CULTURAL MOMENT INTELLIGENCE ──────────────────────────────
CREATE TABLE IF NOT EXISTS cultural_moments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Can be global, country-specific, or industry-specific
  country         VARCHAR(100) DEFAULT 'Nigeria',
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  moment_type     VARCHAR(100),
  -- 'public_holiday' | 'religious' | 'sports_event' | 'cultural_festival' |
  -- 'awareness_day' | 'industry_event' | 'tv_moment' | 'political' | 'seasonal'
  date_start      DATE NOT NULL,
  date_end        DATE,
  is_recurring    BOOLEAN DEFAULT true,
  recurring_rule  VARCHAR(100),  -- 'annual' | 'monthly'
  -- Relevance
  industries      JSONB DEFAULT '[]',  -- relevant industries
  platforms       JSONB DEFAULT '[]',  -- best platforms
  -- Performance data
  avg_engagement_lift NUMERIC(8,4),  -- typical ER lift when brands post about it
  content_window_days INTEGER DEFAULT 3,  -- how many days before to start posting
  -- Preparation
  content_ideas   JSONB DEFAULT '[]',
  hashtags        JSONB DEFAULT '[]',
  examples        JSONB DEFAULT '[]',
  -- Brand override
  brand_id        UUID,  -- NULL = global calendar event
  brand_priority  VARCHAR(20) DEFAULT 'medium'  -- how much brand cares about this
);
CREATE INDEX idx_cultural_date ON cultural_moments(date_start);

-- ── DIGITAL MATURITY ASSESSMENT ───────────────────────────────
CREATE TABLE IF NOT EXISTS maturity_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  assessed_at     TIMESTAMPTZ DEFAULT NOW(),
  -- Maturity dimensions (each 1-5)
  strategy_score      NUMERIC(4,2),  -- goal clarity, planning depth
  execution_score     NUMERIC(4,2),  -- consistency, content quality
  measurement_score   NUMERIC(4,2),  -- analytics sophistication
  technology_score    NUMERIC(4,2),  -- tools, automation, AI usage
  audience_score      NUMERIC(4,2),  -- understanding, segmentation
  integration_score   NUMERIC(4,2),  -- cross-channel coordination
  talent_score        NUMERIC(4,2),  -- team capability
  innovation_score    NUMERIC(4,2),  -- experimentation, forward-thinking
  -- Composite
  overall_maturity    NUMERIC(4,2),
  maturity_level      VARCHAR(50),
  -- 'Reactive' (1-2) | 'Developing' (2-3) | 'Defined' (3-4) | 'Optimised' (4-4.5) | 'Innovative' (4.5-5)
  -- Benchmark
  vs_industry_avg     NUMERIC(4,2),
  percentile          INTEGER,  -- where brand sits vs industry
  -- AI output
  strengths           JSONB DEFAULT '[]',
  gaps                JSONB DEFAULT '[]',
  roadmap             JSONB DEFAULT '[]',  -- recommended 90-day improvement plan
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── SEASONAL INTELLIGENCE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasonal_performance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  platform        VARCHAR(100),
  year            INTEGER,
  month           INTEGER,  -- 1-12
  -- Historical averages for this month
  avg_impressions BIGINT DEFAULT 0,
  avg_er          NUMERIC(8,4) DEFAULT 0,
  avg_leads       INTEGER DEFAULT 0,
  avg_revenue     NUMERIC(15,2) DEFAULT 0,
  -- Index vs brand's annual average
  seasonality_index NUMERIC(8,4) DEFAULT 1.0,  -- 1.2 = 20% above annual avg
  -- Best content patterns this month
  best_content_types JSONB DEFAULT '[]',
  best_posting_days  JSONB DEFAULT '[]',
  cultural_moments   JSONB DEFAULT '[]',  -- relevant moments for this month
  -- AI forecast
  forecast_impressions BIGINT,
  forecast_leads    INTEGER,
  forecast_revenue  NUMERIC(15,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, year, month)
);

-- ── SHARE OF VOICE TRACKER ────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_of_voice (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  industry        VARCHAR(200) NOT NULL,
  platform        VARCHAR(100),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  -- Our metrics
  our_impressions     BIGINT DEFAULT 0,
  our_engagements     INTEGER DEFAULT 0,
  our_mentions        INTEGER DEFAULT 0,
  -- Market totals (estimated)
  total_market_impressions  BIGINT DEFAULT 0,
  total_market_engagements  INTEGER DEFAULT 0,
  -- Calculated SOV
  impressions_sov     NUMERIC(8,4) DEFAULT 0,  -- our % of total
  engagement_sov      NUMERIC(8,4) DEFAULT 0,
  mention_sov         NUMERIC(8,4) DEFAULT 0,
  -- Competitor breakdown
  competitor_breakdown JSONB DEFAULT '[]',
  -- [{ name: '...', impressions_sov: 0.23, ... }]
  -- Trend
  sov_vs_prev_period  NUMERIC(8,4),  -- change in SOV points
  trend               VARCHAR(30) DEFAULT 'stable',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── SMART AUTOMATION RULES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  -- Trigger
  trigger_type    VARCHAR(100) NOT NULL,
  -- 'metric_threshold' | 'goal_milestone' | 'competitor_action' |
  -- 'calendar_event' | 'content_performance' | 'schedule'
  trigger_config  JSONB NOT NULL,
  -- Condition (optional additional logic)
  conditions      JSONB DEFAULT '[]',
  -- Action(s) to execute
  actions         JSONB NOT NULL,
  -- [
  --   { type: 'send_alert', channel: 'slack', message: '...' },
  --   { type: 'generate_report', report_type: 'weekly' },
  --   { type: 'send_digest', recipients: [...] },
  --   { type: 'tag_content', tag: 'top_performer' },
  --   { type: 'create_task', title: '...', assignee: '...' }
  -- ]
  -- Execution tracking
  last_triggered  TIMESTAMPTZ,
  trigger_count   INTEGER DEFAULT 0,
  cooldown_hours  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SPEND HEATMAP DATA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spend_heatmap (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  platform        VARCHAR(100) NOT NULL,
  period_date     DATE NOT NULL,
  day_of_week     INTEGER,  -- 0=Sun, 1=Mon, ..., 6=Sat
  hour_of_day     INTEGER,  -- 0-23 UTC
  spend           NUMERIC(15,2) DEFAULT 0,
  impressions     BIGINT DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  cpm             NUMERIC(10,4) DEFAULT 0,
  cpc             NUMERIC(10,4) DEFAULT 0,
  efficiency_score NUMERIC(5,2),  -- spend efficiency 0-100
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_spend_heatmap ON spend_heatmap(brand_id, platform, period_date);

-- ── FIRST-PARTY DATA SIGNALS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS first_party_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  signal_type     VARCHAR(100) NOT NULL,
  -- 'email_list_growth' | 'loyalty_members' | 'app_installs' | 'sms_subscribers' |
  -- 'website_registered_users' | 'survey_responses' | 'quiz_completions'
  platform        VARCHAR(100),
  period_date     DATE NOT NULL,
  -- Volume
  total_count     INTEGER DEFAULT 0,
  new_this_period INTEGER DEFAULT 0,
  churned         INTEGER DEFAULT 0,
  net_growth      INTEGER DEFAULT 0,
  growth_rate     NUMERIC(8,4) DEFAULT 0,
  -- Quality
  verified_pct    NUMERIC(6,4) DEFAULT 0,
  active_pct      NUMERIC(6,4) DEFAULT 0,  -- % engaged in last 30d
  -- Attribution
  social_attributed INTEGER DEFAULT 0,  -- acquired via social media
  -- Value
  estimated_value NUMERIC(15,2) DEFAULT 0,  -- CLV of this segment
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOARD PRESENTATION BUILDER ────────────────────────────────
CREATE TABLE IF NOT EXISTS board_presentations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  title           VARCHAR(300),
  period_label    VARCHAR(200),
  period_start    DATE,
  period_end      DATE,
  -- Slide configuration
  slides          JSONB DEFAULT '[]',
  -- Presentation type
  format          VARCHAR(50) DEFAULT 'quarterly',
  -- 'monthly' | 'quarterly' | 'yearly' | 'campaign_review' | 'crisis_brief'
  -- Export
  status          VARCHAR(30) DEFAULT 'draft',
  file_url        VARCHAR(1000),
  share_url       VARCHAR(500),
  password_protected BOOLEAN DEFAULT false,
  -- AI narrative
  ai_narrative    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENCY / TEAM COLLABORATION ──────────────────────────────
CREATE TABLE IF NOT EXISTS agency_clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_org_id   UUID NOT NULL,   -- the agency's organisation
  client_org_id   UUID NOT NULL,   -- the client's organisation
  relationship_status VARCHAR(50) DEFAULT 'active',
  -- Access configuration
  access_level    VARCHAR(50) DEFAULT 'reporting',
  -- 'full' | 'reporting' | 'upload_only' | 'view_only'
  white_label_for_client BOOLEAN DEFAULT true,
  show_agency_branding   BOOLEAN DEFAULT false,
  -- Billing
  billing_model   VARCHAR(50),
  monthly_rate    NUMERIC(15,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_org_id, client_org_id)
);

CREATE TABLE IF NOT EXISTS team_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  assigned_to     UUID,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  task_type       VARCHAR(100),
  -- 'content_approval' | 'report_review' | 'data_upload' |
  -- 'crisis_response' | 'campaign_setup' | 'analysis'
  priority        VARCHAR(20) DEFAULT 'medium',
  status          VARCHAR(50) DEFAULT 'open',
  due_date        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  -- Links
  campaign_id     UUID REFERENCES campaigns(id),
  content_id      UUID REFERENCES content_calendar(id),
  -- Collaboration
  comments        JSONB DEFAULT '[]',
  attachments     JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BENCHMARK LIBRARY ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benchmark_library (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry        VARCHAR(200) NOT NULL,
  platform        VARCHAR(100) NOT NULL,
  region          VARCHAR(100) DEFAULT 'Africa',
  year            INTEGER NOT NULL,
  quarter         INTEGER,
  -- Benchmark values
  avg_engagement_rate   NUMERIC(8,4),
  avg_reach_rate        NUMERIC(8,4),
  avg_follower_growth   NUMERIC(8,4),
  avg_posting_frequency NUMERIC(6,2),
  avg_cpm               NUMERIC(10,2),
  avg_cpc               NUMERIC(10,2),
  avg_cpa               NUMERIC(10,2),
  avg_roas              NUMERIC(10,4),
  avg_open_rate         NUMERIC(8,4),  -- email
  avg_click_rate        NUMERIC(8,4),  -- email
  -- Source
  source          VARCHAR(200),
  sample_size     INTEGER,
  data_quality    VARCHAR(20) DEFAULT 'estimated',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(industry, platform, region, year, quarter)
);

-- ── COMPETITOR AD INTELLIGENCE ────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_ads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  competitor_name VARCHAR(255) NOT NULL,
  platform        VARCHAR(100) NOT NULL,
  -- Ad details (from Facebook Ad Library, LinkedIn, etc.)
  ad_creative_type  VARCHAR(100),
  ad_headline       TEXT,
  ad_copy           TEXT,
  call_to_action    VARCHAR(100),
  landing_page_url  VARCHAR(1000),
  -- Targeting signals (estimated)
  estimated_spend   NUMERIC(15,2),
  estimated_reach   INTEGER,
  run_start_date    DATE,
  run_end_date      DATE,
  is_still_running  BOOLEAN DEFAULT false,
  -- Intelligence
  creative_angle    VARCHAR(200),
  message_theme     VARCHAR(200),
  ai_analysis       TEXT,
  alert_triggered   BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
