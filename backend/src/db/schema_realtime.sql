-- ═══════════════════════════════════════════════════════════════
-- Cerebre Real-Time Intelligence — Platform API Schema
-- ═══════════════════════════════════════════════════════════════

-- ── PLATFORM API CONNECTIONS ─────────────────────────────────
-- Stores OAuth tokens for each connected platform per brand
CREATE TABLE IF NOT EXISTS platform_connections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id            UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform            VARCHAR(100) NOT NULL,
  -- 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter' |
  -- 'youtube' | 'google_ads' | 'google_analytics' | 'email_mailchimp' |
  -- 'email_klaviyo' | 'email_sendinblue' | 'shopify' | 'woocommerce' |
  -- 'tripadvisor' | 'google_my_business'

  status              VARCHAR(30) DEFAULT 'connected',
  -- 'connected' | 'expired' | 'error' | 'revoked' | 'pending'

  -- OAuth credentials (encrypted in production)
  access_token        TEXT,
  refresh_token       TEXT,
  token_expires_at    TIMESTAMPTZ,
  scope               TEXT,

  -- Platform-specific IDs
  platform_user_id    VARCHAR(200),
  platform_page_id    VARCHAR(200),      -- Facebook Page ID, LinkedIn Company ID
  platform_account_id VARCHAR(200),      -- Google Ads Account ID, etc.
  ad_account_id       VARCHAR(200),      -- Separate ad account ID where applicable
  platform_handle     VARCHAR(200),

  -- Display metadata
  account_name        VARCHAR(300),
  account_avatar_url  VARCHAR(500),
  follower_count      BIGINT DEFAULT 0,

  -- Sync configuration
  sync_enabled        BOOLEAN DEFAULT true,
  sync_frequency_min  INTEGER DEFAULT 60,   -- how often to pull in minutes
  sync_lookback_days  INTEGER DEFAULT 30,   -- how far back to fetch on first connect

  -- Sync tracking
  last_sync_at        TIMESTAMPTZ,
  last_sync_status    VARCHAR(50) DEFAULT 'never',
  last_error          TEXT,
  consecutive_errors  INTEGER DEFAULT 0,
  total_syncs         INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);
CREATE INDEX idx_connections_brand    ON platform_connections(brand_id);
CREATE INDEX idx_connections_sync     ON platform_connections(last_sync_at) WHERE sync_enabled = true;

-- ── LIVE METRICS (from API pulls) ─────────────────────────────
-- High-frequency metrics updated every hour via API
CREATE TABLE IF NOT EXISTS live_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  connection_id   UUID REFERENCES platform_connections(id),
  platform        VARCHAR(100) NOT NULL,
  metric_type     VARCHAR(100) NOT NULL,
  -- 'followers' | 'impressions' | 'reach' | 'engagement' | 'profile_visits' |
  -- 'website_clicks' | 'stories_views' | 'reel_views' | 'ad_spend' | 'conversions' |
  -- 'active_users' | 'revenue' | 'sessions'

  -- Time granularity
  period_type     VARCHAR(20) NOT NULL,  -- 'hourly' | 'daily' | 'weekly' | 'monthly'
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,

  -- Value
  value           NUMERIC(20, 4),
  previous_value  NUMERIC(20, 4),
  change_pct      NUMERIC(10, 4),

  -- Dimensional breakdown (stored as JSONB for flexibility)
  breakdown       JSONB DEFAULT '{}',
  -- { age_group: '25-34', gender: 'female', location: 'Lagos', device: 'mobile' }

  -- Source metadata
  raw_api_response JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform, metric_type, period_type, period_start)
);
CREATE INDEX idx_live_brand_platform  ON live_metrics(brand_id, platform, period_start DESC);
CREATE INDEX idx_live_recent          ON live_metrics(brand_id, created_at DESC);

-- ── API SYNC JOBS ─────────────────────────────────────────────
-- Audit trail of every API pull
CREATE TABLE IF NOT EXISTS api_sync_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  connection_id   UUID REFERENCES platform_connections(id),
  platform        VARCHAR(100),
  job_type        VARCHAR(100),
  -- 'scheduled_pull' | 'manual_pull' | 'webhook_event' | 'initial_backfill'

  status          VARCHAR(30) DEFAULT 'running',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,

  -- What was fetched
  metrics_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,

  -- Error tracking
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sync_jobs_brand ON api_sync_jobs(brand_id, started_at DESC);

