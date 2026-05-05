'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Zap, Globe,
  BarChart2, Mail, Link2, Target, Building2, Loader2,
  ExternalLink, Copy, Eye, EyeOff, Check, AlertCircle,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

/* ──────────────────────────────────────────────────────────────
   SETUP WIZARD — walks brand through every integration step
   Saves progress so they can come back and finish later
────────────────────────────────────────────────────────────── */

const PLATFORMS_CONFIG = [
  { id: 'instagram',  label: 'Instagram',          icon: '📸', color: '#E1306C', method: 'oauth',   priority: 1 },
  { id: 'facebook',   label: 'Facebook Page',      icon: '👥', color: '#1877F2', method: 'oauth',   priority: 2 },
  { id: 'tiktok',     label: 'TikTok Business',    icon: '🎵', color: '#69C9D0', method: 'oauth',   priority: 3 },
  { id: 'linkedin',   label: 'LinkedIn',           icon: '💼', color: '#0A66C2', method: 'oauth',   priority: 4 },
  { id: 'twitter',    label: 'Twitter / X',        icon: '🐦', color: '#1DA1F2', method: 'oauth',   priority: 5 },
  { id: 'youtube',    label: 'YouTube',            icon: '▶️', color: '#FF0000', method: 'oauth',   priority: 6 },
  { id: 'google_analytics', label: 'Google Analytics 4', icon: '📊', color: '#4285F4', method: 'oauth', priority: 7 },
  { id: 'google_ads', label: 'Google Ads',         icon: '🔍', color: '#34A853', method: 'oauth',   priority: 8 },
  { id: 'google_my_business', label: 'Google Reviews', icon: '📍', color: '#FBBC04', method: 'oauth', priority: 9 },
  { id: 'email_mailchimp', label: 'Mailchimp',     icon: '🐒', color: '#FFE01B', method: 'api_key', priority: 10 },
  { id: 'email_klaviyo',   label: 'Klaviyo',       icon: '🟠', color: '#F45F2C', method: 'api_key', priority: 11 },
  { id: 'email_brevo',     label: 'Brevo',         icon: '🔷', color: '#0B996E', method: 'api_key', priority: 12 },
  { id: 'whatsapp_business', label: 'WhatsApp Business', icon: '💬', color: '#25D366', method: 'api_key', priority: 13 },
  { id: 'wordpress',  label: 'WordPress',          icon: '🔵', color: '#21759B', method: 'plugin',  priority: 14 },
  { id: 'shopify',    label: 'Shopify',            icon: '🟢', color: '#96BF48', method: 'oauth',   priority: 15 },
  { id: 'salesforce', label: 'Salesforce CRM',     icon: '☁️', color: '#00A1E0', method: 'oauth',   priority: 16 },
  { id: 'hubspot',    label: 'HubSpot CRM',        icon: '🔶', color: '#FF7A59', method: 'oauth',   priority: 17 },
  { id: 'anthropic',  label: 'Claude AI (Anthropic)', icon: '⚡', color: '#7c3aed', method: 'api_key', priority: 0 },
];

const API_KEY_FIELDS: Record<string, { label: string; placeholder: string; helpUrl: string; helpText: string }> = {
  anthropic:       { label: 'Anthropic API Key', placeholder: 'sk-ant-api03-...', helpUrl: 'https://console.anthropic.com/settings/keys', helpText: 'console.anthropic.com → API Keys → Create Key' },
  email_mailchimp: { label: 'Mailchimp API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21', helpUrl: 'https://mailchimp.com/help/about-api-keys/', helpText: 'Mailchimp → Account → Extras → API Keys' },
  email_klaviyo:   { label: 'Klaviyo Private Key', placeholder: 'pk_xxxxxxxxxxxxxxxxxxxx', helpUrl: 'https://www.klaviyo.com/settings/account/api-keys', helpText: 'Klaviyo → Settings → API Keys → Create Private Key' },
  email_brevo:     { label: 'Brevo API Key', placeholder: 'xkeysib-...', helpUrl: 'https://app.brevo.com/settings/keys/api', helpText: 'Brevo → Settings → API & Integrations → API Keys' },
  whatsapp_business: { label: 'WhatsApp Access Token', placeholder: 'EAAxxxxxxxxxxxxx', helpUrl: 'https://developers.facebook.com/docs/whatsapp', helpText: 'Facebook Developer Console → WhatsApp → Configuration → Permanent Token' },
};

