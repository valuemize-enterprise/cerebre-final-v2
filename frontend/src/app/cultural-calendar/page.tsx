'use client';
import { useEffect, useState } from 'react';
import {
  Calendar, Clock, Star, ChevronRight, Zap,
  Bell, CheckCircle2, TrendingUp, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import { format, addDays, differenceInDays, parseISO, isFuture } from 'date-fns';
import clsx from 'clsx';

const MOMENT_TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  public_holiday:     { icon: '🏛️', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900' },
  religious:          { icon: '☪️', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900' },
  sports_event:       { icon: '⚽', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900' },
  cultural_festival:  { icon: '🎭', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900' },
  awareness_day:      { icon: '📣', color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900' },
  industry_event:     { icon: '💼', color: 'text-brand-600',  bg: 'bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-800' },
  tv_moment:          { icon: '📺', color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900' },
  seasonal:           { icon: '🌞', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900' },
};

const URGENCY_COLORS = {
  act_now:    'bg-red-500 text-white',
  this_week:  'bg-amber-500 text-white',
  this_month: 'bg-brand-500 text-white',
  watch:      'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

const MomentCard = ({ moment, onPlan }: { moment: any; onPlan: () => void }) => {
  const cfg = MOMENT_TYPE_CONFIG[moment.moment_type] || MOMENT_TYPE_CONFIG.awareness_day;
  const daysUntil = differenceInDays(parseISO(moment.date_start), new Date());
  const isPast = daysUntil < 0;
  const contentWindowStart = differenceInDays(parseISO(moment.date_start), new Date()) - (moment.content_window_days || 3);
  const inWindow = contentWindowStart <= 0 && !isPast;
  const ideas = typeof moment.content_ideas === 'string' ? JSON.parse(moment.content_ideas) : (moment.content_ideas || []);
  const hashtags = typeof moment.hashtags === 'string' ? JSON.parse(moment.hashtags) : (moment.hashtags || []);

  return (
    <div className={clsx('border rounded-xl p-4 transition-all', cfg.bg, isPast && 'opacity-50')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{moment.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(parseISO(moment.date_start), 'MMMM d, yyyy')}
              {moment.date_end && moment.date_end !== moment.date_start &&
                ` — ${format(parseISO(moment.date_end), 'MMM d')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {moment.urgency && !isPast && (
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',  URGENCY_COLORS[moment.urgency as keyof typeof URGENCY_COLORS])}>
              {moment.urgency.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Days countdown */}
      {!isPast && (
        <div className={clsx('text-xs font-semibold mb-3 flex items-center gap-1',
          daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-gray-500')}>
          <Clock className="w-3 h-3" />
          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days away`}
          {inWindow && ' · Content window open now'}
        </div>
      )}

      {/* Engagement lift */}
      {moment.avg_engagement_lift && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mb-3">
          <TrendingUp className="w-3 h-3" />
          Avg {(parseFloat(moment.avg_engagement_lift) * 100).toFixed(0)}% engagement lift when brands post about this
        </div>
      )}

      {/* Content ideas */}
      {ideas.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Content ideas:</p>
          <ul className="space-y-1">
            {ideas.slice(0, 3).map((idea: string, i: number) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex gap-1.5">
                <span className={clsx('font-bold', cfg.color)}>→</span> {idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {hashtags.slice(0, 5).map((tag: string, i: number) => (
            <span key={i} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full text-gray-500">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {!isPast && (
        <button onClick={onPlan} className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1 mt-1">
          Plan content for this <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default function CulturalCalendarPage() {
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('upcoming');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    api.get('/cultural-moments').then(({ data }) => setMoments(data.moments || [])).finally(() => setLoading(false));
  }, []);

  const filtered = moments.filter(m => {
    const inFuture = isFuture(parseISO(m.date_start));
    if (filter === 'upcoming' && !inFuture) return false;
    if (filter === 'past' && inFuture) return false;
    if (typeFilter !== 'all' && m.moment_type !== typeFilter) return false;
    return true;
  }).sort((a, b) => parseISO(a.date_start).getTime() - parseISO(b.date_start).getTime());

  const upcomingCount = moments.filter(m => isFuture(parseISO(m.date_start))).length;
  const actNowCount = moments.filter(m =>
    isFuture(parseISO(m.date_start)) &&
    differenceInDays(parseISO(m.date_start), new Date()) <= 7
  ).length;

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
            <Calendar className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Cultural Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cultural Moments Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">
            Never miss a cultural opportunity — every moment your brand can participate in
          </p>
        </div>
        {actNowCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl">
            <Bell className="w-4 h-4 text-red-600 animate-pulse" />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">{actNowCount} moment{actNowCount !== 1 ? 's' : ''} need attention this week</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming moments', value: upcomingCount, color: 'text-brand-600' },
          { label: 'Act now (≤7 days)', value: actNowCount, color: 'text-red-600' },
          { label: 'This month', value: moments.filter(m => {
            const d = parseISO(m.date_start);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length, color: 'text-amber-600' },
          { label: 'Total in calendar', value: moments.length, color: 'text-gray-700 dark:text-gray-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={clsx('text-3xl font-semibold', color)}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize',
              filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500')}>
            {f}
          </button>
        ))}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 self-center" />
        {['all', 'public_holiday', 'religious', 'cultural_festival', 'sports_event', 'awareness_day', 'seasonal'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize',
              typeFilter === t ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500')}>
            {t === 'all' ? 'All types' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Moments grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 border-dashed">
          <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 font-medium">No moments match this filter</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(m => (
            <MomentCard key={m.id} moment={m}
              onPlan={() => window.location.href = `/calendar?date=${m.date_start}&title=${encodeURIComponent(m.title)}`} />
          ))}
        </div>
      )}
    </div>
  );
}
