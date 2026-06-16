/**
 * NarrativeAI™ Service
 *
 * Generates the plain-English brand story shown at the top of every
 * client dashboard. This is the first thing clients read when they
 * log in — it must feel like a senior strategist wrote it personally.
 *
 * Output: 3–5 sentences that tell the story of the brand's
 * performance in the selected period. Not a summary — a narrative.
 */

const { getCachedBrand, getCachedGoals, getCachedApiKey } = require('./cache.service');
const { query } = require('../db/db');
const logger = require('../utils/logger');

const NARRATIVE_PROMPT = `You are ARIA, the intelligence engine for Cerebre Media Africa.

Write a NarrativeAI™ brand story — 3 to 5 sentences in plain English that tell the story of this brand's digital performance for the given period.

Rules:
- Write like a senior strategist talking to a CMO, not a data analyst talking to a developer
- Lead with the most important finding — good OR bad
- Use at least one specific number
- Reference the brand's goals — are they on track?
- End with one forward-looking sentence about what to watch or act on
- Never use: "synergy", "leverage", "impactful", "game-changing", or any cliché
- Never start with "This period" or "During this period"
- Write in second person ("Your brand", "You grew", "Your audience")
- Maximum 5 sentences. Minimum 3.

Tone: Intelligent, direct, human. Like a trusted advisor, not a report generator.

Examples of good openings:
- "Your Instagram reach grew by 47% this month — the strongest growth you've had since the Detty December campaign."
- "A difficult month: engagement dropped across every platform, driven largely by reduced posting frequency in the second week."
- "You're ahead of target on awareness but 23% behind on leads — the top of the funnel is working, the bottom needs attention."`;

/**
 * Generate the NarrativeAI™ story for a brand
 * Called when a client loads their dashboard
 */
const generateNarrative = async (brandId, periodDays = 30) => {
  try {
    const [brand, goals] = await Promise.all([
      getCachedBrand(brandId),
      getCachedGoals(brandId),
    ]);

    const apiKey = await getCachedApiKey(brandId, 'anthropic') || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    // Get aggregated metrics
    const since = new Date(Date.now() - periodDays * 86400000).toISOString().slice(0, 10);
    const prevSince = new Date(Date.now() - periodDays * 2 * 86400000).toISOString().slice(0, 10);

    const [curr, prev] = await Promise.all([
      query(`SELECT platform, metric_type, SUM(value) as total
             FROM live_metrics WHERE brand_id=$1 AND period_start >= $2
             GROUP BY platform, metric_type`, [brandId, since]),
      query(`SELECT platform, metric_type, SUM(value) as total
             FROM live_metrics WHERE brand_id=$1 AND period_start >= $2 AND period_start < $3
             GROUP BY platform, metric_type`, [brandId, prevSince, since]),
    ]);

    // Build changes summary
    const prevMap = {};
    prev.rows.forEach(r => { prevMap[`${r.platform}:${r.metric_type}`] = parseFloat(r.total); });

    const changes = curr.rows.map(r => {
      const key = `${r.platform}:${r.metric_type}`;
      const current  = parseFloat(r.total);
      const previous = prevMap[key];
      const changePct = previous ? Math.round(((current - previous) / previous) * 100) : null;
      return { platform: r.platform, metric: r.metric_type, current, changePct };
    }).filter(c => c.current > 0);

    // Build goal summary
    const goalSummary = goals.slice(0, 4).map(g =>
      `"${g.title}" — ${Math.round(g.progress_pct || 0)}% complete, status: ${g.status || 'in_progress'}`
    ).join('\n');

    const userContent = `BRAND: ${brand?.name || 'Unknown'}
INDUSTRY: ${brand?.industry || 'Not specified'}
PERIOD: Last ${periodDays} days

PERFORMANCE CHANGES VS PREVIOUS ${periodDays} DAYS:
${changes.slice(0, 15).map(c =>
  `${c.platform} ${c.metric}: ${c.current.toLocaleString()}${c.changePct !== null ? ` (${c.changePct > 0 ? '+' : ''}${c.changePct}%)` : ''}`
).join('\n') || 'No data available yet'}

PRIORITY GOALS:
${goalSummary || 'No goals configured'}

Write the NarrativeAI™ brand story now:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: NARRATIVE_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) throw new Error(`Narrative AI error: ${response.status}`);
    const data = await response.json();
    const narrative = data.content?.[0]?.text?.trim();

    // Cache the narrative in DB for 4 hours to avoid re-generating on every page load
    await query(
      `INSERT INTO narrative_cache (brand_id, period_days, narrative, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '4 hours')
       ON CONFLICT (brand_id, period_days) DO UPDATE SET narrative=$3, expires_at=NOW() + INTERVAL '4 hours'`,
      [brandId, periodDays, narrative]
    ).catch(() => {}); // Table may not exist yet — fail silently

    return narrative;

  } catch (err) {
    logger.warn('[NarrativeAI] Generation failed', { brandId, error: err.message });
    return null;
  }
};

/**
 * Get cached narrative or generate a new one
 * Returns null if no API key is configured
 */
const getNarrative = async (brandId, periodDays = 30) => {
  // Try cache first
  try {
    const { rows } = await query(
      `SELECT narrative FROM narrative_cache
       WHERE brand_id=$1 AND period_days=$2 AND expires_at > NOW()`,
      [brandId, periodDays]
    );
    if (rows[0]?.narrative) return rows[0].narrative;
  } catch { /* Cache table may not exist — skip */ }

  return generateNarrative(brandId, periodDays);
};

/**
 * Create the narrative_cache table if it doesn't exist
 * Called once at startup
 */
const ensureNarrativeTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS narrative_cache (
      brand_id    UUID NOT NULL,
      period_days INTEGER NOT NULL,
      narrative   TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (brand_id, period_days)
    )
  `).catch(() => {});
};

ensureNarrativeTable();

module.exports = { getNarrative, generateNarrative };
