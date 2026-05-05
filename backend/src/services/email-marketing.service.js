/**
 * Email Marketing Integration Service
 * Handles: Mailchimp, Klaviyo, Brevo (Sendinblue), Flutterwave (payment events)
 *
 * These are pulled on a daily schedule since email APIs don't support webhooks
 * for all metrics. For real-time, campaigns trigger webhooks on send.
 */

const { query } = require('../db/db');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════
// MAILCHIMP
// Docs: https://mailchimp.com/developer/marketing/api/
// Auth: API Key (no OAuth needed — just a key from their dashboard)
// ════════════════════════════════════════════════════════════════

const fetchMailchimpMetrics = async (connection) => {
  const { access_token: apiKey, platform_account_id: dataCentre } = connection;
  // Mailchimp API key format: key-usX (where X is the data centre number)
  const dc = dataCentre || apiKey.split('-')[1];
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const headers = {
    Authorization: `Basic ${Buffer.from('anystring:' + apiKey).toString('base64')}`,
  };

  // Get all lists/audiences
  const listsRes = await fetch(`${base}/lists?count=10&fields=lists.id,lists.name,lists.stats`, { headers });
  if (!listsRes.ok) throw new Error(`Mailchimp error: ${listsRes.status}`);
  const listsData = await listsRes.json();

  // Get recent campaigns (last 30 days)
  const sinceDate = new Date(Date.now() - 30 * 86400000).toISOString();
  const campaignsRes = await fetch(
    `${base}/campaigns?count=50&since_send_time=${sinceDate}&status=sent&fields=campaigns.id,campaigns.settings,campaigns.report_summary,campaigns.send_time`,
    { headers }
  );
  const campaignsData = campaignsRes.ok ? await campaignsRes.json() : { campaigns: [] };

  // Aggregate across all lists
  const totalSubscribers = listsData.lists?.reduce((s, l) => s + (l.stats?.member_count || 0), 0) || 0;
  const totalUnsubscribes = listsData.lists?.reduce((s, l) => s + (l.stats?.unsubscribe_count || 0), 0) || 0;

  // Aggregate campaign performance
  let totalSent = 0, totalOpens = 0, totalClicks = 0, totalBounces = 0;
  const campaigns = campaignsData.campaigns || [];
  campaigns.forEach(c => {
    const r = c.report_summary || {};
    totalSent += r.emails_sent || 0;
    totalOpens += r.opens || 0;
    totalClicks += r.clicks || 0;
    totalBounces += r.bounces || 0;
  });

  return {
    list_size: totalSubscribers,
    new_unsubscribes: totalUnsubscribes,
    emails_sent: totalSent,
    opens: totalOpens,
    clicks: totalClicks,
    bounces: totalBounces,
    open_rate: totalSent > 0 ? totalOpens / totalSent : 0,
    click_rate: totalSent > 0 ? totalClicks / totalSent : 0,
    campaigns_sent: campaigns.length,
    platform: 'email',
    email_provider: 'mailchimp',
  };
};

// ════════════════════════════════════════════════════════════════
// KLAVIYO
// Docs: https://developers.klaviyo.com/en/reference
// Auth: Private API Key (from Klaviyo Account → Settings → API Keys)
// ════════════════════════════════════════════════════════════════

