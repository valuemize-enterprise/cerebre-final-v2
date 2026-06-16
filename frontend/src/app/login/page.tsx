'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, Clock } from 'lucide-react';
import api, { ApiError } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { BRAND } from '../../lib/brand';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#060320' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, isHydrated } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    if (isHydrated && token) {
      router.replace(searchParams?.get('redirect') || '/dashboard');
    }
  }, [isHydrated, token, router, searchParams]);

  const reason = searchParams?.get('reason');
  const banners: Record<string,{ msg: string; colour: string }> = {
    session_expired: { msg: 'Your session expired. Please sign in again.', colour: 'amber' },
    not_authorised:  { msg: 'You need to sign in to access that page.',    colour: 'blue'  },
  };
  const banner = reason ? banners[reason] : null;

  const validate = () => {
    const errs: Record<string,string> = {};
    if (!email.trim())               errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password)                   errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => setSlowWarning(true), 5000);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      clearTimeout(timer);
      setAuth(data.user, data.token);
      const name = data.user?.name || data.user?.full_name || 'there';
      toast.success(`Welcome back, ${name.split(' ')[0]}!`);
      router.replace(searchParams?.get('redirect') || '/dashboard');
    } catch (err) {
      clearTimeout(timer);
      setSlowWarning(false);
      if (err instanceof ApiError) {
        if (err.isUnauthorized()) {
          setError('Incorrect email or password.');
          setFieldErrors({ password: 'Incorrect credentials' });
        } else if (err.isOffline()) {
          setError('No internet connection. Check your network.');
        } else if (err.code === 'SERVER_UNREACHABLE' || err.code === 'TIMEOUT') {
          setError('Cannot reach server. It may be starting up — wait 30 seconds and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060320' }}>
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: '#060320',
      backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(109,40,217,.18) 0%, transparent 60%)',
    }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-xl"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
            <span className="text-white font-black text-2xl tracking-tighter">S</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{BRAND.name}</h1>
          <p className="text-purple-400 text-xs mt-1 font-medium">{BRAND.tagline}</p>
        </div>

        {/* Reason banner */}
        {banner && (
          <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-sm border ${
            banner.colour === 'amber'
              ? 'bg-amber-950/30 border-amber-800 text-amber-300'
              : 'bg-blue-950/30 border-blue-800 text-blue-300'
          }`}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {banner.msg}
          </div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '36px 32px',
        }}>
          <h2 className="text-xl font-black text-white mb-1">Agency sign in</h2>
          <p className="text-purple-300/60 text-sm mb-7">Access your Sabi workspace</p>

          {error && (
            <div className="mb-5 p-3 rounded-xl flex items-start gap-2 text-sm"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-red-300">{error}</span>
            </div>
          )}
          {slowWarning && (
            <div className="mb-5 p-3 rounded-xl flex items-start gap-2 text-sm"
              style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)' }}>
              <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-amber-300">Server is starting up — this can take 30 seconds. Please wait...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Email</label>
              <input type="email" autoFocus value={email} disabled={loading}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p=>({...p,email:''})); setError(''); }}
                placeholder="you@cerebre.media"
                className={`w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-purple-500 ${fieldErrors.email ? 'ring-1 ring-red-500' : ''}`}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} disabled={loading}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p=>({...p,password:''})); setError(''); }}
                  placeholder="••••••••"
                  className={`w-full rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-purple-500 ${fieldErrors.password ? 'ring-1 ring-red-500' : ''}`}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
            </div>

            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 mt-2"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{slowWarning ? 'Server starting...' : 'Signing in...'}</span>
                : 'Sign in to Sabi →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          {BRAND.copyright}
        </p>
      </div>
    </div>
  );
}
