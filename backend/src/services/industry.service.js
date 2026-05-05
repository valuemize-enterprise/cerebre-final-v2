/**
 * Industry Intelligence Service
 * Provides industry-specific analysis layers for:
 * - Banking & Financial Services
 * - FMCG / Consumer Goods
 * - Quick Service Restaurants (QSR) / Restaurants
 * - Retail (fashion, electronics, grocery, pharmacy)
 *
 * Each industry gets a custom AI context block that is injected
 * into the master analysis prompt, making recommendations
 * genuinely relevant to that industry's unique concerns.
 */

const { query } = require('../db/db');
const logger = require('../utils/logger');

// ── Industry prompt contexts ──────────────────────────────────
const INDUSTRY_CONTEXTS = {

  banking: `
INDUSTRY: Banking & Financial Services
Critical success factors:
- TRUST is everything. One reputational incident can cost millions in deposits.
  Watch trust_score and sentiment_score daily — any drop below 60 needs immediate response.
- Regulatory compliance: avoid any social content that could be seen as financial advice,
  guarantees, or mis-selling. Flag any content mentioning specific rates or guarantees.
- Key competitors: Focus on digital challenger banks and fintech disruptors (Kuda, Carbon, etc.)
  — they steal share of voice on social faster than traditional banks respond.
- Brand KPIs unique to banking: Net Promoter Score signals, complaint volume mentions,
  app store rating trends, ATM/service availability sentiment.
- Content that works for banks: educational financial content, customer success stories,
  Nigerian economic commentary, payment innovation announcements.
- Content that backfires: anything that feels like sales pressure, tone-deaf posts during
  economic downturns, slow responses to customer complaints.
`,

  fmcg: `
INDUSTRY: Fast-Moving Consumer Goods (FMCG)
Critical success factors:
- Distribution and availability matter as much as brand. Monitor out-of-stock mentions.
- SKU-level brand health: each product variant has its own social presence.
  Track individually, not just at parent brand level.
- Price sensitivity is extreme in Nigerian market — monitor price mention sentiment carefully.
- UGC (User-Generated Content) is the most powerful signal — cooking videos with your product,
  unboxing content, "how I use this" posts. Track and amplify.
- Seasonal demand peaks: Sallah (increased food product demand), Christmas/ember months,
  back-to-school periods. Content must lead demand by 4-6 weeks.
- Retailer relationships: monitor sentiment towards Shoprite, SPAR, Walmart/Massmart, etc.
  as it directly affects shelf placement decisions.
- Competitor monitoring: watch promotional launches — price promotions in FMCG can shift
  market share within days, not months.
`,

  qsr: `
INDUSTRY: Quick Service Restaurants / Casual Dining
Critical success factors:
- SPEED of review response. A negative food safety comment left unanswered for 6 hours
  can go viral. Target <2 hour response time on all reviews.
- Location-level performance matters. A great brand can be destroyed by one poorly-managed
  outlet. Track review sentiment by location, not just brand.
- Menu item buzz drives footfall. When "Jollof Rice" trends nationally, brands that
  post relevant content capture 40-60% higher engagement.
- Delivery platform ratings (Bolt Food, Uber Eats, Jumia Food) are as important as
  dine-in reviews for revenue in urban Nigerian markets.
- Food creator partnerships are the highest-ROI influencer category for this industry.
  Track food bloggers and cooking creators specifically.
- Instagram and TikTok food aesthetics drive decisions. Photo quality of food posts
  directly correlates with reservation/order increases.
- Crisis patterns to watch: food safety incidents, foreign object complaints, pricing
  complaints, racist or insensitive service incident reports.
`,

  retail: `
INDUSTRY: Retail (Fashion, Electronics, Grocery, Pharmacy)
Critical success factors:
- Social commerce is not optional — it is a primary sales channel. Instagram Shopping,
  TikTok Shop, and WhatsApp catalog are direct revenue drivers.
- Influencer attribution must be tracked per creator, per product, per campaign.
  ROI varies enormously between creator tiers.
- Product launch strategy on social directly determines whether new SKUs sell through
  or end up as dead stock. First 72 hours of social content is critical.
- Seasonal events: Black Friday, Back-to-School, Valentine's, Christmas, Sallah are
  when retail brands make or lose their quarter. Content must start 3 weeks before.
- Price promotions amplified on social outperform all other channels in Nigerian retail.
  WhatsApp broadcast lists are the highest-converting delivery mechanism.
- Customer reviews on Google and Facebook should be monitored for product quality
  signals — they surface problems faster than any internal quality system.
- Competitors: Monitor promotional launches within 24 hours. Price matching decisions
  in retail happen at the speed of social media.
`,

  telecoms: `
INDUSTRY: Telecommunications
Critical success factors:
- Network quality complaints are the #1 social media driver in Nigerian telecoms.
  Track volume and sentiment of network-related mentions hourly during outages.
- Data pricing sensitivity is extreme — any price-related post generates high engagement.
- Customer service via Twitter/X is table stakes — customers escalate on Twitter
  and expect public resolution. Response time is a brand health signal.
- Youth market is primary growth segment — TikTok and Instagram reach them;
  Facebook for 30+ segment.
`,

  insurance: `
INDUSTRY: Insurance
Critical success factors:
- Claims experience drives brand reputation above all else.
  Monitor "I couldn't claim" sentiment as a crisis signal.
- Trust-building content (educational, transparent, human) outperforms
  product promotions by 3-5x engagement.
- Social proof from policyholders resolving claims publicly is extremely valuable.
`,

  real_estate: `
INDUSTRY: Real Estate
Critical success factors:
- Property showcase quality on Instagram and YouTube drives qualified inquiries.
  Track profile visits → website clicks → form submissions.
- Neighbourhood content (area guides, lifestyle) drives organic reach and positions
  brand as an authority in specific locations.
- Price sensitivity: housing affordability is top-of-mind in Nigerian market.
  Content that acknowledges this outperforms aspirational-only content.
`,
};

