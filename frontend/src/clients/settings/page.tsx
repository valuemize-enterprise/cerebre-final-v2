'use client';
import { useState, useEffect } from 'react';
import { Lock, Bell, Save, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const clientToken = () => localStorage.getItem('sabi_client_token');
const hdrs = () => ({ Authorization: `Bearer ${clientToken()}` });

const TABS = ['profile', 'security', 'notifications'];

export default function ClientSettingsPage() {
  const [tab, setTab]       = useState('profile');
  const [client, setClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm]     = useState({ full_name:'', job_title:'', whatsapp_number:'' });
  const [pwd, setPwd]       = useState({ old_password:'', new_password:'', confirm:'' });
  const [notif, setNotif]   = useState({ weekly_digest: true, alert_notifications: true });

  useEffect(() => {
    const info = localStorage.getItem('sabi_client_info');
    if (info) {
      const c = JSON.parse(info);
      setClient(c);
      setForm({ full_name: c.name || '', job_title: c.job_title || '', whatsapp_number: c.whatsapp_number || '' });
    }
    axios.get(`${API}/client/auth/me`, { headers: hdrs() })
      .then(r => {
        const c = r.data.client;
        setNotif({ weekly_digest: c.weekly_digest_enabled ?? true, alert_notifications: c.alert_notifications ?? true });
      }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/client/profile`, form, { headers: hdrs() });
      const updated = { ...client, name: form.full_name, job_title: form.job_title, whatsapp_number: form.whatsapp_number };
      localStorage.setItem('sabi_client_info', JSON.stringify(updated));
      toast.success('Profile updated');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pwd.new_password !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    if (pwd.new_password.length < 8)      { toast.error('Minimum 8 characters'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/client/password`, { old_password: pwd.old_password, new_password: pwd.new_password }, { headers: hdrs() });
      toast.success('Password changed');
      setPwd({ old_password: '', new_password: '', confirm: '' });
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };

  const saveNotif = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/client/notifications`, notif, { headers: hdrs() });
      toast.success('Preferences saved');
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  const InputField = ({ label, type='text', value, onChange, placeholder='', rightEl }: any) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          style={inputStyle} />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your profile and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all', tab === t ? 'text-white' : 'text-white/40 hover:text-white/60')}
            style={tab === t ? { background: 'rgba(109,40,217,0.35)', border: '1px solid rgba(109,40,217,0.4)' } : {}}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === 'profile' && (
        <div className="rounded-2xl border p-6" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
              {(form.full_name || 'U').charAt(0)}
            </div>
            <div>
              <p className="text-white font-bold">{form.full_name || 'Your name'}</p>
              <p className="text-xs text-white/40">{client?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <InputField label="Full name" value={form.full_name} onChange={(e: any) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
            <InputField label="Job title" value={form.job_title} onChange={(e: any) => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Chief Marketing Officer" />
            <InputField label="WhatsApp number (optional)" value={form.whatsapp_number} onChange={(e: any) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+234 801 234 5678" />
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {saving ? 'Saving…' : <><Save className="w-4 h-4" /> Save profile</>}
          </button>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-bold text-white mb-2">Change your password</h3>
          <InputField label="Current password" type={showOld ? 'text' : 'password'} value={pwd.old_password} onChange={(e: any) => setPwd({ ...pwd, old_password: e.target.value })}
            rightEl={<button onClick={() => setShowOld(s => !s)} className="text-white/30 hover:text-white/60">{showOld ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>} />
          <InputField label="New password (min 8 characters)" type={showNew ? 'text' : 'password'} value={pwd.new_password} onChange={(e: any) => setPwd({ ...pwd, new_password: e.target.value })}
            rightEl={<button onClick={() => setShowNew(s => !s)} className="text-white/30 hover:text-white/60">{showNew ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>} />
          <InputField label="Confirm new password" type="password" value={pwd.confirm} onChange={(e: any) => setPwd({ ...pwd, confirm: e.target.value })} />
          {pwd.confirm && pwd.confirm !== pwd.new_password && <p className="text-xs text-red-400">Passwords do not match</p>}
          <button onClick={savePassword} disabled={saving || !pwd.old_password || !pwd.new_password || pwd.new_password !== pwd.confirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 mt-2"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {saving ? 'Changing…' : <><Lock className="w-4 h-4" /> Change password</>}
          </button>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="rounded-2xl border p-6" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-bold text-white mb-5">Email & notification preferences</h3>
          <div className="space-y-3">
            {[{ k:'weekly_digest', label:'Weekly digest email', desc:"Receive ARIA's weekly brand summary every Monday morning" },
              { k:'alert_notifications', label:'Performance alerts', desc:'Get notified when significant metric changes are detected' }].map(({ k, label, desc }) => (
              <div key={k} className="flex items-start justify-between gap-4 p-4 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <p className="text-sm font-semibold text-white/80">{label}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
                </div>
                <button onClick={() => setNotif(n => ({ ...n, [k]: !(n as any)[k] }))}
                  className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 mt-0.5"
                  style={{ background: (notif as any)[k] ? '#6d28d9' : 'rgba(255,255,255,0.1)' }}>
                  <div className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', (notif as any)[k] ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={saveNotif} disabled={saving}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {saving ? 'Saving…' : <><Bell className="w-4 h-4" /> Save preferences</>}
          </button>
        </div>
      )}
    </div>
  );
}
