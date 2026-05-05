'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, AlertCircle, Link2, ExternalLink, Copy,
  Code2, Webhook, Globe, Mail, ShoppingCart, CreditCard,
  MessageSquare, BarChart2, Loader2, ChevronRight, Info,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ── Integration Registry ──────────────────────────────────────
const INTEGRATIONS = [
  // ── SOCIAL MEDIA ────────────────────────────────────────────
  {
    category: 'Social Media',
    icon: BarChart2,
    color: '#7c3aed',
    items: [
      { id: 'instagram',   name: 'Instagram',            logo: '📸', authType: 'oauth',  route: '/connect#instagram',   status: 'available', dataType: 'Real-time API' },
      { id: 'facebook',    name: 'Facebook Page',        logo: '👥', authType: 'oauth',  route: '/connect#facebook',    status: 'available', dataType: 'Real-time API' },
      { id: 'tiktok',      name: 'TikTok Business',      logo: '🎵', authType: 'oauth',  route: '/connect#tiktok',      status: 'available', dataType: 'Real-time API' },
      { id: 'linkedin',    name: 'LinkedIn',             logo: '💼', authType: 'oauth',  route: '/connect#linkedin',    status: 'available', dataType: 'Real-time API' },
      { id: 'twitter',     name: 'Twitter / X',          logo: '🐦', authType: 'oauth',  route: '/connect#twitter',     status: 'available', dataType: 'Real-time API' },
      { id: 'youtube',     name: 'YouTube',              logo: '▶️', authType: 'oauth',  route: '/connect#youtube',     status: 'available', dataType: 'Real-time API' },
    ],
  },

  // ── GOOGLE ──────────────────────────────────────────────────
  {
    category: 'Google',
    icon: BarChart2,
    color: '#4285F4',
    items: [
      { id: 'ga4',         name: 'Google Analytics 4',  logo: '📊', authType: 'oauth',  route: '/connect#google_analytics', status: 'available', dataType: 'Real-time + hourly', highlight: 'Live active users' },
      { id: 'google_ads',  name: 'Google Ads',          logo: '🔍', authType: 'oauth',  route: '/connect#google_ads',       status: 'available', dataType: 'Hourly' },
      { id: 'gmb',         name: 'Google Business Profile', logo: '📍', authType: 'oauth', route: '/connect#google_my_business', status: 'available', dataType: 'Every 6h' },
    ],
  },

  // ── WEBSITE / CMS ────────────────────────────────────────────
  {
    category: 'Website & CMS',
    icon: Globe,
    color: '#10B981',
    items: [
      { id: 'wordpress',   name: 'WordPress',            logo: '🔵', authType: 'plugin', route: '/integrations/wordpress',  status: 'available', dataType: 'Plugin + webhook' },
      { id: 'woocommerce', name: 'WooCommerce',          logo: '🛒', authType: 'plugin', route: '/integrations/wordpress',  status: 'available', dataType: 'Real-time events' },
      { id: 'shopify',     name: 'Shopify',              logo: '🟢', authType: 'oauth',  route: '/connect#shopify',          status: 'coming_soon', dataType: 'Webhook' },
      { id: 'webflow',     name: 'Webflow',              logo: '⚡', authType: 'api_key', route: '/integrations/webflow',    status: 'coming_soon', dataType: 'Webhook' },
      { id: 'squarespace', name: 'Squarespace',          logo: '⬛', authType: 'api_key', route: '/integrations/squarespace', status: 'coming_soon', dataType: 'API' },
    ],
  },

  // ── EMAIL MARKETING ──────────────────────────────────────────
  {
    category: 'Email Marketing',
    icon: Mail,
    color: '#F59E0B',
    items: [
      { id: 'mailchimp',   name: 'Mailchimp',            logo: '🐒', authType: 'api_key', route: '/connect#email_mailchimp', status: 'available', dataType: 'Daily sync' },
      { id: 'klaviyo',     name: 'Klaviyo',              logo: '🟠', authType: 'api_key', route: '/connect#email_klaviyo',   status: 'available', dataType: 'Daily sync' },
      { id: 'brevo',       name: 'Brevo (Sendinblue)',   logo: '🔷', authType: 'api_key', route: '/connect#email_brevo',     status: 'available', dataType: 'Daily sync' },
      { id: 'sendgrid',    name: 'SendGrid',             logo: '🟦', authType: 'api_key', route: '/connect#email_sendgrid',  status: 'coming_soon', dataType: 'Daily sync' },
    ],
  },

  // ── CRM ─────────────────────────────────────────────────────
  {
    category: 'CRM',
    icon: MessageSquare,
    color: '#0A66C2',
    items: [
      { id: 'salesforce',  name: 'Salesforce',           logo: '☁️', authType: 'oauth',   route: '/crm',   status: 'available', dataType: 'Daily sync', highlight: 'Pipeline + churn' },
      { id: 'hubspot',     name: 'HubSpot',              logo: '🔶', authType: 'oauth',   route: '/crm',   status: 'available', dataType: 'Daily sync', highlight: 'Deals + contacts' },
      { id: 'zoho',        name: 'Zoho CRM',             logo: '🔵', authType: 'oauth',   route: '/crm',   status: 'coming_soon', dataType: 'Daily sync' },
      { id: 'pipedrive',   name: 'Pipedrive',            logo: '🟢', authType: 'oauth',   route: '/crm',   status: 'coming_soon', dataType: 'Daily sync' },
    ],
  },

  // ── E-COMMERCE ───────────────────────────────────────────────
  {
    category: 'E-Commerce & Payments',
    icon: ShoppingCart,
    color: '#E1306C',
    items: [
      { id: 'flutterwave', name: 'Flutterwave',          logo: '🦋', authType: 'api_key', route: '/integrations/flutterwave', status: 'coming_soon', dataType: 'Webhook', highlight: 'Nigeria payments' },
      { id: 'paystack',    name: 'Paystack',             logo: '💚', authType: 'api_key', route: '/integrations/paystack',    status: 'coming_soon', dataType: 'Webhook', highlight: 'Nigeria payments' },
      { id: 'stripe',      name: 'Stripe',               logo: '🟣', authType: 'oauth',   route: '/integrations/stripe',      status: 'coming_soon', dataType: 'Webhook' },
    ],
  },

  // ── REVIEWS & REPUTATION ─────────────────────────────────────
  {
    category: 'Reviews & Reputation',
    icon: CheckCircle2,
    color: '#FBBC04',
    items: [
      { id: 'gmb_reviews', name: 'Google Reviews',       logo: '⭐', authType: 'oauth',   route: '/connect#google_my_business', status: 'available', dataType: 'Every 6h' },
      { id: 'tripadvisor', name: 'TripAdvisor',          logo: '🦉', authType: 'api_key', route: '/integrations/tripadvisor',   status: 'coming_soon', dataType: 'Daily' },
      { id: 'trustpilot',  name: 'Trustpilot',           logo: '🌟', authType: 'api_key', route: '/integrations/trustpilot',    status: 'coming_soon', dataType: 'Daily' },
      { id: 'jumia_reviews', name: 'Jumia Reviews',      logo: '🛍', authType: 'api_key', route: '/integrations/jumia',         status: 'coming_soon', dataType: 'Daily', highlight: 'Africa-specific' },
    ],
  },

  // ── WHATSAPP ─────────────────────────────────────────────────
  {
    category: 'Messaging',
    icon: MessageSquare,
    color: '#25D366',
    items: [
      { id: 'whatsapp_business', name: 'WhatsApp Business API', logo: '💬', authType: 'api_key', route: '/whatsapp', status: 'available', dataType: 'Daily sync', highlight: 'Critical for Nigeria' },
    ],
  },

  // ── CUSTOM / DEVELOPER ──────────────────────────────────────
  {
    category: 'Custom & Developer',
    icon: Code2,
    color: '#374151',
    items: [
      { id: 'rest_api',    name: 'REST API',             logo: '🔌', authType: 'api_key', route: '/integrations/api',       status: 'available', dataType: 'Push anytime' },
      { id: 'webhook',     name: 'Generic Webhook',      logo: '⚡', authType: 'token',   route: '/integrations/webhooks',  status: 'available', dataType: 'Real-time push' },
      { id: 'zapier',      name: 'Zapier',               logo: '⚡', authType: 'webhook', route: '/integrations/zapier',    status: 'available', dataType: 'Triggered events' },
      { id: 'make',        name: 'Make (Integromat)',     logo: '🔄', authType: 'webhook', route: '/integrations/make',      status: 'available', dataType: 'Triggered events' },
      { id: 'google_sheets', name: 'Google Sheets Import', logo: '📋', authType: 'upload', route: '/upload',                status: 'available', dataType: 'Manual upload' },
    ],
  },
];

