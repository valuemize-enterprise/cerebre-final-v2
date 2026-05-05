/**
 * Meta Platforms API Service
 * Handles: Facebook Pages + Instagram Business Accounts
 *
 * API Docs: https://developers.facebook.com/docs/graph-api
 * Required permissions:
 *   - pages_read_engagement
 *   - pages_show_list
 *   - instagram_basic
 *   - instagram_manage_insights
 *   - ads_read (for ad performance)
 */

const { query } = require('../../db/db');
const logger = require('../../utils/logger');

const META_BASE = 'https://graph.facebook.com/v19.0';

// ── OAuth URL builder ─────────────────────────────────────────
const getMetaAuthUrl = (clientId, redirectUri, state) => {
  const scopes = [
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_manage_insights',
    'instagram_content_publish',
    'ads_read',
    'read_insights',
  ].join(',');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
};

// ── Exchange code for token ───────────────────────────────────
const exchangeCodeForToken = async (code, clientId, clientSecret, redirectUri) => {
  const res = await fetch(`${META_BASE}/oauth/access_token?` + new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  }));
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  const data = await res.json();

  // Exchange short-lived for long-lived token (60 days)
  const longRes = await fetch(`${META_BASE}/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: data.access_token,
  }));
  if (!longRes.ok) throw new Error('Failed to get long-lived token');
  return longRes.json();
};

// ── Fetch Facebook Page metrics ───────────────────────────────
const fetchFacebookMetrics = async (connection, since, until) => {
  const { access_token, platform_page_id } = connection;
  const pageToken = await getPageToken(access_token, platform_page_id);

  const metrics = [
    'page_impressions',
    'page_impressions_organic',
    'page_impressions_paid',
    'page_reach',
    'page_engaged_users',
    'page_fans',
    'page_fan_adds',
    'page_fan_removes',
    'page_views_total',
    'page_video_views',
    'page_post_engagements',
    'page_actions_post_reactions_total',
  ].join(',');

  const res = await fetch(
    `${META_BASE}/${platform_page_id}/insights?` + new URLSearchParams({
      metric: metrics,
      period: 'day',
      since,
      until,
      access_token: pageToken,
    })
  );
  if (!res.ok) throw new Error(`Facebook insights error: ${await res.text()}`);
  const data = await res.json();

  return normaliseMetaInsights(data.data, 'facebook');
};

// ── Fetch Instagram Business metrics ──────────────────────────
const fetchInstagramMetrics = async (connection, since, until) => {
  const { access_token, platform_page_id } = connection;

  // First: get Instagram Business Account ID linked to the Facebook Page
  const igRes = await fetch(
    `${META_BASE}/${platform_page_id}?fields=instagram_business_account&access_token=${access_token}`
  );
  const igData = await igRes.json();
  const igAccountId = igData.instagram_business_account?.id;
  if (!igAccountId) throw new Error('No Instagram Business Account linked to this Facebook Page');

  const metrics = [
    'impressions',
    'reach',
    'follower_count',
    'profile_views',
    'website_clicks',
    'email_contacts',
    'phone_call_clicks',
    'text_message_clicks',
  ].join(',');

  const res = await fetch(
    `${META_BASE}/${igAccountId}/insights?` + new URLSearchParams({
      metric: metrics,
      period: 'day',
      since,
      until,
      access_token,
    })
  );
  if (!res.ok) throw new Error(`Instagram insights error: ${await res.text()}`);
  const basicData = await res.json();

  // Fetch additional audience demographics
  const audienceRes = await fetch(
    `${META_BASE}/${igAccountId}/insights?` + new URLSearchParams({
      metric: 'audience_city,audience_country,audience_gender_age',
      period: 'lifetime',
      access_token,
    })
  );
  const audienceData = audienceRes.ok ? await audienceRes.json() : { data: [] };

  // Fetch media performance (recent posts)
  const mediaRes = await fetch(
    `${META_BASE}/${igAccountId}/media?` + new URLSearchParams({
      fields: 'id,media_type,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement,saved,video_views,plays)',
      limit: 50,
      since,
      until,
      access_token,
    })
  );
  const mediaData = mediaRes.ok ? await mediaRes.json() : { data: [] };

  return {
    insights: normaliseMetaInsights(basicData.data, 'instagram'),
    audience: normaliseAudienceData(audienceData.data),
    topContent: normaliseMediaData(mediaData.data),
  };
};

// ── Fetch Facebook/Instagram Ads ──────────────────────────────
const fetchMetaAdsMetrics = async (connection, since, until) => {
  const { access_token, ad_account_id } = connection;
  if (!ad_account_id) return null;

  const fields = [
    'impressions', 'reach', 'spend', 'clicks', 'cpm', 'cpc', 'ctr',
    'actions', 'cost_per_action_type', 'roas', 'frequency',
    'video_avg_time_watched_actions', 'website_purchase_roas',
  ].join(',');

  const res = await fetch(
    `${META_BASE}/act_${ad_account_id}/insights?` + new URLSearchParams({
      fields,
      level: 'account',
      time_range: JSON.stringify({ since, until }),
      access_token,
    })
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] || null;
};

// ── Helper: get page-specific access token ────────────────────
const getPageToken = async (userToken, pageId) => {
  const res = await fetch(`${META_BASE}/me/accounts?access_token=${userToken}`);
  const data = await res.json();
  const page = data.data?.find(p => p.id === pageId);
  return page?.access_token || userToken;
};

// ── Normalise Meta insights to our schema ────────────────────
const normaliseMetaInsights = (insightData, platform) => {
  const result = {};
  insightData?.forEach(metric => {
    const name = metric.name;
    const latest = metric.values?.[metric.values.length - 1];
    result[name] = latest?.value ?? 0;
  });
  return result;
};

const normaliseAudienceData = (audienceData) => {
  const result = {};
  audienceData?.forEach(item => {
    result[item.name] = item.values?.[0]?.value || {};
  });
  return result;
};

const normaliseMediaData = (mediaData) => {
  return (mediaData || []).map(post => ({
    id: post.id,
    type: post.media_type,
    publishedAt: post.timestamp,
    likes: post.like_count || 0,
    comments: post.comments_count || 0,
    insights: post.insights?.data?.reduce((acc, i) => {
      acc[i.name] = i.values?.[0]?.value || 0;
      return acc;
    }, {}) || {},
  }));
};

// ── Store live metrics in database ────────────────────────────
const storeLiveMetrics = async (brandId, connectionId, platform, metricsObj, periodStart, periodEnd) => {
  const entries = Object.entries(metricsObj).filter(([, v]) => v !== undefined && v !== null);

  for (const [metricType, value] of entries) {
    const numValue = typeof value === 'object' ? JSON.stringify(value) : parseFloat(value) || 0;
    await query(
      `INSERT INTO live_metrics
       (brand_id, connection_id, platform, metric_type, period_type, period_start, period_end, value)
       VALUES ($1,$2,$3,$4,'daily',$5,$6,$7)
       ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
       DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
      [brandId, connectionId, platform, metricType, periodStart, periodEnd, numValue]
    );
  }
};