const fetchKlaviyoMetrics = async (connection) => {
  const { access_token: apiKey } = connection;
  const headers = {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: '2024-02-15',
    Accept: 'application/json',
  };

  // Fetch lists
  const listsRes = await fetch('https://a.klaviyo.com/api/lists?filter=equals(name,"Newsletter")', { headers });

  // Fetch recent campaigns
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const campaignsRes = await fetch(
    `https://a.klaviyo.com/api/campaign-values-reports/`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'campaign-values-report',
          attributes: {
            timeframe: { key: 'last_30_days' },
            conversion_metric_id: null,
            statistics: ['open_rate', 'click_rate', 'bounce_rate', 'unsubscribe_rate', 'revenue_per_recipient'],
          },
        },
      }),
    }
  );

  let metrics = { platform: 'email', email_provider: 'klaviyo' };

  if (campaignsRes.ok) {
    const campaignsData = await campaignsRes.json();
    const results = campaignsData.data?.attributes?.results?.[0] || {};
    metrics.open_rate = parseFloat(results.open_rate || 0);
    metrics.click_rate = parseFloat(results.click_rate || 0);
    metrics.bounce_rate = parseFloat(results.bounce_rate || 0);
    metrics.unsubscribe_rate = parseFloat(results.unsubscribe_rate || 0);
    metrics.revenue_per_email = parseFloat(results.revenue_per_recipient || 0);
  }

  return metrics;
};

// ════════════════════════════════════════════════════════════════
// BREVO (SENDINBLUE)
// Docs: https://developers.brevo.com/reference
// Auth: API Key (Account → SMTP & API → API Keys)
// ════════════════════════════════════════════════════════════════

const fetchBrevoMetrics = async (connection) => {
  const { access_token: apiKey } = connection;
  const headers = { 'api-key': apiKey, Accept: 'application/json' };

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  // Account stats
  const statsRes = await fetch(
    `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${since}&endDate=${until}`,
    { headers }
  );

  // Contacts
  const contactsRes = await fetch('https://api.brevo.com/v3/contacts?limit=1', { headers });

  const [stats, contacts] = await Promise.all([
    statsRes.ok ? statsRes.json() : {},
    contactsRes.ok ? contactsRes.json() : {},
  ]);

  return {
    list_size: contacts.count || 0,
    emails_sent: stats.delivered || 0,
    opens: stats.uniqueOpens || 0,
    clicks: stats.uniqueClicks || 0,
    bounces: (stats.hardBounces || 0) + (stats.softBounces || 0),
    unsubscribes: stats.unsubscribed || 0,
    spam_reports: stats.spamReports || 0,
    open_rate: stats.delivered > 0 ? stats.uniqueOpens / stats.delivered : 0,
    click_rate: stats.delivered > 0 ? stats.uniqueClicks / stats.delivered : 0,
    platform: 'email',
    email_provider: 'brevo',
  };
};

// ════════════════════════════════════════════════════════════════
// DISPATCH — route to correct provider
// ════════════════════════════════════════════════════════════════

const syncEmailMarketing = async (brandId, connectionId) => {
  const conn = (await query(
    'SELECT * FROM platform_connections WHERE id=$1 AND brand_id=$2', [connectionId, brandId]
  )).rows[0];
  if (!conn) throw new Error('Connection not found');

  let metrics;
  switch (conn.platform) {
    case 'email_mailchimp': metrics = await fetchMailchimpMetrics(conn); break;
    case 'email_klaviyo':   metrics = await fetchKlaviyoMetrics(conn);   break;
    case 'email_brevo':     metrics = await fetchBrevoMetrics(conn);     break;
    default: throw new Error(`Unknown email provider: ${conn.platform}`);
  }

  if (metrics) {
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    await query(
      `INSERT INTO live_metrics
       (brand_id, connection_id, platform, metric_type, period_type, period_start, period_end, value)
       VALUES ($1,$2,'email',$3,'monthly',$4,$5,$6)
       ON CONFLICT (brand_id, platform, metric_type, period_type, period_start)
       DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
      [brandId, connectionId, 'open_rate', since, today, metrics.open_rate]
    );

    await query(
      `UPDATE platform_connections SET last_sync_at=NOW(), last_sync_status='success' WHERE id=$1`,
      [connectionId]
    );
  }

  logger.info(`[Email] Synced ${conn.platform} for brand ${brandId}`);
  return metrics;
};

module.exports = { syncEmailMarketing, fetchMailchimpMetrics, fetchKlaviyoMetrics, fetchBrevoMetrics };