-- ── REAL-TIME WEBHOOKS ─────────────────────────────────────────
-- Register incoming webhook endpoints from platforms
CREATE TABLE IF NOT EXISTS webhook_registrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  connection_id   UUID REFERENCES platform_connections(id),
  platform        VARCHAR(100) NOT NULL,
  webhook_id      VARCHAR(300),      -- Platform-assigned webhook ID
  endpoint_url    VARCHAR(1000),     -- Our endpoint that receives events
  secret          VARCHAR(200),      -- Verification secret
  events          JSONB DEFAULT '[]',-- Which events we subscribed to
  is_active       BOOLEAN DEFAULT true,
  last_event_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID,
  platform        VARCHAR(100) NOT NULL,
  event_type      VARCHAR(200),
  payload         JSONB NOT NULL,
  processed       BOOLEAN DEFAULT false,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(platform, processed) WHERE processed = false;

-- ── REAL-TIME ALERTS FEED ─────────────────────────────────────
-- Push notifications for real-time metric changes
CREATE TABLE IF NOT EXISTS realtime_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  platform        VARCHAR(100),
  alert_type      VARCHAR(100),
  -- 'spike_positive' | 'spike_negative' | 'milestone' | 'anomaly' |
  -- 'competitor_move' | 'viral_content' | 'budget_depleted' | 'api_error'

  severity        VARCHAR(20) DEFAULT 'info',
  -- 'critical' | 'high' | 'info' | 'positive'

  title           VARCHAR(300),
  body            TEXT,
  metric_name     VARCHAR(100),
  metric_value    NUMERIC(20, 4),
  change_pct      NUMERIC(10, 4),
  context         JSONB DEFAULT '{}',

  -- Delivery
  delivered_in_app BOOLEAN DEFAULT false,
  delivered_email  BOOLEAN DEFAULT false,
  delivered_slack  BOOLEAN DEFAULT false,
  delivered_whatsapp BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rt_alerts_brand ON realtime_alerts(brand_id, created_at DESC);

-- ── INDUSTRY INTELLIGENCE PROFILES ───────────────────────────
-- Industry-specific KPI thresholds and benchmarks
CREATE TABLE IF NOT EXISTS industry_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL REFERENCES brands(id),
  industry_code   VARCHAR(100) NOT NULL,
  -- 'banking' | 'fmcg' | 'qsr' | 'retail' | 'luxury_retail' |
  -- 'telecoms' | 'insurance' | 'real_estate' | 'healthcare' | 'technology'

  -- Industry-specific KPI targets (overrides global benchmarks)
  custom_kpis     JSONB DEFAULT '{}',
  -- { trust_score: { target: 75, alert_below: 60 },
  --   share_of_voice: { target: 0.25, alert_below: 0.15 } }

  -- Regulatory/compliance flags
  compliance_mode BOOLEAN DEFAULT false,
  restricted_content JSONB DEFAULT '[]',  -- content categories to flag

  -- Industry context for AI
  industry_context TEXT,  -- injected into every AI prompt
  competitor_list JSONB DEFAULT '[]',

  -- Data connections for this industry
  pos_integration BOOLEAN DEFAULT false,  -- Point of Sale (retail/restaurant)
  crm_active      BOOLEAN DEFAULT false,
  review_tracking BOOLEAN DEFAULT false,  -- Google, Tripadvisor, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, industry_code)
);