const STATUS_BADGE = {
  available:    { label: 'Available',    color: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900' },
  coming_soon:  { label: 'Coming soon',  color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700' },
  beta:         { label: 'Beta',         color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' },
};

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/platform-connections'),
      api.get('/settings/api-key'),
      api.get('/settings/webhook-url'),
    ]).then(([connRes, keyRes, webhookRes]) => {
      setConnections(connRes.data.connections || []);
      setApiKey(keyRes.data.apiKey || '');
      setWebhookUrl(webhookRes.data.webhookUrl || `${window.location.origin.replace('3000','4000')}/api/webhooks/generic/${keyRes.data.brandId}`);
    }).finally(() => setLoading(false));
  }, []);

  const getConnectionStatus = (integrationId: string) => {
    return connections.find(c => c.platform === integrationId || c.platform.startsWith(integrationId));
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const totalAvailable = INTEGRATIONS.flatMap(g => g.items).filter(i => i.status === 'available').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-sm text-gray-400 mt-1">
            Connect every tool your brand uses — data flows in automatically
          </p>
        </div>
        <div className="card px-5 py-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{connectedCount}</p>
            <p className="text-xs text-gray-400">connected</p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{totalAvailable}</p>
            <p className="text-xs text-gray-400">available</p>
          </div>
        </div>
      </div>

      {/* Data flow explanation */}
      <div className="card p-5 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/20 dark:to-purple-950/20 border-brand-100 dark:border-brand-800">
        <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-3">How data flows into Cerebre</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="text-2xl shrink-0">🔗</span>
            <div>
              <p className="font-semibold text-brand-700 dark:text-brand-400">OAuth connection</p>
              <p className="text-xs text-brand-600 dark:text-brand-500 mt-0.5">Click Connect → login to the platform → done. Cerebre pulls data automatically. Used for social media, Google, CRM.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl shrink-0">🔌</span>
            <div>
              <p className="font-semibold text-brand-700 dark:text-brand-400">Plugin / API key</p>
              <p className="text-xs text-brand-600 dark:text-brand-500 mt-0.5">Install a plugin (WordPress) or paste an API key. Data syncs on a schedule. Used for email, website, payments.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl shrink-0">📤</span>
            <div>
              <p className="font-semibold text-brand-700 dark:text-brand-400">Webhook / Push</p>
              <p className="text-xs text-brand-600 dark:text-brand-500 mt-0.5">Your system sends data to Cerebre when events happen (order placed, form submitted). Real-time, zero delay.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration categories */}
      {INTEGRATIONS.map(group => {
        const GroupIcon = group.icon;
        return (
          <div key={group.category}>
            <div className="flex items-center gap-2 mb-3">
              <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.category}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map(integration => {
                const conn = getConnectionStatus(integration.id);
                const isConnected = conn?.status === 'connected';
                const badge = STATUS_BADGE[integration.status as keyof typeof STATUS_BADGE] || STATUS_BADGE.coming_soon;

                return (
                  <div key={integration.id}
                    className={clsx('card p-4 transition-all', isConnected && 'border-green-200 dark:border-green-900')}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{integration.logo}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{integration.name}</p>
                        <p className="text-xs text-gray-400">{integration.dataType}</p>
                      </div>
                      {isConnected
                        ? <span className="badge-success flex items-center gap-1 text-xs shrink-0"><CheckCircle2 className="w-3 h-3" />Live</span>
                        : <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', badge.color)}>{badge.label}</span>
                      }
                    </div>

                    {integration.highlight && (
                      <p className="text-xs text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-1">
                        <span>⭐</span> {integration.highlight}
                      </p>
                    )}

                    {integration.status === 'available' && (
                      <Link href={integration.route}
                        className={clsx('text-xs flex items-center gap-1 font-medium transition-colors',
                          isConnected
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-brand-600 hover:text-brand-700'
                        )}>
                        {isConnected ? 'View settings' : 'Set up'} <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Developer tools */}
      <div className="card p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Developer tools</h3>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your API Key</label>
          <div className="flex gap-2">
            <input type="password" readOnly value={apiKey}
              className="input-base font-mono text-xs flex-1" />
            <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copied'); }}
              className="btn-secondary px-3">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Use in Authorization header: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">Bearer YOUR_API_KEY</code></p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Webhook URL</label>
          <div className="flex gap-2">
            <input type="text" readOnly value={webhookUrl}
              className="input-base font-mono text-xs flex-1" />
            <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied'); }}
              className="btn-secondary px-3">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">POST JSON to this URL from Zapier, Make, or any custom integration</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Example: Push data from any system</p>
          <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">{`POST ${webhookUrl}
Content-Type: application/json

{
  "platform": "pos_system",
  "metrics": {
    "revenue": 485000,
    "transactions": 142,
    "avg_order_value": 3415
  },
  "period_start": "2025-03-01",
  "period_end": "2025-03-31"
}`}</pre>
        </div>
      </div>
    </div>
  );
}
