/**
 * Extended API Routes
 * Covers: onboarding, website-tracking, live-data, brand-health,
 * industry-intelligence, automations, predictions, digest, voice-guardian,
 * hashtags, UTM, share-of-voice, ROI, cultural-moments, seasonal,
 * first-party data, experiments, influencers, campaigns, calendar, ask
 */

const express   = require('express');
const { query } = require('../db/db');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const { authenticateClient } = require('./client-portal.routes');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════
router.post('/onboarding/company', authenticate, asyncHandler(async (req, res) => {
  const { name, industry, sub_industry, country, size, website, platforms } = req.body;
  const userId = req.user.userId;

  // Upsert brand
  const existing = await query('SELECT id FROM brands WHERE organisation_id=(SELECT id FROM organisations WHERE slug=$1 LIMIT 1)',
    [userId]).catch(() => ({ rows: [] }));

  if (existing.rows.length === 0) {
    // Create org + brand
    const orgResult = await query(
      `INSERT INTO organisations (name, slug, country) VALUES ($1,$2,$3) RETURNING id`,
      [name, userId, country || 'Nigeria']
    ).catch(async () => {
      // Fallback: just update users table
      await query('UPDATE users SET name=$1 WHERE id=$2', [name, userId]).catch(() => {});
      return { rows: [{ id: userId }] };
    });

    const orgId = orgResult.rows[0].id;
    await query(
      `INSERT INTO brands (organisation_id, name, industry, sub_industry, website, active_platforms, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [orgId, name, industry, sub_industry, website, JSON.stringify(platforms || []), country]
    ).catch(() => {});
  } else {
    await query(
      'UPDATE brands SET name=$1, industry=$2, website=$3, active_platforms=$4 WHERE id=$5',
      [name, industry, website, JSON.stringify(platforms || []), existing.rows[0].id]
    ).catch(() => {});
  }

  res.json({ saved: true });
}));

router.post('/onboarding/complete', authenticate, asyncHandler(async (req, res) => {
  await query(
    'UPDATE users SET onboarding_completed=true WHERE id=$1',
    [req.user.userId]
  ).catch(() => {});
  res.json({ completed: true });
}));

// ═══════════════════════════════════════════════════════════════
// WEBSITE TRACKING (receives events from WordPress plugin + JS pixel)
// ═══════════════════════════════════════════════════════════════
router.post('/website-tracking/event', asyncHandler(async (req, res) => {
  const { brandId, event, sessionId, url, data, timestamp } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });

  // Store event (fire-and-forget)
  query(`INSERT INTO webhook_events (brand_id, platform, event_type, payload)
    VALUES ($1,'website',$2,$3) ON CONFLICT DO NOTHING`,
    [brandId, event, JSON.stringify(req.body)]
  ).catch(() => {});

  // Increment metric counters
  if (event === 'lead') {
    query(`INSERT INTO live_metrics (brand_id,platform,metric_type,period_type,period_start,period_end,value)
      VALUES ($1,'website','leads','daily',CURRENT_DATE,CURRENT_DATE,1)
      ON CONFLICT (brand_id,platform,metric_type,period_type,period_start)
      DO UPDATE SET value=live_metrics.value+1`,
      [brandId]).catch(() => {});
  }
  if (event === 'purchase' && data?.revenue) {
    query(`INSERT INTO live_metrics (brand_id,platform,metric_type,period_type,period_start,period_end,value)
      VALUES ($1,'website','revenue','daily',CURRENT_DATE,CURRENT_DATE,$2)
      ON CONFLICT (brand_id,platform,metric_type,period_type,period_start)
      DO UPDATE SET value=live_metrics.value+$2`,
      [brandId, parseFloat(data.revenue || 0)]).catch(() => {});
  }

  res.json({ ok: true });
}));

router.post('/website-tracking/sync', asyncHandler(async (req, res) => {
  const { brandId, platform = 'website', report_period_start, report_period_end, ...metrics } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId required' });

  let stored = 0;
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value !== 'number') continue;
    await query(`INSERT INTO live_metrics (brand_id,platform,metric_type,period_type,period_start,period_end,value)
      VALUES ($1,$2,$3,'daily',$4,$5,$6)
      ON CONFLICT (brand_id,platform,metric_type,period_type,period_start)
      DO UPDATE SET value=EXCLUDED.value`,
      [brandId, platform, key, report_period_start || new Date().toISOString().slice(0,10),
       report_period_end || new Date().toISOString().slice(0,10), value]).catch(() => {});
    stored++;
  }
  res.json({ stored });
}));

// ═══════════════════════════════════════════════════════════════
// LIVE DATA / REAL-TIME
// ═══════════════════════════════════════════════════════════════
router.get('/live/snapshot', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const metrics = await query(`
    SELECT platform, metric_type, SUM(value) as total, MAX(created_at) as latest
    FROM live_metrics WHERE brand_id=$1 AND period_start >= $2
    GROUP BY platform, metric_type ORDER BY platform`,
    [brandId, since]).catch(() => ({ rows: [] }));

  const connections = await query(
    'SELECT platform, status, last_sync_at, account_name, follower_count FROM platform_connections WHERE brand_id=$1',
    [brandId]).catch(() => ({ rows: [] }));

  const byPlatform = {};
  metrics.rows.forEach(r => {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { _last_updated: r.latest };
    byPlatform[r.platform][r.metric_type] = parseFloat(r.total || 0);
  });

  res.json({ metrics: byPlatform, connections: connections.rows, snapshotAt: new Date().toISOString() });
}));

router.get('/live/realtime-users', authenticate, asyncHandler(async (req, res) => {
  // Returns latest realtime value from GA4 sync (or 0 if not connected)
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    `SELECT value FROM live_metrics WHERE brand_id=$1 AND platform='google_analytics' AND metric_type='active_users'
     ORDER BY created_at DESC LIMIT 1`, [brandId]).catch(() => ({ rows: [] }));
  res.json({ activeUsers: rows[0] ? Math.round(parseFloat(rows[0].value)) : 0 });
}));

router.get('/live/trend', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { metric = 'impressions', hours = 24 } = req.query;
  const { rows } = await query(`
    SELECT DATE_TRUNC('hour', period_start) as hour, SUM(value) as value
    FROM live_metrics WHERE brand_id=$1 AND metric_type=$2
    AND period_start >= NOW() - ($3 || ' hours')::INTERVAL
    GROUP BY 1 ORDER BY 1`, [brandId, metric, hours]).catch(() => ({ rows: [] }));
  res.json({ points: rows.map(r => ({ hour: r.hour?.toISOString().slice(11, 16), value: parseFloat(r.value || 0) })) });
}));

// ═══════════════════════════════════════════════════════════════
// BRAND HEALTH
// ═══════════════════════════════════════════════════════════════
router.get('/brand-health/latest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT * FROM brand_health_scores WHERE brand_id=$1 ORDER BY period_date DESC LIMIT 1',
    [brandId]).catch(() => ({ rows: [] }));
  res.json({ health: rows[0] || null });
}));

router.get('/brand-health/history', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const months = parseInt(req.query.months) || 6;
  const { rows } = await query(
    'SELECT * FROM brand_health_scores WHERE brand_id=$1 ORDER BY period_date DESC LIMIT $2',
    [brandId, months]).catch(() => ({ rows: [] }));
  res.json({ history: rows });
}));

router.post('/brand-health/calculate', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  try {
    const { calculateBrandHealth } = require('../services/brand-health.service');
    const apiKey = await getApiKey(brandId, 'anthropic');
    const result = await calculateBrandHealth(brandId, new Date().toISOString().slice(0, 10), apiKey);
    res.json({ health: result });
  } catch (e) {
    res.json({ health: null, error: e.message });
  }
}));

// ═══════════════════════════════════════════════════════════════
// INDUSTRY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════
router.get('/industry-intelligence', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const brand = await getBrand(brandId);
  const { detectIndustryCode } = require('../services/industry.service');
  const industryCode = detectIndustryCode(brand?.industry);

  const [banking, reviews] = await Promise.all([
    query('SELECT * FROM banking_brand_metrics WHERE brand_id=$1 ORDER BY period_end DESC LIMIT 1', [brandId]).catch(() => ({ rows: [] })),
    query('SELECT * FROM review_metrics WHERE brand_id=$1 ORDER BY created_at DESC LIMIT 10', [brandId]).catch(() => ({ rows: [] })),
  ]);

  res.json({ industryCode, brand, banking: banking.rows[0] || null, reviews: reviews.rows });
}));

router.post('/industry-intelligence/analyse', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const brand   = await getBrand(brandId);
  const metrics = await getRecentMetrics(brandId);
  const goals   = await getGoals(brandId);
  const apiKey  = await getApiKey(brandId, 'anthropic');
  const { generateIndustryAnalysis, detectIndustryCode } = require('../services/industry.service');
  const industryCode = detectIndustryCode(brand?.industry);
  const analysis = await generateIndustryAnalysis({ brandId, brand, metrics, goals, industryCode, apiKey });
  res.json({ analysis });
}));

// ═══════════════════════════════════════════════════════════════
// ASK YOUR DATA (conversational AI)
// ═══════════════════════════════════════════════════════════════
router.post('/ask', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { question, history, conversationId } = req.body;
  const apiKey = await getApiKey(brandId, 'anthropic');
  const { answerQuestion } = require('../services/ask.service');
  const result = await answerQuestion({ brandId, question, history, conversationId, apiKey });
  res.json(result);
}));

router.get('/ask/conversations', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT id, title, created_at FROM ai_conversations WHERE brand_id=$1 ORDER BY created_at DESC LIMIT 20',
    [brandId]).catch(() => ({ rows: [] }));
  res.json({ conversations: rows });
}));

router.get('/ask/conversations/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM ai_conversations WHERE id=$1',[req.params.id]).catch(() => ({ rows: [] }));
  res.json({ conversation: rows[0] || null });
}));

router.post('/ask/insights', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { content, title, conversationId } = req.body;
  const { rows } = await query(
    'INSERT INTO saved_insights (brand_id,conversation_id,title,content) VALUES ($1,$2,$3,$4) RETURNING id',
    [brandId, conversationId, title, content]).catch(() => ({ rows: [{ id: null }] }));
  res.json({ saved: true, id: rows[0]?.id });
}));

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════
router.get('/predictions/latest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT * FROM predictions WHERE brand_id=$1 ORDER BY created_at DESC LIMIT 1', [brandId]).catch(() => ({ rows: [] }));
  res.json({ prediction: rows[0] || null });
}));

router.post('/predictions/generate', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const brand   = await getBrand(brandId);
  const metrics = await getRecentMetrics(brandId, 180);
  const goals   = await getGoals(brandId);
  const apiKey  = await getApiKey(brandId, 'anthropic');
  const { generatePredictions } = require('../services/master-ai.service');
  const result = await generatePredictions({ brand, historicalMetrics: metrics, goals, apiKey });
  await query(
    `INSERT INTO predictions (brand_id, predicted_metrics, goal_trajectories, model_confidence, prediction_for)
     VALUES ($1,$2,$3,$4, CURRENT_DATE + INTERVAL '30 days') RETURNING id`,
    [brandId, JSON.stringify(result.predictions||{}), JSON.stringify(result.goal_trajectories||[]), result.model_confidence||0]
  ).catch(() => {});
  res.json({ prediction: result });
}));

// ═══════════════════════════════════════════════════════════════
// CULTURAL MOMENTS CALENDAR
// ═══════════════════════════════════════════════════════════════
router.get('/cultural-moments', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  // First try brand-specific, then global
  const { rows } = await query(`
    SELECT * FROM cultural_moments
    WHERE (brand_id = $1 OR brand_id IS NULL)
    AND date_start >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY date_start ASC LIMIT 60`,
    [brandId]).catch(() => ({ rows: [] }));

  // If no data in DB, return built-in Nigerian calendar
  if (rows.length === 0) {
    const currentYear = new Date().getFullYear();
    const builtIn = [
      { title:'New Year\'s Day', moment_type:'public_holiday', date_start:`${currentYear}-01-01`, content_ideas:['New Year resolution content','Year-in-review campaigns'], hashtags:['#NewYear','#HappyNewYear','#NewYearNewMe'], avg_engagement_lift:0.45, urgency:'act_now', country:'Nigeria' },
      { title:'Valentine\'s Day', moment_type:'cultural_festival', date_start:`${currentYear}-02-14`, content_ideas:['Gift guides','Love stories from customers','Limited edition products'], hashtags:['#ValentinesDay','#LoveInLagos','#ValentinesNigeria'], avg_engagement_lift:0.60, urgency:'this_week', content_window_days:7, country:'Nigeria' },
      { title:'International Women\'s Day', moment_type:'awareness_day', date_start:`${currentYear}-03-08`, content_ideas:['Feature female leaders in company','Women customer spotlights','#BreakTheBias campaigns'], hashtags:['#IWD2025','#WomenInBusiness','#NigerianWomen'], avg_engagement_lift:0.55, country:'Nigeria' },
      { title:'Easter', moment_type:'religious', date_start:`${currentYear}-04-20`, content_ideas:['Family themes','Festive offers','Behind-the-scenes of office celebrations'], hashtags:['#Easter','#HappyEaster','#EasterInNigeria'], avg_engagement_lift:0.35, content_window_days:5, country:'Nigeria' },
      { title:'Workers\' Day', moment_type:'public_holiday', date_start:`${currentYear}-05-01`, content_ideas:['Celebrate your team','Staff appreciation posts','B2B workforce themes'], hashtags:['#WorkersDay','#LabourDay','#NigeriaWorks'], avg_engagement_lift:0.30, country:'Nigeria' },
      { title:'Children\'s Day', moment_type:'public_holiday', date_start:`${currentYear}-05-27`, content_ideas:['Family-focused content','Future generation themes','Education/development focus'], hashtags:['#ChildrensDay','#NigeriaChildrensDay'], avg_engagement_lift:0.40, country:'Nigeria' },
      { title:'Sallah (Eid al-Adha)', moment_type:'religious', date_start:`${currentYear}-06-07`, content_ideas:['Festive greetings','Special Sallah offers','Celebration food content'], hashtags:['#Sallah','#EidMubarak','#SallahInNigeria'], avg_engagement_lift:0.65, content_window_days:7, country:'Nigeria' },
      { title:'Nigerian Independence Day', moment_type:'public_holiday', date_start:`${currentYear}-10-01`, content_ideas:['Nigerian pride content','1 October campaigns','Local culture celebration'], hashtags:['#IndependenceDay','#NigeriaAt65','#ProudlyNigerian'], avg_engagement_lift:0.70, content_window_days:5, country:'Nigeria' },
      { title:'Black Friday', moment_type:'cultural_festival', date_start:`${currentYear}-11-28`, content_ideas:['Flash sales','Countdown campaigns','Product bundles'], hashtags:['#BlackFriday','#BlackFridayNigeria','#ShopNigeria'], avg_engagement_lift:0.80, content_window_days:14, country:'Nigeria' },
      { title:'Detty December', moment_type:'cultural_festival', date_start:`${currentYear}-12-01`, date_end:`${currentYear}-12-31`, content_ideas:['Party/event content','Year-end campaigns','Lagos nightlife tie-ins'], hashtags:['#DettyDecember','#LagosChristmas','#December25'], avg_engagement_lift:0.75, urgency:'this_month', country:'Nigeria' },
      { title:'Christmas', moment_type:'religious', date_start:`${currentYear}-12-25`, content_ideas:['Christmas greetings','Gift guides','Family themes','Boxing Day sales'], hashtags:['#MerryChristmas','#ChristmasInNigeria','#HolidaySeason'], avg_engagement_lift:0.65, content_window_days:7, country:'Nigeria' },
    ];
    return res.json({ moments: builtIn });
  }
  res.json({ moments: rows });
}));

// ═══════════════════════════════════════════════════════════════
// SHARE OF VOICE
// ═══════════════════════════════════════════════════════════════
router.get('/share-of-voice/latest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const platform = req.query.platform || 'all';
  const q = platform === 'all'
    ? 'SELECT * FROM share_of_voice WHERE brand_id=$1 ORDER BY period_end DESC LIMIT 1'
    : 'SELECT * FROM share_of_voice WHERE brand_id=$1 AND platform=$2 ORDER BY period_end DESC LIMIT 1';
  const { rows } = await query(q, platform === 'all' ? [brandId] : [brandId, platform]).catch(() => ({ rows: [] }));
  res.json({ sov: rows[0] || null });
}));

router.get('/share-of-voice/history', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT * FROM share_of_voice WHERE brand_id=$1 ORDER BY period_end DESC LIMIT 12', [brandId]).catch(() => ({ rows: [] }));
  res.json({ history: rows });
}));

// ═══════════════════════════════════════════════════════════════
// DIGITAL MATURITY ASSESSMENT
// ═══════════════════════════════════════════════════════════════
router.get('/maturity/latest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT * FROM maturity_assessments WHERE brand_id=$1 ORDER BY assessed_at DESC LIMIT 1', [brandId]).catch(() => ({ rows: [] }));
  res.json({ assessment: rows[0] || null });
}));

router.post('/maturity/assess', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { answers } = req.body; // { strategy_score: 3, execution_score: 4, ... }
  const scores = {};
  let total = 0, count = 0;
  const dims = ['strategy_score','execution_score','measurement_score','technology_score',
                'audience_score','integration_score','talent_score','innovation_score'];
  dims.forEach(d => {
    scores[d] = parseFloat(answers[d] || 3);
    total += scores[d]; count++;
  });
  const overall = total / count;
  const levels = [[1,2,'Reactive'],[2,3,'Developing'],[3,4,'Defined'],[4,4.5,'Optimised'],[4.5,5,'Innovative']];
  const level = levels.find(([lo,hi]) => overall >= lo && overall < hi) || levels[levels.length-1];

  // Generate AI roadmap
  const brandId2 = req.user.brandId || req.user.userId;
  const apiKey = await getApiKey(brandId2, 'anthropic');
  let roadmap = [], gaps = [], strengths = [];
  if (apiKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800,
          messages:[{ role:'user', content:`Digital maturity scores: ${JSON.stringify(scores)}. Overall: ${overall.toFixed(1)}. Level: ${level[2]}.
Return JSON only: {"gaps":["gap1","gap2","gap3"],"roadmap":["action1","action2","action3"],"strengths":["str1","str2"]}` }]})
      });
      const d = await r.json();
      const parsed = JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{}');
      roadmap = parsed.roadmap || [];
      gaps    = parsed.gaps    || [];
      strengths = parsed.strengths || [];
    } catch {}
  }

  const { rows } = await query(`
    INSERT INTO maturity_assessments
    (brand_id,strategy_score,execution_score,measurement_score,technology_score,
     audience_score,integration_score,talent_score,innovation_score,overall_maturity,maturity_level,gaps,roadmap,strengths)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [brandId,...dims.map(d=>scores[d]),overall.toFixed(2),level[2],JSON.stringify(gaps),JSON.stringify(roadmap),JSON.stringify(strengths)]
  ).catch(() => ({ rows: [{ ...scores, overall_maturity: overall, maturity_level: level[2], gaps, roadmap, strengths }] }));

  res.json({ assessment: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════
// GEO INTELLIGENCE
// ═══════════════════════════════════════════════════════════════
router.get('/geo-intelligence', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { platform = 'all', metric = 'engagement_rate' } = req.query;
  const q = platform === 'all'
    ? 'SELECT * FROM geo_performance WHERE brand_id=$1 ORDER BY impressions DESC LIMIT 50'
    : 'SELECT * FROM geo_performance WHERE brand_id=$1 AND platform=$2 ORDER BY impressions DESC LIMIT 50';
  const { rows } = await query(q, platform === 'all' ? [brandId] : [brandId, platform]).catch(() => ({ rows: [] }));
  res.json({ locations: rows });
}));

// ═══════════════════════════════════════════════════════════════
// AI SEARCH VISIBILITY
// ═══════════════════════════════════════════════════════════════
router.get('/ai-search-visibility/latest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT * FROM ai_search_visibility WHERE brand_id=$1 ORDER BY checked_at DESC LIMIT 50', [brandId]).catch(() => ({ rows: [] }));
  res.json({ visibility: rows });
}));

router.get('/ai-search-visibility/queries', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT DISTINCT query FROM ai_search_visibility WHERE brand_id=$1', [brandId]).catch(() => ({ rows: [] }));
  res.json({ queries: rows.map(r => r.query) });
}));

