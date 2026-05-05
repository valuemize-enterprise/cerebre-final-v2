const logger = require('../utils/logger');
const { platforms } = require('../config');

// ══════════════════════════════════════════════════════════════
// PLATFORM ALIASES — maps any variant name → canonical platform
// ══════════════════════════════════════════════════════════════
const PLATFORM_ALIASES = {
  // Instagram
  instagram: platforms.INSTAGRAM,
  ig: platforms.INSTAGRAM,
  'instagram insights': platforms.INSTAGRAM,

  // Facebook
  facebook: platforms.FACEBOOK,
  fb: platforms.FACEBOOK,
  'facebook page': platforms.FACEBOOK,
  'meta': platforms.FACEBOOK,

  // Twitter / X
  twitter: platforms.TWITTER,
  'x (twitter)': platforms.TWITTER,
  'x/twitter': platforms.TWITTER,
  twtr: platforms.TWITTER,

  // TikTok
  tiktok: platforms.TIKTOK,
  'tik tok': platforms.TIKTOK,

  // YouTube
  youtube: platforms.YOUTUBE,
  yt: platforms.YOUTUBE,
  'youtube analytics': platforms.YOUTUBE,

  // Google Ads
  'google ads': platforms.GOOGLE_ADS,
  'google adwords': platforms.GOOGLE_ADS,
  'google analytics': platforms.WEBSITE,
  adwords: platforms.GOOGLE_ADS,

  // Website / GA4
  website: platforms.WEBSITE,
  'ga4': platforms.WEBSITE,
  'google analytics 4': platforms.WEBSITE,
  'web analytics': platforms.WEBSITE,

  // Email
  email: platforms.EMAIL,
  mailchimp: platforms.EMAIL,
  klaviyo: platforms.EMAIL,
  'email marketing': platforms.EMAIL,

  // LinkedIn
  linkedin: platforms.LINKEDIN,
};

// ══════════════════════════════════════════════════════════════
// METRIC ALIASES — maps label variants → canonical field names
// ══════════════════════════════════════════════════════════════
const METRIC_ALIASES = {
  // Impressions
  impressions: 'impressions',
  'total impressions': 'impressions',
  views: 'impressions',
  'post impressions': 'impressions',

  // Reach
  reach: 'reach',
  'accounts reached': 'reach',
  'unique reach': 'reach',
  'people reached': 'reach',

  // Followers
  followers: 'followers_total',
  'follower count': 'followers_total',
  subscribers: 'followers_total',
  'page likes': 'followers_total',
  'new followers': 'followers_gained',
  'follower growth': 'followers_gained',
  'followers gained': 'followers_gained',
  unfollows: 'followers_lost',
  'followers lost': 'followers_lost',

  // Engagement
  likes: 'likes',
  reactions: 'likes',
  comments: 'comments',
  shares: 'shares',
  reposts: 'shares',
  retweets: 'shares',
  saves: 'saves',
  bookmarks: 'saves',
  clicks: 'clicks',
  'link clicks': 'clicks',
  'engagement rate': 'engagement_rate',
  'avg engagement rate': 'engagement_rate',

  // Website
  sessions: 'sessions',
  'website visits': 'website_visits',
  'page views': 'website_visits',
  visitors: 'website_visits',
  'bounce rate': 'bounce_rate',
  'avg session duration': 'avg_session_duration_sec',
  'session duration': 'avg_session_duration_sec',

  // Conversions
  leads: 'leads',
  conversions: 'conversions',
  'conversion rate': 'conversion_rate',
  revenue: 'revenue',
  'total revenue': 'revenue',
  sales: 'revenue',

  // Content volume
  posts: 'posts_published',
  'posts published': 'posts_published',
  stories: 'stories_published',
  'stories published': 'stories_published',
  videos: 'videos_published',
  'videos published': 'videos_published',
  reels: 'videos_published',

  // Ads
  spend: 'ad_spend',
  'ad spend': 'ad_spend',
  'total spend': 'ad_spend',
  cpc: 'cpc',
  'cost per click': 'cpc',
  cpm: 'cpm',
  'cost per thousand': 'cpm',
  roas: 'roas',
  'return on ad spend': 'roas',
};

// ══════════════════════════════════════════════════════════════
// PARSING UTILITIES
// ══════════════════════════════════════════════════════════════

/** Parse numbers like "1,234,567", "45.3%", "€2.5k", "1.2M" */
const parseMetricValue = (raw) => {
  if (!raw || raw === '-' || raw === 'N/A') return null;
  let s = String(raw).toLowerCase().trim();

  // Percentage → decimal
  const isPercent = s.endsWith('%');
  s = s.replace('%', '').replace(/[,$€£₦\s]/g, '');

  let multiplier = 1;
  if (s.endsWith('k')) { multiplier = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith('m')) { multiplier = 1_000_000; s = s.slice(0, -1); }
  else if (s.endsWith('b')) { multiplier = 1_000_000_000; s = s.slice(0, -1); }

  const num = parseFloat(s);
  if (isNaN(num)) return null;

  const val = num * multiplier;
  return isPercent ? parseFloat((val / 100).toFixed(6)) : val;
};

