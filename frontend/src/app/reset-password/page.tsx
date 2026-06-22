'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const strength = (p: string): { score: number; label: string; colour: string } => {
  if (!p) return { score: 0, label: '', colour: '' };
  let s = 0;
  if (p.length >= 8)  s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: s, label: 'Too weak',  colour: '#ef4444' };
  if (s === 2) return { score: s, label: 'Fair',      colour: '#d97706' };
  if (s === 3) return { score: s, label: 'Good',      colour: '#6d28d9' };
  return             { score: s, label: 'Strong ✓',   colour: '#059669' };
};

function ResetForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get('token') || '';

  const [pwd,     setPwd]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  const str = strength(pwd);
  const valid = pwd.length >= 8 && pwd === confirm && str.score >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: pwd });
      setDone(true);
      setTimeout(() => router.replace('/login?msg=password_reset'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'This link has expired. Please request a new one.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="text-center">
      <p className="text-white/50 text-sm mb-4">No reset token found. Please request a new link.</p>
      <a href="/forgot-password" className="text-purple-400 text-sm hover:underline">Request reset link →</a>
    </div>
  );

  if (done) return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: 'rgba(5,150,105,0.12)', border: '2px solid rgba(5,150,105,0.3)' }}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Password updated!</h2>
      <p className="text-sm text-white/40">Redirecting you to sign in…</p>
    </div>
  );

  const iStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)' }}>
          <ShieldCheck className="w-6 h-6 text-purple-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Set new password</h1>
        <p className="text-sm text-white/40">Choose a strong password to secure your account.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* New password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>New password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoFocus
              className="w-full rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={iStyle} placeholder="Minimum 8 characters" />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          {pwd && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: i <= str.score ? str.colour : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p className="text-xs font-semibold" style={{ color: str.colour }}>{str.label}</p>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#a78bfa' }}>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all"
            style={{ ...iStyle, borderColor: confirm && confirm !== pwd ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
              boxShadow: confirm && confirm === pwd && pwd ? '0 0 0 2px rgba(5,150,105,0.3)' : undefined }}
            placeholder="Repeat new password" />
          {confirm && confirm !== pwd && <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>}
          {confirm && confirm === pwd && pwd && <p className="text-xs text-emerald-400 mt-1.5">✓ Passwords match</p>}
        </div>

        {error && (
          <div className="text-sm text-red-300 text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={!valid || loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow: '0 4px 16px rgba(109,40,217,0.35)' }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Set new password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#060320', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,.18) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)', boxShadow: '0 8px 24px rgba(109,40,217,0.35)' }}>
            S
          </div>
        </div>
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
