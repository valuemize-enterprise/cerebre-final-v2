'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function ResetForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get('token') || '';
  const [pwd, setPwd]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== confirm) { setError("Passwords don't match"); return; }
    if (pwd.length < 8)  { setError('Minimum 8 characters'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/client/auth/reset-password`, { token, new_password: pwd });
      setDone(true);
      setTimeout(() => router.replace('/client/login?msg=password_reset'), 2000);
    } catch (e: any) { setError(e.response?.data?.error || 'Link expired. Request a new one.'); }
    finally { setLoading(false); }
  };

  const iStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  if (done) return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background:'rgba(5,150,105,0.12)',border:'2px solid rgba(5,150,105,0.3)' }}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400"/>
      </div>
      <h2 className="text-xl font-black text-white mb-2">Password updated!</h2>
      <p className="text-white/40 text-sm">Redirecting to sign in…</p>
    </div>
  );

  return (
    <>
      <div className="text-center mb-8">
        <Lock className="w-10 h-10 mx-auto text-purple-400 mb-4"/>
        <h1 className="text-2xl font-black text-white mb-2">Set new password</h1>
        <p className="text-sm text-white/40">Choose a strong password for your {BRAND.name} account.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>New password</label>
          <div className="relative">
            <input type={show?'text':'password'} value={pwd} onChange={e=>setPwd(e.target.value)} autoFocus placeholder="Minimum 8 characters"
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle}/>
            <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/55">
              {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Confirm password</label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle}/>
          {confirm && confirm !== pwd && <p className="text-xs text-red-400 mt-1">Doesn't match</p>}
          {confirm && confirm === pwd && pwd && <p className="text-xs text-emerald-400 mt-1">✓ Matches</p>}
        </div>
        {error && <div className="text-sm text-red-300 px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
        <button type="submit" disabled={!pwd||!confirm||pwd!==confirm||loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
          style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
          {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Updating…</>:'Set new password'}
        </button>
      </form>
      {!token && <p className="text-xs text-center text-white/25 mt-4">No token found. <a href="/client/forgot-password" className="text-purple-400 hover:underline">Request a new link</a>.</p>}
    </>
  );
}

export default function ClientResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background:'#060320', backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,.15) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-lg" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)', boxShadow:'0 6px 20px rgba(109,40,217,0.35)' }}>S</div>
        </div>
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 text-purple-400 animate-spin"/></div>}>
          <ResetForm/>
        </Suspense>
      </div>
    </div>
  );
}
