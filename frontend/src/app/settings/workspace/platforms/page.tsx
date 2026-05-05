'use client';
import { useEffect, useState } from 'react';
import { Check, Plus, X, Info, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '@/lib/api';

const ALL_PLATFORMS = [
  {
    id: 'instagram',  label: 'Instagram',   color: '#E1306C', icon: '📸',
    desc: 'Visual content, Reels, Stories, Shopping',
    bestFor: ['brand_awareness', 'community', 'ecommerce', 'fashion', 'food', 'lifestyle'],
    uniqueMetrics: 'Reels views, FYP rate, Story exit rate, Bio link clicks',
  },
  {
    id: 'tiktok',     label: 'TikTok',      color: '#69C9D0', icon: '🎵',
    desc: 'Short-form video, viral content, Gen Z audience',
    bestFor: ['brand_awareness', 'youth_marketing', 'entertainment', 'fmcg'],
    uniqueMetrics: 'FYP ratio, Completion rate, Duets, Sound uses',
  },
  {
    id: 'facebook',   label: 'Facebook',    color: '#1877F2', icon: '👥',
    desc: 'Community, ads, events, diverse demographics',
    bestFor: ['community', 'events', 'local_business', 'b2c'],
    uniqueMetrics: 'Organic reach, Video 3s views, Event responses, Messenger conversations',
  },
  {
    id: 'linkedin',   label: 'LinkedIn',    color: '#0A66C2', icon: '💼',
    desc: 'B2B, professional content, thought leadership',
    bestFor: ['b2b', 'recruitment', 'fintech', 'consulting', 'technology'],
    uniqueMetrics: 'Post impressions, InMail acceptance, Pipeline generated',
  },
  {
    id: 'twitter',    label: 'Twitter / X', color: '#1DA1F2', icon: '🐦',
    desc: 'Real-time conversations, news, brand voice',
    bestFor: ['media', 'fintech', 'tech', 'news', 'advocacy'],
    uniqueMetrics: 'Impressions, Mentions, Quote tweets, Spaces listeners',
  },
  {
    id: 'youtube',    label: 'YouTube',     color: '#FF0000', icon: '▶️',
    desc: 'Long-form video, tutorials, brand storytelling',
    bestFor: ['education', 'entertainment', 'tech', 'healthcare', 'beauty'],
    uniqueMetrics: 'Watch time, Avg view duration, Thumbnail CTR, Shorts views',
  },
  {
    id: 'google_ads', label: 'Google Ads',  color: '#4285F4', icon: '🔍',
    desc: 'Search, Display, Shopping, YouTube ads',
    bestFor: ['lead_generation', 'ecommerce', 'local_business', 'saas'],
    uniqueMetrics: 'Quality Score, Impression share, ROAS, Wasted spend',
  },
  {
    id: 'email',      label: 'Email',       color: '#F59E0B', icon: '✉️',
    desc: 'CRM, nurture sequences, newsletters, automation',
    bestFor: ['retention', 'ecommerce', 'saas', 'b2b', 'events'],
    uniqueMetrics: 'Open rate, CTOR, Deliverability, Revenue per email',
  },
  {
    id: 'website',    label: 'Website / GA4', color: '#10B981', icon: '🌐',
    desc: 'Organic traffic, conversions, user behaviour',
    bestFor: ['all industries'],
    uniqueMetrics: 'Core Web Vitals, Traffic sources, Goal completions, Scroll depth',
  },
  {
    id: 'whatsapp',   label: 'WhatsApp Business', color: '#25D366', icon: '💬',
    desc: 'Direct messaging, broadcasts, customer service (Africa-critical)',
    bestFor: ['retail', 'fmcg', 'local_business', 'nigeria'],
    uniqueMetrics: 'Message open rate, Response time, Broadcast reach, Conversion from chat',
  },
  {
    id: 'threads',    label: 'Threads',     color: '#000000', icon: '🧵',
    desc: 'Instagram text content, emerging platform',
    bestFor: ['media', 'lifestyle', 'brand_voice'],
    uniqueMetrics: 'Impressions, Replies, Reposts',
  },
  {
    id: 'pinterest',  label: 'Pinterest',   color: '#E60023', icon: '📌',
    desc: 'Visual discovery, inspiration, shopping intent',
    bestFor: ['fashion', 'food', 'interior', 'diy', 'beauty'],
    uniqueMetrics: 'Outbound clicks, Saves, Monthly viewers',
  },
];

export default function PlatformSelectorPage() {
  const [brand, setBrand] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get('/brands/current').then(({ data }) => {
      setBrand(data.brand);
      setSelected(data.brand?.active_platforms || []);
      // Load existing handles
      if (data.brand?.platform_handles) {
        setHandles(data.brand.platform_handles);
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const setHandle = (platform: string, handle: string) => {
    setHandles(prev => ({ ...prev, [platform]: handle }));
  };

  const save = async () => {
    if (selected.length === 0) { toast.error('Select at least one platform'); return; }
    setSaving(true);
    try {
      await api.put('/brands/platforms', { platforms: selected, handles });
      toast.success(`${selected.length} platform${selected.length !== 1 ? 's' : ''} saved — AI will only analyse these`);
    } catch {
      toast.error('Failed to save platforms');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Platform Configuration</h1>
          <p className="text-sm text-gray-400 mt-1">
            Select only the platforms your brand uses. The AI will never mention or recommend platforms you haven't selected.
          </p>
        </div>
        <button onClick={save} disabled={saving || selected.length === 0} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : `Save ${selected.length} platform${selected.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800 rounded-xl flex gap-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Only select platforms you actively post on.</strong> Adding a platform you don't use will lower your brand health scores and create misleading benchmarks. You can change this at any time.
        </p>
      </div>

      {/* Industry recommendation */}
      {brand?.industry && (
        <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-xl">
          <p className="text-xs font-semibold text-brand-600 mb-2">Recommended for {brand.industry}</p>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS
              .filter(p => p.bestFor.some(b => b === 'all industries' || brand.industry?.toLowerCase().includes(b)))
              .map(p => (
                <span key={p.id} className="text-xs text-brand-700 dark:text-brand-400 flex items-center gap-1">
                  {p.icon} {p.label}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Platform grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_PLATFORMS.map(platform => {
          const isSelected = selected.includes(platform.id);
          const isExpanded = expanded === platform.id;

          return (
            <div key={platform.id}
              className={clsx(
                'border rounded-xl overflow-hidden transition-all',
                isSelected
                  ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
              )}>
              <div className="flex items-center gap-3 p-3.5 cursor-pointer"
                onClick={() => toggle(platform.id)}>
                <span className="text-xl">{platform.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-semibold', isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200')}>
                    {platform.label}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{platform.desc}</p>
                </div>
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                  isSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300 dark:border-gray-600'
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {isSelected && (
                <div className="border-t border-brand-100 dark:border-brand-800 px-3.5 py-3 space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Handle / page name</label>
                  <input
                    className="input-base text-xs py-1.5"
                    placeholder={`@${platform.id}handle`}
                    value={handles[platform.id] || ''}
                    onChange={e => setHandle(platform.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                  <p className="text-xs text-gray-400">Tracked metrics: {platform.uniqueMetrics}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{selected.length}</strong> platform{selected.length !== 1 ? 's' : ''} selected
            — <span className="text-brand-600">AI will focus exclusively on these</span>
          </p>
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save configuration
          </button>
        </div>
      )}
    </div>
  );
}