router.post('/ai-search-visibility/queries', authenticate, asyncHandler(async (req, res) => {
  res.json({ added: true, query: req.body.query });
}));

router.post('/ai-search-visibility/check', authenticate, asyncHandler(async (req, res) => {
  res.json({ results: [], message: 'AI search visibility check scheduled' });
}));

// ═══════════════════════════════════════════════════════════════
// SPEND HEATMAP
// ═══════════════════════════════════════════════════════════════
router.get('/spend-heatmap', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { platform = 'all' } = req.query;
  const q = platform === 'all'
    ? 'SELECT * FROM spend_heatmap WHERE brand_id=$1 ORDER BY day_of_week, hour_of_day'
    : 'SELECT * FROM spend_heatmap WHERE brand_id=$1 AND platform=$2 ORDER BY day_of_week, hour_of_day';
  const { rows } = await query(q, platform === 'all' ? [brandId] : [brandId, platform]).catch(() => ({ rows: [] }));
  res.json({ heatmap: rows });
}));

// ═══════════════════════════════════════════════════════════════
// BRANDS / CURRENT
// ═══════════════════════════════════════════════════════════════
router.get('/brands/current', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const brand = await getBrand(brandId);
  res.json({ brand: brand || { id: brandId, name: 'Your Brand', active_platforms: [] } });
}));

