'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#060320' }} />}>
      <SetPasswordPageInner />
    </Suspense>
  );
}

function SetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Passwords match',       pass: !!password && password === confirm },
  ];
  const allPass = checks.every(c => c.pass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPass || loading || !token) return;
    setLoading(true);
    try {
      await axios.post(`${API}/client/auth/set-password`, { token, password });
      setDone(true);
      toast.success('Password set! Redirecting...');
      setTimeout(() => router.replace('/client/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invite link may have expired. Contact your account manager.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#060320' }}>
      <p className="text-white/40">Invalid invite link</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background:'#060320', backgroundImage:'radial-gradient(ellipse at 50% 20%,rgba(109,40,217,.15) 0%,transparent 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-xl">Cerebre Intelligence</p>
            <p className="text-purple-400 text-xs">Client Portal</p>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'36px 32px' }}>
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white font-black text-xl mb-2">You are all set!</p>
              <p className="text-white/40 text-sm">Taking you to your dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white mb-1">Set your password</h1>
              <p className="text-purple-300 text-sm mb-7">Create a secure password to access your intelligence portal</p>
              {error && <div className="mb-5 p-3 rounded-xl text-sm text-red-300" style={{ background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)' }}>{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                {[{l:'New password',v:password,s:setPassword},{l:'Confirm password',v:confirm,s:setConfirm}].map(({l,v,s},i)=>(
                  <div key={l}>
                    <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">{l}</label>
                    <div className="relative">
                      <input type={show?'text':'password'} value={v} onChange={e=>s(e.target.value)} placeholder="••••••••" disabled={loading}
                        className="w-full rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)' }} />
                      {i===0 && <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>}
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5">
                  {checks.map(c=>(
                    <div key={c.label} className={`flex items-center gap-2 text-xs ${c.pass?'text-green-400':'text-white/30'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${c.pass?'text-green-400':'text-white/20'}`}/>{c.label}
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={!allPass||loading} className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 mt-2" style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
                  {loading?<span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Setting...</span>:'Set password & sign in →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
