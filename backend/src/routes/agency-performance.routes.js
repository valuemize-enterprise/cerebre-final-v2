/**
 * Agency Performance Routes
 * All the routes that power the three new portals:
 * - Agency Staff Portal (/staff/*)
 * - Agency Admin (/agency/*)
 * - Updated Client Portal endpoints
 */

const express   = require('express');
const { query } = require('../db/db');
const { authenticate }      = require('../middleware/auth.middleware');
const { authenticateClient } = require('./client-portal.routes');
const { asyncHandler }      = require('../middleware/error.middleware');
const { validateStrategy, generateProofOfWork, correlateTask } = require('../services/proof-of-work.service');
const { getCachedApiKey }   = require('../services/cache.service');

const router = express.Router();

// ════════════════════════════════════════════════════════════════
// STAFF PROFILES — Agency Admin
// ════════════════════════════════════════════════════════════════

// GET /api/agency/staff — list all staff
router.get('/agency/staff', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT sp.*,
       COUNT(bta.id) FILTER (WHERE bta.is_active) as active_brands,
       COALESCE(AVG(sr.overall_rating), 0) as avg_rating,
       COUNT(sr.id) as total_ratings
     FROM staff_profiles sp
     LEFT JOIN brand_team_assignments bta ON bta.staff_id = sp.id AND bta.is_active
     LEFT JOIN staff_ratings sr ON sr.staff_id = sp.id
     WHERE sp.is_active = true
     GROUP BY sp.id ORDER BY sp.full_name`
  );
  res.json({ staff: rows });
}));

// GET /api/agency/staff/:id — single staff profile
router.get('/agency/staff/:id', authenticate, asyncHandler(async (req, res) => {
  const [staff, brands, ratings] = await Promise.all([
    query('SELECT * FROM staff_profiles WHERE id=$1', [req.params.id]),
    query(`SELECT b.name, b.industry, bta.role_on_brand, bta.is_lead, bta.started_at
           FROM brand_team_assignments bta JOIN brands b ON b.id=bta.brand_id
           WHERE bta.staff_id=$1 AND bta.is_active ORDER BY bta.started_at DESC`, [req.params.id]),
    query(`SELECT sr.*, cpu.full_name as rated_by_name
           FROM staff_ratings sr LEFT JOIN client_portal_users cpu ON cpu.id=sr.rated_by
           WHERE sr.staff_id=$1 AND sr.is_visible_to_staff=true
           ORDER BY sr.created_at DESC LIMIT 10`, [req.params.id]),
  ]);
  if (!staff.rows[0]) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ staff: staff.rows[0], brands: brands.rows, ratings: ratings.rows });
}));

// POST /api/agency/staff — create staff profile
router.post('/agency/staff', authenticate, asyncHandler(async (req, res) => {
  const {
    full_name, email, role_title, department, seniority, bio, avatar_url,
    linkedin_url, skills, industries, certifications, years_experience,
    employment_type, value_proposition,
  } = req.body;

  if (!full_name || !email || !role_title) {
    return res.status(400).json({ error: 'full_name, email, and role_title required' });
  }

  const { rows } = await query(
    `INSERT INTO staff_profiles
     (full_name,email,role_title,department,seniority,bio,avatar_url,linkedin_url,
      skills,industries,certifications,years_experience,employment_type,value_proposition)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [full_name, email, role_title, department, seniority || 'mid', bio, avatar_url, linkedin_url,
     JSON.stringify(skills||[]), JSON.stringify(industries||[]),
     JSON.stringify(certifications||[]), years_experience||0, employment_type||'full_time', value_proposition]
  );
  res.json({ staff: rows[0] });
}));

// PUT /api/agency/staff/:id — update staff profile
router.put('/agency/staff/:id', authenticate, asyncHandler(async (req, res) => {
  const allowed = ['full_name','role_title','department','seniority','bio','avatar_url',
                   'linkedin_url','skills','industries','certifications','years_experience',
                   'employment_type','value_proposition','is_active'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });

  const sets   = Object.keys(updates).map((k, i) => `${k}=$${i+2}`).join(',');
  const vals   = Object.values(updates).map(v => Array.isArray(v) ? JSON.stringify(v) : v);
  await query(`UPDATE staff_profiles SET ${sets}, updated_at=NOW() WHERE id=$1`, [req.params.id, ...vals]);
  res.json({ updated: true });
}));

