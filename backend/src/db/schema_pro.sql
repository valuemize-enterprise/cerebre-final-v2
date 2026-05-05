-- ════════════════════════════════════════════════════════════
-- Cerebre Pro — All New Feature Tables
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector; -- pgvector for AI embedding search

-- ── CONVERSATIONAL AI (Ask Your Data) ────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  user_id         UUID NOT NULL,
  title           VARCHAR(300),  -- auto-generated from first message
  messages        JSONB DEFAULT '[]',
  -- [{ role: 'user'|'assistant', content: '...', timestamp: '', sources: [...] }]
  context_window  JSONB DEFAULT '{}',  -- snapshot of data context used
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_conv_brand ON ai_conversations(brand_id, created_at DESC);

-- Saved insights from conversations
CREATE TABLE IF NOT EXISTS saved_insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  conversation_id UUID REFERENCES ai_conversations(id),
  title           VARCHAR(300),
  content         TEXT,
  tags            JSONB DEFAULT '[]',
  pinned          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── CAMPAIGN TRACKER ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  campaign_type   VARCHAR(100),
  -- 'awareness' | 'lead_gen' | 'product_launch' | 'seasonal' |
  -- 'crisis_response' | 'influencer' | 'paid' | 'organic' | 'event'
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(50) DEFAULT 'planning',
  -- 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
  -- Platforms this campaign runs on
  platforms       JSONB DEFAULT '[]',
  -- Budget
  total_budget    NUMERIC(15,2) DEFAULT 0,
  spent           NUMERIC(15,2) DEFAULT 0,
  -- Goal link
  goal_ids        UUID[],
  -- KPI targets
  kpi_targets     JSONB DEFAULT '{}',
  -- { impressions: 500000, leads: 200, cpa: 5000 }
  -- Actual results (updated from platform metrics)
  kpi_actuals     JSONB DEFAULT '{}',
  -- Tags for categorisation
  tags            JSONB DEFAULT '[]',
  -- AI analysis
  ai_brief        TEXT,
  ai_post_analysis TEXT,
  cover_image_url VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaigns_brand  ON campaigns(brand_id, start_date DESC);
CREATE INDEX idx_campaigns_status ON campaigns(brand_id, status);

-- Campaign content (track specific posts/ads within a campaign)
CREATE TABLE IF NOT EXISTS campaign_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  platform        VARCHAR(100),
  content_type    VARCHAR(100),
  url             VARCHAR(1000),
  caption         TEXT,
  published_at    TIMESTAMPTZ,
  -- Performance (pulled from platform metrics or manually entered)
  impressions     BIGINT DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  spend           NUMERIC(15,2) DEFAULT 0,
  is_top_performer BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTENT CALENDAR ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_calendar (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  platform        VARCHAR(100) NOT NULL,
  content_type    VARCHAR(100),
  title           VARCHAR(500),
  description     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  -- Status workflow
  status          VARCHAR(50) DEFAULT 'planned',
  -- 'idea' | 'planned' | 'in_production' | 'pending_approval' |
  -- 'approved' | 'scheduled' | 'published' | 'cancelled'
  -- Approvals
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  -- Links
  campaign_id     UUID REFERENCES campaigns(id),
  goal_id         UUID,
  content_brief_id UUID,
  -- AI suggestions
  ai_recommended  BOOLEAN DEFAULT false,  -- was this AI-suggested?
  ai_score        NUMERIC(5,2),           -- predicted performance 0-100
  ai_rationale    TEXT,
  -- Post-publish tracking
  actual_performance JSONB DEFAULT '{}',
  published_url   VARCHAR(1000),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_calendar_brand_date ON content_calendar(brand_id, scheduled_at);

-- ── COMPETITIVE INTELLIGENCE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_intelligence_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  competitor_name VARCHAR(255) NOT NULL,
  platform        VARCHAR(100),
  snapshot_date   DATE NOT NULL,
  -- Estimated public metrics
  estimated_followers  BIGINT DEFAULT 0,
  estimated_er         NUMERIC(8,4) DEFAULT 0,
  posts_last_30d       INTEGER DEFAULT 0,
  avg_likes_per_post   NUMERIC(10,2) DEFAULT 0,
  avg_comments_per_post NUMERIC(10,2) DEFAULT 0,
  -- Content strategy signals
  dominant_content_type VARCHAR(100),
  posting_frequency     NUMERIC(6,2),  -- posts per week
  hashtag_strategy      JSONB DEFAULT '[]',
  top_themes            JSONB DEFAULT '[]',
  -- Relative positioning
  share_of_voice        NUMERIC(8,4),
  engagement_advantage  NUMERIC(8,4),  -- positive = we're ahead
  -- AI analysis
  notable_moves         TEXT,  -- what they did this period
  threat_level          VARCHAR(20) DEFAULT 'medium',
  opportunities         JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, competitor_name, platform, snapshot_date)
);

