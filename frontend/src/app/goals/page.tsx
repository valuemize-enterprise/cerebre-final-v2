'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GripVertical, Plus, Trash2, ChevronDown,
  ChevronUp, Zap, Target, Edit2, Check, X, Loader2,
  ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Goal categories — industry-agnostic, user can also type their own
const GOAL_CATEGORIES = [
  { id: 'revenue',           label: 'Revenue Growth',        icon: '💰' },
  { id: 'brand_awareness',   label: 'Brand Awareness',       icon: '📣' },
  { id: 'lead_generation',   label: 'Lead Generation',       icon: '🎯' },
  { id: 'customer_retention', label: 'Customer Retention',   icon: '🔄' },
  { id: 'market_expansion',  label: 'Market Expansion',      icon: '🌍' },
  { id: 'product_launch',    label: 'Product Launch',        icon: '🚀' },
  { id: 'reputation',        label: 'Reputation Management', icon: '⭐' },
  { id: 'community',         label: 'Community Building',    icon: '👥' },
  { id: 'acquisition',       label: 'Customer Acquisition',  icon: '🔍' },
  { id: 'engagement',        label: 'Engagement Quality',    icon: '❤️' },
  { id: 'crisis_recovery',   label: 'Crisis Recovery',       icon: '🛡️' },
  { id: 'investor_relations', label: 'Investor Relations',   icon: '📊' },
  { id: 'talent_acquisition', label: 'Employer Branding',    icon: '🏢' },
  { id: 'custom',            label: 'Custom Goal',           icon: '✦' },
];

const PRIORITY_LABELS = ['#1 — Most critical', '#2 — High priority', '#3 — Important', '#4', '#5'];

