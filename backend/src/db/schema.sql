-- ═══════════════════════════════════════════════════════════
-- Cerebre Media Africa — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name    VARCHAR(255),
  company      VARCHAR(255) DEFAULT 'Cerebre Media Africa',
  role         VARCHAR(50) DEFAULT 'analyst',  -- analyst | admin
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ── Uploaded report files ────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_files (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  filename     VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_type    VARCHAR(20) NOT NULL,   -- pdf | png | jpg | jpeg
  file_size    BIGINT NOT NULL,        -- bytes
  s3_key       VARCHAR(1000) NOT NULL,
  s3_url       TEXT,
  status       VARCHAR(50) DEFAULT 'uploaded',
  -- uploaded | processing | extracted | analyzed | failed
  error_message TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_files_user ON report_files(user_id);
CREATE INDEX idx_report_files_status ON report_files(status);

-- ── Raw extracted text / tables ──────────────────────────────
CREATE TABLE IF NOT EXISTS extracted_data (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id      UUID UNIQUE REFERENCES report_files(id) ON DELETE CASCADE,
  raw_text     TEXT,
  tables       JSONB DEFAULT '[]',  -- array of {headers, rows}
  metadata     JSONB DEFAULT '{}',  -- page count, ocr confidence, etc.
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Normalized platform metrics ──────────────────────────────
CREATE TABLE IF NOT EXISTS platform_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id         UUID REFERENCES report_files(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  platform        VARCHAR(100) NOT NULL,
  -- instagram | facebook | twitter | tiktok | youtube | google_ads | website | email
  report_period_start DATE,
  report_period_end   DATE,
  -- Reach & Awareness
  impressions     BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  followers_total BIGINT DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  followers_lost  INTEGER DEFAULT 0,
  -- Engagement
  likes           INTEGER DEFAULT 0,
  comments        INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  -- Traffic
  website_visits  INTEGER DEFAULT 0,
  sessions        INTEGER DEFAULT 0,
  bounce_rate     NUMERIC(8,4) DEFAULT 0,
  avg_session_duration_sec INTEGER DEFAULT 0,
  -- Conversion
  leads           INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  conversion_rate NUMERIC(8,4) DEFAULT 0,
  revenue         NUMERIC(15,2) DEFAULT 0,
  -- Content
  posts_published INTEGER DEFAULT 0,
  stories_published INTEGER DEFAULT 0,
  videos_published  INTEGER DEFAULT 0,
  top_content     JSONB DEFAULT '[]',  -- [{title, type, metric, value}]
  -- Ads
  ad_spend        NUMERIC(15,2) DEFAULT 0,
  cpc             NUMERIC(10,4) DEFAULT 0,
  cpm             NUMERIC(10,4) DEFAULT 0,
  roas            NUMERIC(10,4) DEFAULT 0,
  -- Raw normalized payload (full json from normalization engine)
  raw_normalized  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_user ON platform_metrics(user_id);
CREATE INDEX idx_metrics_platform ON platform_metrics(platform);
CREATE INDEX idx_metrics_period ON platform_metrics(report_period_start, report_period_end);
CREATE INDEX idx_metrics_file ON platform_metrics(file_id);

-- ── AI Analysis reports ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  file_ids          UUID[] NOT NULL,           -- source files analyzed
  period_label      VARCHAR(200),              -- "March 2025" | "Q1 2025" etc.
  report_type       VARCHAR(50) DEFAULT 'full',-- full | platform | content | comparison
  -- Structured AI output sections
  executive_snapshot    JSONB DEFAULT '{}',
  cross_platform_perf   JSONB DEFAULT '{}',
  platform_breakdown    JSONB DEFAULT '{}',
  content_analysis      JSONB DEFAULT '{}',
  audience_insights     JSONB DEFAULT '{}',
  funnel_analysis       JSONB DEFAULT '{}',
  what_worked_failed    JSONB DEFAULT '{}',
  strategic_recommendations JSONB DEFAULT '{}',
  risk_opportunity      JSONB DEFAULT '{}',
  -- Raw full text response from Claude
  raw_ai_response   TEXT,
  -- Comparison data if comparative report
  compared_to_period VARCHAR(200),
  comparison_delta  JSONB DEFAULT '{}',
  -- Sharing
  share_token       VARCHAR(64) UNIQUE,
  share_expires_at  TIMESTAMPTZ,
  -- Token usage
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  s3_report_key     VARCHAR(1000),  -- stored PDF version
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON analysis_reports(user_id);
CREATE INDEX idx_reports_created ON analysis_reports(created_at DESC);

-- ── Processing jobs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processing_jobs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id    UUID REFERENCES report_files(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  job_type   VARCHAR(50) NOT NULL,  -- ocr | normalize | analyze
  status     VARCHAR(50) DEFAULT 'pending',
  -- pending | running | done | failed
  queue_job_id VARCHAR(200),        -- Bull job id
  attempts   INTEGER DEFAULT 0,
  error      TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_file ON processing_jobs(file_id);
CREATE INDEX idx_jobs_status ON processing_jobs(status);

-- ── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
