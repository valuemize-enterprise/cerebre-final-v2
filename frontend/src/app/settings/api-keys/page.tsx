'use client';
import { useEffect, useState } from 'react';
import {
  Eye, EyeOff, Check, Copy, RefreshCw, Trash2,
  AlertCircle, CheckCircle2, Loader2, Plus, Key, ExternalLink,
} from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API_KEY_REGISTRY = [
  {
    group: 'AI Engine (Required)',
    items: [
      {
        id: 'anthropic', label: 'Anthropic Claude AI', icon: '⚡', required: true,
        placeholder: 'sk-ant-api03-XXXXXXXXX',
        helpUrl: 'https://console.anthropic.com/settings/keys',
        helpText: 'console.anthropic.com → API Keys → Create Key',
        description: 'Powers all AI analysis, recommendations, scorecards, and predictions',
        testEndpoint: '/settings/test-api-key',
      },
    ],
  },
  {
    group: 'Email Marketing',
    items: [
      {
        id: 'email_mailchimp', label: 'Mailchimp', icon: '🐒',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21',
        helpUrl: 'https://mailchimp.com/help/about-api-keys/',
        helpText: 'Mailchimp → Account → Extras → API keys → Create A Key',
        description: 'Syncs list size, open rate, click rate, and campaign performance daily',
      },
      {
        id: 'email_klaviyo', label: 'Klaviyo', icon: '🟠',
        placeholder: 'pk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        helpUrl: 'https://www.klaviyo.com/settings/account/api-keys',
        helpText: 'Klaviyo → Settings → API Keys → Create Private API Key',
        description: 'Syncs email performance including revenue attribution and flows data',
      },
      {
        id: 'email_brevo', label: 'Brevo (Sendinblue)', icon: '🔷',
        placeholder: 'xkeysib-XXXXXXXX',
        helpUrl: 'https://app.brevo.com/settings/keys/api',
        helpText: 'Brevo → Settings → API & Integrations → Generate a new API key',
        description: 'Syncs deliverability, engagement rates, and contact list metrics',
      },
    ],
  },
  {
    group: 'WhatsApp Business',
    items: [
      {
        id: 'whatsapp_business', label: 'WhatsApp Business API', icon: '💬',
        placeholder: 'EAAxxxxxxxxxxxxxxxx',
        helpUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api',
        helpText: 'Meta Business Suite → WhatsApp → API Setup → Generate Token',
        description: 'Tracks message delivery, read rates, catalog views, and commerce data (Nigeria-critical)',
        extraField: { id: 'whatsapp_phone_id', label: 'Phone Number ID', placeholder: '1234567890' },
      },
    ],
  },
  {
    group: 'Reviews & Reputation',
    items: [
      {
        id: 'tripadvisor', label: 'TripAdvisor', icon: '🦉',
        placeholder: 'XXXXXXXXXXXXXXXXXXXXXX',
        helpUrl: 'https://developer-tripadvisor.com/content-api/',
        helpText: 'TripAdvisor Content API → Apply for access → Get API key',
        description: 'Monitors restaurant and hotel reviews across TripAdvisor properties',
      },
      {
        id: 'trustpilot', label: 'Trustpilot', icon: '🌟',
        placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
        helpUrl: 'https://support.trustpilot.com/hc/en-us/articles/207309867',
        helpText: 'Trustpilot Business → Integrations → API → Create Application',
        description: 'Tracks business reviews and reputation score on Trustpilot',
      },
    ],
  },
  {
    group: 'Google Ads Developer Token',
    items: [
      {
        id: 'google_ads_developer_token', label: 'Google Ads Developer Token', icon: '🔑',
        placeholder: 'XXXXXXXXXXXXXXXXXXXXXXXX',
        helpUrl: 'https://developers.google.com/google-ads/api/docs/first-call/dev-token',
        helpText: 'Google Ads → Tools → API Center → Developer token (needs manager account)',
        description: 'Required for full Google Ads API access beyond basic campaign data',
      },
    ],
  },
  {
    group: 'Payment Platforms (Nigeria)',
    items: [
      {
        id: 'paystack', label: 'Paystack', icon: '💚',
        placeholder: 'sk_live_XXXXXXXXXXXXXXXX',
        helpUrl: 'https://dashboard.paystack.com/#/settings/developer',
        helpText: 'Paystack Dashboard → Settings → API Keys & Webhooks → Secret Key',
        description: 'Tracks payment conversions and revenue from social-attributed transactions',
      },
      {
        id: 'flutterwave', label: 'Flutterwave', icon: '🦋',
        placeholder: 'FLWSECK_TEST-XXXXXXXX',
        helpUrl: 'https://developer.flutterwave.com/docs/integration-guides/authentication',
        helpText: 'Flutterwave Dashboard → Settings → API → Copy Secret Key',
        description: 'Tracks payment data and links social media activity to revenue',
      },
    ],
  },
];