-- ── INFLUENCER / CREATOR TRACKER ─────────────────────────────
CREATE TABLE IF NOT EXISTS influencers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  -- 'mega' (>1M) | 'macro' (100K-1M) | 'mid' (10K-100K) | 'micro' (1K-10K) | 'nano' (<1K)
  tier            VARCHAR(20),
  -- Platform handles
  handles         JSONB DEFAULT '{}',
  -- { instagram: '@handle', tiktok: '@handle' }
  -- Audience data
  total_reach     BIGINT DEFAULT 0,
  avg_er          NUMERIC(8,4) DEFAULT 0,
  audience_demo   JSONB DEFAULT '{}',
  -- Location focus: relevant for Nigeria
  primary_market  VARCHAR(100),
  -- Relationship
  status          VARCHAR(50) DEFAULT 'prospect',
  -- 'prospect' | 'outreach' | 'negotiating' | 'active' | 'past' | 'blacklisted'
  relationship_notes TEXT,
  -- Commercial
  rate_per_post   NUMERIC(15,2),
  rate_per_story  NUMERIC(15,2),
  rate_per_reel   NUMERIC(15,2),
  currency        VARCHAR(10) DEFAULT 'NGN',
  -- AI score (0-100: fit with brand goals + audience alignment)
  brand_fit_score NUMERIC(5,2),
  ai_assessment   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  influencer_id   UUID REFERENCES influencers(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id),
  brand_id        UUID NOT NULL,
  platform        VARCHAR(100),
  deliverables    JSONB DEFAULT '[]',
  -- [{ type: 'reel', quantity: 2, due_date: '2025-03-15' }]
  agreed_rate     NUMERIC(15,2),
  payment_status  VARCHAR(50) DEFAULT 'pending',
  -- Content performance
  total_reach     BIGINT DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  revenue_attributed NUMERIC(15,2) DEFAULT 0,
  cpv             NUMERIC(10,4) DEFAULT 0,  -- cost per view
  cpe             NUMERIC(10,4) DEFAULT 0,  -- cost per engagement
  roi             NUMERIC(10,4) DEFAULT 0,
  -- Review
  performance_notes TEXT,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  would_use_again BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── A/B TEST TRACKER ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_experiments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  name            VARCHAR(300) NOT NULL,
  hypothesis      TEXT,
  platform        VARCHAR(100),
  test_type       VARCHAR(100),
  -- 'caption' | 'cta' | 'visual' | 'format' | 'posting_time' | 'hashtags'
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(50) DEFAULT 'running',
  -- Variants
  variant_a       JSONB DEFAULT '{}',
  -- { description: '...', url: '...', impressions: 0, engagement: 0 }
  variant_b       JSONB DEFAULT '{}',
  -- Results
  winner          VARCHAR(5),  -- 'A' | 'B' | 'tie'
  confidence      NUMERIC(5,4),  -- statistical confidence
  lift_pct        NUMERIC(8,4),  -- improvement % from winner
  -- AI analysis
  ai_conclusion   TEXT,
  ai_recommendation TEXT,
  applied         BOOLEAN DEFAULT false,  -- was the winner applied to strategy?
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BRAND VOICE GUARDIAN ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID UNIQUE NOT NULL,
  -- Voice attributes
  tone_descriptors JSONB DEFAULT '[]',
  -- ['professional', 'warm', 'direct', 'inspiring', 'inclusive']
  avoid_words     JSONB DEFAULT '[]',
  preferred_words JSONB DEFAULT '[]',
  sample_captions JSONB DEFAULT '[]',  -- approved content examples
  sample_bad      JSONB DEFAULT '[]',  -- content that violates voice
  -- Scoring
  formality_level INTEGER DEFAULT 5,   -- 1=very casual, 10=very formal
  emoji_policy    VARCHAR(50) DEFAULT 'moderate',
  -- 'none' | 'minimal' | 'moderate' | 'frequent'
  cta_style       VARCHAR(100),        -- how the brand asks for action
  updated_by      UUID,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_checks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  platform        VARCHAR(100),
  content         TEXT NOT NULL,
  score           NUMERIC(5,2),     -- 0-100
  is_compliant    BOOLEAN,
  violations      JSONB DEFAULT '[]',
  suggestions     JSONB DEFAULT '[]',
  approved        BOOLEAN,
  checked_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── TREND INTELLIGENCE FEED ───────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,  -- NULL = global trend
  platform        VARCHAR(100),
  trend_type      VARCHAR(100),
  -- 'hashtag' | 'audio' | 'format' | 'topic' | 'cultural_moment' |
  -- 'industry_shift' | 'consumer_behaviour' | 'algorithm_change'
  title           VARCHAR(300),
  description     TEXT,
  relevance_score NUMERIC(5,2),  -- 0-100 relevance to this brand
  urgency         VARCHAR(20),   -- 'act_now' | 'this_week' | 'this_month' | 'watch'
  opportunity     TEXT,          -- how brand can capitalise
  expires_at      TIMESTAMPTZ,   -- when trend window closes
  is_dismissed    BOOLEAN DEFAULT false,
  is_actioned     BOOLEAN DEFAULT false,
  source          VARCHAR(200),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── WEEKLY STAKEHOLDER DIGEST ─────────────────────────────────
