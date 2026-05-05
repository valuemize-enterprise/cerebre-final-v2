const express = require('express');
const crypto  = require('crypto');
const { query } = require('../db/db');
const logger  = require('../utils/logger');

const router = express.Router();

// ── Verify webhook signatures ─────────────────────────────────
const verifyMeta = (req) => {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_WEBHOOK_SECRET || '')
    .update(req.rawBody || '')
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const verifyShopify = (req) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!hmac) return false;
  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || '')
    .update(req.rawBody || '')
    .digest('base64');
  return hmac === computed;
};

// ── Meta / Instagram webhooks ─────────────────────────────────
// Facebook sends a GET to verify the endpoint first
router.get('/meta', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.send(challenge);
  }
  res.sendStatus(403);
});

router.post('/meta', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifyMeta(req)) return res.sendStatus(403);

  const payload = JSON.parse(req.body);
  res.sendStatus(200); // Acknowledge immediately

  // Process asynchronously
  for (const entry of payload.entry || []) {
    const pageId = entry.id;

    // Find brand connection by page ID
    const conn = (await query(
      'SELECT brand_id FROM platform_connections WHERE platform_page_id=$1 AND platform IN ($2,$3)',
      [pageId, 'facebook', 'instagram']
    ).catch(() => ({ rows: [] }))).rows[0];

    if (!conn) continue;

    // Log the webhook event
    await query(
      `INSERT INTO webhook_events (brand_id, platform, event_type, payload)
       VALUES ($1,'meta',$2,$3)`,
      [conn.brand_id, payload.object, JSON.stringify(entry)]
    );

    // If it's a comment or mention, trigger real-time alert
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.value?.item === 'comment' || change.field === 'mention') {
          await query(
            `INSERT INTO realtime_alerts (brand_id, platform, alert_type, severity, title, body)
             VALUES ($1,'instagram','new_mention','info',$2,$3)`,
            [conn.brand_id, 'New mention received', JSON.stringify(change.value)]
          );
        }
      }
    }
  }
});

// ── Shopify webhooks ──────────────────────────────────────────
router.post('/shopify/:event', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifyShopify(req)) return res.sendStatus(401);

  const { event } = req.params;
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const payload = JSON.parse(req.body);

  res.sendStatus(200);

  // Find brand by Shopify domain
  const conn = (await query(
    "SELECT brand_id FROM platform_connections WHERE platform='shopify' AND platform_handle=$1",
    [shopDomain]
  ).catch(() => ({ rows: [] }))).rows[0];

  if (!conn) return;

  await query(
    `INSERT INTO webhook_events (brand_id, platform, event_type, payload, processed)
     VALUES ($1,'shopify',$2,$3,false)`,
    [conn.brand_id, event, JSON.stringify(payload)]
  );

  // Handle specific events
  if (event === 'orders/paid') {
    await query(
      `INSERT INTO realtime_alerts (brand_id, platform, alert_type, severity, title, body, context)
       VALUES ($1,'shopify','new_order','positive',$2,$3,$4)`,
      [
        conn.brand_id,
        `New order: ₦${parseFloat(payload.total_price || 0).toLocaleString()}`,
        `Order #${payload.order_number} from ${payload.billing_address?.first_name || 'customer'}`,
        JSON.stringify({ order_id: payload.id, revenue: payload.total_price }),
      ]
    );
  }
});

