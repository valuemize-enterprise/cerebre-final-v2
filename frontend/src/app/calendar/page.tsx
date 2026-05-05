'use client';
import { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Sparkles,
  Calendar, Clock, CheckCircle2, AlertCircle,
  Edit2, Trash2, X, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO,
} from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#69C9D0',
  twitter: '#1DA1F2', linkedin: '#0A66C2', youtube: '#FF0000',
  google_ads: '#4285F4', email: '#F59E0B', website: '#10B981',
};

const STATUS_DOTS: Record<string, string> = {
  idea: 'bg-gray-400', planned: 'bg-blue-400', in_production: 'bg-amber-400',
  pending_approval: 'bg-orange-400', approved: 'bg-green-400',
  scheduled: 'bg-brand-400', published: 'bg-green-600', cancelled: 'bg-red-400',
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [newEntry, setNewEntry] = useState({
    platform: '', content_type: 'post', title: '', description: '',
    scheduled_at: '', status: 'planned',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const start = format(monthStart, 'yyyy-MM-dd');
    const end = format(monthEnd, 'yyyy-MM-dd');
    Promise.all([
      api.get(`/calendar?start=${start}&end=${end}`),
      api.get('/brands/current'),
    ]).then(([cRes, bRes]) => {
      setEntries(cRes.data.entries || []);
      setActivePlatforms(bRes.data.brand?.active_platforms || []);
    }).finally(() => setLoading(false));
  }, [currentMonth]);

  const getEntriesForDay = (day: Date) =>
    entries.filter(e => isSameDay(parseISO(e.scheduled_at), day));

  const requestAiSuggestions = async () => {
    setAiSuggesting(true);
    try {
      const { data } = await api.post('/calendar/ai-suggest', {
        month: format(currentMonth, 'yyyy-MM'),
        activePlatforms,
      });
      setAiSuggestions(data.suggestions || []);
      toast.success(`AI suggested ${data.suggestions?.length || 0} content ideas`);
    } catch {
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiSuggesting(false);
    }
  };

  const addEntry = async () => {
    if (!newEntry.platform || !newEntry.scheduled_at) {
      toast.error('Platform and date/time required'); return;
    }
    try {
      const { data } = await api.post('/calendar', newEntry);
      setEntries(prev => [...prev, data.entry]);
      setShowNewEntry(false);
      setNewEntry({ platform: '', content_type: 'post', title: '', description: '', scheduled_at: '', status: 'planned' });
      toast.success('Added to calendar');
    } catch {
      toast.error('Failed to add entry');
    }
  };

  const addAiSuggestion = async (suggestion: any) => {
    try {
      const { data } = await api.post('/calendar', {
        ...suggestion,
        status: 'planned',
        ai_recommended: true,
      });
      setEntries(prev => [...prev, data.entry]);
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      toast.success('Added to calendar');
    } catch {
      toast.error('Failed to add suggestion');
    }
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Plan, schedule, and track content across all platforms</p>
        </div>
        <div className="flex gap-2">
          <button onClick={requestAiSuggestions} disabled={aiSuggesting} className="btn-secondary">
            {aiSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-brand-500" />}
            AI suggest content
          </button>
          <button onClick={() => setShowNewEntry(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add content
          </button>
        </div>
      </div>

      {/* AI Suggestions strip */}
      {aiSuggestions.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Content Suggestions for {format(currentMonth, 'MMMM')}</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {aiSuggestions.map((s, i) => (
              <div key={i} className="shrink-0 w-64 p-3 border border-brand-100 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full"
                    style={{ background: PLATFORM_COLORS[s.platform] || '#8B5CF6' }} />
                  <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 capitalize">{s.platform} {s.content_type}</p>
                  <span className="text-xs text-gray-400 ml-auto">{s.scheduled_at ? format(parseISO(s.scheduled_at), 'MMM d') : ''}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-medium">{s.title}</p>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{s.ai_rationale}</p>
                <button onClick={() => addAiSuggestion(s)} className="text-xs text-brand-600 font-semibold hover:text-brand-700">
                  Add to calendar →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {/* Leading blank days */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[100px] border-b border-r border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50" />
          ))}

          {days.map(day => {
            const dayEntries = getEntriesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={clsx(
                  'min-h-[100px] border-b border-r border-gray-100 dark:border-gray-800 p-2 cursor-pointer transition-colors',
                  isSelected ? 'bg-brand-50 dark:bg-brand-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                  !isCurrentMonth && 'opacity-40',
                )}>
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1.5',
                  isToday(day) ? 'bg-brand-600 text-white' : 'text-gray-500'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEntries.slice(0, 3).map(entry => (
                    <div key={entry.id} className="flex items-center gap-1 rounded px-1 py-0.5"
                      style={{ background: `${PLATFORM_COLORS[entry.platform] || '#8B5CF6'}18` }}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOTS[entry.status] || 'bg-gray-400')} />
                      <span className="text-[10px] truncate font-medium" style={{ color: PLATFORM_COLORS[entry.platform] || '#8B5CF6' }}>
                        {entry.title || entry.content_type}
                      </span>
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <p className="text-[10px] text-gray-400 pl-1">+{dayEntries.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <button onClick={() => { setNewEntry(p => ({ ...p, scheduled_at: format(selectedDate, "yyyy-MM-dd'T'09:00") })); setShowNewEntry(true); }}
              className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {getEntriesForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400">Nothing scheduled. Add content for this day.</p>
          ) : (
            <div className="space-y-2">
              {getEntriesForDay(selectedDate).map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PLATFORM_COLORS[entry.platform] || '#8B5CF6' }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {entry.title || `${entry.platform} ${entry.content_type}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(entry.scheduled_at), 'h:mm a')} · {entry.status}
                      {entry.ai_recommended && ' · AI suggested'}
                    </p>
                  </div>
                  {entry.ai_score && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">
                      {entry.ai_score}% predicted
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New entry modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Schedule content</h2>
              <button onClick={() => setShowNewEntry(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Platform *</label>
                <div className="flex flex-wrap gap-2">
                  {activePlatforms.map(p => (
                    <button key={p} type="button" onClick={() => setNewEntry(e => ({ ...e, platform: p }))}
                      className={clsx('px-2.5 py-1.5 text-xs rounded-lg border transition-colors capitalize',
                        newEntry.platform === p ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'
                      )} style={newEntry.platform === p ? { borderColor: PLATFORM_COLORS[p] } : {}}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Content type</label>
                <select className="input-base" value={newEntry.content_type}
                  onChange={e => setNewEntry(n => ({ ...n, content_type: e.target.value }))}>
                  {['post','reel','story','video','carousel','thread','email','ad','live'].map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Title / brief</label>
                <input className="input-base" placeholder="Content title or brief description"
                  value={newEntry.title} onChange={e => setNewEntry(n => ({ ...n, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Schedule date & time *</label>
                <input type="datetime-local" className="input-base"
                  value={newEntry.scheduled_at}
                  onChange={e => setNewEntry(n => ({ ...n, scheduled_at: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <select className="input-base" value={newEntry.status}
                  onChange={e => setNewEntry(n => ({ ...n, status: e.target.value }))}>
                  {['idea','planned','in_production','pending_approval','approved'].map(s => (
                    <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={addEntry} className="btn-primary flex-1">Schedule</button>
              <button onClick={() => setShowNewEntry(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
