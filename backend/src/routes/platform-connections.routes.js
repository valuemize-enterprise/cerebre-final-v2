const express = require('express');
const crypto  = require('crypto');
const { query } = require('../db/db');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { getMetaAuthUrl, exchangeCodeForToken, syncMeta } = require('../services/platforms/meta.service');
const { getGoogleAuthUrl, exchangeCode: exchangeGoogleCode, syncGoogle } = require('../services/platforms/google.service');
const { getLinkedInAuthUrl, getTikTokAuthUrl, getTwitterAuthUrl, syncPlatform } = require('../services/platforms/social.service');
const { getDashboardSnapshot, forceSyncBrand } = require('../services/sync.service');
const config = require('../config');

const router = express.Router();

// ── Get all connections for a brand ───────────────────────────
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { brandId } = req.user;
  const result = await query(
    `SELECT id, platform, status, account_name, account_avatar_url,
            follower_count, last_sync_at, last_error, sync_enabled,
            sync_frequency_min, consecutive_errors, total_syncs
     FROM platform_connections WHERE brand_id = $1 ORDER BY platform`,
    [brandId || req.user.userId]
  );
  res.json({ connections: result.rows });
}));

// ── Get OAuth auth URL for a platform ────────────────────────
router.get('/auth-url/:platform', authenticate, asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const brandId = req.user.brandId || req.user.userId;

  // State includes brandId and userId for the callback
  const state = Buffer.from(JSON.stringify({
    brandId,
    userId: req.user.userId,
    platform,
    ts: Date.now(),
  })).toString('base64');

  const callbackBase = `${config.app.apiUrl}/api/platform-connections/callback`;
  let authUrl;

  switch (platform) {
    case 'instagram':
    case 'facebook':
      authUrl = getMetaAuthUrl(process.env.META_APP_ID, `${callbackBase}/meta`, state);
      break;
    case 'google_analytics':
    case 'google_ads':
    case 'google_my_business':
      authUrl = getGoogleAuthUrl(process.env.GOOGLE_CLIENT_ID, `${callbackBase}/google`, state);
      break;
    case 'linkedin':
      authUrl = getLinkedInAuthUrl(process.env.LINKEDIN_CLIENT_ID, `${callbackBase}/linkedin`, state);
      break;
    case 'tiktok':
      authUrl = getTikTokAuthUrl(process.env.TIKTOK_CLIENT_KEY, `${callbackBase}/tiktok`, state);
      break;
    case 'twitter':
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      authUrl = getTwitterAuthUrl(process.env.TWITTER_CLIENT_ID, `${callbackBase}/twitter`, state, codeChallenge);
      break;
    default:
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  res.json({ authUrl });
}));

// ── OAuth Callbacks ───────────────────────────────────────────

