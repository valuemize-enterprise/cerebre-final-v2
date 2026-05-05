/**
 * Platform metric definitions — what each platform uniquely tracks.
 * Used by: normalization engine, AI prompts, UI field labels.
 */

const PLATFORM_CONFIGS = {

  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    icon: 'instagram',
    funnelRole: 'awareness_engagement',
    uniqueMetrics: {
      reels_views:          { label: 'Reels views',           type: 'number', category: 'content' },
      reels_avg_watch_pct:  { label: 'Reels avg watch %',     type: 'percent', category: 'content' },
      stories_views:        { label: 'Stories views',         type: 'number', category: 'content' },
      stories_replies:      { label: 'Stories replies',       type: 'number', category: 'engagement' },
      stories_exit_rate:    { label: 'Stories exit rate',     type: 'percent', category: 'content' },
      profile_visits:       { label: 'Profile visits',        type: 'number', category: 'awareness' },
      website_clicks_bio:   { label: 'Bio link clicks',       type: 'number', category: 'traffic' },
      ig_shopping_clicks:   { label: 'Shopping clicks',       type: 'number', category: 'conversion' },
      carousel_swipe_rate:  { label: 'Carousel swipe rate',   type: 'percent', category: 'content' },
      reel_shares:          { label: 'Reels shares',          type: 'number', category: 'engagement' },
      non_follower_reach_pct: { label: 'Non-follower reach %', type: 'percent', category: 'awareness' },
    },
    kpiPriority: ['reels_views', 'engagement_rate', 'profile_visits', 'website_clicks_bio'],
    benchmarks: { engagement_rate: 0.033, reels_avg_watch_pct: 0.45 },
    goalMapping: {
      brand_awareness: ['impressions', 'reach', 'reels_views'],
      lead_generation: ['website_clicks_bio', 'ig_shopping_clicks'],
      community_growth: ['followers_gained', 'engagement_rate'],
    },
  },

  tiktok: {
    label: 'TikTok',
    color: '#69C9D0',
    icon: 'tiktok',
    funnelRole: 'awareness_viral',
    uniqueMetrics: {
      fyp_views:            { label: 'For You Page views',    type: 'number', category: 'awareness' },
      fyp_ratio:            { label: 'FYP ratio',             type: 'percent', category: 'awareness' },
      profile_views:        { label: 'Profile views',         type: 'number', category: 'awareness' },
      video_completions:    { label: 'Video completions',     type: 'number', category: 'content' },
      avg_watch_time_sec:   { label: 'Avg watch time (s)',    type: 'number', category: 'content' },
      completion_rate:      { label: 'Completion rate',       type: 'percent', category: 'content' },
      duet_count:           { label: 'Duets',                 type: 'number', category: 'engagement' },
      stitch_count:         { label: 'Stitches',              type: 'number', category: 'engagement' },
      live_viewers:         { label: 'Live viewers',          type: 'number', category: 'engagement' },
      live_duration_min:    { label: 'Live duration (min)',   type: 'number', category: 'content' },
      hashtag_views:        { label: 'Hashtag views',         type: 'number', category: 'awareness' },
      sound_uses:           { label: 'Sound uses',            type: 'number', category: 'viral' },
    },
    kpiPriority: ['fyp_views', 'completion_rate', 'engagement_rate', 'followers_gained'],
    benchmarks: { completion_rate: 0.52, engagement_rate: 0.058 },
    goalMapping: {
      brand_awareness: ['fyp_views', 'impressions', 'reach'],
      community_growth: ['followers_gained', 'duet_count'],
      content_engagement: ['completion_rate', 'avg_watch_time_sec'],
    },
  },

  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    icon: 'facebook',
    funnelRole: 'community_conversion',
    uniqueMetrics: {
      page_views:           { label: 'Page views',            type: 'number', category: 'awareness' },
      organic_reach:        { label: 'Organic reach',         type: 'number', category: 'awareness' },
      paid_reach:           { label: 'Paid reach',            type: 'number', category: 'awareness' },
      video_views_3s:       { label: 'Video views (3s+)',     type: 'number', category: 'content' },
      video_avg_watch_pct:  { label: 'Video avg watch %',     type: 'percent', category: 'content' },
      event_responses:      { label: 'Event responses',       type: 'number', category: 'engagement' },
      check_ins:            { label: 'Check-ins',             type: 'number', category: 'engagement' },
      reactions_breakdown:  { label: 'Reaction types',        type: 'json', category: 'engagement' },
      // {like, love, haha, wow, sad, angry}
      group_members:        { label: 'Group members',         type: 'number', category: 'community' },
      messenger_conversations: { label: 'Messenger convos',  type: 'number', category: 'engagement' },
    },
    kpiPriority: ['organic_reach', 'engagement_rate', 'page_views', 'video_views_3s'],
    benchmarks: { engagement_rate: 0.021, organic_reach: 0.056 },
    goalMapping: {
      community_growth: ['group_members', 'followers_gained'],
      brand_awareness: ['organic_reach', 'page_views'],
      lead_generation: ['messenger_conversations', 'clicks'],
    },
  },

  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: 'linkedin',
    funnelRole: 'b2b_authority',
    uniqueMetrics: {
      post_impressions:       { label: 'Post impressions',      type: 'number', category: 'awareness' },
      unique_visitors:        { label: 'Unique page visitors',  type: 'number', category: 'awareness' },
      page_followers:         { label: 'Page followers',        type: 'number', category: 'community' },
      sponsored_ctr:          { label: 'Sponsored CTR',         type: 'percent', category: 'paid' },
      inmail_open_rate:       { label: 'InMail open rate',      type: 'percent', category: 'engagement' },
      inmail_acceptance_rate: { label: 'InMail accept rate',    type: 'percent', category: 'engagement' },
      employee_advocacy:      { label: 'Employee posts',        type: 'number', category: 'content' },
      job_applications:       { label: 'Job applications',      type: 'number', category: 'conversion' },
      content_downloads:      { label: 'Content downloads',     type: 'number', category: 'conversion' },
      pipeline_generated:     { label: 'Pipeline generated',   type: 'currency', category: 'roi' },
    },
    kpiPriority: ['post_impressions', 'engagement_rate', 'unique_visitors', 'pipeline_generated'],
    benchmarks: { engagement_rate: 0.035, sponsored_ctr: 0.006 },
    goalMapping: {
      lead_generation: ['content_downloads', 'inmail_acceptance_rate'],
      brand_awareness: ['post_impressions', 'unique_visitors'],
      sales_conversion: ['pipeline_generated', 'job_applications'],
    },
  },

  twitter: {
    label: 'Twitter / X',
    color: '#1DA1F2',
    icon: 'twitter',
    funnelRole: 'realtime_awareness',
    uniqueMetrics: {
      tweet_impressions:    { label: 'Tweet impressions',     type: 'number', category: 'awareness' },
      profile_visits:       { label: 'Profile visits',        type: 'number', category: 'awareness' },
      mentions:             { label: 'Mentions',              type: 'number', category: 'engagement' },
      link_clicks:          { label: 'Link clicks',           type: 'number', category: 'traffic' },
      retweets:             { label: 'Retweets',              type: 'number', category: 'viral' },
      quote_tweets:         { label: 'Quote tweets',          type: 'number', category: 'engagement' },
      spaces_listeners:     { label: 'Spaces listeners',      type: 'number', category: 'content' },
      list_subscriptions:   { label: 'List subscriptions',   type: 'number', category: 'community' },
      hashtag_performance:  { label: 'Hashtag reach',         type: 'number', category: 'awareness' },
    },
    kpiPriority: ['tweet_impressions', 'engagement_rate', 'mentions', 'link_clicks'],
    benchmarks: { engagement_rate: 0.018 },
    goalMapping: {
      brand_awareness: ['tweet_impressions', 'mentions'],
      community_growth: ['followers_gained', 'list_subscriptions'],
    },
  },

  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    icon: 'youtube',
    funnelRole: 'deep_engagement',
    uniqueMetrics: {
      views:                { label: 'Views',                  type: 'number', category: 'awareness' },
      watch_time_hours:     { label: 'Watch time (hours)',     type: 'number', category: 'content' },
      avg_view_duration_pct:{ label: 'Avg view duration %',   type: 'percent', category: 'content' },
      ctr_thumbnail:        { label: 'Thumbnail CTR',          type: 'percent', category: 'content' },
      subscribers_gained:   { label: 'Subscribers gained',    type: 'number', category: 'community' },
      subscribers_lost:     { label: 'Subscribers lost',      type: 'number', category: 'community' },
      revenue_estimated:    { label: 'Est. revenue (₦)',       type: 'currency', category: 'roi' },
      shorts_views:         { label: 'Shorts views',           type: 'number', category: 'content' },
      cards_ctr:            { label: 'Cards CTR',              type: 'percent', category: 'engagement' },
      end_screen_ctr:       { label: 'End screen CTR',         type: 'percent', category: 'engagement' },
      playlist_adds:        { label: 'Playlist adds',          type: 'number', category: 'engagement' },
    },
    kpiPriority: ['views', 'watch_time_hours', 'avg_view_duration_pct', 'subscribers_gained'],
    benchmarks: { avg_view_duration_pct: 0.45, ctr_thumbnail: 0.04 },
    goalMapping: {
      brand_awareness: ['views', 'watch_time_hours'],
      content_engagement: ['avg_view_duration_pct', 'ctr_thumbnail'],
      community_growth: ['subscribers_gained'],
    },
  },

  google_ads: {
    label: 'Google Ads',
    color: '#4285F4',
    icon: 'google',
    funnelRole: 'paid_acquisition',
    uniqueMetrics: {
      quality_score:        { label: 'Quality score',          type: 'score', category: 'efficiency' },
      impression_share:     { label: 'Impression share',       type: 'percent', category: 'awareness' },
      search_top_is:        { label: 'Search top IS',          type: 'percent', category: 'awareness' },
      wasted_spend:         { label: 'Wasted spend (₦)',        type: 'currency', category: 'efficiency' },
      pmax_performance:     { label: 'PMax performance',       type: 'score', category: 'paid' },
      smart_bidding_conv:   { label: 'Smart bidding convs',    type: 'number', category: 'conversion' },
      search_volume:        { label: 'Search volume',          type: 'number', category: 'awareness' },
      keyword_ranking:      { label: 'Avg keyword position',  type: 'number', category: 'awareness' },
      responsive_ad_score:  { label: 'Responsive ad strength', type: 'text', category: 'content' },
    },
    kpiPriority: ['roas', 'cpa', 'quality_score', 'impression_share'],
    benchmarks: { roas: 3.5, cpa: 2500 },
    goalMapping: {
      lead_generation: ['conversions', 'smart_bidding_conv'],
      sales_conversion: ['roas', 'revenue'],
      brand_awareness: ['impression_share', 'search_volume'],
    },
  },

  email: {
    label: 'Email',
    color: '#F59E0B',
    icon: 'email',
    funnelRole: 'retention_conversion',
    uniqueMetrics: {
      list_size:            { label: 'List size',              type: 'number', category: 'community' },
      open_rate:            { label: 'Open rate',              type: 'percent', category: 'engagement' },
      click_rate:           { label: 'Click rate',             type: 'percent', category: 'engagement' },
      click_to_open_rate:   { label: 'CTOR',                   type: 'percent', category: 'engagement' },
      unsubscribes:         { label: 'Unsubscribes',           type: 'number', category: 'churn' },
      unsubscribe_rate:     { label: 'Unsubscribe rate',       type: 'percent', category: 'churn' },
      bounce_hard:          { label: 'Hard bounces',           type: 'number', category: 'health' },
      bounce_soft:          { label: 'Soft bounces',           type: 'number', category: 'health' },
      spam_rate:            { label: 'Spam rate',              type: 'percent', category: 'health' },
      deliverability_rate:  { label: 'Deliverability rate',   type: 'percent', category: 'health' },
      revenue_per_email:    { label: 'Revenue per email',      type: 'currency', category: 'roi' },
      automation_revenue:   { label: 'Automation revenue',    type: 'currency', category: 'roi' },
    },
    kpiPriority: ['open_rate', 'click_rate', 'revenue_per_email', 'deliverability_rate'],
    benchmarks: { open_rate: 0.22, click_rate: 0.028 },
    goalMapping: {
      customer_retention: ['open_rate', 'click_rate', 'unsubscribe_rate'],
      lead_generation: ['list_size', 'click_rate'],
      sales_conversion: ['revenue_per_email', 'automation_revenue'],
    },
  },

  website: {
    label: 'Website / GA4',
    color: '#10B981',
    icon: 'globe',
    funnelRole: 'conversion_hub',
    uniqueMetrics: {
      new_users:            { label: 'New users',              type: 'number', category: 'acquisition' },
      returning_users:      { label: 'Returning users',        type: 'number', category: 'retention' },
      pages_per_session:    { label: 'Pages per session',      type: 'number', category: 'engagement' },
      goal_completions:     { label: 'Goal completions',       type: 'number', category: 'conversion' },
      top_landing_pages:    { label: 'Top landing pages',      type: 'json', category: 'content' },
      traffic_sources:      { label: 'Traffic sources',        type: 'json', category: 'acquisition' },
      // {organic: 40%, social: 30%, direct: 20%, paid: 10%}
      core_web_vitals:      { label: 'Core Web Vitals',        type: 'json', category: 'technical' },
      // {lcp: 2.1, fid: 50, cls: 0.1}
      scroll_depth:         { label: 'Avg scroll depth',       type: 'percent', category: 'engagement' },
      chat_engagements:     { label: 'Chat engagements',       type: 'number', category: 'conversion' },
    },
    kpiPriority: ['sessions', 'conversion_rate', 'bounce_rate', 'goal_completions'],
    benchmarks: { bounce_rate: 0.56, conversion_rate: 0.032 },
    goalMapping: {
      lead_generation: ['goal_completions', 'conversion_rate'],
      brand_awareness: ['new_users', 'sessions'],
      customer_retention: ['returning_users', 'pages_per_session'],
    },
  },
};