// ════════════════════════════════════════════════════════════════
// BRAND TEAM ASSIGNMENTS
// ════════════════════════════════════════════════════════════════

// GET /api/agency/brands/:brandId/team
router.get('/agency/brands/:brandId/team', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT bta.*, sp.full_name, sp.role_title, sp.department, sp.avatar_url,
            sp.avg_client_rating, sp.skills
     FROM brand_team_assignments bta
     JOIN staff_profiles sp ON sp.id=bta.staff_id
     WHERE bta.brand_id=$1 AND bta.is_active ORDER BY bta.is_lead DESC, sp.full_name`,
    [req.params.brandId]
  );
  res.json({ team: rows });
}));

// POST /api/agency/brands/:brandId/team — assign staff to brand
router.post('/agency/brands/:brandId/team', authenticate, asyncHandler(async (req, res) => {
  const { staff_id, role_on_brand, is_lead = false } = req.body;
  if (!staff_id) return res.status(400).json({ error: 'staff_id required' });

  // If is_lead, remove lead from current lead first
  if (is_lead) {
    await query('UPDATE brand_team_assignments SET is_lead=false WHERE brand_id=$1', [req.params.brandId]);
  }

  const { rows } = await query(
    `INSERT INTO brand_team_assignments (brand_id,staff_id,role_on_brand,is_lead)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (brand_id,staff_id,is_active) DO UPDATE
     SET role_on_brand=$3, is_lead=$4 RETURNING *`,
    [req.params.brandId, staff_id, role_on_brand, is_lead]
  );
  // Update brands_managed count
  await query('UPDATE staff_profiles SET brands_managed=brands_managed+1 WHERE id=$1', [staff_id]).catch(()=>{});
  res.json({ assignment: rows[0] });
}));

// DELETE /api/agency/brands/:brandId/team/:staffId
router.delete('/agency/brands/:brandId/team/:staffId', authenticate, asyncHandler(async (req, res) => {
  await query(
    'UPDATE brand_team_assignments SET is_active=false, ended_at=CURRENT_DATE WHERE brand_id=$1 AND staff_id=$2',
    [req.params.brandId, req.params.staffId]
  );
  res.json({ removed: true });
}));

// ════════════════════════════════════════════════════════════════
// AGENCY STRATEGIES — Submit, Validate, Track
// ════════════════════════════════════════════════════════════════

// GET /api/agency/brands/:brandId/strategies
router.get('/agency/brands/:brandId/strategies', authenticate, asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  let q = `SELECT as2.*, sp.full_name as submitted_by_name
           FROM agency_strategies as2
           LEFT JOIN staff_profiles sp ON sp.id=as2.staff_id
           WHERE as2.brand_id=$1`;
  const params = [req.params.brandId];
  if (type)   { q += ` AND as2.strategy_type=$${params.length+1}`; params.push(type); }
  if (status) { q += ` AND as2.status=$${params.length+1}`; params.push(status); }
  q += ' ORDER BY as2.period_start DESC LIMIT 30';
  const { rows } = await query(q, params);
  res.json({ strategies: rows });
}));

// POST /api/agency/brands/:brandId/strategies — create strategy
router.post('/agency/brands/:brandId/strategies', authenticate, asyncHandler(async (req, res) => {
  const {
    title, strategy_type, period_start, period_end,
    objectives, tactics, budget_allocated, channels, kpis,
  } = req.body;

  if (!title || !strategy_type || !period_start || !period_end) {
    return res.status(400).json({ error: 'title, type, and period required' });
  }

  // Get staff profile for the authenticated user
  const { rows: staffRows } = await query(
    'SELECT id FROM staff_profiles WHERE user_id=$1 OR email=(SELECT email FROM users WHERE id=$1)',
    [req.user.userId]
  ).catch(() => ({ rows: [] }));

  const { rows } = await query(
    `INSERT INTO agency_strategies
     (brand_id,created_by,staff_id,title,strategy_type,period_start,period_end,
      objectives,tactics,budget_allocated,channels,kpis,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft') RETURNING *`,
    [req.params.brandId, req.user.userId, staffRows[0]?.id || null,
     title, strategy_type, period_start, period_end,
     JSON.stringify(objectives||[]), JSON.stringify(tactics||[]),
     budget_allocated||0, JSON.stringify(channels||[]), JSON.stringify(kpis||[])]
  );
  res.json({ strategy: rows[0] });
}));