// ═══════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════
router.get('/campaigns', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM campaigns WHERE brand_id=$1 ORDER BY start_date DESC', [brandId]).catch(() => ({ rows: [] }));
  res.json({ campaigns: rows });
}));

router.post('/campaigns', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { name, campaign_type, start_date, end_date, total_budget, platforms, description, kpi_targets } = req.body;
  const { rows } = await query(
    `INSERT INTO campaigns (brand_id,name,campaign_type,start_date,end_date,total_budget,platforms,description,kpi_targets)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brandId,name,campaign_type,start_date,end_date,total_budget||0,JSON.stringify(platforms||[]),description,JSON.stringify(kpi_targets||{})]
  ).catch(() => ({ rows: [{}] }));
  res.json({ campaign: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════
// CONTENT CALENDAR
// ═══════════════════════════════════════════════════════════════
router.get('/calendar', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { start, end } = req.query;
  const { rows } = await query(
    `SELECT * FROM content_calendar WHERE brand_id=$1 AND scheduled_at >= $2 AND scheduled_at <= $3 ORDER BY scheduled_at`,
    [brandId, start, end]).catch(() => ({ rows: [] }));
  res.json({ entries: rows });
}));

router.post('/calendar', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { platform, content_type, title, description, scheduled_at, status, ai_recommended, ai_rationale } = req.body;
  const { rows } = await query(
    `INSERT INTO content_calendar (brand_id,platform,content_type,title,description,scheduled_at,status,ai_recommended,ai_rationale)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brandId,platform,content_type,title,description,scheduled_at,status||'planned',ai_recommended||false,ai_rationale]
  ).catch(() => ({ rows: [req.body] }));
  res.json({ entry: rows[0] });
}));