-- ── GOOGLE MY BUSINESS / REVIEW TRACKING ─────────────────────
CREATE TABLE IF NOT EXISTS review_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  location_name   VARCHAR(300),
  location_id     VARCHAR(200),
  platform        VARCHAR(100),
  -- 'google_my_business' | 'tripadvisor' | 'yelp' | 'zomato' | 'opentable'

  period_start    DATE,
  period_end      DATE,

  -- Volume
  total_reviews   INTEGER DEFAULT 0,
  new_reviews     INTEGER DEFAULT 0,
  -- Sentiment
  avg_rating      NUMERIC(4,2),
  five_star_pct   NUMERIC(6,4),
  one_star_pct    NUMERIC(6,4),
  sentiment_score NUMERIC(6,4),  -- -1 to 1
  -- Response
  response_rate   NUMERIC(6,4),
  avg_response_time_hours NUMERIC(10,2),
  -- Trending topics in reviews
  positive_topics JSONB DEFAULT '[]',
  negative_topics JSONB DEFAULT '[]',
  -- AI summary
  ai_summary      TEXT,
  alert_triggered BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BANKING-SPECIFIC TABLES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS banking_brand_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  period_start    DATE,
  period_end      DATE,

  -- Trust & reputation (critical for banking)
  trust_score           NUMERIC(5,2),    -- 0-100 AI-calculated
  reputation_index      NUMERIC(5,2),    -- vs competitors
  -- Customer sentiment
  positive_sentiment_pct NUMERIC(6,4),
  negative_sentiment_pct NUMERIC(6,4),
  neutral_sentiment_pct  NUMERIC(6,4),
  -- Product mentions
  product_mentions      JSONB DEFAULT '{}',
  -- { savings: 1240, loans: 890, transfers: 560, cards: 340 }
  -- Compliance flags
  regulatory_mentions   INTEGER DEFAULT 0,
  complaint_volume      INTEGER DEFAULT 0,
  crisis_flag           BOOLEAN DEFAULT false,

  -- Digital banking performance
  app_store_rating      NUMERIC(4,2),
  app_mentions_social   INTEGER DEFAULT 0,
  fintech_competitor_sov NUMERIC(6,4),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── FMCG-SPECIFIC TABLES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS fmcg_brand_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  period_start    DATE,
  period_end      DATE,

  -- Product-level social intelligence
  product_buzz    JSONB DEFAULT '{}',
  -- { "Indomie Original": { mentions: 2400, sentiment: 0.78 } }
  -- Retail performance
  shelf_visibility_mentions INTEGER DEFAULT 0,
  out_of_stock_mentions     INTEGER DEFAULT 0,
  price_sensitivity_index   NUMERIC(6,4),
  -- Distribution signals
  retailer_sentiment  JSONB DEFAULT '{}',  -- sentiment by retailer brand
  -- Campaign signals
  promotion_awareness NUMERIC(6,4),   -- % of mentions mentioning current promo
  viral_content_count INTEGER DEFAULT 0,
  ugc_count          INTEGER DEFAULT 0,  -- User-generated content volume
  -- Seasonal demand
  seasonal_demand_index NUMERIC(6,4),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RESTAURANT/QSR-SPECIFIC TABLES ───────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  location_id     VARCHAR(200),  -- specific branch/location
  period_start    DATE,
  period_end      DATE,

  -- Menu intelligence
  menu_item_buzz  JSONB DEFAULT '{}',
  -- { "Jollof Rice": { mentions: 890, photos: 340, sentiment: 0.85 } }
  -- Reservation & traffic signals
  google_reservations_clicks INTEGER DEFAULT 0,
  directions_requests        INTEGER DEFAULT 0,
  website_menu_views         INTEGER DEFAULT 0,
  -- Delivery platform performance
  delivery_ratings    JSONB DEFAULT '{}',
  -- { uber_eats: 4.6, bolt_food: 4.4, jumia_food: 4.7 }
  -- Dining experience signals
  wait_time_complaints INTEGER DEFAULT 0,
  service_complaints   INTEGER DEFAULT 0,
  food_quality_score   NUMERIC(4,2),
  ambiance_score       NUMERIC(4,2),
  -- Influencer & UGC
  food_creator_mentions INTEGER DEFAULT 0,
  photo_tags            INTEGER DEFAULT 0,
  story_mentions        INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RETAIL-SPECIFIC TABLES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS retail_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  period_start    DATE,
  period_end      DATE,

  -- Social commerce performance
  social_to_purchase_rate NUMERIC(8,4),
  product_discovery_via_social NUMERIC(6,4),
  -- Product-level performance
  top_products_by_social  JSONB DEFAULT '[]',
  trending_categories     JSONB DEFAULT '[]',
  -- Influencer attribution
  influencer_revenue      NUMERIC(15,2) DEFAULT 0,
  influencer_orders       INTEGER DEFAULT 0,
  creator_content_count   INTEGER DEFAULT 0,
  -- Customer journey
  social_to_website_pct   NUMERIC(6,4),
  cart_abandon_recovery_pct NUMERIC(6,4),
  retargeting_performance JSONB DEFAULT '{}',
  -- Brand vs price competition
  price_mention_sentiment NUMERIC(6,4),
  competitor_price_mentions INTEGER DEFAULT 0,
  -- Seasonal intelligence
  sale_event_awareness    NUMERIC(6,4),
  black_friday_readiness  NUMERIC(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