// Goal types with descriptions
const GOAL_TYPES = {
  brand_awareness:     { label: 'Brand Awareness',      icon: '📣', metric: 'impressions',   unit: 'count' },
  lead_generation:     { label: 'Lead Generation',      icon: '🎯', metric: 'leads',         unit: 'count' },
  sales_conversion:    { label: 'Sales & Revenue',      icon: '💰', metric: 'revenue',        unit: 'naira' },
  community_growth:    { label: 'Community Growth',     icon: '👥', metric: 'followers_total', unit: 'count' },
  customer_retention:  { label: 'Customer Retention',   icon: '🔄', metric: 'retention_rate', unit: 'percent' },
  website_traffic:     { label: 'Website Traffic',      icon: '🌐', metric: 'website_visits', unit: 'count' },
  content_engagement:  { label: 'Content Engagement',   icon: '❤️', metric: 'engagement_rate', unit: 'percent' },
  app_downloads:       { label: 'App Downloads',        icon: '📱', metric: 'conversions',    unit: 'count' },
  event_promotion:     { label: 'Event Promotion',      icon: '🎪', metric: 'clicks',         unit: 'count' },
  custom:              { label: 'Custom Goal',           icon: '✦',  metric: null,            unit: 'count' },
};

module.exports = { PLATFORM_CONFIGS, GOAL_TYPES };
