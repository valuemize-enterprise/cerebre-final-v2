/**
 * LinkedIn, TikTok, Twitter/X, YouTube API Services
 * Each platform has its own OAuth flow and data format.
 */

const { query } = require('../../db/db');
const logger = require('../../utils/logger');

// ════════════════════════════════════════════════════════════════
// LINKEDIN MARKETING API
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing
// Scopes: r_organization_social, rw_organization_admin, r_ads, r_ads_reporting
// ════════════════════════════════════════════════════════════════
const LINKEDIN_BASE = 'https://api.linkedin.com/v2';

const getLinkedInAuthUrl = (clientId, redirectUri, state) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'r_organization_social rw_organization_admin r_ads r_ads_reporting',
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
};

const fetchLinkedInMetrics = async (connection, startDate, endDate) => {
  const { access_token, platform_page_id: orgId } = connection;
  const headers = { Authorization: `Bearer ${access_token}`, 'X-Restli-Protocol-Version': '2.0.0' };

  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();

  // Page statistics
  const statsRes = await fetch(
    `${LINKEDIN_BASE}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${start}&timeIntervals.timeRange.end=${end}`,
    { headers }
  );

  // Follower statistics
  const followersRes = await fetch(
    `${LINKEDIN_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`,
    { headers }
  );

  // Visitor statistics
  const visitorsRes = await fetch(
    `${LINKEDIN_BASE}/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${start}&timeIntervals.timeRange.end=${end}`,
    { headers }
  );

  const [stats, followers, visitors] = await Promise.all([
    statsRes.ok ? statsRes.json() : {},
    followersRes.ok ? followersRes.json() : {},
    visitorsRes.ok ? visitorsRes.json() : {},
  ]);

  // Aggregate
  let impressions = 0, clicks = 0, likes = 0, comments = 0, shares = 0;
  (stats.elements || []).forEach(el => {
    const s = el.totalShareStatistics || {};
    impressions += s.impressionCount || 0;
    clicks += s.clickCount || 0;
    likes += s.likeCount || 0;
    comments += s.commentCount || 0;
    shares += s.shareCount || 0;
  });

  const totalFollowers = followers.elements?.[0]?.followerCountsByAssociationType?.find(
    f => f.associationType === 'MEMBER'
  )?.followerCounts?.organicFollowerCount || 0;

  let pageViews = 0;
  (visitors.elements || []).forEach(el => {
    pageViews += el.totalPageStatistics?.views?.allPageViews?.pageViews || 0;
  });

  return {
    impressions,
    clicks,
    likes,
    comments,
    shares,
    followers_total: totalFollowers,
    page_views: pageViews,
    engagement_rate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
  };
};

// ════════════════════════════════════════════════════════════════
// TIKTOK BUSINESS API
// Docs: https://business-api.tiktok.com/portal/docs
// Scopes: user.info.basic, video.list, business.get
// ════════════════════════════════════════════════════════════════
const getTikTokAuthUrl = (clientKey, redirectUri, state) => {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.list,business.get',
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize?${params}`;
};

const fetchTikTokMetrics = async (connection, startDate, endDate) => {
  const { access_token, platform_account_id: businessId } = connection;

  const body = {
    advertiser_id: businessId,
    start_date: startDate,
    end_date: endDate,
    page: 1,
    page_size: 50,
    metrics: [
      'play_count', 'like_count', 'comment_count', 'share_count',
      'follower_count', 'reach', 'impressions', 'profile_view',
      'video_completion_rate',
    ],
  };

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/business/get/profile/', {
    method: 'POST',
    headers: {
      'Access-Token': access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    logger.warn('[TikTok] API error', { status: res.status });
    return null;
  }

  const data = await res.json();
  const profile = data.data || {};

  return {
    followers_total: profile.follower_count || 0,
    total_likes: profile.likes_count || 0,
    video_count: profile.video_count || 0,
    // Analytics from insights endpoint
    impressions: profile.impressions || 0,
    reach: profile.reach || 0,
    video_views: profile.play_count || 0,
    completion_rate: profile.video_completion_rate || 0,
  };
};

// ════════════════════════════════════════════════════════════════
// TWITTER / X API v2
// Docs: https://developer.twitter.com/en/docs/twitter-api
// OAuth 2.0 with PKCE (for user context)
// Required: tweet.read, users.read, offline.access
// Note: Analytics API requires Basic tier ($100/month) or Enterprise
// ════════════════════════════════════════════════════════════════
const getTwitterAuthUrl = (clientId, redirectUri, state, codeChallenge) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
};

const fetchTwitterMetrics = async (connection, startDate, endDate) => {
  const { access_token, platform_user_id: userId } = connection;
  const headers = { Authorization: `Bearer ${access_token}` };

  // User profile metrics
  const userRes = await fetch(
    `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics,created_at`,
    { headers }
  );

  if (!userRes.ok) return null;
  const userData = await userRes.json();
  const metrics = userData.data?.public_metrics || {};

  // Recent tweets performance (last 100)
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=public_metrics,created_at&start_time=${startDate}T00:00:00Z`,
    { headers }
  );

  let totalImpressions = 0, totalEngagements = 0, totalLikes = 0, totalRetweets = 0;
  if (tweetsRes.ok) {
    const tweetsData = await tweetsRes.json();
    (tweetsData.data || []).forEach(tweet => {
      const pm = tweet.public_metrics || {};
      totalImpressions += pm.impression_count || 0;
      totalLikes += pm.like_count || 0;
      totalRetweets += pm.retweet_count || 0;
      totalEngagements += (pm.like_count || 0) + (pm.retweet_count || 0) + (pm.reply_count || 0);
    });
  }

  return {
    followers_total: metrics.followers_count || 0,
    following: metrics.following_count || 0,
    tweet_count: metrics.tweet_count || 0,
    impressions: totalImpressions,
    likes: totalLikes,
    retweets: totalRetweets,
    engagement_rate: totalImpressions > 0 ? totalEngagements / totalImpressions : 0,
  };
};

