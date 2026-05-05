/**
 * Sync Orchestrator
 * Manages scheduled pulls for all connected platforms.
 * Runs via Bull queue on configurable intervals per connection.
 *
 * Architecture:
 * - Every platform_connection has sync_frequency_min (default 60 minutes)
 * - A cron job runs every 15 minutes and enqueues any connections due for sync
 * - Results update live_metrics table immediately
 * - WebSocket pushes updates to connected dashboards in real-time
 */

const { query } = require('../db/db');
const logger = require('../utils/logger');
const { syncMeta } = require('./platforms/meta.service');
const { syncGoogle, fetchGA4Realtime } = require('./platforms/google.service');
const { syncPlatform } = require('./platforms/social.service');

// ── Dispatch sync to correct platform service ─────────────────
const dispatchSync = async (brandId, connectionId, platform) => {
  const start = Date.now();

  // Log the sync job start
  const { rows: [job] } = await query(
    `INSERT INTO api_sync_jobs (brand_id, connection_id, platform, job_type, status)
     VALUES ($1,$2,$3,'scheduled_pull','running') RETURNING id`,
    [brandId, connectionId, platform]
  );

  try {
    let result;

    if (['facebook', 'instagram'].includes(platform)) {
      result = await syncMeta(brandId, connectionId);
    } else if (['google_analytics', 'google_ads', 'google_my_business'].includes(platform)) {
      result = await syncGoogle(brandId, connectionId);
    } else if (['linkedin', 'tiktok', 'twitter', 'youtube'].includes(platform)) {
      result = await syncPlatform(brandId, connectionId, platform);
    } else if (platform === 'email_mailchimp') {
      result = await syncMailchimp(brandId, connectionId);
    }

    const durationMs = Date.now() - start;

    await query(
      `UPDATE api_sync_jobs SET status='completed', completed_at=NOW(), duration_ms=$1,
       metrics_fetched=$2 WHERE id=$3`,
      [durationMs, Object.keys(result || {}).length, job.id]
    );

    // Emit real-time update to connected dashboards via WebSocket
    return { success: true, platform, durationMs, result };

  } catch (err) {
    logger.error(`[Sync] ${platform} failed for brand ${brandId}`, { error: err.message });

    await query(
      `UPDATE api_sync_jobs SET status='failed', completed_at=NOW(), error_message=$1 WHERE id=$2`,
      [err.message, job.id]
    );

    // Increment consecutive error count
    await query(
      `UPDATE platform_connections
       SET consecutive_errors=consecutive_errors+1, last_error=$1, last_sync_status='error'
       WHERE id=$2`,
      [err.message, connectionId]
    );

    // If too many consecutive errors, disable auto-sync
    await query(
      `UPDATE platform_connections SET sync_enabled=false
       WHERE id=$1 AND consecutive_errors >= 5`,
      [connectionId]
    );

    throw err;
  }
};

// ── Find all connections due for sync ─────────────────────────
const getConnectionsDueForSync = async () => {
  const result = await query(`
    SELECT id, brand_id, platform, sync_frequency_min, last_sync_at
    FROM platform_connections
    WHERE sync_enabled = true
      AND status = 'connected'
      AND (
        last_sync_at IS NULL
        OR last_sync_at < NOW() - (sync_frequency_min || ' minutes')::INTERVAL
      )
    ORDER BY last_sync_at ASC NULLS FIRST
    LIMIT 50
  `);
  return result.rows;
};

// ── Force sync a specific brand (manual trigger) ──────────────
const forceSyncBrand = async (brandId) => {
  const { rows: connections } = await query(
    'SELECT id, platform FROM platform_connections WHERE brand_id=$1 AND status=$2',
    [brandId, 'connected']
  );

  const results = [];
  for (const conn of connections) {
    try {
      const result = await dispatchSync(brandId, conn.id, conn.platform);
      results.push({ platform: conn.platform, success: true });
    } catch (err) {
      results.push({ platform: conn.platform, success: false, error: err.message });
    }
  }
  return results;
};

// ── Get real-time active users (GA4) ──────────────────────────
const getRealtimeActiveUsers = async (brandId) => {
  const gaConn = (await query(
    `SELECT * FROM platform_connections WHERE brand_id=$1 AND platform='google_analytics' AND status='connected'`,
    [brandId]
  )).rows[0];

  if (!gaConn) return null;
  return fetchGA4Realtime(gaConn);
};

// ── Build aggregated dashboard snapshot ──────────────────────
const getDashboardSnapshot = async (brandId, periodDays = 30) => {
  const since = new Date(Date.now() - periodDays * 86400000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  // Get all live metrics for this brand in the period
  const metrics = await query(`
    SELECT platform, metric_type, SUM(value) as total, MAX(created_at) as latest
    FROM live_metrics
    WHERE brand_id = $1
      AND period_start >= $2
      AND period_end <= $3
    GROUP BY platform, metric_type
    ORDER BY platform, metric_type
  `, [brandId, since, until]);

  // Structure by platform
  const byPlatform = {};
  metrics.rows.forEach(row => {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = {};
    byPlatform[row.platform][row.metric_type] = parseFloat(row.total || 0);
    byPlatform[row.platform]._last_updated = row.latest;
  });

  // Get connection statuses
  const connections = await query(
    `SELECT platform, status, last_sync_at, last_error, follower_count, account_name
     FROM platform_connections WHERE brand_id=$1`,
    [brandId]
  );

  return {
    metrics: byPlatform,
    connections: connections.rows,
    snapshotAt: new Date().toISOString(),
    period: { since, until, days: periodDays },
  };
};

module.exports = {
  dispatchSync,
  getConnectionsDueForSync,
  forceSyncBrand,
  getRealtimeActiveUsers,
  getDashboardSnapshot,
};
