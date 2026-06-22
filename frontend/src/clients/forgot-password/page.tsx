'use client';
import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ClientForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email address'); return; }
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/client/auth/forgot-password`, { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send reset email — please try again');
    } finally { setLoading(false); }
  };

  const bg = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background:'#060320', backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,.15) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)', boxShadow:'0 6px 20px rgba(109,40,217,0.35)' }}>S</div>
        </div>
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background:'rgba(5,150,105,0.12)',border:'2px solid rgba(5,150,105,0.3)' }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400"/>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Check your email</h1>
            <p className="text-sm text-white/50 leading-relaxed mb-6">We sent a reset link to <span className="text-white/70 font-medium">{email}</span>. Expires in 30 minutes.</p>
            <a href="/client/login" className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/55 transition-colors"><ArrowLeft className="w-4 h-4"/>Back to sign in</a>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-white mb-2">Forgot password?</h1>
              <p className="text-sm text-white/40">Enter your email — we'll send a reset link.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25"/>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@company.com" autoFocus
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
                    style={{ ...bg, borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                </div>
                {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 transition-all"
                style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow:'0 4px 16px rgba(109,40,217,0.3)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Sending…</> : 'Send reset link'}
              </button>
            </form>
            <a href="/client/login" className="flex items-center justify-center gap-2 mt-6 text-sm text-white/30 hover:text-white/50 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5"/>Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
