/**
 * Cerebre Intelligence Platform — Complete Feature Manifest
 * All features, their routes, and which tier they belong to
 */

export const FEATURE_GROUPS = [
  {
    group: 'Command Centre',
    description: 'Executive-level monitoring and oversight',
    features: [
      { route: '/dashboard',     label: 'Dashboard',           icon: 'LayoutDashboard', tier: 'all',          desc: 'Live KPI cards, trend charts, platform overview' },
      { route: '/executive',     label: 'Executive View',      icon: 'Shield',          tier: 'all',          desc: 'Board-level KPIs, scorecards, goal health' },
      { route: '/ask',           label: 'Ask Your Data',       icon: 'Sparkles',        tier: 'professional', desc: 'Conversational AI — ask anything about brand performance' },
      { route: '/alerts',        label: 'Alerts',              icon: 'Bell',            tier: 'all',          desc: 'Real-time crisis detection and threshold alerts' },
    ],
  },
  {
    group: 'Data & Reports',
    description: 'Upload, process, and analyse platform data',
    features: [
      { route: '/upload',        label: 'Upload Reports',      icon: 'Upload',          tier: 'all',          desc: 'PDF/image upload with OCR extraction' },
      { route: '/reports',       label: 'Reports',             icon: 'FileBarChart',    tier: 'all',          desc: 'Full AI-generated platform reports' },
      { route: '/history',       label: 'History',             icon: 'History',         tier: 'all',          desc: 'Time-series performance trends' },
      { route: '/data-health',   label: 'Data Health',         icon: 'Activity',        tier: 'professional', desc: 'Data completeness monitor and gap detection' },
    ],
  },
  {
    group: 'Platforms',
    description: 'Deep-dive into individual platform performance',
    features: [
      { route: '/platforms',     label: 'All Platforms',       icon: 'BarChart2',       tier: 'all',          desc: 'Cross-platform overview and comparison' },
      { route: '/whatsapp',      label: 'WhatsApp Business',   icon: 'MessageSquare',   tier: 'professional', desc: 'Nigeria-critical WhatsApp performance metrics' },
      { route: '/social-commerce', label: 'Social Commerce',  icon: 'ShoppingBag',     tier: 'enterprise',   desc: 'Instagram Shopping, TikTok Shop, catalog sales' },
    ],
  },
  {
    group: 'Strategy & Goals',
    description: 'Set priorities, track objectives, measure progress',
    features: [
      { route: '/goals',         label: 'Priority Goals',      icon: 'Target',          tier: 'all',          desc: 'Ranked business goals — AI always reads these first' },
      { route: '/scorecards',    label: 'Scorecards',          icon: 'ClipboardList',   tier: 'all',          desc: 'Monthly/quarterly/yearly performance grades' },
      { route: '/campaigns',     label: 'Campaigns',           icon: 'Rocket',          tier: 'professional', desc: 'Multi-platform campaign tracking with KPIs' },
    ],
  },
  {
    group: 'Brand Intelligence',
    description: 'Monitor and protect brand health online',
    features: [
      { route: '/brand-health',  label: 'Brand Health',        icon: 'Heart',           tier: 'all',          desc: '8-dimension health score with AI narrative' },
      { route: '/share-of-voice',label: 'Share of Voice',      icon: 'Radio',           tier: 'professional', desc: 'Your % of industry conversation' },
      { route: '/ai-search',     label: 'AI Search Visibility',icon: 'Search',          tier: 'enterprise',   desc: 'How brand appears in ChatGPT, Perplexity, Gemini' },
      { route: '/maturity',      label: 'Digital Maturity',    icon: 'Award',           tier: 'professional', desc: '8-dimension marketing sophistication score' },
    ],
  },
  {
    group: 'Audience & Content',
    description: 'Know your audience, plan better content',
    features: [
      { route: '/calendar',      label: 'Content Calendar',    icon: 'Calendar',        tier: 'professional', desc: 'Visual content planner with AI suggestions' },
      { route: '/cultural-calendar', label: 'Cultural Moments', icon: 'Globe',         tier: 'professional', desc: 'Nigeria/Africa cultural moment intelligence' },
      { route: '/hashtags',      label: 'Hashtag Intelligence',icon: 'Hash',            tier: 'professional', desc: 'Performance, difficulty, trending analysis' },
      { route: '/geo-intelligence', label: 'Geo Intelligence', icon: 'MapPin',         tier: 'enterprise',   desc: 'Where performance is happening across Nigeria' },
      { route: '/audience',      label: 'Audience Personas',   icon: 'Users',           tier: 'enterprise',   desc: 'AI-built audience persona profiles' },
    ],
  },
  {
    group: 'Competitive Intelligence',
    description: 'Monitor competitors and own your market',
    features: [
      { route: '/benchmarks',    label: 'Benchmarks',          icon: 'Scale',           tier: 'all',          desc: 'Industry comparison and competitor analysis' },
      { route: '/competitor-ads',label: 'Competitor Ads',      icon: 'Eye',             tier: 'enterprise',   desc: 'Track competitor ad creatives and strategy' },
      { route: '/seasonal',      label: 'Seasonal Intelligence',icon: 'Snowflake',      tier: 'professional', desc: 'Month-by-month performance patterns' },
    ],
  },
  {
    group: 'Budget & ROI',
    description: 'Maximise return on every marketing naira',
    features: [
      { route: '/roi-calculator',label: 'ROI Calculator',      icon: 'Calculator',      tier: 'professional', desc: 'Model different budget scenarios' },
      { route: '/spend-heatmap', label: 'Spend Heatmap',       icon: 'Flame',           tier: 'enterprise',   desc: 'When budget works hardest by hour/day' },
      { route: '/budget',        label: 'Budget Optimiser',    icon: 'DollarSign',      tier: 'enterprise',   desc: 'AI-recommended budget reallocation' },
      { route: '/utm',           label: 'UTM Builder & Tracker',icon: 'Link',           tier: 'professional', desc: 'Build, manage, and track UTM links' },
    ],
  },
  {
    group: 'Customer & CRM',
    description: 'Connect social to customer business outcomes',
    features: [
      { route: '/crm',           label: 'CRM Integration',     icon: 'Link2',           tier: 'professional', desc: 'Salesforce / HubSpot — pipeline & churn' },
      { route: '/attribution',   label: 'Attribution Modeling',icon: 'GitMerge',        tier: 'enterprise',   desc: 'Data-driven cross-platform attribution' },
      { route: '/first-party',   label: 'First-Party Signals', icon: 'Database',        tier: 'enterprise',   desc: 'Email list, loyalty, app growth tracking' },
    ],
  },
  {
    group: 'Reports & Delivery',
    description: 'Create and share beautiful reports',
    features: [
      { route: '/report-builder',label: 'Report Builder',      icon: 'Layout',          tier: 'professional', desc: 'Drag-and-drop custom report creation' },
      { route: '/board-deck',    label: 'Board Deck Builder',  icon: 'Presentation',    tier: 'enterprise',   desc: 'Auto-generate AI-narrated board presentations' },
      { route: '/digest',        label: 'Weekly Digest',       icon: 'Mail',            tier: 'professional', desc: 'Auto-send performance digest to stakeholders' },
      { route: '/client-portal', label: 'Client Portal',       icon: 'ExternalLink',    tier: 'enterprise',   desc: 'White-labelled client-facing reports' },
    ],
  },
  {
    group: 'Advanced Analytics',
    description: 'Predictive and forward-looking intelligence',
    features: [
      { route: '/predictions',   label: 'Predictive Analytics',icon: 'TrendingUp',      tier: 'enterprise',   desc: '30/90-day forecasts and goal trajectory' },
      { route: '/experiments',   label: 'A/B Experiments',     icon: 'FlaskConical',    tier: 'professional', desc: 'Track content tests and apply winners' },
      { route: '/influencers',   label: 'Influencer Tracker',  icon: 'Star',            tier: 'professional', desc: 'Manage influencer relationships and ROI' },
    ],
  },
  {
    group: 'Team & Workspace',
    description: 'Collaborate, automate, and scale',
    features: [
      { route: '/automations',   label: 'Smart Automations',   icon: 'Zap',             tier: 'enterprise',   desc: 'Trigger-based actions without manual work' },
      { route: '/voice-guardian',label: 'Brand Voice Guardian',icon: 'Shield',          tier: 'professional', desc: 'AI checks content for brand voice compliance' },
      { route: '/tasks',         label: 'Team Tasks',          icon: 'CheckSquare',     tier: 'professional', desc: 'Assign, track, and complete marketing tasks' },
      { route: '/documents',     label: 'Document Library',    icon: 'FileText',        tier: 'enterprise',   desc: 'Upload strategy docs — AI extracts insights' },
    ],
  },
  {
    group: 'Settings',
    description: 'Configure workspace and integrations',
    features: [
      { route: '/settings/workspace/platforms', label: 'Platform Config', icon: 'Settings', tier: 'all', desc: 'Select active platforms and set handles' },
      { route: '/settings',      label: 'Account Settings',    icon: 'User',            tier: 'all',          desc: 'Profile, password, notifications' },
      { route: '/admin',         label: 'Admin Panel',         icon: 'Shield',          tier: 'admin',        desc: 'User management, system health' },
    ],
  },
];

