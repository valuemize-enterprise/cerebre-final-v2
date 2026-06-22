'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target, Loader2, TrendingUp, Calendar } from 'lucide-react';
import { Card, Input, Button, Callout, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const router     = useRouter();
  const [goal,    setGoal]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm]       = useState({ title:'', target_value:'', target_unit:'', current_value:'', deadline:'' });

  useEffect(() => {
    axios.get(`${API}/goals/${goalId}`, { headers: hdrs() })
      .then(r => {
        const g = r.data.goal || r.data;
        setGoal(g);
        setForm({ title: g.title||'', target_value: g.target_value||'', target_unit: g.target_unit||'', current_value: g.current_value||'', deadline: g.deadline?.split('T')[0]||'' });
      }).catch(() => toast.error('Goal not found'))
      .finally(() => setLoading(false));
  }, [goalId]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`${API}/goals/${goalId}`, {
        ...form, target_value: parseFloat(form.target_value), current_value: parseFloat(form.current_value || '0'),
      }, { headers: hdrs() });
      setGoal(data.goal || data);
      toast.success('Goal updated!');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>;
  if (!goal)   return <div className="p-8 text-center"><p className="text-white/40">Goal not found</p><a href="/goals" className="text-purple-400 text-sm mt-2 inline-block hover:underline">← Back to goals</a></div>;

  const pct    = Math.min(100, Math.round((parseFloat(form.current_value||'0') / parseFloat(form.target_value||'1')) * 100));
  const barCol = pct >= 80 ? '#059669' : pct >= 50 ? '#6d28d9' : '#d97706';

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-7">
        <a href="/goals" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 mb-4 transition-colors"><ArrowLeft className="w-3.5 h-3.5"/>All goals</a>
        <div className="flex items-center gap-2 mb-1"><div className="w-1 h-5 rounded-full" style={{ background:'#059669' }}/><p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Goal</p></div>
        <h1 className="text-2xl font-black text-white">{goal.title}</h1>
        <p className="text-white/40 text-sm mt-1">{goal.brand_name} · <span className="capitalize">{goal.category}</span></p>
      </div>

      {/* Progress visual */}
      <Card className="mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-black text-white">{parseFloat(form.current_value||'0').toLocaleString()}</p>
            <p className="text-xs text-white/35 mt-0.5">of {parseFloat(form.target_value||'0').toLocaleString()} {form.target_unit}</p>
          </div>
          <p className="text-2xl font-black" style={{ color: barCol }}>{pct}%</p>
        </div>
        <div className="h-3 rounded-full mb-2" style={{ background:'rgba(255,255,255,0.07)' }}>
          <div className="h-3 rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${barCol},${barCol}90)` }}/>
        </div>
        {form.deadline && (
          <p className="text-xs text-white/30 flex items-center gap-1"><Calendar className="w-3 h-3"/>Due {new Date(form.deadline).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
        )}
      </Card>

      {/* Edit form */}
      <Card>
        <h3 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Update goal</h3>
        <div className="space-y-4">
          <Input label="Goal title" value={form.title} onChange={f('title')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current value" type="number" value={form.current_value} onChange={f('current_value')} hint="Update this when progress is made" />
            <Input label="Target value" type="number" value={form.target_value} onChange={f('target_value')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit" value={form.target_unit} onChange={f('target_unit')} placeholder="e.g. followers" />
            <Input label="Deadline" type="date" value={form.deadline} onChange={f('deadline')} />
          </div>
        </div>
        <Button className="mt-5" loading={saving} onClick={save} icon={<Save className="w-4 h-4"/>}>Save changes</Button>
      </Card>
    </div>
  );
}