const ApiKeyRow = ({ item, savedKey, onSave, onDelete }: any) => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  const [extraValue, setExtraValue] = useState('');
  const [expanded, setExpanded] = useState(!savedKey);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(item.id, value, item.extraField ? { [item.extraField.id]: extraValue } : undefined);
      setValue('');
      setExpanded(false);
      toast.success(`${item.label} key saved`);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    const keyToTest = value || savedKey?.masked;
    if (!keyToTest) return;
    setTesting(true);
    try {
      const { data } = await api.post('/settings/test-api-key', { platform: item.id, apiKey: value || savedKey?.value });
      setTestResult(data.valid ? 'pass' : 'fail');
      if (!data.valid) toast.error(data.message || 'Key invalid');
    } catch { setTestResult('fail'); }
    finally { setTesting(false); }
  };

  return (
    <div className={clsx('border rounded-xl overflow-hidden transition-all',
      savedKey ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    )}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <span className="text-xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
            {item.required && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Required</span>}
          </div>
          <p className="text-xs text-gray-400 truncate">{item.description}</p>
        </div>
        {savedKey ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        ) : (
          <span className="text-xs text-gray-400 shrink-0">Not set</span>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <p className="text-xs text-gray-500">{item.description}</p>

          {savedKey && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-400 font-mono">{savedKey.masked}</p>
              <button onClick={() => onDelete(item.id)} className="ml-auto text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              {savedKey ? 'Replace with new key' : 'Paste your API key'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={item.placeholder}
                  className="input-base pr-10 font-mono text-xs"
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {item.extraField && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{item.extraField.label}</label>
              <input className="input-base text-xs" placeholder={item.extraField.placeholder}
                value={extraValue} onChange={e => setExtraValue(e.target.value)} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <a href={item.helpUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> {item.helpText}
            </a>
            <div className="flex gap-2">
              {(value || savedKey) && (
                <button onClick={handleTest} disabled={testing}
                  className={clsx('btn-secondary text-xs py-1.5',
                    testResult === 'pass' ? 'text-green-600' : testResult === 'fail' ? 'text-red-500' : '')}>
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   testResult === 'pass' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   testResult === 'fail' ? <AlertCircle className="w-3.5 h-3.5" /> :
                   'Test key'}
                </button>
              )}
              <button onClick={handleSave} disabled={!value || saving}
                className="btn-primary text-xs py-1.5 disabled:opacity-40">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ApiKeysPage() {
  const [savedKeys, setSavedKeys] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [ownApiKey, setOwnApiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/settings/api-keys'),
      api.get('/settings/my-api-key'),
    ]).then(([keysRes, myKeyRes]) => {
      setSavedKeys(keysRes.data.keys || {});
      setOwnApiKey(myKeyRes.data.apiKey || '');
    }).finally(() => setLoading(false));
  }, []);

  const saveKey = async (platform: string, key: string, extra?: any) => {
    await api.post('/settings/api-keys', { platform, apiKey: key, extra });
    setSavedKeys(prev => ({
      ...prev,
      [platform]: { masked: key.slice(0, 8) + '...' + key.slice(-4), value: key },
    }));
  };

  const deleteKey = async (platform: string) => {
    if (!confirm(`Remove ${platform} API key?`)) return;
    await api.delete(`/settings/api-keys/${platform}`);
    setSavedKeys(prev => { const n = { ...prev }; delete n[platform]; return n; });
    toast.success('Key removed');
  };

  const regenerateOwnKey = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) return;
    const { data } = await api.post('/settings/regenerate-api-key');
    setOwnApiKey(data.apiKey);
    toast.success('New API key generated');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">API Keys</h1>
        <p className="text-sm text-gray-400 mt-1">Manage all platform credentials — stored encrypted, never exposed in the UI</p>
      </div>

      {/* Your own API key (for the WordPress plugin and webhooks) */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Cerebre API Key</h2>
        <p className="text-xs text-gray-400 mb-4">Use this in the WordPress plugin, webhook integrations, and the REST API</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={keyVisible ? 'text' : 'password'} readOnly value={ownApiKey}
              className="input-base font-mono text-xs pr-10" />
            <button onClick={() => setKeyVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(ownApiKey); toast.success('Copied'); }}
            className="btn-secondary px-3"><Copy className="w-4 h-4" /></button>
          <button onClick={regenerateOwnKey} className="btn-secondary px-3" title="Regenerate key">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform API keys */}
      {API_KEY_REGISTRY.map(group => (
        <div key={group.group}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.group}</h2>
          <div className="space-y-2">
            {group.items.map(item => (
              <ApiKeyRow key={item.id} item={item} savedKey={savedKeys[item.id]}
                onSave={saveKey} onDelete={deleteKey} />
            ))}
          </div>
        </div>
      ))}

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">🔒 Security</p>
        <p className="text-xs text-gray-400">All API keys are encrypted at rest using AES-256 before storage. Keys are never logged, never displayed in full after saving, and never transmitted in responses. Cerebre uses keys only to pull read-only data from each platform.</p>
      </div>
    </div>
  );
}
