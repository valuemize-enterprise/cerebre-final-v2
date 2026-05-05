require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Helpers ───────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 4) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));

// Generate 6 months of metrics for a platform with realistic growth trends
const generateMetrics = (platform, userId, fileId, monthOffset, growth = 1.0) => {
  const base = {
    instagram: { impressions: 800000, engagement_rate: 0.038, followers_total: 45000 },
    facebook:  { impressions: 500000, engagement_rate: 0.021, followers_total: 28000 },
    twitter:   { impressions: 200000, engagement_rate: 0.012, followers_total: 12000 },
    tiktok:    { impressions: 950000, engagement_rate: 0.065, followers_total: 31000 },
    youtube:   { impressions: 120000, engagement_rate: 0.054, followers_total: 8500 },
    google_ads:{ impressions: 450000, engagement_rate: 0.008, followers_total: 0 },
    website:   { impressions: 0,      engagement_rate: 0,     followers_total: 0 },
    email:     { impressions: 0,      engagement_rate: 0.28,  followers_total: 0 },
  }[platform] || { impressions: 100000, engagement_rate: 0.02, followers_total: 5000 };

  const multiplier = Math.pow(growth, monthOffset);
  const imp = Math.floor(base.impressions * multiplier * randFloat(0.85, 1.15));
  const reach = Math.floor(imp * randFloat(0.55, 0.75));
  const engRate = parseFloat((base.engagement_rate * randFloat(0.9, 1.1)).toFixed(6));
  const clicks = Math.floor(imp * randFloat(0.02, 0.06));
  const conversions = Math.floor(clicks * randFloat(0.05, 0.15));

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (5 - monthOffset), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() - (5 - monthOffset) + 1, 0);

  return {
    id: uuidv4(),
    file_id: fileId,
    user_id: userId,
    platform,
    report_period_start: periodStart.toISOString().split('T')[0],
    report_period_end: periodEnd.toISOString().split('T')[0],
    impressions: imp,
    reach,
    followers_total: Math.floor(base.followers_total * multiplier),
    followers_gained: rand(200, 1500),
    followers_lost: rand(50, 300),
    likes: Math.floor(imp * engRate * randFloat(0.6, 0.8)),
    comments: Math.floor(imp * engRate * randFloat(0.05, 0.12)),
    shares: Math.floor(imp * engRate * randFloat(0.1, 0.2)),
    saves: Math.floor(imp * engRate * randFloat(0.08, 0.15)),
    clicks,
    engagement_rate: engRate,
    website_visits: platform === 'website' ? rand(8000, 25000) : Math.floor(clicks * randFloat(0.3, 0.6)),
    sessions: platform === 'website' ? rand(6000, 20000) : 0,
    bounce_rate: randFloat(0.42, 0.68),
    avg_session_duration_sec: rand(90, 240),
    leads: Math.floor(conversions * randFloat(2, 4)),
    conversions,
    conversion_rate: parseFloat((conversions / Math.max(clicks, 1)).toFixed(6)),
    revenue: parseFloat((conversions * randFloat(4000, 18000)).toFixed(2)),
    posts_published: rand(8, 28),
    stories_published: rand(15, 60),
    videos_published: rand(2, 12),
    ad_spend: platform === 'google_ads' ? parseFloat((rand(80000, 350000)).toFixed(2)) : 0,
    cpc: platform === 'google_ads' ? randFloat(120, 450) : 0,
    cpm: platform === 'google_ads' ? randFloat(800, 2500) : 0,
    roas: platform === 'google_ads' ? randFloat(2.8, 5.5) : 0,
    top_content: JSON.stringify([
      { title: 'Brand spotlight reel', type: 'video', metric: 'views', value: rand(20000, 80000) },
      { title: 'Product launch carousel', type: 'carousel', metric: 'saves', value: rand(1000, 5000) },
    ]),
    raw_normalized: JSON.stringify({}),
  };
};

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[seed] Starting...');

    // ── Demo User ────────────────────────────────────────────
    const demoEmail = 'demo@cerebre.media';
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [demoEmail]);

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log('[seed] Demo user already exists — skipping creation');
    } else {
      const hash = await bcrypt.hash('demo1234', 12);
      userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, company, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, demoEmail, hash, 'Amara Okafor', 'Cerebre Media Africa', 'admin']
      );
      console.log(`[seed] Created demo user: ${demoEmail} / demo1234`);
    }

    // ── Check if metrics already seeded ─────────────────────
    const metricCount = await client.query(
      'SELECT COUNT(*) FROM platform_metrics WHERE user_id = $1', [userId]
    );
    if (parseInt(metricCount.rows[0].count) > 0) {
      console.log('[seed] Metrics already seeded — skipping');
      return;
    }

    // ── Demo report files (one per month) ───────────────────
    const platforms = ['instagram', 'facebook', 'tiktok', 'google_ads', 'website', 'email'];
    const MONTHS = 6;

    for (let month = 0; month < MONTHS; month++) {
      const fileId = uuidv4();
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - month), 1);
      const label = d.toLocaleString('en-NG', { month: 'long', year: 'numeric' });

      // Insert a dummy report file
      await client.query(
        `INSERT INTO report_files
         (id, user_id, filename, original_name, file_type, file_size, s3_key, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'analyzed')`,
        [
          fileId, userId,
          `seed_report_${month}.pdf`,
          `${label.replace(' ', '_')}_marketing_report.pdf`,
          'application/pdf',
          rand(200000, 800000),
          `uploads/${userId}/seed_${month}.pdf`,
        ]
      );

      // Insert metrics for each platform
      for (const platform of platforms) {
        const m = generateMetrics(platform, userId, fileId, month, 1.06); // ~6% MoM growth
        await client.query(
          `INSERT INTO platform_metrics
           (id, file_id, user_id, platform,
            report_period_start, report_period_end,
            impressions, reach, followers_total, followers_gained, followers_lost,
            likes, comments, shares, saves, clicks, engagement_rate,
            website_visits, sessions, bounce_rate, avg_session_duration_sec,
            leads, conversions, conversion_rate, revenue,
            posts_published, stories_published, videos_published,
            ad_spend, cpc, cpm, roas, top_content, raw_normalized)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                   $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)`,
          [
            m.id, m.file_id, m.user_id, m.platform,
            m.report_period_start, m.report_period_end,
            m.impressions, m.reach, m.followers_total, m.followers_gained, m.followers_lost,
            m.likes, m.comments, m.shares, m.saves, m.clicks, m.engagement_rate,
            m.website_visits, m.sessions, m.bounce_rate, m.avg_session_duration_sec,
            m.leads, m.conversions, m.conversion_rate, m.revenue,
            m.posts_published, m.stories_published, m.videos_published,
            m.ad_spend, m.cpc, m.cpm, m.roas, m.top_content, m.raw_normalized,
          ]
        );
      }

      // Insert a demo analysis report for the latest month
      if (month === MONTHS - 1) {
        await client.query(
          `INSERT INTO analysis_reports
           (id, user_id, file_ids, period_label,
            executive_snapshot, cross_platform_perf, platform_breakdown,
            content_analysis, audience_insights, funnel_analysis,
            what_worked_failed, strategic_recommendations, risk_opportunity,
            raw_ai_response)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            uuidv4(), userId, [fileId], label,
            JSON.stringify({
              key_wins: [
                'Instagram reach grew 34% driven by Reel content strategy',
                'Google Ads ROAS improved to 4.2x after audience refinement',
                'Email open rate reached 28% — highest in 6 months',
                'TikTok followers grew 18% with consistent posting cadence',
                'Website conversion rate up 0.4pp from landing page A/B test',
              ],
              key_concerns: [
                'Facebook organic reach declining — algorithm deprioritising text posts',
                'Website bounce rate increased to 62% — landing page audit needed',
                'Email click-through rate dropped to 3.1% — content fatigue likely',
                'Google Ads CPC rose 22% — increased competition in Q1',
                'Twitter engagement flat despite follower growth',
              ],
              overall_direction: 'growing',
              direction_reasoning: 'Impressions and revenue both trending upward MoM across 4 of 6 platforms',
              cross_platform_insight: 'Instagram and TikTok are driving awareness while Google Ads and Email convert — a healthy dual-funnel setup',
              strategic_focus: 'Double down on Reels and TikTok content to sustain the awareness growth, while optimising the Google Ads landing page to improve conversion rate from the paid traffic',
            }),
            JSON.stringify({
              strongest_platform: 'instagram',
              strongest_platform_reason: 'Highest reach and fastest follower growth',
              declining_platforms: ['facebook', 'twitter'],
              funnel_mapping: {
                awareness: ['instagram', 'tiktok', 'facebook'],
                engagement: ['instagram', 'email', 'youtube'],
                conversion: ['google_ads', 'email', 'website'],
              },
            }),
            JSON.stringify([
              {
                platform: 'instagram',
                insight: 'Reels content drove 3x the reach of static posts. Posting frequency increase from 12 to 18/month correlated with the follower spike.',
                business_implication: 'Instagram is our highest-ROI awareness channel — reducing posting frequency would directly harm top-of-funnel reach.',
                recommendation: 'Allocate 40% of content budget to Reels production. Test carousel formats for product showcases.',
                key_metrics: [{ name: 'Impressions', current: '1.8M', change_pct: 34 }, { name: 'Eng. rate', current: '4.2%', change_pct: 11 }],
              },
              {
                platform: 'google_ads',
                insight: 'ROAS improved after switching from broad to custom intent audiences. CPC rose due to Q1 competition surge but was offset by better conversion quality.',
                business_implication: 'Paid search is our primary conversion driver — the ROAS improvement means current spend is well-allocated.',
                recommendation: 'Increase budget by 15% on the top-converting ad groups. Pause underperforming broad match campaigns.',
                key_metrics: [{ name: 'ROAS', current: '4.2x', change_pct: 18 }, { name: 'Conversions', current: '312', change_pct: 9 }],
              },
            ]),
            JSON.stringify({
              best_performing: [
                { type: 'Reel', description: 'Behind-the-scenes brand story — 72K views', metric: 'Reach', value: '72,400' },
                { type: 'Email', description: 'Product launch announcement — 31% open rate', metric: 'Open rate', value: '31.2%' },
              ],
              worst_performing: [
                { type: 'Facebook text post', description: 'Industry news share — low organic reach', metric: 'Reach', value: '1,240' },
                { type: 'Twitter thread', description: 'Long-form commentary — no engagement', metric: 'Engagement', value: '0.4%' },
              ],
              format_patterns: 'Video (Reels, TikTok) consistently outperforms static by 3-5x on reach',
              timing_patterns: 'Tuesday-Thursday 7-9pm WAT drives highest engagement across platforms',
              hook_patterns: 'Posts starting with a question or bold claim perform 40% better than informational openers',
              recommendation: 'Shift 30% of static post budget to short-form video. Schedule all evergreen content for Tue-Thu evening window.',
            }),
            JSON.stringify({
              primary_location: 'Lagos, Nigeria',
              location_breakdown: [
                { location: 'Lagos', percentage: 44 },
                { location: 'Abuja', percentage: 18 },
                { location: 'Port Harcourt', percentage: 9 },
                { location: 'Ibadan', percentage: 7 },
                { location: 'Other Nigeria', percentage: 14 },
                { location: 'Diaspora (UK/US)', percentage: 8 },
              ],
              device_split: { mobile: 87, desktop: 11, other: 2 },
              peak_engagement_times: ['7pm-9pm WAT', 'Saturday 11am-1pm'],
              audience_behavior_insight: '87% mobile usage reinforces need for vertical video-first content. Short attention spans on mobile mean hooks must land in first 2 seconds.',
              nigeria_specific_insight: 'Lagos audience responds strongly to local cultural references and Pidgin English CTAs. Network-conscious users prefer compressed video formats.',
            }),
            JSON.stringify({
              traffic_volume: '1.2M total impressions',
              engagement_rate_overall: '3.8%',
              conversion_rate_overall: '2.1%',
              biggest_drop_off: 'Between clicks and website conversions — 68% of paid traffic bounces without converting',
              drop_off_stage: 'conversion',
              drop_off_reason: 'Landing page load time >4s on mobile, mismatched messaging from ad creative to landing page',
              funnel_health: 'leaky',
            }),
            JSON.stringify({
              worked: [
                { what: 'Reels-first Instagram strategy', evidence: '34% reach increase, 11% engagement lift', why_it_worked: 'Algorithm prioritises Reels; format matches audience consumption habits' },
                { what: 'Google Ads audience narrowing', evidence: 'ROAS from 3.5x to 4.2x', why_it_worked: 'Custom intent audiences eliminated waste spend on non-converting segments' },
              ],
              failed: [
                { what: 'Facebook organic text posts', evidence: 'Average reach of 1,200 vs 8,000 target', why_it_failed: 'Algorithm deprioritises text-only content; audience expects visual content from brand accounts' },
                { what: 'Long Twitter threads', evidence: '0.4% engagement vs 1.8% platform average', why_it_failed: 'Nigerian Twitter audience engages with short punchy takes, not long-form analysis' },
              ],
            }),
            JSON.stringify({
              immediate_actions: [
                { action: 'Audit and optimise top-5 landing pages for mobile speed and message match', priority: 'high', expected_impact: 'Reduce bounce rate from 62% to <50%, lifting conversion rate by est. 0.8pp', effort: 'medium' },
                { action: 'Launch Reels production sprint — 3 Reels/week for 30 days', priority: 'high', expected_impact: 'Sustain 20%+ MoM reach growth on Instagram', effort: 'medium' },
                { action: 'Pause all Facebook text-only posts, replace with image/video', priority: 'medium', expected_impact: '3-4x reach improvement per post based on current data', effort: 'low' },
                { action: 'A/B test two new email subject line formulas against current control', priority: 'medium', expected_impact: 'Recover click-through rate from 3.1% to >4%', effort: 'low' },
                { action: 'Increase Google Ads budget by 15% on top-converting ad groups only', priority: 'high', expected_impact: 'Est. 20-25 additional conversions/month at current ROAS', effort: 'low' },
              ],
              growth_experiments: [
                { experiment: 'TikTok creator partnership with 3 Lagos-based micro-influencers', hypothesis: 'Authentic local creators will drive 2x the follower growth vs brand-only content', kpi: 'New followers per ₦ spent', timeline: '30-day test' },
                { experiment: 'WhatsApp broadcast channel for flash sales and VIP content', hypothesis: 'Direct mobile channel will outperform email CTR by 3x given 87% mobile audience', kpi: 'Message open rate + conversion rate', timeline: '60-day pilot' },
                { experiment: 'YouTube Shorts repurposed from TikTok content', hypothesis: 'Zero-cost distribution expansion — same content, new audience', kpi: 'Views and subscriber growth per hour of effort', timeline: '90-day test' },
              ],
              content_strategy_adjustments: [
                'Move to video-first content calendar — minimum 60% of posts should be video or Reels',
                'Introduce weekly "Lagos life" cultural reference series to boost local relatability',
                'Retire Twitter/X long-form threads; replace with 3-tweet punchy takes under 280 chars',
                'Create platform-specific CTAs — Pidgin English for TikTok/Instagram, formal English for LinkedIn/email',
              ],
              platform_focus_strategy: 'Primary investment: Instagram + TikTok for awareness. Secondary: Google Ads + Email for conversion. Maintenance only: Facebook, Twitter. Explore: WhatsApp Business, YouTube Shorts.',
              conversion_optimization: [
                'Reduce mobile landing page load time to <2s using next-gen image formats and lazy loading',
                'Add social proof (testimonials, review count) above the fold on all landing pages',
                'Implement exit-intent popup with 10% discount for first-time visitors',
                'Set up retargeting campaigns for website visitors who did not convert within 48 hours',
              ],
            }),
            JSON.stringify({
              biggest_risk: 'Over-reliance on Instagram algorithm — a single algorithm change could wipe 30-40% of current reach overnight',
              risk_mitigation: 'Diversify to owned channels (email list, WhatsApp). Aim to grow email list by 500 subscribers/month as insurance.',
              biggest_opportunity: 'WhatsApp Business broadcast channel — 87% of audience is mobile-native and WhatsApp-first. No brand in our category has established a strong presence there.',
              opportunity_how_to_capture: 'Launch WhatsApp broadcast pilot in next 30 days. Promote sign-up via Instagram Stories (swipe-up link) and email footer. Target 1,000 subscribers in first 60 days.',
            }),
            'Demo report generated by seed script',
          ]
        );
      }

      console.log(`[seed] Month ${month + 1}/${MONTHS}: ${label} — inserted ${platforms.length} platform records`);
    }

    console.log('\n[seed] ✓ Complete!');
    console.log('[seed] Demo login:  demo@cerebre.media / demo1234');
    console.log('[seed] Seeded:      6 months × 6 platforms = 36 metric records');
    console.log('[seed] Seeded:      1 full AI analysis report for latest period');
  } catch (err) {
    console.error('[seed] Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