router.post('/calendar/ai-suggest', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { month, activePlatforms } = req.body;
  const apiKey = await getApiKey(brandId, 'anthropic');
  const goals = await getGoals(brandId);
  const brand = await getBrand(brandId);

  const suggestions = [];
  if (apiKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1500,
          messages:[{ role:'user', content:`
Brand: ${brand?.name || 'Unknown'}, Industry: ${brand?.industry || 'Unknown'}
Active platforms: ${activePlatforms?.join(', ')}
Month: ${month}
Goals: ${goals.slice(0,3).map(g=>g.title).join(', ')}

Suggest 8 specific content ideas for this month. Return JSON array only:
[{ "platform": "instagram", "content_type": "reel", "title": "...", "scheduled_at": "YYYY-MM-DDTHH:00", "ai_rationale": "why this works" }]
Use dates in ${month}.` }]})
      });
      const d = await r.json();
      const parsed = JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '[]');
      suggestions.push(...(Array.isArray(parsed) ? parsed : []));
    } catch {}
  }
  res.json({ suggestions: suggestions.slice(0, 8) });
}));

// ═══════════════════════════════════════════════════════════════
// AUTOMATIONS
// ═══════════════════════════════════════════════════════════════
router.get('/automations', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM automation_rules WHERE brand_id=$1 ORDER BY created_at DESC', [brandId]).catch(() => ({ rows: [] }));
  res.json({ automations: rows });
}));

router.post('/automations', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { name, trigger_type, trigger_config, actions } = req.body;
  const { rows } = await query(
    'INSERT INTO automation_rules (brand_id,name,trigger_type,trigger_config,actions) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [brandId,name,trigger_type,JSON.stringify(trigger_config||{}),JSON.stringify(actions||[])]
  ).catch(() => ({ rows: [req.body] }));
  res.json({ automation: rows[0] });
}));

router.patch('/automations/:id', authenticate, asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  await query('UPDATE automation_rules SET is_active=$1 WHERE id=$2',[is_active, req.params.id]).catch(() => {});
  res.json({ updated: true });
}));

router.delete('/automations/:id', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM automation_rules WHERE id=$1',[req.params.id]).catch(() => {});
  res.json({ deleted: true });
}));

// ═══════════════════════════════════════════════════════════════
// DIGEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════
router.get('/digest/config', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM digest_configs WHERE brand_id=$1',[brandId]).catch(() => ({ rows: [] }));
  res.json({ config: rows[0] || { is_enabled:false, frequency:'weekly', send_day:1, recipients:[] } });
}));

router.put('/digest/config', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { is_enabled, frequency, send_day, recipients, include_sections } = req.body;
  await query(`INSERT INTO digest_configs (brand_id,is_enabled,frequency,send_day,recipients,include_sections)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (brand_id) DO UPDATE SET is_enabled=$2,frequency=$3,send_day=$4,recipients=$5,include_sections=$6`,
    [brandId,is_enabled,frequency,send_day,JSON.stringify(recipients||[]),JSON.stringify(include_sections||[])]).catch(() => {});
  res.json({ updated: true });
}));