// ── Industry-specific metric priorities ───────────────────────
const INDUSTRY_KPI_WEIGHTS = {
  banking: {
    primary: ['trust_score', 'sentiment_score', 'share_of_voice', 'complaint_volume'],
    secondary: ['brand_awareness', 'digital_acquisition', 'app_rating'],
    alert_thresholds: {
      trust_score: { critical: 50, warning: 65 },
      negative_sentiment_pct: { critical: 0.30, warning: 0.20 },
      complaint_volume: { critical: 500, warning: 200 },
    },
  },
  fmcg: {
    primary: ['brand_awareness', 'ugc_volume', 'product_buzz', 'retailer_sentiment'],
    secondary: ['engagement_rate', 'share_of_voice', 'out_of_stock_mentions'],
    alert_thresholds: {
      out_of_stock_mentions: { critical: 100, warning: 50 },
      negative_sentiment_pct: { critical: 0.25, warning: 0.15 },
    },
  },
  qsr: {
    primary: ['review_rating', 'review_response_rate', 'food_creator_mentions', 'location_sentiment'],
    secondary: ['delivery_rating', 'menu_item_buzz', 'photo_tags'],
    alert_thresholds: {
      avg_rating: { critical: 3.5, warning: 4.0 },
      review_response_rate: { critical: 0.50, warning: 0.70 },
      food_safety_mentions: { critical: 1, warning: 1 },
    },
  },
  retail: {
    primary: ['social_commerce_revenue', 'influencer_revenue', 'product_launch_awareness'],
    secondary: ['review_rating', 'cart_social_attribution', 'seasonal_readiness'],
    alert_thresholds: {
      negative_product_reviews_pct: { critical: 0.20, warning: 0.12 },
      avg_rating: { critical: 3.5, warning: 4.0 },
    },
  },
};