// TOTAL FEATURE COUNT
export const getTotalFeatureCount = () =>
  FEATURE_GROUPS.reduce((sum, g) => sum + g.features.length, 0);

// FEATURES BY TIER
export const getFeaturesByTier = (tier: 'all' | 'professional' | 'enterprise' | 'admin') =>
  FEATURE_GROUPS.flatMap(g => g.features).filter(f => {
    if (tier === 'all') return f.tier === 'all';
    if (tier === 'professional') return ['all', 'professional'].includes(f.tier);
    if (tier === 'enterprise') return ['all', 'professional', 'enterprise'].includes(f.tier);
    if (tier === 'admin') return true;
    return false;
  });

// QUICK-ACCESS NAV (sidebar items — curated subset)
export const SIDEBAR_NAV = [
  { group: null,        route: '/dashboard',      label: 'Dashboard',        icon: 'LayoutDashboard' },
  { group: null,        route: '/executive',      label: 'Executive View',   icon: 'Shield' },
  { group: null,        route: '/ask',            label: 'Ask Your Data',    icon: 'Sparkles' },
  { group: 'Data',      route: '/upload',         label: 'Upload',           icon: 'Upload' },
  { group: 'Data',      route: '/reports',        label: 'Reports',          icon: 'FileBarChart' },
  { group: 'Data',      route: '/platforms',      label: 'Platforms',        icon: 'BarChart2' },
  { group: 'Strategy',  route: '/goals',          label: 'Goals',            icon: 'Target' },
  { group: 'Strategy',  route: '/campaigns',      label: 'Campaigns',        icon: 'Rocket' },
  { group: 'Strategy',  route: '/scorecards',     label: 'Scorecards',       icon: 'ClipboardList' },
  { group: 'Strategy',  route: '/calendar',       label: 'Content Calendar', icon: 'Calendar' },
  { group: 'Brand',     route: '/brand-health',   label: 'Brand Health',     icon: 'Heart' },
  { group: 'Brand',     route: '/share-of-voice', label: 'Share of Voice',   icon: 'Radio' },
  { group: 'Brand',     route: '/ai-search',      label: 'AI Search',        icon: 'Search' },
  { group: 'Market',    route: '/benchmarks',     label: 'Benchmarks',       icon: 'Scale' },
  { group: 'Market',    route: '/cultural-calendar', label: 'Cultural Moments', icon: 'Globe' },
  { group: 'Market',    route: '/geo-intelligence', label: 'Geo Intelligence', icon: 'MapPin' },
  { group: 'Budget',    route: '/roi-calculator', label: 'ROI Calculator',   icon: 'Calculator' },
  { group: 'Budget',    route: '/spend-heatmap',  label: 'Spend Heatmap',    icon: 'Flame' },
  { group: 'Customer',  route: '/crm',            label: 'CRM',              icon: 'Link2' },
  { group: 'Customer',  route: '/whatsapp',       label: 'WhatsApp',         icon: 'MessageSquare' },
  { group: 'Reports',   route: '/report-builder', label: 'Report Builder',   icon: 'Layout' },
  { group: 'Reports',   route: '/board-deck',     label: 'Board Deck',       icon: 'Presentation' },
  { group: 'Reports',   route: '/digest',         label: 'Digest',           icon: 'Mail' },
  { group: 'Tools',     route: '/maturity',       label: 'Maturity Score',   icon: 'Award' },
  { group: 'Tools',     route: '/influencers',    label: 'Influencers',      icon: 'Star' },
  { group: 'Tools',     route: '/experiments',    label: 'Experiments',      icon: 'FlaskConical' },
  { group: 'Tools',     route: '/search',         label: 'Search',           icon: 'Search' },
  { group: 'Tools',     route: '/notifications',  label: 'Notifications',    icon: 'Bell' },
];