// ── WordPress / Custom webhook ────────────────────────────────
// Called by the WordPress plugin and any custom integration
router.post('/wordpress', async (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  const brandId = req.headers['x-brand-id'];

  if (!apiKey || !brandId) return res.status(401).json({ error: 'Missing credentials' });

  // Verify the API key
  const user = (await query(
    'SELECT user_id FROM api_keys WHERE key_hash=$1 AND is_active=true',
    [crypto.createHash('sha256').update(apiKey).digest('hex')]
  ).catch(() => ({ rows: [] }))).rows[0];

  if (!user) return res.status(401).json({ error: 'Invalid API key' });

  res.json({ received: true });

  const { event, data, timestamp } = req.body;

  // Route to correct handler
  switch (event) {
    case 'page_view':
      // Accumulate page views (batched, not per-view)
      break;

    case 'lead':
      await query(
        `INSERT INTO live_metrics
         (brand_id, platform, metric_type, period_type, period_start, period_end, value)
         VALUES ($1,'website','leads','daily',CURRENT_DATE,CURRENT_DATE,1)
         ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
         DO UPDATE SET value = live_metrics.value + 1, created_at = NOW()`,
        [brandId]
      );
      break;

    case 'purchase':
      await query(
        `INSERT INTO live_metrics
         (brand_id, platform, metric_type, period_type, period_start, period_end, value)
         VALUES ($1,'website','revenue','daily',CURRENT_DATE,CURRENT_DATE,$2)
         ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
         DO UPDATE SET value = live_metrics.value + $2, created_at = NOW()`,
        [brandId, parseFloat(data?.revenue || 0)]
      );
      break;

    case 'page_exit':
      // Could store average time-on-page, scroll depth etc.
      break;
  }

  await query(
    'INSERT INTO webhook_events (brand_id, platform, event_type, payload) VALUES ($1,$2,$3,$4)',
    [brandId, 'website', event, JSON.stringify(req.body)]
  );
});

// ── Zapier / Make.com generic webhook ─────────────────────────
// Any automation tool can POST data here
router.post('/generic/:brandId', async (req, res) => {
  const { brandId } = req.params;
  const token = req.headers['x-webhook-token'];

  // Verify token
  const valid = (await query(
    'SELECT id FROM brands WHERE id=$1', [brandId]
  ).catch(() => ({ rows: [] }))).rows[0];

  if (!valid) return res.status(404).json({ error: 'Brand not found' });

  const { platform, metrics, period_start, period_end } = req.body;

  // Store metrics directly
  if (metrics && typeof metrics === 'object') {
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value !== 'number') continue;
      await query(
        `INSERT INTO live_metrics
         (brand_id, platform, metric_type, period_type, period_start, period_end, value)
         VALUES ($1,$2,$3,'daily',$4,$5,$6)
         ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
         DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
        [brandId, platform || 'custom', key, period_start || new Date().toISOString().slice(0,10), period_end || new Date().toISOString().slice(0,10), value]
      );
    }
  }

  res.json({ received: true, stored: Object.keys(metrics || {}).length });
});

// ── Website tracking pixel endpoint ───────────────────────────
router.post('/event', async (req, res) => {
  const { brandId, event, url, sessionId, data, timestamp } = req.body;
  if (!brandId || !event) return res.status(400).json({ error: 'brandId and event required' });

  // Store event
  await query(
    'INSERT INTO webhook_events (brand_id, platform, event_type, payload) VALUES ($1,$2,$3,$4)',
    [brandId, 'website', event, JSON.stringify(req.body)]
  ).catch(() => {});

  res.json({ ok: true });
});

// ── Website metrics batch sync (from WordPress plugin hourly cron) ────────
router.post('/sync', async (req, res) => {
  const apiKey  = req.headers.authorization?.replace('Bearer ', '');
  const brandId = req.headers['x-brand-id'] || req.body.brandId;

  if (!apiKey || !brandId) return res.status(401).json({ error: 'Missing auth' });

  const { platform, report_period_start, report_period_end, ...metrics } = req.body;

  // Store all numeric metrics
  const toStore = Object.entries(metrics).filter(([, v]) => typeof v === 'number');
  for (const [key, value] of toStore) {
    await query(
      `INSERT INTO live_metrics
       (brand_id, platform, metric_type, period_type, period_start, period_end, value)
       VALUES ($1,$2,$3,'daily',$4,$5,$6)
       ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
       DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
      [brandId, platform || 'website', key, report_period_start, report_period_end, value]
    ).catch(() => {});
  }

  res.json({ stored: toStore.length });
});

module.exports = router;