// POST /api/agency/brands/:brandId/strategies/:strategyId/validate — AI validation
router.post('/agency/brands/:brandId/strategies/:strategyId/validate', authenticate, asyncHandler(async (req, res) => {
  const { rows: stratRows } = await query('SELECT * FROM agency_strategies WHERE id=$1 AND brand_id=$2',
    [req.params.strategyId, req.params.brandId]);
  if (!stratRows[0]) return res.status(404).json({ error: 'Strategy not found' });

  const strategy = stratRows[0];
  const brandId  = req.params.brandId;
  const apiKey   = await getCachedApiKey(brandId, 'anthropic') || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured — add Anthropic API key in Settings' });

  const { getCachedBrand, getCachedGoals } = require('../services/cache.service');
  const [brand, goals] = await Promise.all([getCachedBrand(brandId), getCachedGoals(brandId)]);

  const { rows: metrics } = await query(
    `SELECT * FROM live_metrics WHERE brand_id=$1 AND period_start >= NOW()-INTERVAL '30 days' LIMIT 20`,
    [brandId]
  );

  // Parse JSON fields
  const strategyObj = {
    ...strategy,
    objectives: typeof strategy.objectives === 'string' ? JSON.parse(strategy.objectives) : (strategy.objectives||[]),
    tactics:    typeof strategy.tactics    === 'string' ? JSON.parse(strategy.tactics)    : (strategy.tactics||[]),
    kpis:       typeof strategy.kpis       === 'string' ? JSON.parse(strategy.kpis)       : (strategy.kpis||[]),
  };

  const validation = await validateStrategy(strategyObj, brand, metrics, goals, apiKey);

  await query(
    `UPDATE agency_strategies SET
     ai_viability_score=$1, ai_validation_notes=$2, ai_risk_flags=$3,
     ai_suggested_tweaks=$4, status='pending_validation', validated_at=NOW()
     WHERE id=$5`,
    [validation.viability_score, validation.verdict_reason,
     JSON.stringify(validation.risk_flags||[]),
     JSON.stringify(validation.suggested_tweaks||[]),
     req.params.strategyId]
  );

  res.json({ validation, strategy_id: req.params.strategyId });
}));