/** Detect date ranges like "Jan 1 – Jan 31 2025", "March 2025", "Q1 2024" */
const parseDateRange = (text) => {
  const monthMap = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3,
    jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // ISO: 2025-01-01 to 2025-01-31
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/i);
  if (isoRange) return { start: new Date(isoRange[1]), end: new Date(isoRange[2]) };

  // Month Year: "March 2025"
  const monthYear = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i);
  if (monthYear) {
    const m = monthMap[monthYear[1].toLowerCase()];
    const y = parseInt(monthYear[2], 10);
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start, end };
  }

  // Quarter: "Q1 2025"
  const quarter = text.match(/\bQ([1-4])\s+(\d{4})\b/i);
  if (quarter) {
    const q = parseInt(quarter[1], 10);
    const y = parseInt(quarter[2], 10);
    const startMonth = (q - 1) * 3;
    return { start: new Date(y, startMonth, 1), end: new Date(y, startMonth + 3, 0) };
  }

  return null;
};

/** Detect platform from text by looking for known aliases */
const detectPlatform = (text) => {
  const lower = text.toLowerCase();
  for (const [alias, canonical] of Object.entries(PLATFORM_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }
  return null;
};

// ══════════════════════════════════════════════════════════════
// MAIN NORMALIZATION ENGINE
// ══════════════════════════════════════════════════════════════

/**
 * Normalize extracted data (text + tables) into structured platform metrics.
 *
 * Strategy:
 * 1. Try to detect platform from text headings / titles
 * 2. Walk tables: match header cells to metric aliases
 * 3. Walk key:value pairs in raw text (e.g. "Impressions: 45,000")
 * 4. Detect date range from text
 * 5. Return array of normalized metric objects (one per detected platform)
 */
const normalizeData = (extractedData) => {
  const { rawText, tables, metadata } = extractedData;
  const normalizedPlatforms = {};

  // ── Step 1: Detect platforms from text context ───────────
  const textSegments = rawText.split(/\n{2,}|\={3,}|\-{3,}/);
  let activePlatform = detectPlatform(rawText) || 'unknown';

  // Ensure slot exists
  if (!normalizedPlatforms[activePlatform]) {
    normalizedPlatforms[activePlatform] = _emptyMetrics(activePlatform);
  }

  // ── Step 2: Extract key:value pairs from raw text ────────
  const kvPattern = /([A-Za-z][A-Za-z\s\/\(\)]+?)\s*[:\|]\s*([\d,\.%kKmMbB$€£₦\-N\/A]+)/g;
  let kvMatch;
  while ((kvMatch = kvPattern.exec(rawText)) !== null) {
    const label = kvMatch[1].trim().toLowerCase();
    const rawValue = kvMatch[2].trim();

    const canonical = METRIC_ALIASES[label];
    if (canonical) {
      const val = parseMetricValue(rawValue);
      if (val !== null) {
        normalizedPlatforms[activePlatform][canonical] = val;
      }
    }

    // Re-detect platform from context
    const platformCandidate = PLATFORM_ALIASES[label];
    if (platformCandidate) {
      activePlatform = platformCandidate;
      if (!normalizedPlatforms[activePlatform]) {
        normalizedPlatforms[activePlatform] = _emptyMetrics(activePlatform);
      }
    }
  }

  // ── Step 3: Walk tables ──────────────────────────────────
  for (const table of tables) {
    const headerMap = {}; // colIndex → canonical metric
    table.headers.forEach((h, i) => {
      const lower = h.toLowerCase().trim();
      const canonical = METRIC_ALIASES[lower];
      if (canonical) headerMap[i] = canonical;

      const platform = PLATFORM_ALIASES[lower];
      if (platform) {
        activePlatform = platform;
        if (!normalizedPlatforms[activePlatform]) {
          normalizedPlatforms[activePlatform] = _emptyMetrics(activePlatform);
        }
      }
    });

    for (const row of table.rows) {
      // First cell might be a platform name or metric label
      const firstCell = (row[0] || '').toLowerCase().trim();
      const rowPlatform = PLATFORM_ALIASES[firstCell];
      if (rowPlatform) activePlatform = rowPlatform;

      const rowMetric = METRIC_ALIASES[firstCell];
      if (rowMetric && row[1]) {
        const val = parseMetricValue(row[1]);
        if (val !== null) normalizedPlatforms[activePlatform][rowMetric] = val;
      }

      // Map by column headers
      Object.entries(headerMap).forEach(([idx, field]) => {
        const raw = row[parseInt(idx, 10)];
        if (raw !== undefined) {
          const val = parseMetricValue(raw);
          if (val !== null) normalizedPlatforms[activePlatform][field] = val;
        }
      });
    }
  }

  // ── Step 4: Date range detection ────────────────────────
  const dateRange = parseDateRange(rawText);

  // ── Step 5: Build final result array ────────────────────
  const result = Object.values(normalizedPlatforms).map((metrics) => ({
    ...metrics,
    report_period_start: dateRange ? dateRange.start.toISOString().split('T')[0] : null,
    report_period_end: dateRange ? dateRange.end.toISOString().split('T')[0] : null,
    raw_normalized: metrics,
  }));

  logger.debug('[Normalization] Complete', {
    platforms: result.map((r) => r.platform),
    dateRange,
    tables: tables.length,
  });

  return result;
};

/** Empty metrics object for a platform */
const _emptyMetrics = (platform) => ({
  platform,
  impressions: 0,
  reach: 0,
  followers_total: 0,
  followers_gained: 0,
  followers_lost: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
  engagement_rate: 0,
  website_visits: 0,
  sessions: 0,
  bounce_rate: 0,
  avg_session_duration_sec: 0,
  leads: 0,
  conversions: 0,
  conversion_rate: 0,
  revenue: 0,
  posts_published: 0,
  stories_published: 0,
  videos_published: 0,
  ad_spend: 0,
  cpc: 0,
  cpm: 0,
  roas: 0,
  top_content: [],
});

module.exports = { normalizeData, parseMetricValue, parseDateRange, detectPlatform };