CREATE TABLE IF NOT EXISTS digest_configs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID UNIQUE NOT NULL,
  is_enabled      BOOLEAN DEFAULT true,
  frequency       VARCHAR(20) DEFAULT 'weekly',
  send_day        INTEGER DEFAULT 1,  -- 1=Monday
  send_time       TIME DEFAULT '08:00',
  timezone        VARCHAR(100) DEFAULT 'Africa/Lagos',
  -- Recipients by role
  recipients      JSONB DEFAULT '[]',
  -- [{ email: '...', role: 'cmo', name: '...', format: 'full'|'executive' }]
  -- What to include
  include_sections JSONB DEFAULT '["health_score","goal_progress","top_wins","top_concerns","next_actions"]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digest_sends (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  period_label    VARCHAR(100),
  recipients_count INTEGER,
  content_preview TEXT,
  ai_headline     VARCHAR(500),
  status          VARCHAR(30) DEFAULT 'sent'
);

-- ── WHATSAPP BUSINESS INTELLIGENCE ────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  period_start    DATE,
  period_end      DATE,
  -- Business account metrics
  messages_sent           INTEGER DEFAULT 0,
  messages_delivered      INTEGER DEFAULT 0,
  messages_read           INTEGER DEFAULT 0,
  delivery_rate           NUMERIC(8,4) DEFAULT 0,
  read_rate               NUMERIC(8,4) DEFAULT 0,
  -- Broadcast performance
  broadcast_audiences     INTEGER DEFAULT 0,  -- list size
  broadcast_reach         INTEGER DEFAULT 0,
  broadcast_responses     INTEGER DEFAULT 0,
  response_rate           NUMERIC(8,4) DEFAULT 0,
  -- Catalog & Commerce
  catalog_views           INTEGER DEFAULT 0,
  catalog_clicks          INTEGER DEFAULT 0,
  orders_initiated        INTEGER DEFAULT 0,
  revenue_from_wa         NUMERIC(15,2) DEFAULT 0,
  -- Customer service
  avg_response_time_min   NUMERIC(10,2) DEFAULT 0,
  csat_score              NUMERIC(5,2),
  conversations_resolved  INTEGER DEFAULT 0,
  -- Opt-in / opt-out
  new_subscribers         INTEGER DEFAULT 0,
  opt_outs                INTEGER DEFAULT 0,
  -- Goal alignment
  leads_from_whatsapp     INTEGER DEFAULT 0,
  conversions_from_wa     INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROI CALCULATOR ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roi_scenarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  created_by      UUID,
  name            VARCHAR(300),
  scenario_type   VARCHAR(50),  -- 'current' | 'optimised' | 'what_if'
  inputs          JSONB DEFAULT '{}',
  -- { monthly_budget: 500000, avg_order_value: 12000, ... }
  outputs         JSONB DEFAULT '{}',
  -- { roi: 340, revenue: 2040000, leads: 170, cost_per_lead: 2941 }
  assumptions     JSONB DEFAULT '{}',
  saved           BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── DATA HEALTH MONITOR ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_health_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  checked_at      TIMESTAMPTZ DEFAULT NOW(),
  overall_score   NUMERIC(5,2),  -- 0-100
  -- Per-platform completeness
  platform_scores JSONB DEFAULT '{}',
  -- { instagram: { completeness: 95, last_upload: '2025-03-01', missing_fields: [...] } }
  gaps_detected   JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  critical_gaps   INTEGER DEFAULT 0
);