// PATCH /api/agency/brands/:brandId/strategies/:strategyId — update status
router.patch('/agency/brands/:brandId/strategies/:strategyId', authenticate, asyncHandler(async (req, res) => {
  const allowed = ['status','impact_score','impact_notes','impact_analysis'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const sets = Object.keys(updates).map((k,i)=>`${k}=$${i+2}`).join(',');
  const vals = Object.values(updates).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
  await query(`UPDATE agency_strategies SET ${sets},updated_at=NOW() WHERE id=$1`, [req.params.strategyId,...vals]);
  res.json({ updated: true });
}));

// ════════════════════════════════════════════════════════════════
// AGENCY TASKS (Work Log)
// ════════════════════════════════════════════════════════════════

// GET /api/agency/brands/:brandId/tasks
router.get('/agency/brands/:brandId/tasks', authenticate, asyncHandler(async (req, res) => {
  const { week, year, status } = req.query;
  let q = `SELECT at.*, sp.full_name as staff_name, sp.role_title
           FROM agency_tasks at LEFT JOIN staff_profiles sp ON sp.id=at.staff_id
           WHERE at.brand_id=$1`;
  const params = [req.params.brandId];
  if (week) { q += ` AND at.week_number=$${params.length+1}`; params.push(parseInt(week)); }
  if (year) { q += ` AND at.year=$${params.length+1}`; params.push(parseInt(year)); }
  if (status) { q += ` AND at.status=$${params.length+1}`; params.push(status); }
  q += ' ORDER BY at.completed_date DESC LIMIT 50';
  const { rows } = await query(q, params);
  res.json({ tasks: rows });
}));

// POST /api/agency/brands/:brandId/tasks — log a task
router.post('/agency/brands/:brandId/tasks', authenticate, asyncHandler(async (req, res) => {
  const {
    title, description, task_type, platform, status = 'completed',
    planned_date, completed_date, due_date, output_url, output_description,
    strategy_id, client_notes, is_visible_to_client = true,
  } = req.body;

  if (!title || !task_type) return res.status(400).json({ error: 'title and task_type required' });

  const completedAt = completed_date ? new Date(completed_date) : new Date();
  const weekNum = getISOWeek(completedAt);
  const yearNum = completedAt.getFullYear();

  // Get staff profile
  const { rows: staffRows } = await query(
    'SELECT id FROM staff_profiles WHERE user_id=$1',
    [req.user.userId]
  ).catch(() => ({ rows: [] }));

  const { rows } = await query(
    `INSERT INTO agency_tasks
     (brand_id,strategy_id,staff_id,title,description,task_type,platform,status,
      planned_date,completed_date,due_date,week_number,year,
      output_url,output_description,client_notes,is_visible_to_client)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [req.params.brandId, strategy_id||null, staffRows[0]?.id||null,
     title, description, task_type, platform, status,
     planned_date||null, completed_date||null, due_date||null,
     weekNum, yearNum, output_url||null, output_description||null,
     client_notes, is_visible_to_client]
  );

  // Trigger async correlation (fire and forget)
  if (status === 'completed' && platform) {
    setTimeout(() => correlateTask(rows[0].id).catch(()=>{}), 5000);
  }

  // Update staff task count
  if (staffRows[0]) {
    await query('UPDATE staff_profiles SET tasks_completed=tasks_completed+1 WHERE id=$1', [staffRows[0].id]).catch(()=>{});
  }

  res.json({ task: rows[0] });
}));

// ════════════════════════════════════════════════════════════════
// PROOF OF WORK
// ════════════════════════════════════════════════════════════════

// POST /api/agency/brands/:brandId/proof-of-work/generate
router.post('/agency/brands/:brandId/proof-of-work/generate', authenticate, asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.body;
  if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });

  const brandId = req.params.brandId;
  const apiKey  = await getCachedApiKey(brandId, 'anthropic') || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  const result = await generateProofOfWork(brandId, period_start, period_end, apiKey);
  res.json({ proofOfWork: result });
}));

// GET /api/agency/brands/:brandId/proof-of-work
router.get('/agency/brands/:brandId/proof-of-work', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM proof_of_work_reports WHERE brand_id=$1 ORDER BY period_start DESC LIMIT 12',
    [req.params.brandId]
  );
  res.json({ reports: rows });
}));

// ════════════════════════════════════════════════════════════════
// CLIENT PORTAL: VIEW TEAM + RATE STAFF
// ════════════════════════════════════════════════════════════════

// GET /api/client/team — see who works on my brand
router.get('/client/team', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { rows } = await query(
    `SELECT sp.id, sp.full_name, sp.role_title, sp.department, sp.bio, sp.avatar_url,
            sp.linkedin_url, sp.skills, sp.years_experience, sp.certifications,
            sp.avg_client_rating, sp.total_ratings, sp.value_proposition,
            bta.role_on_brand, bta.is_lead, bta.started_at
     FROM brand_team_assignments bta
     JOIN staff_profiles sp ON sp.id=bta.staff_id
     WHERE bta.brand_id=$1 AND bta.is_active AND sp.is_active
     ORDER BY bta.is_lead DESC, sp.full_name`,
    [brandId]
  );
  res.json({ team: rows });
}));

// POST /api/client/team/:staffId/rate — rate a staff member
router.post('/client/team/:staffId/rate', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId, clientId } = req.client;
  const {
    overall_rating, communication_rating, quality_rating,
    responsiveness_rating, strategic_value_rating,
    written_feedback, rating_period,
  } = req.body;

  if (!overall_rating) return res.status(400).json({ error: 'overall_rating required' });
  if (overall_rating < 1 || overall_rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });

  const period = rating_period || new Date().toISOString().slice(0, 7);

  const { rows } = await query(
    `INSERT INTO staff_ratings
     (brand_id,staff_id,rated_by,overall_rating,communication_rating,quality_rating,
      responsiveness_rating,strategic_value_rating,written_feedback,rating_period)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (brand_id,staff_id,rated_by,rating_period)
     DO UPDATE SET overall_rating=$4,communication_rating=$5,quality_rating=$6,
                   responsiveness_rating=$7,strategic_value_rating=$8,written_feedback=$9
     RETURNING *`,
    [brandId, req.params.staffId, clientId, overall_rating, communication_rating||null,
     quality_rating||null, responsiveness_rating||null, strategic_value_rating||null,
     written_feedback||null, period]
  );

  // Recalculate staff avg rating
  await query(
    `UPDATE staff_profiles SET
     avg_client_rating=(SELECT AVG(overall_rating) FROM staff_ratings WHERE staff_id=$1),
     total_ratings=(SELECT COUNT(*) FROM staff_ratings WHERE staff_id=$1)
     WHERE id=$1`,
    [req.params.staffId]
  );

  res.json({ rating: rows[0] });
}));

// GET /api/client/team/:staffId/ratings-summary — aggregated ratings visible to client
router.get('/client/team/:staffId/ratings-summary', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { rows } = await query(
    `SELECT AVG(overall_rating) as avg, COUNT(*) as count,
            AVG(communication_rating) as comm, AVG(quality_rating) as qual,
            AVG(responsiveness_rating) as resp, AVG(strategic_value_rating) as strat
     FROM staff_ratings WHERE staff_id=$1`,
    [req.params.staffId]
  );
  res.json({ summary: rows[0] });
}));

// GET /api/client/strategies — client sees strategies for their brand
router.get('/client/strategies', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { rows } = await query(
    `SELECT as2.id,as2.title,as2.strategy_type,as2.period_start,as2.period_end,
            as2.status,as2.ai_viability_score,as2.impact_score,
            as2.objectives,as2.kpis,as2.ai_validation_notes,
            sp.full_name as submitted_by
     FROM agency_strategies as2 LEFT JOIN staff_profiles sp ON sp.id=as2.staff_id
     WHERE as2.brand_id=$1 AND as2.status NOT IN ('draft')
     ORDER BY as2.period_start DESC LIMIT 20`,
    [brandId]
  );
  res.json({ strategies: rows });
}));

// GET /api/client/proof-of-work — client sees proof of value reports
router.get('/client/proof-of-work', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { rows } = await query(
    `SELECT * FROM proof_of_work_reports
     WHERE brand_id=$1 AND is_published=true
     ORDER BY period_start DESC LIMIT 12`,
    [brandId]
  );
  res.json({ reports: rows });
}));

// GET /api/client/tasks — client sees what Cerebre did for them (visible tasks only)
router.get('/client/tasks', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId } = req.client;
  const { week, year } = req.query;
  const currYear  = new Date().getFullYear();
  const currWeek  = getISOWeek(new Date());
  const { rows } = await query(
    `SELECT at.id,at.title,at.task_type,at.platform,at.completed_date,
            at.output_url,at.client_notes,at.correlated_metric,at.metric_change_pct,
            at.correlation_strength,sp.full_name as done_by
     FROM agency_tasks at LEFT JOIN staff_profiles sp ON sp.id=at.staff_id
     WHERE at.brand_id=$1 AND at.is_visible_to_client=true AND at.status='completed'
     AND at.year=${parseInt(year||currYear)} AND at.week_number=${parseInt(week||currWeek)}
     ORDER BY at.completed_date DESC`,
    [brandId]
  );
  res.json({ tasks: rows });
}));

// POST /api/client/satisfaction — client rates overall agency satisfaction
router.post('/client/satisfaction', authenticateClient, asyncHandler(async (req, res) => {
  const { brandId, clientId } = req.client;
  const {
    overall_score, strategy_score, communication_score, results_score,
    value_for_money, would_recommend, highlight, improvement, notes,
  } = req.body;

  if (!overall_score || overall_score < 1 || overall_score > 10) {
    return res.status(400).json({ error: 'overall_score must be 1–10' });
  }

  const period = new Date().toISOString().slice(0, 7);
  const { rows } = await query(
    `INSERT INTO client_satisfaction
     (brand_id,rated_by,rating_period,overall_score,strategy_score,communication_score,
      results_score,value_for_money,would_recommend,highlight,improvement,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (brand_id,rated_by,rating_period) DO UPDATE
     SET overall_score=$4,strategy_score=$5,communication_score=$6,results_score=$7,
         value_for_money=$8,would_recommend=$9,highlight=$10,improvement=$11,notes=$12
     RETURNING *`,
    [brandId, clientId, period, overall_score, strategy_score||null, communication_score||null,
     results_score||null, value_for_money||null, would_recommend||null, highlight||null,
     improvement||null, notes||null]
  );
  res.json({ saved: true, satisfaction: rows[0] });
}));

// ════════════════════════════════════════════════════════════════
// LEADERSHIP DASHBOARD
// ════════════════════════════════════════════════════════════════

// GET /api/agency/leadership/overview — all clients health in one view
router.get('/agency/leadership/overview', authenticate, asyncHandler(async (req, res) => {
  const [brandsRes, satisfactionRes, tasksRes, staffRes] = await Promise.all([
    // All brands with their latest health score
    query(`SELECT b.id,b.name,b.industry,
                  bhs.overall_score as health_score,
                  (SELECT COUNT(*) FROM brand_team_assignments bta WHERE bta.brand_id=b.id AND bta.is_active) as team_size,
                  (SELECT COUNT(*) FROM agency_tasks at WHERE at.brand_id=b.id AND at.created_at > NOW()-INTERVAL '30 days') as tasks_this_month
           FROM brands b LEFT JOIN brand_health_scores bhs ON bhs.brand_id=b.id
           AND bhs.period_date=(SELECT MAX(period_date) FROM brand_health_scores WHERE brand_id=b.id)
           WHERE b.is_active IS DISTINCT FROM false ORDER BY b.name`),

    // Average satisfaction per brand
    query(`SELECT brand_id, AVG(overall_score) as avg_nps, COUNT(*) as responses
           FROM client_satisfaction WHERE created_at > NOW()-INTERVAL '90 days'
           GROUP BY brand_id`),

    // Task completion rate by brand
    query(`SELECT brand_id, COUNT(*) FILTER (WHERE status='completed') as completed,
                  COUNT(*) as total
           FROM agency_tasks WHERE created_at > NOW()-INTERVAL '30 days'
           GROUP BY brand_id`),

    // Staff performance overview
    query(`SELECT sp.full_name,sp.role_title,sp.avg_client_rating,sp.total_ratings,
                  sp.brands_managed,sp.tasks_completed
           FROM staff_profiles sp WHERE sp.is_active ORDER BY sp.avg_client_rating DESC LIMIT 10`),
  ]);

  const satMap  = {};
  const taskMap = {};
  satisfactionRes.rows.forEach(r => { satMap[r.brand_id]  = r; });
  tasksRes.rows.forEach(r => { taskMap[r.brand_id] = r; });

  const brands = brandsRes.rows.map(b => ({
    ...b,
    avg_nps:         satMap[b.id]?.avg_nps   || null,
    task_completion: taskMap[b.id]
      ? Math.round((taskMap[b.id].completed / Math.max(taskMap[b.id].total,1)) * 100)
      : null,
    client_health: b.health_score >= 70 ? 'green' : b.health_score >= 50 ? 'amber' : 'red',
  }));

  res.json({
    brands,
    topStaff: staffRes.rows,
    summary: {
      totalBrands:   brandsRes.rows.length,
      avgNPS:        satisfactionRes.rows.length > 0
        ? Math.round(satisfactionRes.rows.reduce((s,r) => s + parseFloat(r.avg_nps||0), 0) / satisfactionRes.rows.length * 10) / 10
        : null,
      tasksThisMonth: tasksRes.rows.reduce((s,r) => s + parseInt(r.completed||0), 0),
    },
  });
}));

// ── ISO week number helper ────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = router;