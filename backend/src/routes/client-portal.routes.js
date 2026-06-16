/**
 * client-portal.routes.js
 *
 * Sabi — Client Portal API Routes
 * Prefix: /api/client/*
 *
 * All routes in this file are for CLIENT access only.
 * Clients can only READ their own brand's data.
 * They CANNOT see other clients, agency internals, or raw data.
 *
 * Register in server.js:
 *   const clientPortalRoutes = require('./routes/client-portal.routes');
 *   app.use('/api/client', clientPortalRoutes);
 *
 * Exports:
 *   router               — the Express router
 *   authenticateClient   — middleware used by extended-client.routes.js
 *                          and agency-performance.routes.js
 */

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { query } = require('../db/db');
const { asyncHandler } = require('../middleware/error.middleware');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ══════════════════════════════════════════════════════════════════
// CLIENT AUTH MIDDLEWARE
// Separate from the agency authenticate() middleware.
// Client tokens carry type: 'client' — agency tokens are rejected.
// ══════════════════════════════════════════════════════════════════
const authenticateClient = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Reject agency tokens — they must use the agency login
    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'Invalid token type — use the agency login' });
    }

    // Attach client context to request
    req.client = {
      clientId:   decoded.clientId,
      brandId:    decoded.brandId,
      clientName: decoded.clientName,
      role:       decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
};

// ══════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// POST /api/client/auth/login
// POST /api/client/auth/logout
// GET  /api/client/auth/me
// POST /api/client/auth/set-password   (invite flow)
// ══════════════════════════════════════════════════════════════════

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await query(
    `SELECT
       cp.id, cp.brand_id, cp.email, cp.password_hash, cp.full_name,
       cp.role, cp.is_active, cp.last_login_at,
       cp.can_ask_ai, cp.can_download, cp.can_view_competitors,
       b.name   AS brand_name,
       b.industry,
       b.active_platforms,
       b.logo_url,
       b.brand_color
     FROM client_portal_users cp
     JOIN brands b ON b.id = cp.brand_id
     WHERE cp.email = $1`,
    [email.toLowerCase().trim()]
  );

  const client = rows[0];

  if (!client) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!client.is_active) {
    return res.status(401).json({ error: 'Account is inactive — contact your account manager' });
  }
  if (!(await bcrypt.compare(password, client.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Record last login
  await query(
    'UPDATE client_portal_users SET last_login_at = NOW() WHERE id = $1',
    [client.id]
  );

  const token = jwt.sign(
    {
      type:       'client',
      clientId:   client.id,
      brandId:    client.brand_id,
      clientName: client.full_name,
      role:       client.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    client: {
      id:                  client.id,
      name:                client.full_name,
      email:               client.email,
      role:                client.role,
      brandId:             client.brand_id,
      brandName:           client.brand_name,
      industry:            client.industry,
      activePlatforms:     client.active_platforms,
      logoUrl:             client.logo_url,
      brandColor:          client.brand_color,
      permissions: {
        canAskAI:           client.can_ask_ai,
        canDownload:        client.can_download,
        canViewCompetitors: client.can_view_competitors,
      },
    },
  });
}));

router.post('/auth/logout', authenticateClient, (req, res) => {
  res.json({ logged_out: true });
});

