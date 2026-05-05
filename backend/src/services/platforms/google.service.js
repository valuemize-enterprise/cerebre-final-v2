/**
 * Google Platform APIs Service
 * Handles: Google Analytics 4 (GA4) + Google Ads
 *
 * Requires:
 *   - OAuth 2.0 with Google: https://developers.google.com/identity/protocols/oauth2
 *   - GA4 Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
 *   - Google Ads API: https://developers.google.com/google-ads/api
 *
 * Scopes needed:
 *   - https://www.googleapis.com/auth/analytics.readonly
 *   - https://www.googleapis.com/auth/adwords
 */

const { query } = require('../../db/db');
const logger = require('../../utils/logger');

const GOOGLE_AUTH  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GA4_BASE     = 'https://analyticsdata.googleapis.com/v1beta';
const ADS_BASE     = 'https://googleads.googleapis.com/v14';

// ── OAuth URL ─────────────────────────────────────────────────
const getGoogleAuthUrl = (clientId, redirectUri, state) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/business.manage',
      'email', 'profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
};

// ── Exchange + refresh tokens ─────────────────────────────────
const exchangeCode = async (code, clientId, clientSecret, redirectUri) => {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  return res.json();
};

const refreshAccessToken = async (refreshToken, clientId, clientSecret) => {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
  });
  return res.json();
};

// ── GA4: Fetch website performance metrics ────────────────────
const fetchGA4Metrics = async (connection, startDate, endDate) => {
  const propertyId = connection.platform_account_id; // GA4 Property ID
  if (!propertyId) throw new Error('No GA4 Property ID configured');

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }, { name: 'deviceCategory' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
      { name: 'purchaseRevenue' },
    ],
    keepEmptyRows: false,
    returnPropertyQuota: true,
  };

  const res = await fetch(`${GA4_BASE}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Try refreshing the token
    logger.warn('[GA4] Token may be expired, attempting refresh');
    throw new Error(`GA4 API error: ${res.status}`);
  }

  const data = await res.json();
  return processGA4Response(data, startDate, endDate);
};

const processGA4Response = (data, startDate, endDate) => {
  const metricHeaders = data.metricHeaders?.map(h => h.name) || [];
  const totals = {};

  data.rows?.forEach(row => {
    row.metricValues?.forEach((v, i) => {
      const key = metricHeaders[i];
      totals[key] = (totals[key] || 0) + parseFloat(v.value || 0);
    });
  });

  // Traffic source breakdown
  const trafficSources = {};
  data.rows?.forEach(row => {
    const channel = row.dimensionValues?.[1]?.value;
    if (channel) {
      if (!trafficSources[channel]) trafficSources[channel] = { sessions: 0, conversions: 0, revenue: 0 };
      trafficSources[channel].sessions += parseFloat(row.metricValues?.[0]?.value || 0);
      trafficSources[channel].conversions += parseFloat(row.metricValues?.[6]?.value || 0);
      trafficSources[channel].revenue += parseFloat(row.metricValues?.[8]?.value || 0);
    }
  });

  return {
    sessions: Math.round(totals.sessions || 0),
    activeUsers: Math.round(totals.activeUsers || 0),
    newUsers: Math.round(totals.newUsers || 0),
    pageViews: Math.round(totals.screenPageViews || 0),
    bounceRate: (totals.bounceRate || 0) / Math.max(1, data.rows?.length || 1),
    avgSessionDuration: (totals.averageSessionDuration || 0) / Math.max(1, data.rows?.length || 1),
    conversions: Math.round(totals.conversions || 0),
    revenue: parseFloat((totals.purchaseRevenue || 0).toFixed(2)),
    trafficSources,
    period: { startDate, endDate },
  };
};

// ── GA4: Real-time active users ────────────────────────────────
const fetchGA4Realtime = async (connection) => {
  const propertyId = connection.platform_account_id;
  const res = await fetch(`${GA4_BASE}/properties/${propertyId}:runRealtimeReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    }),
  });
  if (!res.ok) return { activeUsers: 0 };
  const data = await res.json();
  const total = data.rows?.reduce((s, r) => s + parseInt(r.metricValues?.[0]?.value || 0), 0) || 0;
  return { activeUsers: total, breakdown: data.rows || [] };
};