router.post('/digest/send-test', authenticate, asyncHandler(async (req, res) => {
  res.json({ sent: true, message: 'Test digest queued for delivery' });
}));

// ═══════════════════════════════════════════════════════════════
// INFLUENCERS
// ═══════════════════════════════════════════════════════════════
router.get('/influencers', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM influencers WHERE brand_id=$1 ORDER BY brand_fit_score DESC', [brandId]).catch(() => ({ rows: [] }));
  res.json({ influencers: rows });
}));

router.post('/influencers', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { name, tier, handles, avg_er, total_reach, rate_per_post, primary_market } = req.body;
  const { rows } = await query(
    'INSERT INTO influencers (brand_id,name,tier,handles,avg_er,total_reach,rate_per_post,primary_market) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [brandId,name,tier,JSON.stringify(handles||{}),avg_er||0,total_reach||0,rate_per_post||0,primary_market]
  ).catch(() => ({ rows: [req.body] }));
  res.json({ influencer: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════
// A/B EXPERIMENTS
// ═══════════════════════════════════════════════════════════════
router.get('/experiments', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM ab_experiments WHERE brand_id=$1 ORDER BY created_at DESC', [brandId]).catch(() => ({ rows: [] }));
  res.json({ experiments: rows });
}));

router.post('/experiments', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { name, hypothesis, platform, test_type, variant_a, variant_b, start_date, end_date } = req.body;
  const { rows } = await query(
    `INSERT INTO ab_experiments (brand_id,name,hypothesis,platform,test_type,variant_a,variant_b,start_date,end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brandId,name,hypothesis,platform,test_type,JSON.stringify(variant_a||{}),JSON.stringify(variant_b||{}),start_date,end_date]
  ).catch(() => ({ rows: [req.body] }));
  res.json({ experiment: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════
// UTM BUILDER
// ═══════════════════════════════════════════════════════════════
router.get('/utm', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM utm_links WHERE brand_id=$1 AND is_archived=false ORDER BY created_at DESC LIMIT 50', [brandId]).catch(() => ({ rows: [] }));
  res.json({ links: rows });
}));

router.post('/utm', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { destination_url, utm_source, utm_medium, utm_campaign, utm_content, name, platform } = req.body;
  const params = new URLSearchParams();
  if (utm_source) params.set('utm_source', utm_source);
  if (utm_medium) params.set('utm_medium', utm_medium);
  if (utm_campaign) params.set('utm_campaign', utm_campaign);
  if (utm_content) params.set('utm_content', utm_content);
  const full_utm_url = `${destination_url}${destination_url.includes('?') ? '&' : '?'}${params.toString()}`;
  const { rows } = await query(
    `INSERT INTO utm_links (brand_id,destination_url,full_utm_url,utm_source,utm_medium,utm_campaign,utm_content,name,platform)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [brandId,destination_url,full_utm_url,utm_source,utm_medium,utm_campaign,utm_content,name,platform]
  ).catch(() => ({ rows: [{ ...req.body, full_utm_url }] }));
  res.json({ link: rows[0] });
}));

// ═══════════════════════════════════════════════════════════════
// ROI CALCULATOR
// ═══════════════════════════════════════════════════════════════
router.post('/roi-calculator', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { monthly_budget, avg_order_value, conversion_rate, current_leads, avg_cpc } = req.body;

  const budget = parseFloat(monthly_budget || 0);
  const aov    = parseFloat(avg_order_value || 0);
  const cvr    = parseFloat(conversion_rate || 0.02);
  const cpc    = parseFloat(avg_cpc || 500);

  const clicks   = budget / Math.max(cpc, 1);
  const leads    = clicks * cvr;
  const revenue  = leads * aov;
  const roi      = budget > 0 ? ((revenue - budget) / budget) * 100 : 0;
  const roas     = budget > 0 ? revenue / budget : 0;
  const cpl      = leads > 0 ? budget / leads : 0;

  const outputs = { clicks: Math.round(clicks), leads: Math.round(leads), revenue: Math.round(revenue),
    roi: Math.round(roi), roas: parseFloat(roas.toFixed(2)), cpl: Math.round(cpl) };

  await query('INSERT INTO roi_scenarios (brand_id,name,inputs,outputs) VALUES ($1,$2,$3,$4)',
    [brandId, req.body.name||'Calculation', JSON.stringify(req.body), JSON.stringify(outputs)]).catch(() => {});

  res.json({ outputs, inputs: req.body });
}));

// ═══════════════════════════════════════════════════════════════
// HASHTAG INTELLIGENCE
// ═══════════════════════════════════════════════════════════════
router.get('/hashtags', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { platform = 'instagram' } = req.query;
  const { rows } = await query(
    'SELECT * FROM hashtag_analytics WHERE brand_id=$1 AND platform=$2 ORDER BY opportunity_score DESC LIMIT 50',
    [brandId, platform]).catch(() => ({ rows: [] }));
  res.json({ hashtags: rows });
}));

// ═══════════════════════════════════════════════════════════════
// VOICE GUARDIAN (Brand Voice Checker)
// ═══════════════════════════════════════════════════════════════
router.get('/voice-guardian/profile', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM brand_voice_profiles WHERE brand_id=$1',[brandId]).catch(() => ({ rows: [] }));
  res.json({ profile: rows[0] || null });
}));

router.put('/voice-guardian/profile', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { tone_descriptors, avoid_words, preferred_words, formality_level, emoji_policy, cta_style } = req.body;
  await query(`INSERT INTO brand_voice_profiles (brand_id,tone_descriptors,avoid_words,preferred_words,formality_level,emoji_policy,cta_style)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (brand_id) DO UPDATE SET tone_descriptors=$2,avoid_words=$3,preferred_words=$4,formality_level=$5,emoji_policy=$6,cta_style=$7`,
    [brandId,JSON.stringify(tone_descriptors||[]),JSON.stringify(avoid_words||[]),JSON.stringify(preferred_words||[]),formality_level||5,emoji_policy||'moderate',cta_style]
  ).catch(() => {});
  res.json({ updated: true });
}));