const GoalCard = ({ goal, rank, onMoveUp, onMoveDown, onToggle, onDelete, onEdit, isFirst, isLast }: any) => {
  const [expanded, setExpanded] = useState(false);
  const cat = GOAL_CATEGORIES.find(c => c.id === goal.goal_category);
  const pct = Math.min(100, parseFloat(goal.progress_pct || 0));

  const statusColors: Record<string, string> = {
    achieved: 'text-green-600 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900',
    active:   'text-brand-600 bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-800',
    at_risk:  'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800',
    missed:   'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900',
  };

  return (
    <div className={clsx(
      'border rounded-xl overflow-hidden transition-all',
      goal.is_active
        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
        : 'bg-gray-50 dark:bg-gray-900/50 border-dashed border-gray-200 dark:border-gray-700 opacity-60'
    )}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Priority label */}
        <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-700 dark:text-brand-400">#{rank}</span>
        </div>

        {/* Icon + title */}
        <span className="text-lg">{cat?.icon || '✦'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={clsx('text-sm font-semibold truncate', goal.is_active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400')}>
              {goal.title}
            </p>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border capitalize font-medium', statusColors[goal.status] || statusColors.active)}>
              {goal.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[120px]">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isFirst && (
            <button onClick={onMoveUp} className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors" title="Increase priority">
              <ArrowUpCircle className="w-4 h-4" />
            </button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors" title="Decrease priority">
              <ArrowDownCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={onToggle}
            className={clsx('p-1.5 transition-colors', goal.is_active ? 'text-green-500 hover:text-gray-400' : 'text-gray-300 hover:text-green-500')}
            title={goal.is_active ? 'Pause goal' : 'Activate goal'}>
            <div className={clsx('w-8 h-4 rounded-full transition-colors relative', goal.is_active ? 'bg-green-500' : 'bg-gray-300')}>
              <span className={clsx('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', goal.is_active ? 'left-4' : 'left-0.5')} />
            </div>
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3">
          {goal.description && <p className="text-sm text-gray-500">{goal.description}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {goal.target_value && (
              <div>
                <p className="text-gray-400">Target</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  {Number(goal.target_value).toLocaleString()} {goal.target_unit}
                </p>
              </div>
            )}
            {goal.current_value !== undefined && (
              <div>
                <p className="text-gray-400">Current</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  {Number(goal.current_value || 0).toLocaleString()}
                </p>
              </div>
            )}
            {goal.deadline && (
              <div>
                <p className="text-gray-400">Deadline</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  {new Date(goal.deadline).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: '2-digit' })}
                </p>
              </div>
            )}
            {goal.relevant_platforms?.length > 0 && (
              <div>
                <p className="text-gray-400">Platforms</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
                  {Array.isArray(goal.relevant_platforms) ? goal.relevant_platforms.join(', ') : goal.relevant_platforms}
                </p>
              </div>
            )}
          </div>

          {goal.ai_strategy && (
            <div className="p-3 bg-brand-50 dark:bg-brand-950/20 rounded-lg border border-brand-100 dark:border-brand-800">
              <p className="text-xs font-semibold text-brand-600 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> AI Strategy
              </p>
              <p className="text-xs text-brand-800 dark:text-brand-300">{goal.ai_strategy}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onEdit} className="btn-secondary text-xs py-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AddGoalModal = ({ onClose, onAdd, activePlatforms }: any) => {
  const [form, setForm] = useState({
    title: '', description: '', goal_category: '', custom_category: '',
    target_metric: '', target_value: '', target_unit: '',
    deadline: '', horizon: 'quarterly',
    relevant_platforms: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.goal_category) { toast.error('Title and category required'); return; }
    setSaving(true);
    try {
      await onAdd(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add priority goal</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Goal title *</label>
            <input className="input-base" placeholder="e.g. Grow brand awareness in Lagos by Q2"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category *</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => set('goal_category', c.id)}
                  className={clsx(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-all',
                    form.goal_category === c.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  )}>
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {form.goal_category === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Custom category name</label>
              <input className="input-base" placeholder="e.g. ESG / Sustainability"
                value={form.custom_category} onChange={e => set('custom_category', e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target metric</label>
              <input className="input-base text-xs" placeholder="e.g. leads, revenue"
                value={form.target_metric} onChange={e => set('target_metric', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target value</label>
              <input type="number" className="input-base text-xs" placeholder="1000"
                value={form.target_value} onChange={e => set('target_value', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Unit</label>
              <input className="input-base text-xs" placeholder="count, ₦, %"
                value={form.target_unit} onChange={e => set('target_unit', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Deadline</label>
            <input type="date" className="input-base"
              value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </div>

          {activePlatforms?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Relevant platforms <span className="text-gray-400 font-normal">(leave empty = all)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {activePlatforms.map((p: string) => (
                  <button key={p} type="button"
                    onClick={() => set('relevant_platforms',
                      form.relevant_platforms.includes(p)
                        ? form.relevant_platforms.filter(x => x !== p)
                        : [...form.relevant_platforms, p]
                    )}
                    className={clsx('px-2.5 py-1 text-xs rounded-lg border transition-colors capitalize',
                      form.relevant_platforms.includes(p)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}>
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Description (optional)</label>
            <textarea className="input-base resize-none" rows={2}
              placeholder="Additional context for the AI..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {saving ? 'Adding...' : 'Add goal'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default function GoalsPriorityPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    Promise.all([api.get('/goals'), api.get('/brands/current')])
      .then(([gRes, bRes]) => {
        const sorted = [...(gRes.data.goals || [])].sort((a, b) => a.priority_rank - b.priority_rank);
        setGoals(sorted);
        setBrand(bRes.data.brand);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const moveGoal = async (index: number, direction: 'up' | 'down') => {
    const newGoals = [...goals];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    [newGoals[index], newGoals[swapWith]] = [newGoals[swapWith], newGoals[index]];

    const reordered = newGoals.map((g, i) => ({ ...g, priority_rank: i + 1 }));
    setGoals(reordered);

    try {
      await api.put('/goals/reorder', {
        order: reordered.map(g => ({ id: g.id, priority_rank: g.priority_rank }))
      });
      toast.success('Priority updated — AI will focus on the new order');
    } catch {
      toast.error('Failed to save priority order');
      load();
    }
  };

  const toggleGoal = async (goalId: string, currentActive: boolean) => {
    try {
      await api.patch(`/goals/${goalId}/toggle`, { is_active: !currentActive });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, is_active: !currentActive } : g));
      toast.success(currentActive ? 'Goal paused — AI will ignore it until reactivated' : 'Goal reactivated');
    } catch {
      toast.error('Failed to update goal');
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const addGoal = async (formData: any) => {
    const { data } = await api.post('/goals', formData);
    setGoals(prev => [...prev, data.goal].sort((a, b) => a.priority_rank - b.priority_rank));
    toast.success('Goal added — AI will now factor this into all recommendations');
  };

  const activeGoals = goals.filter(g => g.is_active);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {showAdd && (
        <AddGoalModal onClose={() => setShowAdd(false)} onAdd={addGoal}
          activePlatforms={brand?.active_platforms || []} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Priority Goals</h1>
          <p className="text-sm text-gray-400 mt-1">
            The AI reads these goals before every analysis. Drag to re-prioritise at any time.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add goal
        </button>
      </div>

      {/* AI context notice */}
      <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-xl flex gap-3">
        <Zap className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-brand-800 dark:text-brand-300">
          <strong>AI alignment:</strong> {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}.
          Every recommendation, scorecard, and analysis is aligned to these priorities in order.
          Changes take effect immediately — no restart needed.
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <Target className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No goals set yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Set your business priorities and the AI will tailor every recommendation to achieve them
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Set first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              rank={i + 1}
              isFirst={i === 0}
              isLast={i === goals.length - 1}
              onMoveUp={() => moveGoal(i, 'up')}
              onMoveDown={() => moveGoal(i, 'down')}
              onToggle={() => toggleGoal(goal.id, goal.is_active)}
              onDelete={() => deleteGoal(goal.id)}
              onEdit={() => {}}
            />
          ))}
        </div>
      )}

      {goals.length > 0 && (
        <div className="text-center text-xs text-gray-400">
          {activeGoals.length} of {goals.length} goals active ·
          Priority #1 receives the most AI attention
        </div>
      )}
    </div>
  );
}