// ── Generate industry-specific AI analysis ────────────────────
const generateIndustryAnalysis = async ({ brandId, brand, metrics, goals, industryCode, apiKey }) => {
  const industryContext = INDUSTRY_CONTEXTS[industryCode] || INDUSTRY_CONTEXTS.retail;
  const kpiPriorities = INDUSTRY_KPI_WEIGHTS[industryCode] || INDUSTRY_KPI_WEIGHTS.retail;

  const prompt = `You are a senior marketing analyst specialising in the ${industryCode} industry in African markets, particularly Nigeria.

${industryContext}

BRAND: ${brand.name}
INDUSTRY: ${brand.industry}
ACTIVE PLATFORMS: ${brand.active_platforms?.join(', ')}

CURRENT METRICS:
${JSON.stringify(metrics, null, 2)}

PRIORITY GOALS:
${goals.map((g, i) => `${i+1}. ${g.title} (${g.status} — ${g.progress_pct}%)`).join('\n')}

INDUSTRY KPI PRIORITIES:
Primary KPIs: ${kpiPriorities.primary.join(', ')}
Secondary KPIs: ${kpiPriorities.secondary.join(', ')}

Provide industry-specific analysis. Return ONLY valid JSON:
{
  "industry_health_score": <0-100>,
  "primary_kpi_status": [
    { "kpi": "<name>", "value": "<value>", "status": "healthy|warning|critical", "insight": "<why this matters for ${industryCode}>" }
  ],
  "industry_specific_wins": ["<win specific to ${industryCode} context>"],
  "industry_specific_risks": [
    { "risk": "<risk>", "severity": "critical|high|medium", "industry_context": "<why this is especially important for ${industryCode}>" }
  ],
  "competitor_landscape": "<how this brand is positioned vs ${industryCode} competitors on social>",
  "content_strategy": {
    "what_is_working": "<specific to ${industryCode} content patterns>",
    "content_gap": "<what the brand should be doing that industry leaders do>",
    "next_campaign_idea": "<specific campaign concept relevant to ${industryCode}>"
  },
  "board_summary": "<3-4 sentences. This is for the board/CEO of a ${industryCode} company. Focus on business impact, not vanity metrics.>",
  "immediate_actions": [
    { "action": "<specific>", "timeline": "24h|1week|1month", "expected_impact": "<measurable outcome>", "goal_served": "<which goal>" }
  ]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  const raw = data.content?.[0]?.text || '{}';

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { parse_error: true, raw };
  }
};

// ── Get industry profile for a brand ─────────────────────────
const getIndustryProfile = async (brandId) => {
  const result = await query(
    'SELECT * FROM industry_profiles WHERE brand_id = $1',
    [brandId]
  );
  return result.rows[0] || null;
};

// ── Detect industry from brand info ──────────────────────────
const detectIndustryCode = (industry = '') => {
  const i = industry.toLowerCase();
  if (i.includes('bank') || i.includes('finance') || i.includes('fintech') || i.includes('insurance')) return 'banking';
  if (i.includes('fmcg') || i.includes('consumer goods') || i.includes('food') || i.includes('beverage')) return 'fmcg';
  if (i.includes('restaurant') || i.includes('food service') || i.includes('qsr') || i.includes('hospitality')) return 'qsr';
  if (i.includes('retail') || i.includes('fashion') || i.includes('ecommerce') || i.includes('pharmacy')) return 'retail';
  if (i.includes('telecom') || i.includes('telco') || i.includes('mobile')) return 'telecoms';
  if (i.includes('real estate') || i.includes('property')) return 'real_estate';
  return 'retail'; // default
};

module.exports = {
  generateIndustryAnalysis,
  getIndustryProfile,
  detectIndustryCode,
  INDUSTRY_CONTEXTS,
  INDUSTRY_KPI_WEIGHTS,
};
