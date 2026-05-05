'use client';
import { useEffect, useState } from 'react';
import { reportsApi } from '../../lib/api';
import Link from 'next/link';
import {
  FileBarChart, TrendingUp, TrendingDown, Minus,
  ChevronRight, Loader2, Calendar,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CompareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>
    <polyline points="15 9 18 6 21 9"/><polyline points="9 15 6 18 3 15"/>
  </svg>
);

const DirectionIcon = ({ d }: { d: string }) => {
  if (d === 'growing') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (d === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [compareA, setCompareA] = useState<string | null>(null);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const { data } = await reportsApi.list(p);
      setReports(data.reports || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const handleCompareSelect = (reportId: string) => {
    if (!compareA) {
      setCompareA(reportId);
      toast('Select a second report to compare', { icon: '🔄' });
    } else if (compareA === reportId) {
      setCompareA(null);
    } else {
      window.location.href = `/reports/compare/${compareA}/${reportId}`;
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-400 mt-1">{total} AI-generated report{total !== 1 ? 's' : ''}</p>
        </div>
        {compareA && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg text-sm text-brand-700 dark:text-brand-400">
            <CompareIcon className="w-4 h-4" />
            Select a second report to compare
            <button onClick={() => setCompareA(null)} className="ml-1 text-brand-400 hover:text-brand-600">✕</button>
          </div>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <FileBarChart className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload and analyze a report to see insights here</p>
          <Link href="/upload" className="btn-primary mt-4 inline-flex">Upload a report</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className={clsx(
                'card p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md',
                compareA === r.id && 'ring-2 ring-brand-500'
              )}
            >
              {/* Direction + period */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {r.period_label || 'Unknown period'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <DirectionIcon d={r.direction} />
              </div>

              {/* Strategic focus */}
              {r.strategic_focus && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                  "{r.strategic_focus}"
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neutral">{r.file_count} file{r.file_count !== 1 ? 's' : ''}</span>
                {r.direction && (
                  <span className={clsx(
                    r.direction === 'growing' ? 'badge-success' :
                    r.direction === 'declining' ? 'badge-danger' : 'badge-neutral'
                  )}>
                    {r.direction}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-50 dark:border-gray-800">
                <Link
                  href={`/reports/${r.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                >
                  View report <ChevronRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => handleCompareSelect(r.id)}
                  className={clsx(
                    'p-2 rounded-lg text-xs transition-colors',
                    compareA === r.id
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-brand-500'
                  )}
                  title="Compare with another period"
                >
                  <CompareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="btn-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