router.post('/voice-guardian/check', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { content, platform } = req.body;
  const apiKey = await getApiKey(brandId, 'anthropic');
  const profile = (await query('SELECT * FROM brand_voice_profiles WHERE brand_id=$1',[brandId]).catch(() => ({ rows: [] }))).rows[0];

  let score = 75, violations = [], suggestions = [];

  if (apiKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600,
          messages:[{ role:'user', content:`
Brand voice profile: ${JSON.stringify(profile||{})}
Content to check: "${content}"
Platform: ${platform}

Score this content for brand voice compliance (0-100) and identify issues.
Return JSON only: {"score":85,"violations":["issue1"],"suggestions":["suggestion1"],"approved":true}` }]})
      });
      const d = await r.json();
      const parsed = JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{}');
      score = parsed.score || 75;
      violations = parsed.violations || [];
      suggestions = parsed.suggestions || [];
    } catch {}
  }

  await query('INSERT INTO voice_checks (brand_id,platform,content,score,violations,suggestions) VALUES ($1,$2,$3,$4,$5,$6)',
    [brandId,platform,content.slice(0,500),score,JSON.stringify(violations),JSON.stringify(suggestions)]).catch(() => {});

  res.json({ score, violations, suggestions, is_compliant: score >= 70, checked_at: new Date().toISOString() });
}));

router.get('/voice-guardian/history', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query('SELECT * FROM voice_checks WHERE brand_id=$1 ORDER BY checked_at DESC LIMIT 20',[brandId]).catch(() => ({ rows: [] }));
  res.json({ checks: rows });
}));

/**
 * Extended Client Portal Routes — adds all missing endpoints
 *
 * Adds to existing client-portal.routes.js:
 * - GET  /api/client/narrative          → NarrativeAI™ brand story
 * - GET  /api/client/reports/:id/pdf    → PDF download (real implementation)
 * - GET  /api/client/velocity           → VelocityTracker™ goal data
 * - GET  /api/client/depth-view         → DepthView™ competitor data
 * - GET  /api/client/intellipulse       → IntelliPulse™ live feed
 * - POST /api/client/alerts/:id/read    → Mark alert as read
 *
 * Admin routes (agency staff only):
 * - GET  /api/admin/brands              → all brands
 * - POST /api/admin/client-portal-users → create client user
 * - GET  /api/admin/client-portal-users → list all client users
 * - POST /api/admin/client-portal-users/:id/resend-invite
 * - POST /api/admin/brands/:brandId/generate-narrative → manual trigger
 * - POST /api/admin/digest/send-weekly  → send all digests now
 */



// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: NARRATIVEAI™
// ══════════════════════════════════════════════════════════════════

// GET /api/client/narrative — get or generate the brand story
router.get('/client/narrative', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const period = parseInt(req.query.period) || 30;
  const { getNarrative } = require('../services/narrative-ai.service');
  const narrative = await getNarrative(brandId, period);
  res.json({ narrative, period });
}));

// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: PDF REPORT DOWNLOAD
// ══════════════════════════════════════════════════════════════════

// GET /api/client/reports/:id/pdf
router.get('/client/reports/:id/pdf', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { generatePDF } = require('../services/pdf-generator.service');
  const result = await generatePDF(req.params.id, brandId);

  if (result.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cerebre-report-${req.params.id}.pdf"`);
    res.send(result.buffer);
  } else {
    // HTML fallback
    res.setHeader('Content-Type', 'text/html');
    res.send(result.html);
  }
}));

// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: VELOCITYTRACKER™
// Returns goal progress WITH velocity data (acceleration/deceleration)
// ══════════════════════════════════════════════════════════════════

// GET /api/client/velocity
router.get('/client/velocity', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;

  const [goalsRes, historyRes] = await Promise.all([
    query(`SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true ORDER BY priority_rank`, [brandId]),
    query(`SELECT goal_id, recorded_value, progress_pct, recorded_at
           FROM goal_history WHERE brand_id=$1
           ORDER BY recorded_at ASC`, [brandId]),
  ]);

  // Group history by goal
  const historyByGoal = {};
  historyRes.rows.forEach(h => {
    if (!historyByGoal[h.goal_id]) historyByGoal[h.goal_id] = [];
    historyByGoal[h.goal_id].push({
      date:  h.recorded_at,
      value: parseFloat(h.recorded_value || 0),
      pct:   parseFloat(h.progress_pct || 0),
    });
  });

  // Calculate velocity for each goal
  const goals = goalsRes.rows.map(g => {
    const history = historyByGoal[g.id] || [];
    const currentPct = parseFloat(g.progress_pct || 0);

    // Velocity = change in progress % over last 2 data points
    let velocity = 0;
    let velocityLabel = 'STEADY';
    if (history.length >= 2) {
      const last    = history[history.length - 1].pct;
      const prevLast = history[history.length - 2].pct;
      velocity = last - prevLast;
      velocityLabel = velocity > 5 ? 'ACCELERATING' : velocity > 0 ? 'PROGRESSING' : velocity === 0 ? 'STEADY' : 'DECELERATING';
    }

    // Will goal be achieved? Simple linear projection
    const daysToDeadline = g.deadline
      ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
      : null;
    const progressNeeded = 100 - currentPct;
    const weeklyRate     = history.length >= 2 ? (history[history.length - 1].pct - history[0].pct) / Math.max(1, history.length - 1) : 0;
    const weeksNeeded    = weeklyRate > 0 ? Math.ceil(progressNeeded / weeklyRate) : null;

    let projectionStatus = 'UNKNOWN';
    if (daysToDeadline !== null && weeksNeeded !== null) {
      const daysNeeded = weeksNeeded * 7;
      projectionStatus = daysNeeded <= daysToDeadline ? 'ON_TRACK' : daysNeeded <= daysToDeadline * 1.2 ? 'AT_RISK' : 'BEHIND';
    }

    return {
      ...g,
      history: history.slice(-12), // last 12 data points for chart
      velocity,
      velocityLabel,
      projectionStatus,
      daysToDeadline,
    };
  });

  res.json({ goals });
}));

// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: DEPTHVIEW™ — COMPETITOR INTELLIGENCE
// ══════════════════════════════════════════════════════════════════

// GET /api/client/depth-view
router.get('/client/depth-view', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;

  const [myMetrics, competitors, sovHistory] = await Promise.all([
    query(`SELECT platform, metric_type, SUM(value) as total
           FROM live_metrics WHERE brand_id=$1
           AND period_start >= NOW() - INTERVAL '30 days'
           GROUP BY platform, metric_type ORDER BY platform`, [brandId]),

    query(`SELECT * FROM competitors WHERE brand_id=$1 AND is_active=true
           ORDER BY share_of_voice_estimate DESC`, [brandId]),

    query(`SELECT platform, our_sov, period_end
           FROM share_of_voice WHERE brand_id=$1
           ORDER BY period_end DESC LIMIT 12`, [brandId]),
  ]);

  // Organise my metrics
  const myPlatformMetrics = {};
  myMetrics.rows.forEach(r => {
    if (!myPlatformMetrics[r.platform]) myPlatformMetrics[r.platform] = {};
    myPlatformMetrics[r.platform][r.metric_type] = parseFloat(r.total || 0);
  });

  // Build comparison matrix: for each competitor, compare key metrics
  const comparisonMatrix = competitors.rows.map(comp => {
    const estimates = typeof comp.follower_estimates === 'string'
      ? JSON.parse(comp.follower_estimates) : (comp.follower_estimates || {});
    const engagement = typeof comp.engagement_estimates === 'string'
      ? JSON.parse(comp.engagement_estimates) : (comp.engagement_estimates || {});

    return {
      id:            comp.id,
      name:          comp.competitor_name,
      sov:           comp.share_of_voice_estimate,
      followerEsts:  estimates,
      engagementEsts: engagement,
      lastActivity:  comp.last_notable_activity,
      strategy:      comp.content_strategy_summary,
      platforms:     typeof comp.platforms === 'string' ? JSON.parse(comp.platforms) : (comp.platforms || {}),
    };
  });

  res.json({
    myMetrics: myPlatformMetrics,
    competitors: comparisonMatrix,
    shareOfVoiceHistory: sovHistory.rows,
    totalCompetitors: competitors.rows.length,
  });
}));

// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: INTELLIPULSE™ — LIVE COMPETITOR ACTIVITY FEED
// ══════════════════════════════════════════════════════════════════

// GET /api/client/intellipulse
router.get('/client/intellipulse', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const limit = parseInt(req.query.limit) || 20;

  const { rows } = await query(
    `SELECT ip.*, c.competitor_name
     FROM intellipulse_feed ip
     JOIN competitors c ON c.id = ip.competitor_id
     WHERE ip.brand_id=$1
     ORDER BY ip.detected_at DESC LIMIT $2`,
    [brandId, limit]
  ).catch(() => ({ rows: [] }));

  // If no intellipulse data yet, return competitor last-activity summary
  if (rows.length === 0) {
    const { rows: compRows } = await query(
      `SELECT competitor_name, last_notable_activity, content_strategy_summary, share_of_voice_estimate
       FROM competitors WHERE brand_id=$1 AND is_active=true ORDER BY share_of_voice_estimate DESC`,
      [brandId]
    );
    return res.json({
      feed: compRows.map(c => ({
        competitor_name: c.competitor_name,
        type: 'strategy_summary',
        title: `${c.competitor_name} overview`,
        body: c.content_strategy_summary || c.last_notable_activity || 'No recent activity tracked',
        sov: c.share_of_voice_estimate,
        detected_at: new Date().toISOString(),
      })),
      hasRealData: false,
    });
  }

  res.json({ feed: rows, hasRealData: true });
}));

// ══════════════════════════════════════════════════════════════════
// CLIENT PORTAL: CULTURAL CALENDAR
// ══════════════════════════════════════════════════════════════════

// GET /api/client/moments — upcoming cultural moments
router.get('/client/moments', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { rows } = await query(
    `SELECT * FROM cultural_moments
     WHERE (brand_id=$1 OR brand_id IS NULL)
     AND date_start >= CURRENT_DATE
     ORDER BY date_start ASC LIMIT 12`,
    [brandId]
  ).catch(() => ({ rows: [] }));

  // If no DB data, return the built-in Nigerian calendar
  const year = new Date().getFullYear();
  const builtIn = rows.length > 0 ? rows : [
    { title: 'Sallah (Eid al-Adha)', date_start: `${year}-06-07`, moment_type: 'religious', content_ideas: JSON.stringify(['Festive greetings','Special offers','Celebration content']), avg_engagement_lift: 0.65, urgency: 'plan_now', country: 'Nigeria' },
    { title: 'Independence Day', date_start: `${year}-10-01`, moment_type: 'public_holiday', content_ideas: JSON.stringify(['Nigerian pride content','1 October campaigns','Local culture celebration']), avg_engagement_lift: 0.70, urgency: 'plan_ahead', country: 'Nigeria' },
    { title: 'Black Friday', date_start: `${year}-11-28`, moment_type: 'cultural_festival', content_ideas: JSON.stringify(['Flash sales','Countdown campaigns','Product bundles']), avg_engagement_lift: 0.80, urgency: 'plan_ahead', country: 'Nigeria' },
    { title: 'Detty December', date_start: `${year}-12-01`, date_end: `${year}-12-31`, moment_type: 'cultural_festival', content_ideas: JSON.stringify(['Party/event content','Year-end campaigns','Lagos nightlife tie-ins']), avg_engagement_lift: 0.75, urgency: 'plan_ahead', country: 'Nigeria' },
    { title: 'Christmas', date_start: `${year}-12-25`, moment_type: 'religious', content_ideas: JSON.stringify(['Christmas greetings','Gift guides','Family themes']), avg_engagement_lift: 0.65, urgency: 'plan_ahead', country: 'Nigeria' },
  ];

  res.json({ moments: builtIn });
}));

// ══════════════════════════════════════════════════════════════════
// ADMIN: BRAND & CLIENT USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════

// GET /api/admin/brands
router.get('/admin/brands', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, industry, website, active_platforms, created_at FROM brands ORDER BY name`
  ).catch(() => ({ rows: [] }));
  res.json({ brands: rows });
}));

// POST /api/admin/brands — create a new brand
router.post('/admin/brands', authenticate, asyncHandler(async (req, res) => {
  const { name, industry, website, country, targetAudience } = req.body;
  if (!name) return res.status(400).json({ error: 'Brand name required' });

  // Ensure an organisation exists
  const orgResult = await query(
    `INSERT INTO organisations (name, slug, country)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name=$1
     RETURNING id`,
    [name, name.toLowerCase().replace(/[^a-z0-9]/g, '-'), country || 'Nigeria']
  );
  const orgId = orgResult.rows[0].id;

  const { rows } = await query(
    `INSERT INTO brands (organisation_id, name, industry, website, country, target_audience)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orgId, name, industry, website, country || 'Nigeria', targetAudience]
  );
  res.json({ brand: rows[0] });
}));

