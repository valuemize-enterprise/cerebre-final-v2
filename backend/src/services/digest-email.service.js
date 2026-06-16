/**
 * Weekly Digest Email Service
 *
 * Sends the Monday morning performance digest to all subscribed clients.
 * This is the email clients start to depend on — it must be beautiful
 * and feel like a personal briefing from their account manager.
 *
 * Triggered by: a cron job in the worker (runs every Monday 7:00 AM WAT)
 * Also triggered by: POST /api/digest/send-test
 */

const nodemailer = require('nodemailer');
const { query }  = require('../db/db');
const { getNarrative } = require('./narrative-ai.service');
const { getCachedBrand, getCachedGoals } = require('./cache.service');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.sendgrid.net',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || '',
  },
});

// ── Build the email HTML ─────────────────────────────────────────
const buildDigestEmail = (client, brand, narrative, goals, metrics, clarityScore, clarityLabel) => {
  const scoreColour = clarityScore >= 800 ? '#059669' : clarityScore >= 600 ? '#6d28d9' : clarityScore >= 400 ? '#d97706' : '#dc2626';
  const greeting    = new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon';

  const goalRows = goals.slice(0, 4).map(g => {
    const pct = Math.min(100, Math.round(parseFloat(g.progress_pct || 0)));
    const statusColour = g.status === 'achieved' ? '#059669' : g.status === 'at_risk' ? '#dc2626' : '#6d28d9';
    const statusLabel  = g.status === 'achieved' ? '✓ Achieved' : g.status === 'at_risk' ? '⚠ At risk' : '● On track';
    return `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${g.title}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;">
          <div style="height:5px;background:#f3f4f6;border-radius:3px;overflow:hidden;min-width:80px;">
            <div style="height:100%;width:${pct}%;background:${statusColour};border-radius:3px;"></div>
          </div>
        </td>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:${statusColour};border-bottom:1px solid #f3f4f6;">${statusLabel}</td>
      </tr>
    `;
  }).join('');

  const platformSummary = Object.entries(metrics).slice(0, 4).map(([platform, data]) => {
    const impressions = data.impressions || data.sessions || data.video_views || 0;
    return `
      <td style="padding:16px;text-align:center;border-right:1px solid #f3f4f6;">
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${platform.replace('_', ' ')}</p>
        <p style="font-size:22px;font-weight:900;color:#111827;">${impressions >= 1000 ? `${(impressions/1000).toFixed(0)}K` : impressions.toLocaleString()}</p>
      </td>
    `;
  }).join('');

  const portalUrl = process.env.FRONTEND_URL || 'https://cerebre.media';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#060320,#4c1d95);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:inline-flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:900;">⚡</span>
      </div>
      <span style="color:white;font-weight:900;font-size:15px;">Cerebre Intelligence</span>
    </div>
    <p style="color:#a78bfa;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Weekly Brand Intelligence Briefing</p>
    <h1 style="color:white;font-size:24px;font-weight:900;margin:0;">${brand?.name || 'Your Brand'}</h1>
  </div>

  <!-- Body -->
  <div style="background:white;padding:32px;">

    <!-- Greeting -->
    <p style="font-size:15px;color:#374151;margin-bottom:24px;">
      ${greeting}, ${client.full_name?.split(' ')[0] || 'there'}. Here is your brand intelligence briefing for this week.
    </p>

    <!-- ClarityScore -->
    <div style="background:linear-gradient(135deg,#f5f3ff,#faf5ff);border:1px solid #e9d5ff;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">⚡ ClarityScore™ this week</p>
      <p style="font-size:56px;font-weight:900;color:${scoreColour};margin:0;">${clarityScore || '—'}</p>
      <p style="font-size:14px;font-weight:700;color:${scoreColour};margin-top:4px;">${clarityLabel || ''}</p>
    </div>

    <!-- NarrativeAI -->
    ${narrative ? `
      <div style="border-left:4px solid #6d28d9;padding:16px 20px;background:#fafafa;border-radius:0 10px 10px 0;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🧠 NarrativeAI™ — Your brand this week</p>
        <p style="font-size:14px;color:#374151;line-height:1.8;margin:0;">${narrative}</p>
      </div>
    ` : ''}

    <!-- Platform snapshot -->
    ${platformSummary ? `
      <p style="font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Platform snapshot (7 days)</p>
      <table style="width:100%;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        <tr>${platformSummary}</tr>
      </table>
    ` : ''}

    <!-- Goals -->
    ${goalRows ? `
      <p style="font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Priority goals</p>
      <table style="width:100%;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        ${goalRows}
      </table>
    ` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${portalUrl}/client/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#9333ea);color:white;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        View full intelligence dashboard →
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;">
      Or <a href="${portalUrl}/client/ask" style="color:#6d28d9;">Ask ARIA</a> a question about your brand
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      Cerebre Media Africa · Powered by Cerebre Intelligence Suite™<br>
      <a href="${portalUrl}/client/digest/unsubscribe?client=${client.id}" style="color:#9ca3af;">Unsubscribe from weekly digest</a>
    </p>
  </div>

</div>
</body>
</html>`;
};

// ── Send digest to a single client ───────────────────────────────
const sendDigestToClient = async (clientUser, brandId) => {
  const [brand, goals, narrative] = await Promise.all([
    getCachedBrand(brandId),
    getCachedGoals(brandId),
    getNarrative(brandId, 7), // 7-day narrative for weekly digest
  ]);

  // Get 7-day metrics
  const since   = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { rows: metricRows } = await query(
    `SELECT platform, metric_type, SUM(value) as total
     FROM live_metrics WHERE brand_id=$1 AND period_start >= $2
     GROUP BY platform, metric_type`,
    [brandId, since]
  );

  const metrics = {};
  metricRows.forEach(r => {
    if (!metrics[r.platform]) metrics[r.platform] = {};
    metrics[r.platform][r.metric_type] = parseFloat(r.total);
  });

  // Calculate ClarityScore for the digest
  const { rows: healthRows } = await query(
    'SELECT overall_score FROM brand_health_scores WHERE brand_id=$1 ORDER BY period_date DESC LIMIT 1',
    [brandId]
  ).catch(() => ({ rows: [] }));
  const healthScore = healthRows[0]?.overall_score || 50;
  const goalsOnTrack = goals.filter(g => g.status !== 'at_risk' && g.status !== 'missed').length;
  const clarityScore = Math.min(1000, Math.round(healthScore * 7 + (goalsOnTrack / Math.max(goals.length, 1)) * 150 + Math.min(metricRows.length * 5, 150)));
  const clarityLabel = clarityScore >= 800 ? 'EXCELLENT' : clarityScore >= 600 ? 'HEALTHY' : clarityScore >= 400 ? 'DEVELOPING' : 'NEEDS ATTENTION';

  const html = buildDigestEmail(clientUser, brand, narrative, goals, metrics, clarityScore, clarityLabel);

  await transporter.sendMail({
    from: `Cerebre Intelligence <${process.env.EMAIL_FROM || 'intelligence@cerebre.media'}>`,
    to:   clientUser.email,
    subject: `[${brand?.name}] Your Weekly Intelligence Briefing · ClarityScore™ ${clarityScore || '—'}`,
    html,
  });

  logger.info(`[Digest] Sent to ${clientUser.email} for brand ${brandId}`);
  return true;
};

// ── Send digests to ALL subscribed clients ────────────────────────
const sendWeeklyDigests = async () => {
  const { rows: clients } = await query(
    `SELECT cpu.*, dc.recipients, dc.include_sections
     FROM client_portal_users cpu
     LEFT JOIN digest_configs dc ON dc.brand_id = cpu.brand_id
     WHERE cpu.is_active = true AND cpu.weekly_digest_enabled = true
     AND (dc.is_enabled = true OR dc.is_enabled IS NULL)`
  );

  logger.info(`[Digest] Sending weekly digests to ${clients.length} clients`);
  let sent = 0, failed = 0;

  for (const client of clients) {
    try {
      await sendDigestToClient(client, client.brand_id);
      sent++;
      // Small delay to avoid SMTP rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      failed++;
      logger.error(`[Digest] Failed for ${client.email}`, { error: err.message });
    }
  }

  logger.info(`[Digest] Complete — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
};

module.exports = { sendWeeklyDigests, sendDigestToClient, buildDigestEmail };