// ════════════════════════════════════════════════════════════════
// YOUTUBE DATA API v3
// Docs: https://developers.google.com/youtube/v3
// Scope: https://www.googleapis.com/auth/youtube.readonly
// ════════════════════════════════════════════════════════════════
const fetchYouTubeMetrics = async (connection, startDate, endDate) => {
  const { access_token, platform_account_id: channelId } = connection;
  const headers = { Authorization: `Bearer ${access_token}` };

  // Channel statistics
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`,
    { headers }
  );

  // Analytics (requires YouTube Analytics API)
  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` + new URLSearchParams({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares',
      dimensions: 'day',
    }),
    { headers }
  );

  const [channelData, analyticsData] = await Promise.all([
    channelRes.ok ? channelRes.json() : {},
    analyticsRes.ok ? analyticsRes.json() : {},
  ]);

  const stats = channelData.items?.[0]?.statistics || {};
  let totalViews = 0, totalWatchTime = 0, totalLikes = 0;

  analyticsData.rows?.forEach(row => {
    totalViews += row[1] || 0;
    totalWatchTime += row[2] || 0;
    totalLikes += row[7] || 0;
  });

  return {
    subscribers: parseInt(stats.subscriberCount || 0),
    total_views: parseInt(stats.viewCount || 0),
    video_count: parseInt(stats.videoCount || 0),
    period_views: Math.round(totalViews),
    watch_time_hours: Math.round(totalWatchTime / 60),
    likes: Math.round(totalLikes),
    avg_view_duration: analyticsData.rows?.length > 0
      ? totalWatchTime / analyticsData.rows.length : 0,
  };
};

// ── Main sync dispatcher ──────────────────────────────────────
const syncPlatform = async (brandId, connectionId, platform) => {
  const conn = (await query(
    'SELECT * FROM platform_connections WHERE id=$1 AND brand_id=$2', [connectionId, brandId]
  )).rows[0];
  if (!conn) throw new Error('Connection not found');

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  let data = null;
  switch (platform) {
    case 'linkedin': data = await fetchLinkedInMetrics(conn, startDate, endDate); break;
    case 'tiktok':   data = await fetchTikTokMetrics(conn, startDate, endDate); break;
    case 'twitter':  data = await fetchTwitterMetrics(conn, startDate, endDate); break;
    case 'youtube':  data = await fetchYouTubeMetrics(conn, startDate, endDate); break;
    default: throw new Error(`Unknown platform: ${platform}`);
  }

  if (data) {
    await query(
      `UPDATE platform_connections SET last_sync_at=NOW(), last_sync_status='success', total_syncs=total_syncs+1 WHERE id=$1`,
      [connectionId]
    );
    logger.info(`[${platform}] Synced for brand ${brandId}`);
  }

  return data;
};

module.exports = {
  getLinkedInAuthUrl, fetchLinkedInMetrics,
  getTikTokAuthUrl, fetchTikTokMetrics,
  getTwitterAuthUrl, fetchTwitterMetrics,
  fetchYouTubeMetrics,
  syncPlatform,
};