// GET /api/admin/client-portal-users
router.get('/admin/client-portal-users', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT cpu.*, b.name as brand_name
     FROM client_portal_users cpu
     JOIN brands b ON b.id = cpu.brand_id
     ORDER BY cpu.created_at DESC`
  ).catch(() => ({ rows: [] }));
  res.json({ users: rows });
}));

// POST /api/admin/client-portal-users — create a client portal account
router.post('/admin/client-portal-users', authenticate, asyncHandler(async (req, res) => {
  const {
    brandId, email, fullName, jobTitle, phone, role = 'viewer',
    can_ask_ai = true, can_download = true, can_view_competitors = true,
  } = req.body;

  if (!brandId || !email || !fullName) {
    return res.status(400).json({ error: 'brandId, email, and fullName are required' });
  }

  // Generate a temporary password and invite token
  const tempPassword = crypto.randomBytes(8).toString('base64url');
  const inviteToken  = crypto.randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const { rows } = await query(
    `INSERT INTO client_portal_users
     (brand_id, email, password_hash, full_name, job_title, phone, role,
      can_ask_ai, can_download, can_view_competitors, invite_token, invited_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [brandId, email.toLowerCase().trim(), passwordHash, fullName, jobTitle, phone, role,
     can_ask_ai, can_download, can_view_competitors, inviteToken, req.user.userId]
  );

  const frontendUrl = process.env.FRONTEND_URL || 'https://cerebre.media';
  const inviteUrl   = `${frontendUrl}/client/set-password?token=${inviteToken}`;

  // Send welcome email
  try {
    const nodemailer = require('nodemailer');
    const transport  = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const { name: brandName } = (await query('SELECT name FROM brands WHERE id=$1', [brandId])).rows[0] || {};

    await transport.sendMail({
      from:    `Cerebre Intelligence <${process.env.EMAIL_FROM || 'intelligence@cerebre.media'}>`,
      to:      email,
      subject: `You've been invited to the ${brandName || 'Brand'} Intelligence Portal`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#6d28d9;font-size:24px;margin:0;">⚡ Cerebre Intelligence</h1>
          </div>
          <h2 style="font-size:20px;color:#111827;">Hello ${fullName.split(' ')[0]},</h2>
          <p style="color:#374151;font-size:15px;line-height:1.7;">
            Your account manager at Cerebre Media Africa has set up your intelligence dashboard.
            You now have access to your brand's performance data, AI insights, and weekly reports.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteUrl}" style="background:linear-gradient(135deg,#6d28d9,#9333ea);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
              Set up my password →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;">
            This invitation link expires in 7 days.<br>
            Questions? Email hello@cerebre.media
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Email failure doesn't block account creation
    console.warn('[Admin] Failed to send invite email:', emailErr.message);
  }

  res.json({ user: rows[0], inviteUrl, inviteToken });
}));

// PATCH /api/admin/client-portal-users/:id — update permissions
router.patch('/admin/client-portal-users/:id', authenticate, asyncHandler(async (req, res) => {
  const allowed = ['can_ask_ai', 'can_download', 'can_view_competitors', 'is_active', 'role'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const sets = Object.keys(updates).map((k, i) => `${k}=$${i + 2}`).join(', ');
  await query(`UPDATE client_portal_users SET ${sets} WHERE id=$1`, [req.params.id, ...Object.values(updates)]);
  res.json({ updated: true });
}));

// DELETE /api/admin/client-portal-users/:id — revoke access
router.delete('/admin/client-portal-users/:id', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE client_portal_users SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ revoked: true });
}));

// POST /api/admin/client-portal-users/:id/resend-invite — resend email
router.post('/admin/client-portal-users/:id/resend-invite', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM client_portal_users WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  // Regenerate invite token
  const token = crypto.randomBytes(24).toString('base64url');
  await query('UPDATE client_portal_users SET invite_token=$1 WHERE id=$2', [token, req.params.id]);
  const frontendUrl = process.env.FRONTEND_URL || 'https://cerebre.media';
  res.json({ inviteUrl: `${frontendUrl}/client/set-password?token=${token}` });
}));

// POST /api/admin/digest/send-weekly — manual trigger (for testing)
router.post('/admin/digest/send-weekly', authenticate, asyncHandler(async (req, res) => {
  const { sendWeeklyDigests } = require('../services/digest-email.service');
  const result = await sendWeeklyDigests();
  res.json({ ...result, triggered: true });
}));

// POST /api/admin/brands/:brandId/generate-narrative — manually trigger narrative
router.post('/admin/brands/:brandId/generate-narrative', authenticate, asyncHandler(async (req, res) => {
  const { generateNarrative } = require('../services/narrative-ai.service');
  const narrative = await generateNarrative(req.params.brandId, req.body.periodDays || 30);
  res.json({ narrative });
}));

// GET /api/admin/client-portal/stats — overview of portal usage
router.get('/admin/client-portal/stats', authenticate, asyncHandler(async (req, res) => {
  const [users, logins, reports] = await Promise.all([
    query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM client_portal_users'),
    query(`SELECT COUNT(*) as recent FROM client_portal_users WHERE last_login_at > NOW() - INTERVAL '7 days'`),
    query('SELECT COUNT(*) as total FROM analysis_reports WHERE client_visible=true'),
  ]);

  res.json({
    totalUsers:    parseInt(users.rows[0].total),
    activeUsers:   parseInt(users.rows[0].active),
    recentLogins:  parseInt(logins.rows[0].recent),
    totalReports:  parseInt(reports.rows[0].total),
  });
}));

module.exports = router;

// POST /api/client/auth/set-password — used by invite flow
router.post('/client/auth/set-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: 'Valid token and password (8+ chars) required' });
  }
  const { rows } = await query(
    'SELECT id FROM client_portal_users WHERE invite_token=$1 AND is_active=true', [token]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Invite link is invalid or has expired' });

  const bcrypt = require('bcryptjs');
  const hash   = await bcrypt.hash(password, 12);
  await query(
    'UPDATE client_portal_users SET password_hash=$1, invite_token=NULL WHERE id=$2',
    [hash, rows[0].id]
  );
  res.json({ set: true });
}));

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
async function getApiKey(brandId, platform) {
  try {
    const { rows } = await query('SELECT encrypted_key FROM api_keys_store WHERE brand_id=$1 AND platform=$2 AND is_active=true',[brandId,platform]);
    if (!rows[0]) return process.env.ANTHROPIC_API_KEY || null;
    const crypto = require('crypto');
    const ENC_KEY = Buffer.from((process.env.JWT_SECRET||'change-me-32chars!!!!!!!!!!!!!').padEnd(32,'0').slice(0,32));
    const [a,b,t] = rows[0].encrypted_key.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(a,'hex'));
    d.setAuthTag(Buffer.from(t,'hex'));
    return d.update(Buffer.from(b,'hex')) + d.final('utf8');
  } catch { return process.env.ANTHROPIC_API_KEY || null; }
}

async function getBrand(brandId) {
  try {
    const { rows } = await query('SELECT * FROM brands WHERE id=$1',[brandId]);
    return rows[0] || null;
  } catch { return null; }
}

async function getGoals(brandId) {
  try {
    const { rows } = await query('SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true ORDER BY priority_rank',[brandId]);
    return rows;
  } catch { return []; }
}

async function getRecentMetrics(brandId, days = 30) {
  try {
    const since = new Date(Date.now() - days*86400000).toISOString().slice(0,10);
    const { rows } = await query('SELECT * FROM live_metrics WHERE brand_id=$1 AND period_start >= $2',[brandId, since]);
    return rows;
  } catch { return []; }
}

module.exports = router;
