'use client';
import { TrendingUp, TrendingDown, Clock, Hash, Lightbulb } from 'lucide-react';
import clsx from 'clsx';

interface ContentItem {
  type: string;
  description: string;
  metric: string;
  value: string;
}

interface ContentAnalysisProps {
  data: {
    best_performing?: ContentItem[];
    worst_performing?: ContentItem[];
    format_patterns?: string;
    timing_patterns?: string;
    hook_patterns?: string;
    recommendation?: string;
  };
}

const ContentCard = ({
  item,
  variant,
}: {
  item: ContentItem;
  variant: 'best' | 'worst';
}) => (
  <div className={clsx(
    'p-4 rounded-xl border',
    variant === 'best'
      ? 'border-green-100 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10'
      : 'border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10'
  )}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-2">
        {variant === 'best'
          ? <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
          : <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />}
        <span className={clsx(
          'text-xs font-semibold uppercase tracking-wider',
          variant === 'best' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {item.type}
        </span>
      </div>
      <span className={clsx(
        'text-xs font-bold',
        variant === 'best' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {item.value}
      </span>
    </div>
    <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
    <p className="text-xs text-gray-400 mt-1">{item.metric}</p>
  </div>
);

const PatternPill = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-4 card">
    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{value}</p>
    </div>
  </div>
);

export const ContentAnalysis = ({ data }: ContentAnalysisProps) => {
  if (!data || Object.keys(data).length === 0) return null;

  const best = data.best_performing || [];
  const worst = data.worst_performing || [];

  return (
    <div className="space-y-5">
      {/* Best vs worst */}
      {(best.length > 0 || worst.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="section-title text-green-700 dark:text-green-400 mb-3">Top performing content</p>
            <div className="space-y-2">
              {best.map((item, i) => (
                <ContentCard key={i} item={item} variant="best" />
              ))}
              {best.length === 0 && <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>
          <div>
            <p className="section-title text-red-500 mb-3">Underperforming content</p>
            <div className="space-y-2">
              {worst.map((item, i) => (
                <ContentCard key={i} item={item} variant="worst" />
              ))}
              {worst.length === 0 && <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>
        </div>
      )}

      {/* Patterns */}
      <div className="grid sm:grid-cols-3 gap-3">
        {data.format_patterns && (
          <PatternPill icon={Hash} label="Format patterns" value={data.format_patterns} />
        )}
        {data.timing_patterns && (
          <PatternPill icon={Clock} label="Timing patterns" value={data.timing_patterns} />
        )}
        {data.hook_patterns && (
          <PatternPill icon={TrendingUp} label="Hook patterns" value={data.hook_patterns} />
        )}
      </div>

      {/* Strategic recommendation */}
      {data.recommendation && (
        <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 flex gap-3">
          <Lightbulb className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-brand-800 dark:text-brand-300">{data.recommendation}</p>
        </div>
      )}
    </div>
  );
};
