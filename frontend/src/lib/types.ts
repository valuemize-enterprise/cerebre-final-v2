// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: 'analyst' | 'admin';
  is_active: boolean;
  created_at: string;
}

// ── File upload ───────────────────────────────────────────────
export type FileStatus = 'uploaded' | 'processing' | 'extracted' | 'analyzed' | 'failed';

export interface ReportFile {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  s3_key: string;
  status: FileStatus;
  error_message?: string;
  uploaded_at: string;
  platform_count?: number;
  report_count?: number;
}

/** Status response from the /upload/:id/status polling endpoint */
export interface FileStatusResponse {
  fileId: string;
  status: FileStatus;
  progress: number;
  platformsDetected: number;
  error?: string;
}

// ── Platform metrics ──────────────────────────────────────────
export type PlatformName =
  | 'instagram' | 'facebook' | 'twitter' | 'tiktok'
  | 'youtube' | 'google_ads' | 'website' | 'email' | 'linkedin';

export interface PlatformMetrics {
  id: string;
  file_id: string;
  user_id: string;
  platform: PlatformName;
  report_period_start: string;
  report_period_end: string;
  impressions: number;
  reach: number;
  followers_total: number;
  followers_gained: number;
  followers_lost: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagement_rate: number;
  website_visits: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration_sec: number;
  leads: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  posts_published: number;
  stories_published: number;
  videos_published: number;
  ad_spend: number;
  cpc: number;
  cpm: number;
  roas: number;
}

// ── AI Report sections ────────────────────────────────────────
export interface ExecutiveSnapshot {
  key_wins: string[];
  key_concerns: string[];
  overall_direction: 'growing' | 'stable' | 'declining';
  direction_reasoning: string;
  cross_platform_insight: string;
  strategic_focus: string;
}

export interface PlatformBreakdownItem {
  platform: string;
  period?: string;
  key_metrics: Array<{
    name: string;
    current: string;
    previous?: string;
    change_pct?: number;
  }>;
  insight: string;
  business_implication: string;
  recommendation: string;
}

export interface ContentAnalysisData {
  best_performing: Array<{ type: string; description: string; metric: string; value: string }>;
  worst_performing: Array<{ type: string; description: string; metric: string; value: string }>;
  format_patterns: string;
  timing_patterns: string;
  hook_patterns: string;
  recommendation: string;
}

export interface FunnelAnalysis {
  traffic_volume: string;
  engagement_rate_overall: string;
  conversion_rate_overall: string;
  biggest_drop_off: string;
  drop_off_stage: 'awareness' | 'engagement' | 'conversion';
  drop_off_reason: string;
  funnel_health: 'healthy' | 'leaky' | 'broken';
}

export interface StrategicAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  expected_impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface GrowthExperiment {
  experiment: string;
  hypothesis: string;
  kpi: string;
  timeline: string;
}

export interface StrategicRecommendations {
  immediate_actions: StrategicAction[];
  growth_experiments: GrowthExperiment[];
  content_strategy_adjustments: string[];
  platform_focus_strategy: string;
  conversion_optimization: string[];
}

export interface RiskOpportunity {
  biggest_risk: string;
  risk_mitigation: string;
  biggest_opportunity: string;
  opportunity_how_to_capture: string;
}

// ── Analysis Report ───────────────────────────────────────────
export interface AnalysisReport {
  id: string;
  user_id: string;
  file_ids: string[];
  period_label: string;
  report_type: string;
  executive_snapshot: ExecutiveSnapshot;
  cross_platform_perf: {
    strongest_platform: string;
    strongest_platform_reason: string;
    declining_platforms: string[];
    funnel_mapping: {
      awareness: string[];
      engagement: string[];
      conversion: string[];
    };
  };
  platform_breakdown: PlatformBreakdownItem[];
  content_analysis: ContentAnalysisData;
  audience_insights: {
    primary_location: string;
    location_breakdown: Array<{ location: string; percentage: number }>;
    device_split: { mobile: number; desktop: number; other: number };
    peak_engagement_times: string[];
    audience_behavior_insight: string;
    nigeria_specific_insight: string;
  };
  funnel_analysis: FunnelAnalysis;
  what_worked_failed: {
    worked: Array<{ what: string; evidence: string; why_it_worked: string }>;
    failed: Array<{ what: string; evidence: string; why_it_failed: string }>;
  };
  strategic_recommendations: StrategicRecommendations;
  risk_opportunity: RiskOpportunity;
  comparison_delta?: Record<string, any>;
  share_token?: string;
  share_expires_at?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  created_at: string;
}

// ── Notification ──────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

// ── Funnel stage ──────────────────────────────────────────────
export interface FunnelStage {
  stage: string;
  metric: string;
  value: number;
  rate: number;
}

// ── API response wrappers ─────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiError {
  error: string;
  errors?: Array<{ field: string; message: string }>;
}