router.get('/auth/me', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       cp.id, cp.full_name, cp.email, cp.role,
       cp.can_ask_ai, cp.can_download, cp.can_view_competitors,
       b.name      AS brand_name,
       b.industry,
       b.active_platforms,
       b.logo_url,
       b.brand_color,
       b.website
     FROM client_portal_users cp
     JOIN brands b ON b.id = cp.brand_id
     WHERE cp.id = $1`,
    [req.client.clientId]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Client not found' });
  res.json({ client: rows[0] });
}));

// Invite flow: client clicks link → sets password → can log in
router.post('/auth/set-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: 'A valid invite token and password (8+ characters) are required' });
  }

  const { rows } = await query(
    'SELECT id FROM client_portal_users WHERE invite_token = $1 AND is_active = true',
    [token]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Invite link is invalid or has already been used' });
  }

  const hash = await bcrypt.hash(password, 12);
  await query(
    'UPDATE client_portal_users SET password_hash = $1, invite_token = NULL WHERE id = $2',
    [hash, rows[0].id]
  );

  res.json({ set: true, message: 'Password set — you can now sign in' });
}));

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// GET /api/client/dashboard
// Returns everything the main client dashboard needs in one call.
// ══════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const period = Math.min(365, Math.max(1, parseInt(req.query.period || '30')));
  const since  = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);

  const [metricsRes, goalsRes, reportsRes, alertsRes, healthRes] = await Promise.all([
    query(
      `SELECT platform, metric_type, SUM(value) AS total, MAX(created_at) AS latest
       FROM live_metrics
       WHERE brand_id = $1 AND period_start >= $2
       GROUP BY platform, metric_type
       ORDER BY platform`,
      [brandId, since]
    ),
    query(
      `SELECT id, title, goal_category, target_metric, target_value, target_unit,
              current_value, progress_pct, status, deadline, priority_rank
       FROM priority_goals
       WHERE brand_id = $1 AND is_active = true
       ORDER BY priority_rank ASC
       LIMIT 5`,
      [brandId]
    ),
    query(
      `SELECT id, report_type, analysis_type, period_label, overall_score,
              clarity_score, created_at
       FROM analysis_reports
       WHERE brand_id = $1 AND client_visible IS DISTINCT FROM false
       ORDER BY created_at DESC
       LIMIT 5`,
      [brandId]
    ),
    query(
      `SELECT id, title, body, alert_type, severity, platform, created_at
       FROM realtime_alerts
       WHERE brand_id = $1 AND read_at IS NULL
       ORDER BY created_at DESC
       LIMIT 5`,
      [brandId]
    ),
    query(
      `SELECT overall_score, maturity_level, period_date
       FROM brand_health_scores
       WHERE brand_id = $1
       ORDER BY period_date DESC
       LIMIT 1`,
      [brandId]
    ),
  ]);

  const health        = healthRes.rows[0];
  const goalsOnTrack  = goalsRes.rows.filter(g => g.status === 'on_track' || g.status === 'achieved').length;
  const totalGoals    = goalsRes.rows.length;
  const metricsCount  = metricsRes.rows.length;

  // ClarityScore™ — 0 to 1000 composite brand intelligence score
  const clarityScore = health
    ? Math.min(
        1000,
        Math.round(
          (health.overall_score || 50) * 7 +
          (goalsOnTrack / Math.max(totalGoals, 1)) * 150 +
          Math.min(metricsCount * 5, 150)
        )
      )
    : null;

  const clarityLabel =
    !clarityScore     ? 'CALCULATING'   :
    clarityScore >= 800 ? 'EXCELLENT'   :
    clarityScore >= 650 ? 'HEALTHY'     :
    clarityScore >= 450 ? 'DEVELOPING'  :
    clarityScore >= 250 ? 'NEEDS ATTENTION' : 'CRITICAL';

  // Group raw metric rows into a platform → metrics map
  const platforms = {};
  metricsRes.rows.forEach(r => {
    if (!platforms[r.platform]) platforms[r.platform] = {};
    platforms[r.platform][r.metric_type]  = parseFloat(r.total || 0);
    platforms[r.platform]._last_updated   = r.latest;
  });

  res.json({
    clarityScore,
    clarityLabel,
    brandHealth:   health?.overall_score || null,
    platforms,
    goals:         goalsRes.rows,
    recentReports: reportsRes.rows,
    alerts:        alertsRes.rows,
    period,
    generatedAt:   new Date().toISOString(),
  });
}));

// ══════════════════════════════════════════════════════════════════
// REPORTS
// GET /api/client/reports
// GET /api/client/reports/:id
// GET /api/client/reports/:id/pdf
// ══════════════════════════════════════════════════════════════════

router.get('/reports', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const page   = Math.max(1, parseInt(req.query.page || '1'));
  const offset = (page - 1) * 20;
  const params = [brandId];

  let q = `SELECT id, report_type, analysis_type, period_label,
                  overall_score, clarity_score, key_highlights, created_at
           FROM analysis_reports
           WHERE brand_id = $1 AND client_visible IS DISTINCT FROM false`;

  if (req.query.type) {
    params.push(req.query.type);
    q += ` AND report_type = $${params.length}`;
  }

  params.push(20, offset);
  q += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await query(q, params);
  res.json({ reports: rows, page });
}));

router.get('/reports/:id', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT ar.*, b.name AS brand_name, b.industry, b.logo_url
     FROM analysis_reports ar
     JOIN brands b ON b.id = ar.brand_id
     WHERE ar.id = $1 AND ar.brand_id = $2`,
    [req.params.id, req.client.brandId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: rows[0] });
}));

