/**
 * Background Worker — Scheduled Jobs
 *
 * Runs three recurring jobs:
 *
 * 1. WEEKLY DIGEST   — Mondays 7:00 AM WAT
 *    Sends the NarrativeAI™ briefing email to all subscribed clients
 *
 * 2. GOAL HISTORY    — Daily 11:00 PM WAT
 *    Records a daily snapshot of every active goal's progress
 *    This is the data that powers VelocityTracker™ charts
 *
 * 3. PLATFORM SYNC   — Every hour
 *    Triggers API pulls for all connected platforms due for refresh
 *
 * 4. CLARITY SCORE   — Daily 8:00 AM WAT
 *    Recalculates the brand health score for all active brands
 */

require('dotenv').config();
const { query }  = require('../db/db');
const logger     = require('../utils/logger');
const { ocrQueue, analysisQueue } = require('./queue');

// ── Simple cron implementation (no external dependency needed) ────
const schedule = (label, cronExpr, fn) => {
  const parse = (expr) => {
    const [min, hour, , , dayOfWeek] = expr.split(' ');
    return { min: parseInt(min), hour: parseInt(hour), dow: dayOfWeek === '*' ? null : parseInt(dayOfWeek) };
  };
  const sched = parse(cronExpr);
  logger.info(`[Worker] Scheduled: ${label} at ${cronExpr} (WAT)`);

  return setInterval(() => {
    const now = new Date();
    const watHour = (now.getUTCHours() + 1) % 24; // WAT = UTC+1
    const watMin  = now.getUTCMinutes();
    const dayMatch = sched.dow === null || now.getUTCDay() === sched.dow;
    if (watHour === sched.hour && watMin === sched.min && dayMatch) {
      logger.info(`[Worker] Running: ${label}`);
      fn().catch(err => logger.error(`[Worker] ${label} failed`, { error: err.message }));
    }
  }, 60_000); // check every minute
};

// ── JOB 1: Weekly digest (Monday 7:00 AM WAT = 6:00 AM UTC, dow=1) ──
schedule('WeeklyDigest', '0 6 * * 1', async () => {
  const { sendWeeklyDigests } = require('../services/digest-email.service');
  const result = await sendWeeklyDigests();
  logger.info('[Worker] Weekly digest complete', result);
});

// ── JOB 2: Goal history snapshot (11:00 PM WAT = 10:00 PM UTC) ───
schedule('GoalHistory', '0 22 * * *', async () => {
  const { rows: goals } = await query(
    'SELECT id, brand_id, current_value, progress_pct FROM priority_goals WHERE is_active=true'
  );
  let saved = 0;
  for (const goal of goals) {
    await query(
      'INSERT INTO goal_history (goal_id, brand_id, recorded_value, progress_pct) VALUES ($1,$2,$3,$4)',
      [goal.id, goal.brand_id, goal.current_value, goal.progress_pct]
    ).catch(() => {});
    saved++;
  }
  logger.info(`[Worker] Goal history: ${saved} snapshots saved`);
});

// ── JOB 3: Platform sync (every hour, on the hour) ─────────────
let syncRunning = false;
setInterval(async () => {
  if (syncRunning) return;
  const now = new Date();
  if (now.getUTCMinutes() !== 0) return; // Only on the hour

  syncRunning = true;
  try {
    const { getConnectionsDueForSync, dispatchSync } = require('../services/sync.service');
    const connections = await getConnectionsDueForSync().catch(() => []);
    let synced = 0;
    for (const conn of connections) {
      try {
        await dispatchSync(conn.brand_id, conn.id, conn.platform);
        synced++;
      } catch (e) {
        logger.warn(`[Worker] Sync failed: ${conn.platform}`, { error: e.message });
      }
    }
    if (synced > 0) logger.info(`[Worker] Platform sync: ${synced} connections refreshed`);
  } finally {
    syncRunning = false;
  }
}, 60_000);

// ── JOB 4: ClarityScore recalculation (8:00 AM WAT = 7:00 AM UTC) ──
schedule('ClarityScore', '0 7 * * *', async () => {
  const { calculateBrandHealthScore } = require('../services/master-ai.service');
  const { getCachedApiKey } = require('../services/cache.service');

  const { rows: brands } = await query(
    'SELECT id FROM brands WHERE is_active IS DISTINCT FROM false'
  ).catch(() => ({ rows: [] }));

  let updated = 0;
  for (const brand of brands) {
    try {
      const apiKey = await getCachedApiKey(brand.id, 'anthropic') || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) continue;

      const { rows: metrics } = await query(
        'SELECT * FROM live_metrics WHERE brand_id=$1 AND period_start >= NOW() - INTERVAL \'30 days\'',
        [brand.id]
      );
      const { rows: goals } = await query(
        'SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true',
        [brand.id]
      );

      if (metrics.length === 0) continue;
      const result = await calculateBrandHealthScore({ brand: { id: brand.id }, metrics, goals: goals, apiKey });
      if (result.overall_score) {
        await query(
          `INSERT INTO brand_health_scores (brand_id, overall_score, period_date)
           VALUES ($1,$2,CURRENT_DATE)
           ON CONFLICT (brand_id, period_date)
           DO UPDATE SET overall_score=$2`,
          [brand.id, result.overall_score]
        ).catch(() => {});
        updated++;
      }
    } catch (e) {
      logger.warn(`[Worker] ClarityScore failed for brand ${brand.id}`, { error: e.message });
    }
    // Small delay to avoid rate limiting AI API
    await new Promise(r => setTimeout(r, 500));
  }
  logger.info(`[Worker] ClarityScore: ${updated} brands updated`);
});

// ── Queue processors (existing) ──────────────────────────────────
ocrQueue.process(async (job) => {
  const { processUpload } = require('./processor');
  return processUpload(job.data);
});

analysisQueue.process(async (job) => {
  const { processAnalysis } = require('./processor');
  return processAnalysis(job.data);
});

// Handle failures
[ocrQueue, analysisQueue].forEach(q => {
  q.on('failed', (job, err) => {
    logger.error(`[Queue] Job failed`, { queue: q.name, jobId: job.id, error: err.message });
  });
});

logger.info('[Worker] All scheduled jobs registered. Worker running...');

process.on('SIGTERM', async () => {
  logger.info('[Worker] Shutting down');
  await Promise.all([ocrQueue.close(), analysisQueue.close()]).catch(() => {});
  process.exit(0);
});