'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, Clock } from 'lucide-react';
import axios from 'axios';
import BRAND from '@/lib/brand';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#060320' }} />}>
      <ClientLoginPageInner />
    </Suspense>
  );
}

function ClientLoginPageInner() {
  const router       = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(BRAND.storage.clientToken)) router.replace('/client/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email || !password) return;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => setSlowWarning(true), 5000);
    try {
      const { data } = await axios.post(`${API}/client/auth/login`, { email, password });
      clearTimeout(timer);
      localStorage.setItem(BRAND.storage.clientToken, data.token);
      localStorage.setItem(BRAND.storage.clientInfo,  JSON.stringify(data.client));
      toast.success(`Welcome back, ${(data.client?.name || 'there').split(' ')[0]}!`);
      router.replace('/client/dashboard');
    } catch (err: any) {
      clearTimeout(timer);
      setSlowWarning(false);
      const status = err.response?.status;
      if (status === 401) setError('Incorrect email or password.');
      else if (!navigator.onLine) setError('No internet connection.');
      else setError(err.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{
      background: '#060320',
      backgroundImage: 'radial-gradient(ellipse at 50% 25%, rgba(109,40,217,.2) 0%, transparent 55%)',
    }}>
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
          <span className="text-white font-black text-3xl tracking-tighter">S</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">{BRAND.name}</h1>
        <p className="text-purple-400 text-xs mt-1">{BRAND.clientPortalName}</p>
      </div>

      <div className="w-full max-w-sm" style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22, padding: '36px 32px',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 className="text-2xl font-black text-white mb-1">Sign in</h2>
        <p className="text-purple-300/60 text-sm mb-7">Your brand intelligence dashboard awaits</p>

        {error && (
          <div className="mb-5 p-3 rounded-xl flex items-start gap-2 text-sm"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span className="text-red-300">{error}</span>
          </div>
        )}
        {slowWarning && (
          <div className="mb-5 p-3 rounded-xl text-xs text-amber-300"
            style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)' }}>
            Server is starting up — this takes up to 30 seconds. Please wait...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label:'Email address', type:'email',    val:email,    set:setEmail    },
            { label:'Password',      type:'password', val:password, set:setPassword },
          ].map(({ label, type, val, set }, i) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">{label}</label>
              <div className="relative">
                <input type={i === 1 && showPass ? 'text' : type} value={val} disabled={loading}
                  onChange={e => { set(e.target.value); setError(''); }}
                  placeholder={i === 0 ? 'cmo@yourbrand.com' : '••••••••'}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                {i === 1 && (
                  <button type="button" tabIndex={-1} onClick={() => setShowPass(s=>!s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full py-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{slowWarning ? 'Starting...' : 'Signing in...'}</span>
              : 'Access my dashboard →'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Need access? Contact your account manager at {BRAND.agency}
        </p>
      </div>

      <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.12)' }}>
        {BRAND.name} · {BRAND.copyright}
      </p>
    </div>
  );
}
