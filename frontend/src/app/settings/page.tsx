'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { settingsApi } from '../../lib/api';
import {
  User, Lock, Bell, Key, Save, Loader2, CheckCircle2, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors w-full text-left',
      active
        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
  >
    <Icon className="w-4 h-4 shrink-0" />
    {label}
  </button>
);

const Field = ({ label, children }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
    {children}
  </div>
);

// ── Profile Tab ───────────────────────────────────────────────
const ProfileTab = ({ user }: { user: any }) => {
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    company: user?.company || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        fullName: form.fullName,
        company: form.company,
      });
      setSaved(true);
      toast.success('Profile updated');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-brand-700 dark:text-brand-400 font-semibold text-xl">
          {form.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{form.fullName}</p>
          <p className="text-xs text-gray-400">{form.email}</p>
          <span className="badge-neutral mt-1 inline-block">{user?.role}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <input
            className="input-base"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
        </Field>
        <Field label="Company / Agency">
          <input
            className="input-base"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
        </Field>
        <Field label="Email address">
          <input className="input-base opacity-60" value={form.email} disabled />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </Field>
        <Field label="Account role">
          <input className="input-base opacity-60" value={user?.role || 'analyst'} disabled />
        </Field>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
      </button>
    </div>
  );
};

// ── Password Tab ──────────────────────────────────────────────
const PasswordTab = () => {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const toggle = (k: keyof typeof show) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const handleSave = async () => {
    if (form.newPass !== form.confirm) { toast.error('New passwords do not match'); return; }
    if (form.newPass.length < 8) { toast.error('Password must be 8+ characters'); return; }
    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: form.current,
        newPassword: form.newPass,
      });
      toast.success('Password changed');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'current', label: 'Current password', placeholder: '••••••••' },
    { key: 'newPass', label: 'New password', placeholder: '8+ characters' },
    { key: 'confirm', label: 'Confirm new password', placeholder: 'Repeat new password' },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Change password</h2>
        <p className="text-sm text-gray-400 mt-0.5">Use a strong, unique password</p>
      </div>

      <div className="max-w-sm space-y-4">
        {fields.map(({ key, label, placeholder }) => (
          <Field key={key} label={label}>
            <div className="relative">
              <input
                type={show[key] ? 'text' : 'password'}
                className="input-base pr-10"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => toggle(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {show[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        ))}
      </div>

      {/* Strength indicator */}
      {form.newPass && (
        <div className="max-w-sm">
          <p className="text-xs text-gray-400 mb-1">Password strength</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => {
              const strength =
                (form.newPass.length >= 8 ? 1 : 0) +
                (/[A-Z]/.test(form.newPass) ? 1 : 0) +
                (/[0-9]/.test(form.newPass) ? 1 : 0) +
                (/[^A-Za-z0-9]/.test(form.newPass) ? 1 : 0);
              return (
                <div key={level} className={clsx(
                  'h-1.5 flex-1 rounded-full',
                  level <= strength
                    ? strength <= 1 ? 'bg-red-400'
                    : strength <= 2 ? 'bg-amber-400'
                    : strength <= 3 ? 'bg-yellow-400'
                    : 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                )} />
              );
            })}
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving || !form.current || !form.newPass} className="btn-primary">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Updating...' : 'Update password'}
      </button>
    </div>
  );
};

// ── Notifications Tab ─────────────────────────────────────────
const NotificationsTab = () => {
  const [prefs, setPrefs] = useState({
    analysisComplete: true,
    fileFailed: true,
    weeklyDigest: false,
    platformAlerts: true,
  });

  const toggle = (k: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'analysisComplete', label: 'Analysis complete', desc: 'When AI finishes processing a report' },
    { key: 'fileFailed', label: 'File processing errors', desc: 'When OCR or extraction fails' },
    { key: 'platformAlerts', label: 'Platform performance alerts', desc: 'When a platform drops significantly' },
    { key: 'weeklyDigest', label: 'Weekly digest email', desc: 'Summary of performance sent every Monday' },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Notifications</h2>
        <p className="text-sm text-gray-400 mt-0.5">Control what alerts you receive</p>
      </div>

      <div className="space-y-1">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3.5 border-b border-gray-50 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={clsx(
                'relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4',
                prefs[key] ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                prefs[key] ? 'left-5' : 'left-0.5'
              )} />
            </button>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={() => toast.success('Notification preferences saved')}
      >
        <Save className="w-4 h-4" />
        Save preferences
      </button>
    </div>
  );
};

// ── API Key Tab ───────────────────────────────────────────────
const ApiKeyTab = ({ user }: { user: any }) => {
  const [showKey, setShowKey] = useState(false);
  const fakeKey = `cm_live_${user?.id?.slice(0, 8) || '00000000'}xxxxxxxxxxxxxxxxxxxx`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">API access</h2>
        <p className="text-sm text-gray-400 mt-0.5">Use these credentials to integrate Cerebre data</p>
      </div>

      <div className="card p-5 space-y-4">
        <Field label="Your API key">
          <div className="flex gap-2">
            <input
              className="input-base font-mono text-xs"
              type={showKey ? 'text' : 'password'}
              value={fakeKey}
              readOnly
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="btn-secondary shrink-0"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(fakeKey); toast.success('Copied'); }}
              className="btn-secondary shrink-0 text-xs"
            >
              Copy
            </button>
          </div>
        </Field>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Keep your API key private. Never expose it in client-side code or public repos.
            Rotate it immediately if you suspect it has been compromised.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Quick example</p>
        <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto text-gray-700 dark:text-gray-300">
{`curl -X POST https://api.cerebre.media/v1/upload \\
  -H "Authorization: Bearer ${fakeKey.slice(0, 20)}..." \\
  -F "files=@instagram_report.pdf"`}
        </pre>
      </div>
    </div>
  );
};

// ── Main settings page ────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'password' | 'notifications' | 'api'>('profile');

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'password', label: 'Password', icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'api', label: 'API access', icon: Key },
  ] as const;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-44 shrink-0 space-y-0.5">
          {tabs.map(({ key, label, icon }) => (
            <TabButton
              key={key}
              active={tab === key}
              onClick={() => setTab(key)}
              icon={icon}
              label={label}
            />
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 card p-6">
          {tab === 'profile' && <ProfileTab user={user} />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'api' && <ApiKeyTab user={user} />}
        </div>
      </div>
    </div>
  );
}