// ── Main sync function ────────────────────────────────────────
const syncMeta = async (brandId, connectionId) => {
  const conn = (await query(
    'SELECT * FROM platform_connections WHERE id=$1 AND brand_id=$2', [connectionId, brandId]
  )).rows[0];
  if (!conn) throw new Error('Connection not found');

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  let metrics = {};
  let topContent = [];

  if (conn.platform === 'facebook') {
    metrics = await fetchFacebookMetrics(conn, since, until);
  } else if (conn.platform === 'instagram') {
    const { insights, audience, topContent: tc } = await fetchInstagramMetrics(conn, since, until);
    metrics = { ...insights, audience: JSON.stringify(audience) };
    topContent = tc;
  }

  const adMetrics = await fetchMetaAdsMetrics(conn, since, until);
  if (adMetrics) {
    metrics.ad_spend = adMetrics.spend;
    metrics.ad_impressions = adMetrics.impressions;
    metrics.ad_reach = adMetrics.reach;
    metrics.ad_clicks = adMetrics.clicks;
    metrics.ad_cpm = adMetrics.cpm;
    metrics.ad_cpc = adMetrics.cpc;
    metrics.ad_roas = adMetrics.roas;
  }

  await storeLiveMetrics(brandId, connectionId, conn.platform, metrics, since, until);

  await query(
    `UPDATE platform_connections SET last_sync_at=NOW(), last_sync_status='success',
     consecutive_errors=0, total_syncs=total_syncs+1 WHERE id=$1`,
    [connectionId]
  );

  logger.info(`[Meta] Synced ${conn.platform} for brand ${brandId}`);
  return { metrics, topContent };
};

module.exports = {
  getMetaAuthUrl,
  exchangeCodeForToken,
  syncMeta,
  fetchFacebookMetrics,
  fetchInstagramMetrics,
  fetchMetaAdsMetrics,
};