-- ── DOCUMENT INTELLIGENCE (upload any doc, extract insights) ──
CREATE TABLE IF NOT EXISTS document_library (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  uploaded_by     UUID,
  title           VARCHAR(500),
  doc_type        VARCHAR(100),
  -- 'brand_guidelines' | 'strategy_deck' | 'competitor_report' |
  -- 'agency_brief' | 'board_presentation' | 'research_report' | 'other'
  s3_key          VARCHAR(1000),
  file_size       BIGINT,
  extracted_text  TEXT,
  -- AI-generated summary and insights
  ai_summary      TEXT,
  key_insights    JSONB DEFAULT '[]',
  action_items    JSONB DEFAULT '[]',
  -- Embedding for semantic search
  embedding       vector(1536),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_docs_embedding ON document_library USING ivfflat (embedding vector_cosine_ops);

-- ── AUDIENCE PERSONAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audience_personas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  name            VARCHAR(200),  -- "Lagos Working Professional, 28-35"
  platform        VARCHAR(100),  -- NULL = cross-platform
  -- Demographics
  age_range       VARCHAR(50),
  gender_skew     VARCHAR(50),
  primary_location VARCHAR(200),
  income_bracket  VARCHAR(100),
  -- Psychographics
  interests       JSONB DEFAULT '[]',
  pain_points     JSONB DEFAULT '[]',
  motivations     JSONB DEFAULT '[]',
  -- Digital behaviour
  peak_online_times JSONB DEFAULT '[]',
  preferred_content_types JSONB DEFAULT '[]',
  devices_used    JSONB DEFAULT '[]',
  -- Brand relationship
  relationship_stage VARCHAR(50),
  -- 'unaware' | 'aware' | 'considering' | 'customer' | 'advocate'
  engagement_depth VARCHAR(50),
  -- AI narrative
  persona_story   TEXT,  -- rich narrative about this person
  content_strategy TEXT,  -- how to speak to this persona
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPETITOR ALERT WATCHERS ────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_watch_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL,
  competitor_name VARCHAR(255),
  watch_type      VARCHAR(100),
  -- 'campaign_launch' | 'follower_surge' | 'viral_content' |
  -- 'price_change' | 'new_product' | 'negative_press'
  keywords        JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT true,
  notify_immediately BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
