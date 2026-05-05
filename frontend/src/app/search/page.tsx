'use client';
import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { reportsApi, metricsApi } from '../../lib/api';
import { Search, FileBarChart, BarChart2, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface SearchResult {
  type: 'report' | 'platform';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  date?: string;
  badge?: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter/X',
  tiktok: 'TikTok', youtube: 'YouTube', google_ads: 'Google Ads',
  website: 'Website', email: 'Email', linkedin: 'LinkedIn',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);

  const debouncedQuery = useDebounce(query, 250);

  // Load all reports and platforms once for client-side filtering
  useEffect(() => {
    Promise.all([
      reportsApi.list(1),
      metricsApi.platforms(),
    ]).then(([rRes, pRes]) => {
      setReports(rRes.data.reports || []);
      setPlatforms(pRes.data.platforms || []);
    });
  }, []);

  // Filter on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);

    const q = debouncedQuery.toLowerCase();
    const matched: SearchResult[] = [];

    // Search reports
    reports.forEach((r) => {
      const period = (r.period_label || '').toLowerCase();
      const focus = (r.strategic_focus || '').toLowerCase();
      if (period.includes(q) || focus.includes(q)) {
        matched.push({
          type: 'report',
          id: r.id,
          title: r.period_label || 'Unknown period',
          subtitle: r.strategic_focus || 'AI analysis report',
          href: `/reports/${r.id}`,
          date: r.created_at,
          badge: r.direction,
        });
      }
    });

    // Search platforms
    platforms.forEach((p) => {
      const name = (PLATFORM_NAMES[p.platform] || p.platform).toLowerCase();
      if (name.includes(q)) {
        matched.push({
          type: 'platform',
          id: p.platform,
          title: PLATFORM_NAMES[p.platform] || p.platform,
          subtitle: `${Number(p.total_impressions).toLocaleString()} impressions · ${Number(p.total_conversions).toLocaleString()} conversions`,
          href: `/platforms/${p.platform}`,
          badge: `${p.periods_tracked} periods`,
        });
      }
    });

    setResults(matched);
    setLoading(false);
  }, [debouncedQuery, reports, platforms]);

  const recent = reports.slice(0, 5);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Search</h1>
        <p className="text-sm text-gray-400 mt-1">Find reports, platforms, and insights</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by period, platform, or keyword..."
          className="input-base pl-10 pr-4 h-12 text-base"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Results */}
      {query && results.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Link href={r.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    r.type === 'report'
                      ? 'bg-brand-50 dark:bg-brand-950/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/30'
                  )}>
                    {r.type === 'report'
                      ? <FileBarChart className="w-4 h-4 text-brand-500" />
                      : <BarChart2 className="w-4 h-4 text-emerald-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                      {r.badge && (
                        <span className="badge-neutral text-xs shrink-0">{r.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{r.subtitle}</p>
                    {r.date && (
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(r.date), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty query → show recent */}
      {!query && recent.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent reports</p>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <FileBarChart className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.period_label}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No results */}
      {query && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No results for "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Try a platform name, month, or quarter</p>
        </div>
      )}
    </div>
  );
}