router.get('/reports/:id/pdf', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM analysis_reports WHERE id = $1 AND brand_id = $2',
    [req.params.id, req.client.brandId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Report not found' });

  if (rows[0].pdf_url) {
    return res.json({ pdfUrl: rows[0].pdf_url });
  }

  // Generate on the fly if no cached PDF
  try {
    const { generatePDF } = require('../services/pdf-generator.service');
    const result = await generatePDF(req.params.id, req.client.brandId);
    if (result.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sabi-report-${req.params.id.slice(0, 8)}.pdf"`);
      return res.send(result.buffer);
    }
    res.setHeader('Content-Type', 'text/html');
    return res.send(result.html);
  } catch {
    res.json({ message: 'PDF queued', jobId: rows[0].id });
  }
}));

// ══════════════════════════════════════════════════════════════════
// PLATFORMS
// GET /api/client/platforms/:platform
// ══════════════════════════════════════════════════════════════════

router.get('/platforms/:platform', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId }             = req.client;
  const platform                = req.params.platform.toLowerCase();
  const period                  = Math.min(365, Math.max(1, parseInt(req.query.period || '30')));
  const granularity             = ['daily', 'weekly', 'monthly'].includes(req.query.granularity) ? req.query.granularity : 'daily';
  const since                   = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
  const prevSince               = new Date(Date.now() - period * 2 * 86400000).toISOString().slice(0, 10);

  const [currentRes, prevRes, trendRes, topContentRes] = await Promise.all([
    query(
      `SELECT metric_type, SUM(value) AS total
       FROM live_metrics WHERE brand_id = $1 AND platform = $2 AND period_start >= $3
       GROUP BY metric_type`,
      [brandId, platform, since]
    ),
    query(
      `SELECT metric_type, SUM(value) AS total
       FROM live_metrics WHERE brand_id = $1 AND platform = $2
       AND period_start >= $3 AND period_start < $4
       GROUP BY metric_type`,
      [brandId, platform, prevSince, since]
    ),
    query(
      `SELECT period_start AS date, metric_type, value
       FROM live_metrics WHERE brand_id = $1 AND platform = $2
       AND period_start >= $3 AND period_type = $4
       ORDER BY period_start ASC`,
      [brandId, platform, since, granularity]
    ),
    query(
      `SELECT * FROM top_content WHERE brand_id = $1 AND platform = $2
       ORDER BY engagement_score DESC LIMIT 10`,
      [brandId, platform]
    ),
  ]);

  const prevMap = {};
  prevRes.rows.forEach(r => { prevMap[r.metric_type] = parseFloat(r.total); });

  const metrics = currentRes.rows.map(r => {
    const current  = parseFloat(r.total);
    const previous = prevMap[r.metric_type];
    const changePct = previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
    return { metric: r.metric_type, current, previous: previous || null, changePct };
  });

  res.json({ platform, period, metrics, trend: trendRes.rows, topContent: topContentRes.rows });
}));

// ══════════════════════════════════════════════════════════════════
// GOALS
// GET /api/client/goals
// ══════════════════════════════════════════════════════════════════

