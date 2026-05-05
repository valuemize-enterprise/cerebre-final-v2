'use client';
import { useEffect, useState } from 'react';
import { Zap, Plus, Play, Pause, Trash2, Edit2, Clock, Bell, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TRIGGER_TYPES = [
  { id: 'metric_threshold', label: 'Metric hits threshold', icon: '📊' },
  { id: 'goal_milestone', label: 'Goal reaches milestone', icon: '🎯' },
  { id: 'competitor_action', label: 'Competitor surges', icon: '👁' },
  { id: 'schedule', label: 'Scheduled (daily/weekly)', icon: '🕐' },
  { id: 'content_performance', label: 'Content goes viral', icon: '🚀' },
];

const ACTION_TYPES = [
  { id: 'send_alert', label: 'Send alert notification', icon: '🔔' },
  { id: 'generate_report', label: 'Generate AI report', icon: '📄' },
  { id: 'send_digest', label: 'Email digest to team', icon: '📧' },
  { id: 'send_slack', label: 'Send Slack message', icon: '💬' },
  { id: 'create_task', label: 'Create team task', icon: '✅' },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_type: 'metric_threshold', description: '', actions: ['send_alert'] });

  useEffect(() => {
    api.get('/automations').then(({ data }) => setRules(data.rules || [])).finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, active: boolean) => {
    await api.patch(`/automations/${id}`, { is_active: !active });
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !active } : r));
  };

  const save = async () => {
    const { data } = await api.post('/automations', form);
    setRules(prev => [...prev, data.rule]);
    setShowNew(false);
    toast.success('Automation created');
  };

  const del = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    await api.delete(`/automations/${id}`);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Smart Automations</h1>
          <p className="text-sm text-gray-400 mt-1">Trigger actions automatically based on platform events and thresholds</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> New automation</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-brand-600">{rules.filter(r=>r.is_active).length}</p><p className="text-xs text-gray-400 mt-1">Active rules</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{rules.reduce((s,r)=>s+(r.trigger_count||0),0)}</p><p className="text-xs text-gray-400 mt-1">Total triggers</p></div>
        <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-600">{rules.length}</p><p className="text-xs text-gray-400 mt-1">Total rules</p></div>
      </div>

      {showNew && (
        <div className="card p-5 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">New automation rule</h3>
          <div className="space-y-3">
            <input className="input-base" placeholder="Rule name (e.g. Alert when engagement drops 30%)" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Trigger</label>
                <select className="input-base text-xs" value={form.trigger_type} onChange={e => setForm(f=>({...f,trigger_type:e.target.value}))}>
                  {TRIGGER_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Actions</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {ACTION_TYPES.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={form.actions.includes(a.id)}
                        onChange={e => setForm(f=>({...f, actions: e.target.checked ? [...f.actions,a.id] : f.actions.filter(x=>x!==a.id)}))} className="rounded" />
                      {a.icon} {a.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1">Create rule</button>
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="card text-center py-16 border-dashed"><Zap className="w-10 h-10 mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No automations yet</p><p className="text-sm text-gray-400 mt-1">Create rules to automatically respond to platform events</p></div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const trig = TRIGGER_TYPES.find(t => t.id === rule.trigger_type);
            const acts = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : (rule.actions || []);
            return (
              <div key={rule.id} className="card p-4 flex items-center gap-4">
                <div className="text-2xl">{trig?.icon || '⚡'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rule.name}</p>
                  <p className="text-xs text-gray-400">{trig?.label} · {acts.length} action{acts.length!==1?'s':''}</p>
                  {rule.last_triggered && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> Last triggered: {new Date(rule.last_triggered).toLocaleDateString()}</p>}
                </div>
                <div className={clsx('w-10 h-5 rounded-full relative cursor-pointer transition-colors', rule.is_active ? 'bg-green-500' : 'bg-gray-300')} onClick={() => toggle(rule.id, rule.is_active)}>
                  <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all', rule.is_active ? 'left-5' : 'left-0.5')} />
                </div>
                <button onClick={() => del(rule.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}