'use client';
import { useEffect, useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Loader2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

const AI_SEARCH_PLATFORMS = [
  { id: 'chatgpt',     label: 'ChatGPT',       icon: '🤖', color: '#10a37f', description: 'OpenAI GPT-4 responses' },
  { id: 'perplexity',  label: 'Perplexity',    icon: '🔭', color: '#20808D', description: 'AI-native search engine' },
  { id: 'gemini',      label: 'Google Gemini', icon: '💎', color: '#4285F4', description: 'Google AI answers' },
  { id: 'google_ai',   label: 'Google AI Overview', icon: '🔍', color: '#EA4335', description: 'Google Search AI summaries' },
  { id: 'claude',      label: 'Claude',        icon: '⚡', color: '#7c3aed', description: 'Anthropic Claude responses' },
];

const MENTION_TYPES: Record<string, { label: string; color: string; icon: any }> = {
  featured:      { label: 'Featured',      color: 'text-green-600 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900',  icon: CheckCircle2 },
  listed:        { label: 'Listed',        color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-800',  icon: CheckCircle2 },
  recommended:   { label: 'Recommended',  color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900',   icon: CheckCircle2 },
  not_mentioned: { label: 'Not found',     color: 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900',     icon: AlertTriangle },
};

export default function AISearchPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [queries, setQueries] = useState<string[]>([]);
  const [newQuery, setNewQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/ai-search-visibility/latest'),
      api.get('/ai-search-visibility/queries'),
    ]).then(([visRes, qRes]) => {
      setData(visRes.data.visibility || []);
      setQueries(qRes.data.queries || []);
    }).finally(() => setLoading(false));
  }, []);

  const runCheck = async () => {
    setChecking(true);
    try {
      const { data: result } = await api.post('/ai-search-visibility/check');
      setData(result.results || []);
    } finally {
      setChecking(false);
    }
  };

  const addQuery = async () => {
    if (!newQuery.trim()) return;
    const { data: result } = await api.post('/ai-search-visibility/queries', { query: newQuery });
    setQueries(prev => [...prev, newQuery]);
    setNewQuery('');
  };

  // Group by platform
  const byPlatform = AI_SEARCH_PLATFORMS.map(p => ({
    ...p,
    checks: data.filter(d => d.platform === p.id),
    visibility_pct: data.filter(d => d.platform === p.id).length > 0
      ? (data.filter(d => d.platform === p.id && d.brand_mentioned).length /
         data.filter(d => d.platform === p.id).length) * 100
      : null,
  }));

  const overallVisibility = data.length > 0
    ? (data.filter(d => d.brand_mentioned).length / data.length) * 100
    : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Future Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">AI Search Visibility</h1>
          <p className="text-sm text-gray-400 mt-1">
            How your brand appears when people ask AI tools about your industry
          </p>
        </div>
        <button onClick={runCheck} disabled={checking} className="btn-primary">
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {checking ? 'Checking...' : 'Run visibility check'}
        </button>
      </div>

      {/* Why this matters */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800 rounded-xl">
        <p className="text-xs font-semibold text-amber-700 mb-1">Why AI Search Visibility matters in 2025+</p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Over 40% of consumers now use AI tools for product discovery. When someone asks ChatGPT
          "what's the best [your product] in Nigeria?", does your brand appear? This replaces a
          growing share of traditional Google searches — and most brands don't know if they're visible.
        </p>
      </div>

      {/* Overall score */}
      {data.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-brand-600">{overallVisibility.toFixed(0)}<span className="text-2xl">%</span></p>
              <p className="text-sm text-gray-400 mt-1">AI search visibility</p>
            </div>
            <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
              Your brand appears in <strong>{data.filter(d => d.brand_mentioned).length}</strong> of{' '}
              <strong>{data.length}</strong> AI search queries tested across {AI_SEARCH_PLATFORMS.length} AI platforms.
              {overallVisibility >= 70 && ' Strong AI search presence — your brand has good discoverability.'}
              {overallVisibility >= 40 && overallVisibility < 70 && ' Moderate presence — opportunity to improve AI visibility significantly.'}
              {overallVisibility < 40 && ' Low AI visibility — urgent opportunity to build your presence in AI search results.'}
            </div>
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {byPlatform.map(p => (
          <div key={p.id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{p.label}</p>
                <p className="text-xs text-gray-400">{p.description}</p>
              </div>
            </div>
            {p.visibility_pct !== null ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-2xl font-bold" style={{ color: p.color }}>
                    {p.visibility_pct.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-400">visible</p>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.visibility_pct}%`, background: p.color }} />
                </div>
                {p.checks.length > 0 && p.checks[0].competitors_mentioned?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Competitors found: {(typeof p.checks[0].competitors_mentioned === 'string'
                      ? JSON.parse(p.checks[0].competitors_mentioned)
                      : p.checks[0].competitors_mentioned).slice(0, 2).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400">Not yet checked</p>
            )}
          </div>
        ))}
      </div>

      {/* Query management */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Test queries</h3>
        <div className="flex gap-2 mb-4">
          <input className="input-base flex-1 text-sm" placeholder='e.g. "best digital marketing agency in Lagos"'
            value={newQuery} onChange={e => setNewQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuery()} />
          <button onClick={addQuery} className="btn-primary px-4">Add</button>
        </div>
        <div className="space-y-2">
          {queries.map((q, i) => {
            const queryResults = data.filter(d => d.query === q);
            const visible = queryResults.filter(d => d.brand_mentioned).length;
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 mr-4">"{q}"</p>
                {queryResults.length > 0 ? (
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full',
                    visible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                    {visible}/{queryResults.length} platforms
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Not checked yet</span>
                )}
              </div>
            );
          })}
          {queries.length === 0 && (
            <p className="text-sm text-gray-400">No test queries yet. Add queries above to start tracking.</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">How to improve AI search visibility</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: 'Publish expert long-form content', desc: 'AI tools cite authoritative sources. Long-form guides, thought leadership articles, and deep-dive blogs improve citation probability.' },
            { title: 'Build Wikipedia-style structured content', desc: 'FAQ pages, comparison articles, and "complete guides" match AI training and retrieval patterns.' },
            { title: 'Earn quality backlinks and mentions', desc: 'AI models weigh authority signals. Getting mentioned in industry publications and news sites increases visibility.' },
            { title: 'Maintain consistent brand messaging', desc: 'Ensure your key brand claims are consistently stated across all owned channels — AI learns from frequency.' },
          ].map((tip, i) => (
            <div key={i} className="p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-lg">
              <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">{tip.title}</p>
              <p className="text-xs text-brand-600 dark:text-brand-500">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