router.get('/goals', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT g.*,
            ARRAY_AGG(gh.recorded_value ORDER BY gh.recorded_at DESC)
              FILTER (WHERE gh.recorded_value IS NOT NULL) AS history_values,
            ARRAY_AGG(gh.recorded_at    ORDER BY gh.recorded_at DESC)
              FILTER (WHERE gh.recorded_at IS NOT NULL)    AS history_dates
     FROM priority_goals g
     LEFT JOIN goal_history gh ON gh.goal_id = g.id
     WHERE g.brand_id = $1 AND g.is_active = true
     GROUP BY g.id
     ORDER BY g.priority_rank ASC`,
    [req.client.brandId]
  );
  res.json({ goals: rows });
}));

// ══════════════════════════════════════════════════════════════════
// COMPETITORS — DepthView™
// GET /api/client/competitors
// ══════════════════════════════════════════════════════════════════

router.get('/competitors', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;

  const [myMetrics, competitors, sovData] = await Promise.all([
    query(
      `SELECT platform, metric_type, SUM(value) AS total
       FROM live_metrics WHERE brand_id = $1
       AND period_start >= NOW() - INTERVAL '30 days'
       GROUP BY platform, metric_type`,
      [brandId]
    ),
    query(
      `SELECT id, competitor_name, competitor_industry, platforms,
              follower_estimates, engagement_estimates,
              last_notable_activity, content_strategy_summary,
              share_of_voice_estimate
       FROM competitors WHERE brand_id = $1 AND is_active = true
       ORDER BY share_of_voice_estimate DESC`,
      [brandId]
    ),
    query(
      `SELECT platform, our_sov, period_end
       FROM share_of_voice WHERE brand_id = $1
       ORDER BY period_end DESC LIMIT 12`,
      [brandId]
    ),
  ]);

  res.json({
    myMetrics:    myMetrics.rows,
    competitors:  competitors.rows,
    shareOfVoice: sovData.rows,
  });
}));

// ══════════════════════════════════════════════════════════════════
// ALERTS
// GET   /api/client/alerts
// PATCH /api/client/alerts/:id/read
// ══════════════════════════════════════════════════════════════════

router.get('/alerts', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM realtime_alerts WHERE brand_id = $1
     ORDER BY created_at DESC LIMIT 30`,
    [req.client.brandId]
  );
  res.json({ alerts: rows });
}));

router.patch('/alerts/:id/read', authenticateClient, asyncHandler(async (req, res) => {
  await query(
    'UPDATE realtime_alerts SET read_at = NOW() WHERE id = $1 AND brand_id = $2',
    [req.params.id, req.client.brandId]
  );
  res.json({ read: true });
}));

// ══════════════════════════════════════════════════════════════════
// ASK ARIA — Conversational AI
// POST /api/client/ask
// ══════════════════════════════════════════════════════════════════

router.post('/ask', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId }        = req.client;
  const { question, history = [] } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }

  const { getCachedBrand, getCachedGoals, getCachedApiKey } = require('../services/cache.service');
  const { generateAnswer }                                   = require('../services/master-ai.service');

  const [brand, goals, metricsResult] = await Promise.all([
    getCachedBrand(brandId),
    getCachedGoals(brandId),
    query(
      `SELECT platform, metric_type, SUM(value) AS value
       FROM live_metrics WHERE brand_id = $1
       AND period_start >= NOW() - INTERVAL '30 days'
       GROUP BY platform, metric_type`,
      [brandId]
    ),
  ]);

  const apiKey = await getCachedApiKey(brandId, 'anthropic') || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI service is not configured for this account — contact your account manager',
    });
  }

  const answer = await generateAnswer({
    brand,
    question,
    history: history.slice(-8),  // last 8 turns for context
    goals,
    metrics: metricsResult.rows,
    apiKey,
  });

  res.json({ answer, question, askedAt: new Date().toISOString() });
}));

// ══════════════════════════════════════════════════════════════════
// CULTURAL CALENDAR
// GET /api/client/moments
// ══════════════════════════════════════════════════════════════════

router.get('/moments', authenticateClient, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM cultural_moments
     WHERE (brand_id = $1 OR brand_id IS NULL)
     AND date_start >= CURRENT_DATE
     ORDER BY date_start ASC LIMIT 20`,
    [req.client.brandId]
  ).catch(() => ({ rows: [] }));
  res.json({ moments: rows });
}));

module.exports = router;
module.exports.authenticateClient = authenticateClient;