// Meta (Facebook + Instagram)
router.get('/callback/meta', asyncHandler(async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = config.app.frontendUrl;

  if (oauthError) return res.redirect(`${frontendUrl}/connect?connection_error=${encodeURIComponent(oauthError)}`);

  const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  const { brandId, userId, platform } = stateData;

  try {
    const tokenData = await exchangeCodeForToken(
      code, process.env.META_APP_ID, process.env.META_APP_SECRET,
      `${config.app.apiUrl}/api/platform-connections/callback/meta`
    );

    // Get pages the user manages
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`);
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 3600 * 1000); // 60 days for long-lived

    // Upsert connection for both Facebook and Instagram
    await query(
      `INSERT INTO platform_connections
       (brand_id, platform, access_token, refresh_token, token_expires_at,
        platform_page_id, account_name, status, sync_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'connected',true)
       ON CONFLICT (brand_id, platform)
       DO UPDATE SET access_token=$3, token_expires_at=$5, platform_page_id=$6,
                     account_name=$7, status='connected', consecutive_errors=0, updated_at=NOW()`,
      [brandId, 'facebook', tokenData.access_token, null, expiresAt, page?.id, page?.name]
    );

    await query(
      `INSERT INTO platform_connections
       (brand_id, platform, access_token, token_expires_at, platform_page_id, account_name, status, sync_enabled)
       VALUES ($1,'instagram',$2,$3,$4,$5,'connected',true)
       ON CONFLICT (brand_id, platform)
       DO UPDATE SET access_token=$2, token_expires_at=$3, platform_page_id=$4, account_name=$5, status='connected', updated_at=NOW()`,
      [brandId, tokenData.access_token, expiresAt, page?.id, page?.name]
    );

    res.redirect(`${frontendUrl}/connect?platform_connected=Instagram+%26+Facebook`);
  } catch (err) {
    res.redirect(`${frontendUrl}/connect?connection_error=${encodeURIComponent(err.message)}`);
  }
}));

// Google
router.get('/callback/google', asyncHandler(async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const frontendUrl = config.app.frontendUrl;
  if (oauthError) return res.redirect(`${frontendUrl}/connect?connection_error=${encodeURIComponent(oauthError)}`);

  const { brandId, platform } = JSON.parse(Buffer.from(state, 'base64').toString());

  try {
    const tokenData = await exchangeGoogleCode(
      code, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
      `${config.app.apiUrl}/api/platform-connections/callback/google`
    );

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // Store for all Google platforms
    for (const gPlatform of ['google_analytics', 'google_ads', 'google_my_business']) {
      await query(
        `INSERT INTO platform_connections
         (brand_id, platform, access_token, refresh_token, token_expires_at, status, sync_enabled)
         VALUES ($1,$2,$3,$4,$5,'connected',true)
         ON CONFLICT (brand_id, platform)
         DO UPDATE SET access_token=$3, refresh_token=$4, token_expires_at=$5, status='connected', updated_at=NOW()`,
        [brandId, gPlatform, tokenData.access_token, tokenData.refresh_token, expiresAt]
      );
    }

    res.redirect(`${frontendUrl}/connect?platform_connected=Google`);
  } catch (err) {
    res.redirect(`${frontendUrl}/connect?connection_error=${encodeURIComponent(err.message)}`);
  }
}));

// ── Manual sync trigger ───────────────────────────────────────
router.post('/sync/:connectionId', authenticate, asyncHandler(async (req, res) => {
  const { connectionId } = req.params;
  const { brandId } = req.user;

  const conn = (await query(
    'SELECT * FROM platform_connections WHERE id=$1 AND brand_id=$2',
    [connectionId, brandId]
  )).rows[0];
  if (!conn) return res.status(404).json({ error: 'Connection not found' });

  // Enqueue async — don't wait
  const { dispatchSync } = require('../services/sync.service');
  dispatchSync(brandId, connectionId, conn.platform).catch(e =>
    console.error('[Sync] Error', e.message)
  );

  res.json({ message: 'Sync triggered', platform: conn.platform });
}));

// ── Force sync all platforms for brand ───────────────────────
router.post('/sync-all', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const results = await forceSyncBrand(brandId);
  res.json({ results });
}));

// ── Live dashboard snapshot ───────────────────────────────────
router.get('/snapshot', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const days = parseInt(req.query.days) || 30;
  const snapshot = await getDashboardSnapshot(brandId, days);
  res.json(snapshot);
}));

// ── Real-time users ───────────────────────────────────────────
router.get('/realtime-users', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { getRealtimeActiveUsers } = require('../services/sync.service');
  const data = await getRealtimeActiveUsers(brandId);
  res.json(data || { activeUsers: 0 });
}));

// ── Disconnect a platform ─────────────────────────────────────
router.delete('/:connectionId', authenticate, asyncHandler(async (req, res) => {
  await query(
    'UPDATE platform_connections SET status=$1, sync_enabled=false, access_token=NULL, refresh_token=NULL WHERE id=$2 AND brand_id=$3',
    ['revoked', req.params.connectionId, req.user.brandId || req.user.userId]
  );
  res.json({ message: 'Platform disconnected' });
}));

module.exports = router;