// ── Google Ads: Campaign performance ──────────────────────────
const fetchGoogleAdsMetrics = async (connection, startDate, endDate) => {
  const customerId = connection.ad_account_id;
  if (!customerId) return null;

  const query_str = `
    SELECT
      customer.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.search_impression_share,
      metrics.search_top_impression_share,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.ctr,
      metrics.average_quality_score,
      metrics.view_through_conversions
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const res = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: query_str }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const results = data[0]?.results?.[0];
  if (!results) return null;

  const m = results.metrics;
  const spend = (m.costMicros || 0) / 1_000_000;
  const conversions = parseFloat(m.conversions || 0);
  const convValue = parseFloat(m.conversionsValue || 0);

  return {
    impressions: parseInt(m.impressions || 0),
    clicks: parseInt(m.clicks || 0),
    ad_spend: spend,
    conversions,
    revenue: convValue,
    roas: spend > 0 ? convValue / spend : 0,
    cpc: parseFloat(m.averageCpc || 0) / 1_000_000,
    cpm: parseFloat(m.averageCpm || 0) / 1_000_000,
    ctr: parseFloat(m.ctr || 0),
    quality_score: parseFloat(m.averageQualityScore || 0),
    impression_share: parseFloat(m.searchImpressionShare || 0),
    search_top_is: parseFloat(m.searchTopImpressionShare || 0),
  };
};

// ── Google My Business: Reviews + insights ────────────────────
const fetchGoogleMyBusiness = async (connection) => {
  const accountId = connection.platform_account_id;
  if (!accountId) return null;

  // Fetch locations
  const locRes = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations?readMask=name,title,averageRating,metadata`,
    { headers: { Authorization: `Bearer ${connection.access_token}` } }
  );
  if (!locRes.ok) return null;
  const locData = await locRes.json();
  const locations = locData.locations || [];

  const results = [];
  for (const loc of locations.slice(0, 10)) {  // limit to 10 locations
    const locName = loc.name;
    // Fetch reviews
    const reviewRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${locName}/reviews?pageSize=50`,
      { headers: { Authorization: `Bearer ${connection.access_token}` } }
    );
    if (reviewRes.ok) {
      const reviewData = await reviewRes.json();
      const reviews = reviewData.reviews || [];
      results.push({
        locationName: loc.title,
        locationId: locName,
        avgRating: loc.averageRating || 0,
        reviewCount: reviews.length,
        recentReviews: reviews.slice(0, 10).map(r => ({
          rating: r.starRating,
          comment: r.comment?.slice(0, 200),
          createTime: r.createTime,
          hasReply: !!r.reviewReply,
        })),
      });
    }
  }
  return results;
};

// ── Main sync orchestrator ────────────────────────────────────
const syncGoogle = async (brandId, connectionId) => {
  const conn = (await query(
    'SELECT * FROM platform_connections WHERE id=$1 AND brand_id=$2', [connectionId, brandId]
  )).rows[0];
  if (!conn) throw new Error('Connection not found');

  // Refresh token if needed
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
    const refreshed = await refreshAccessToken(conn.refresh_token, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    if (refreshed.access_token) {
      await query(
        `UPDATE platform_connections SET access_token=$1, token_expires_at=$2 WHERE id=$3`,
        [refreshed.access_token, new Date(Date.now() + (refreshed.expires_in || 3600) * 1000), connectionId]
      );
      conn.access_token = refreshed.access_token;
    }
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const results = {};

  if (conn.platform === 'google_analytics') {
    results.ga4 = await fetchGA4Metrics(conn, startDate, endDate);
    results.realtime = await fetchGA4Realtime(conn);
  } else if (conn.platform === 'google_ads') {
    results.ads = await fetchGoogleAdsMetrics(conn, startDate, endDate);
  } else if (conn.platform === 'google_my_business') {
    results.gmb = await fetchGoogleMyBusiness(conn);
  }

  await query(
    `UPDATE platform_connections SET last_sync_at=NOW(), last_sync_status='success', total_syncs=total_syncs+1 WHERE id=$1`,
    [connectionId]
  );

  return results;
};

module.exports = { getGoogleAuthUrl, exchangeCode, syncGoogle, fetchGA4Realtime };