const ApiKeyInput = ({ platformId, value, onChange, onTest }: any) => {
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  const cfg = API_KEY_FIELDS[platformId];
  if (!cfg) return null;

  const handleTest = async () => {
    if (!value) return;
    setTesting(true);
    try {
      const { data } = await api.post('/settings/test-api-key', { platform: platformId, apiKey: value });
      setTestResult(data.valid ? 'pass' : 'fail');
      if (data.valid) toast.success('API key verified!');
      else toast.error('Invalid API key');
    } catch {
      setTestResult('fail');
      toast.error('Could not verify key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{cfg.label}</label>
        <a href={cfg.helpUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-500 hover:underline flex items-center gap-1">
          Where to find it <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={cfg.placeholder}
            className="input-base pr-10 font-mono text-xs"
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={handleTest} disabled={!value || testing} className="btn-secondary px-3 shrink-0">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> :
           testResult === 'pass' ? <Check className="w-4 h-4 text-green-500" /> :
           testResult === 'fail' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
           'Test'}
        </button>
      </div>
      <p className="text-xs text-gray-400">{cfg.helpText}</p>
    </div>
  );
};

type WizardStep = 'welcome' | 'company' | 'ai' | 'platforms' | 'goals' | 'done';

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('welcome');
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [company, setCompany] = useState({ name: '', industry: '', website: '', size: 'enterprise', country: 'Nigeria' });
  const [goal, setGoal] = useState({ category: 'brand_awareness', title: '', target: '', metric: 'impressions', deadline: '' });
  const [oauthConnecting, setOauthConnecting] = useState<string | null>(null);

  useEffect(() => {
    api.get('/platform-connections').then(({ data }) => setConnections(data.connections || [])).catch(() => {});
  }, []);

  const isConnected = (id: string) => connections.some(c => c.platform === id && c.status === 'connected');

  const handleOAuth = async (platformId: string) => {
    setOauthConnecting(platformId);
    try {
      const { data } = await api.get(`/platform-connections/auth-url/${platformId}`);
      window.open(data.authUrl, '_blank', 'width=600,height=700');
      // Poll for connection
      const poll = setInterval(async () => {
        const { data: conn } = await api.get('/platform-connections');
        if ((conn.connections || []).some((c: any) => c.platform === platformId && c.status === 'connected')) {
          clearInterval(poll);
          setConnections(conn.connections);
          setOauthConnecting(null);
          toast.success(`${platformId} connected!`);
        }
      }, 3000);
      setTimeout(() => { clearInterval(poll); setOauthConnecting(null); }, 120000);
    } catch {
      setOauthConnecting(null);
      toast.error('Failed to start connection');
    }
  };

  const saveApiKey = async (platformId: string) => {
    const key = apiKeys[platformId];
    if (!key) return;
    setSaving(true);
    try {
      await api.post('/settings/api-keys', { platform: platformId, apiKey: key });
      setConnections(prev => [...prev.filter(c => c.platform !== platformId), { platform: platformId, status: 'connected' }]);
      toast.success('API key saved');
    } catch { toast.error('Failed to save key'); }
    finally { setSaving(false); }
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      await api.post('/onboarding/company', { ...company, platforms: selectedPlatforms });
      toast.success('Company profile saved');
      setStep('ai');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const STEPS_ORDER: WizardStep[] = ['welcome', 'company', 'ai', 'platforms', 'goals', 'done'];
  const stepIdx = STEPS_ORDER.indexOf(step);
  const progress = (stepIdx / (STEPS_ORDER.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950/30 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>Cerebre Intelligence</p>
            <p className="text-brand-400 text-xs">Setup Wizard</p>
          </div>
        </div>

        {/* Progress */}
        {step !== 'welcome' && step !== 'done' && (
          <div className="mb-6">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1.5">
              {['Company', 'AI Engine', 'Platforms', 'Goals'].map((s, i) => (
                <span key={s} className={clsx(stepIdx > i + 1 ? 'text-brand-400' : stepIdx === i + 1 ? 'text-white' : '')}>
                  {stepIdx > i + 1 ? '✓ ' : ''}{s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

          {/* WELCOME */}
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-brand-500/30">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Welcome to Cerebre Intelligence
                </h1>
                <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
                  This 5-minute setup connects your social media platforms, AI engine, and data sources.
                  Everything will work automatically once configured — no technical knowledge required.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '⚡', label: 'Claude AI powers every insight' },
                  { icon: '🔗', label: 'One-click platform connections' },
                  { icon: '📊', label: 'Real-time board dashboards' },
                ].map(({ icon, label }) => (
                  <div key={label} className="p-3 bg-gray-800 rounded-xl">
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep('company')} className="btn-primary w-full text-base py-3">
                Start setup <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-gray-400">
                Skip — I'll set up later
              </button>
            </div>
          )}

          {/* COMPANY */}
          {step === 'company' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Your company</h2>
                <p className="text-gray-400 text-sm">The AI uses this to tailor every recommendation to your industry</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Company name</label>
                <input className="input-base" placeholder="Stanbic IBTC, Dangote, etc."
                  value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Industry</label>
                <select className="input-base" value={company.industry}
                  onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))}>
                  <option value="">Select industry...</option>
                  {['Banking & Financial Services', 'FMCG / Consumer Goods', 'Restaurant / QSR', 'Retail / E-commerce',
                    'Telecommunications', 'Insurance', 'Real Estate', 'Healthcare / Pharma',
                    'Technology / SaaS', 'Media & Entertainment', 'Oil & Gas', 'Manufacturing',
                    'Education', 'Hospitality & Tourism', 'Non-profit / NGO', 'Government'].map(i => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Company size</label>
                  <select className="input-base" value={company.size}
                    onChange={e => setCompany(c => ({ ...c, size: e.target.value }))}>
                    <option value="startup">Startup (1–50)</option>
                    <option value="sme">SME (51–500)</option>
                    <option value="enterprise">Enterprise (500+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Country</label>
                  <select className="input-base" value={company.country}
                    onChange={e => setCompany(c => ({ ...c, country: e.target.value }))}>
                    {['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Ethiopia',
                      'Tanzania', 'Rwanda', 'UK', 'USA', 'UAE', 'Other'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label>
                <input className="input-base" placeholder="https://yourcompany.com"
                  value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('welcome')} className="btn-secondary flex-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={saveCompany} disabled={!company.name || !company.industry || saving}
                  className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* AI ENGINE */}
          {step === 'ai' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Connect the AI engine</h2>
                <p className="text-gray-400 text-sm">Claude AI by Anthropic powers every analysis, recommendation, and scorecard</p>
              </div>
              <div className="p-4 bg-brand-950/40 border border-brand-800 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-300">Claude AI (claude-sonnet-4)</p>
                    <p className="text-xs text-brand-500">World's most intelligent business AI</p>
                  </div>
                </div>
                <ApiKeyInput
                  platformId="anthropic"
                  value={apiKeys.anthropic || ''}
                  onChange={(v: string) => setApiKeys(k => ({ ...k, anthropic: v }))}
                />
              </div>
              <div className="p-4 bg-gray-800 rounded-xl text-sm text-gray-300 space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <span>💡</span> How to get your free API key:
                </p>
                <ol className="space-y-1 text-gray-400 list-decimal ml-4 text-xs">
                  <li>Go to <a href="https://console.anthropic.com" target="_blank" className="text-brand-400 hover:underline">console.anthropic.com</a></li>
                  <li>Sign up (free — includes $5 in credits)</li>
                  <li>Click <strong className="text-white">API Keys</strong> → <strong className="text-white">Create Key</strong></li>
                  <li>Copy and paste the key above</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('company')} className="btn-secondary flex-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={async () => {
                    if (apiKeys.anthropic) await saveApiKey('anthropic');
                    setStep('platforms');
                  }}
                  disabled={saving}
                  className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {apiKeys.anthropic ? 'Save & Continue' : 'Skip for now'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PLATFORMS */}
          {step === 'platforms' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Connect your platforms</h2>
                <p className="text-gray-400 text-sm">Connect the ones you use — each takes under 60 seconds</p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {PLATFORMS_CONFIG.filter(p => p.id !== 'anthropic').map(platform => {
                  const connected = isConnected(platform.id);
                  const isOAuth = platform.method === 'oauth';
                  const isApiKey = platform.method === 'api_key';
                  const isPlugin = platform.method === 'plugin';
                  const connecting = oauthConnecting === platform.id;

                  return (
                    <div key={platform.id}
                      className={clsx('p-3 rounded-xl border transition-all',
                        connected ? 'border-green-700 bg-green-950/20' : 'border-gray-700 bg-gray-800/50'
                      )}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{platform.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{platform.label}</p>
                          <p className="text-xs text-gray-500 capitalize">{platform.method.replace('_', ' ')}</p>
                        </div>
                        {connected ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : isPlugin ? (
                          <a href="/integrations/wordpress" className="btn-secondary text-xs py-1.5 whitespace-nowrap">
                            Setup guide →
                          </a>
                        ) : isOAuth ? (
                          <button onClick={() => handleOAuth(platform.id)} disabled={connecting}
                            className="btn-primary text-xs py-1.5 whitespace-nowrap">
                            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                            {connecting ? 'Connecting...' : 'Connect'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setApiKeys(k => ({ ...k, [platform.id]: '' }));
                            }}
                            className="btn-secondary text-xs py-1.5 whitespace-nowrap">
                            Add key
                          </button>
                        )}
                      </div>
                      {isApiKey && apiKeys[platform.id] !== undefined && !connected && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <ApiKeyInput
                            platformId={platform.id}
                            value={apiKeys[platform.id] || ''}
                            onChange={(v: string) => setApiKeys(k => ({ ...k, [platform.id]: v }))}
                          />
                          <button onClick={() => saveApiKey(platform.id)} disabled={!apiKeys[platform.id] || saving}
                            className="btn-primary text-xs mt-2 w-full">
                            Save API key
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Connected: {connections.filter(c => c.status === 'connected').length} platforms · You can always add more later
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep('ai')} className="btn-secondary flex-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep('goals')} className="btn-primary flex-1">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* GOALS */}
          {step === 'goals' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Set your first goal</h2>
                <p className="text-gray-400 text-sm">The AI reads this before every analysis — every recommendation will serve this goal</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Goal category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'brand_awareness', label: 'Brand Awareness', icon: '📣' },
                    { id: 'lead_generation', label: 'Lead Generation', icon: '🎯' },
                    { id: 'revenue', label: 'Revenue Growth', icon: '💰' },
                    { id: 'community_growth', label: 'Community Growth', icon: '👥' },
                    { id: 'customer_retention', label: 'Customer Retention', icon: '🔄' },
                    { id: 'custom', label: 'Custom', icon: '✦' },
                  ].map(cat => (
                    <button key={cat.id} onClick={() => setGoal(g => ({ ...g, category: cat.id }))}
                      className={clsx('flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm',
                        goal.category === cat.id
                          ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      )}>
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Goal title</label>
                <input className="input-base" placeholder='e.g. "Grow brand awareness by Q2 2025"'
                  value={goal.title} onChange={e => setGoal(g => ({ ...g, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Target metric</label>
                  <select className="input-base" value={goal.metric}
                    onChange={e => setGoal(g => ({ ...g, metric: e.target.value }))}>
                    {['impressions','leads','revenue','followers_total','conversions','engagement_rate','website_visits'].map(m => (
                      <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Target value</label>
                  <input type="number" className="input-base" placeholder="e.g. 100000"
                    value={goal.target} onChange={e => setGoal(g => ({ ...g, target: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Deadline</label>
                <input type="date" className="input-base" value={goal.deadline}
                  onChange={e => setGoal(g => ({ ...g, deadline: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('platforms')} className="btn-secondary flex-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      if (goal.title) {
                        await api.post('/goals', {
                          goal_category: goal.category,
                          title: goal.title,
                          target_metric: goal.metric,
                          target_value: parseFloat(goal.target) || 0,
                          deadline: goal.deadline,
                          horizon: 'quarterly',
                        });
                      }
                      await api.post('/onboarding/complete');
                      setStep('done');
                    } catch { toast.error('Failed to save'); }
                    finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {goal.title ? 'Save & Launch' : 'Skip & Launch'}
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Cerebre is now connected and pulling data from your platforms.
                  Your first AI analysis will be ready within a few minutes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { label: 'Platforms connected', value: `${connections.filter(c => c.status === 'connected').length}`, color: 'text-green-400' },
                  { label: 'AI engine', value: apiKeys.anthropic ? 'Claude AI ✓' : 'Set up later', color: apiKeys.anthropic ? 'text-brand-400' : 'text-gray-400' },
                  { label: 'First sync', value: 'In progress...', color: 'text-amber-400' },
                  { label: 'Board ready', value: 'Yes', color: 'text-green-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className={clsx('text-sm font-semibold', color)}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <button onClick={() => router.push('/dashboard')} className="btn-primary w-full text-base py-3">
                  Go to dashboard <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => router.push('/connect')} className="btn-secondary w-full text-sm">
                  Add more platforms
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
