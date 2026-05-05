import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

// ── Spinner ───────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className }: { size?: 'sm'|'md'|'lg'; className?: string }) => {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return <Loader2 className={clsx(s, 'text-brand-500 animate-spin', className)} />;
};

// ── LoadingScreen ─────────────────────────────────────────────
export const LoadingScreen = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <Spinner size="lg" />
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

// ── EmptyState ────────────────────────────────────────────────
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export const EmptyState = ({ icon: Icon, title, body, action }: EmptyStateProps) => (
  <div className="card text-center py-16 border-dashed border-2">
    <Icon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
    <p className="text-gray-600 dark:text-gray-400 font-medium">{title}</p>
    {body && <p className="text-sm text-gray-400 mt-1">{body}</p>}
    {action && (
      action.href ? (
        <a href={action.href} className="btn-primary mt-4 inline-flex">{action.label}</a>
      ) : (
        <button onClick={action.onClick} className="btn-primary mt-4">{action.label}</button>
      )
    )}
  </div>
);

// ── SectionHeader ─────────────────────────────────────────────
export const SectionHeader = ({
  icon: Icon, title, action, iconColor = 'text-brand-500',
}: {
  icon: LucideIcon; title: string; action?: React.ReactNode; iconColor?: string;
}) => (
  <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-2">
      <Icon className={clsx('w-4 h-4', iconColor)} />
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ── StatCard ──────────────────────────────────────────────────
export const StatCard = ({
  label, value, sub, trend, icon: Icon, iconBg = 'bg-brand-500',
}: {
  label: string; value: string | number; sub?: string;
  trend?: number; icon: LucideIcon; iconBg?: string;
}) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="section-title">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
      <div className={clsx('p-2.5 rounded-lg shrink-0', iconBg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    {trend !== undefined && (
      <p className={clsx('mt-3 text-xs font-medium flex items-center gap-1',
        trend >= 0 ? 'text-green-600' : 'text-red-500'
      )}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last period
      </p>
    )}
  </div>
);
