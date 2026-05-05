/**
 * Ask Your Data — Conversational AI Service
 * Loads full brand context before every answer:
 * goals, metrics, health scores, alerts, platform data
 */

const { query } = require('../db/db');
const { loadPriorityGoals, buildGoalContext, buildIndustryContext } = require('./priority-goals.service');

const SYSTEM_PROMPT = `You are a senior marketing data analyst with deep knowledge of this brand's performance.
You have been given complete access to the brand's:
- Priority goals (ranked by importance)
- Platform metrics (current and historical)
- Brand health scores
- Active alerts and risks
- Competitor intelligence

RULES:
1. Answer in plain English — no jargon unless the question uses it
2. Always cite specific numbers: say "your engagement rate dropped from 4.2% to 2.8% last month" not "engagement dropped"
3. When you don't have data to answer, say so clearly
4. Give actionable advice, not just descriptions
5. Connect everything back to the brand's stated priority goals
6. Be direct — these are business leaders who want clarity, not hedging`;

const buildConversationContext = async (brandId) => {
  const brand = (await query('SELECT b.*, o.industry FROM brands b JOIN organisations o ON o.id = b.organisation_id WHERE b.id = $1', [brandId])).rows[0];
  if (!brand) return {};

  const [goals, recentMetrics, healthScore, recentAlerts] = await Promise.all([
    loadPriorityGoals(brandId),
    query(`SELECT platform, SUM(impressions) AS imp, SUM(leads) AS leads,
                  AVG(engagement_rate) AS avg_er, SUM(revenue) AS rev,
                  SUM(conversions) AS conv, SUM(ad_spend) AS spend
           FROM platform_metrics_v2 WHERE brand_id = $1
           AND report_period_start >= NOW() - INTERVAL '90 days'
           GROUP BY platform ORDER BY imp DESC`, [brandId]),
    query('SELECT overall_score, score_trend, health_summary FROM brand_health_scores WHERE brand_id = $1 ORDER BY period_date DESC LIMIT 1', [brandId]),
    query('SELECT title, severity, body FROM alerts WHERE brand_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 5', [brandId, 'active']),
  ]);

  const goalsContext = buildGoalContext(goals);
  const brandContext = buildIndustryContext(brand);

  const metricsContext = recentMetrics.rows.length > 0
    ? `RECENT PLATFORM PERFORMANCE (last 90 days):\n${recentMetrics.rows.map(m =>
        `${m.platform}: ${Number(m.imp).toLocaleString()} impressions, ${(Number(m.avg_er) * 100).toFixed(2)}% ER, ${Number(m.leads)} leads, ₦${Number(m.rev).toLocaleString()} revenue`
      ).join('\n')}`
    : 'No recent metrics uploaded.';

  const healthContext = healthScore.rows[0]
    ? `BRAND HEALTH: ${healthScore.rows[0].overall_score}/100 (${healthScore.rows[0].score_trend}). ${healthScore.rows[0].health_summary}`
    : '';

  const alertsContext = recentAlerts.rows.length > 0
    ? `ACTIVE ALERTS:\n${recentAlerts.rows.map(a => `[${a.severity}] ${a.title}`).join('\n')}`
    : '';

  return { brand, goalsContext, brandContext, metricsContext, healthContext, alertsContext };
};

const answerQuestion = async ({ brandId, question, history = [], conversationId, apiKey }) => {
  const ctx = await buildConversationContext(brandId);

  const systemPrompt = `${SYSTEM_PROMPT}

${ctx.brandContext}

${ctx.goalsContext}

${ctx.metricsContext}

${ctx.healthContext}

${ctx.alertsContext}`;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await response.json();
  const answer = data.content?.[0]?.text || 'I was unable to generate an answer.';

  // Determine data sources used
  const sources = [];
  if (ctx.metricsContext.includes('impressions')) sources.push('Platform metrics');
  if (ctx.goalsContext.includes('PRIORITY')) sources.push('Priority goals');
  if (ctx.healthContext) sources.push('Brand health');
  if (ctx.alertsContext) sources.push('Active alerts');

  // Save/update conversation
  let convId = conversationId;
  const newMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
  const aiMessage = { role: 'assistant', content: answer, timestamp: new Date().toISOString(), sources };

  if (convId) {
    const existing = await query('SELECT messages FROM ai_conversations WHERE id = $1 AND brand_id = $2', [convId, brandId]);
    if (existing.rows.length) {
      const msgs = [...(existing.rows[0].messages || []), newMessage, aiMessage];
      await query('UPDATE ai_conversations SET messages = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(msgs), convId]);
    }
  } else {
    const title = question.slice(0, 60) + (question.length > 60 ? '...' : '');
    const result = await query(
      `INSERT INTO ai_conversations (brand_id, user_id, title, messages)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [brandId, null, title, JSON.stringify([newMessage, aiMessage])]
    );
    convId = result.rows[0].id;
  }

  return { answer, sources, conversationId: convId };
};

module.exports = { answerQuestion, buildConversationContext };
