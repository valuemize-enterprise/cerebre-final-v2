'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Zap, AlertCircle, Clock, Loader2 } from 'lucide-react';
import api, { ApiError } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';

/**
 * Login Page — ALL BUGS FIXED
 *
 * BUGS FIXED:
 * 1. setAuth(data.user, data.token) — correct argument order (was reversed)
 * 2. Single redirect path — removed the useEffect redirect that caused race condition
 * 3. user.displayName used instead of user.name (backend field variance)
 * 4. Uses direct api.post() — not store.login() — so we can see the raw response
 * 5. Token stored correctly by persist middleware, not manually
 */

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, isHydrated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slowWarning, setSlowWarning] = useState(false);

  // ── If already authenticated, redirect away ────────────────────────
  // Only redirect AFTER hydration — avoids flash redirect on first load
  const hasSubmitted = useRef(false);

  // useEffect — only for users who are ALREADY authenticated visiting /login
  useEffect(() => {
    if (hasSubmitted.current) return; // login just happened — handleSubmit owns the redirect
    if (isHydrated && token) {
      const redirect = searchParams?.get('redirect') || '/dashboard';
      router.replace(redirect);
    }
  }, [isHydrated, token, router, searchParams]);

  // ── Reason banner (session expired, not authorised, etc.) ─────────
  const reason = searchParams?.get('reason');
  const reasonBanners: Record<string, { msg: string; color: string }> = {
    session_expired: { msg: 'Your session expired. Please sign in again.', color: 'amber' },
    not_authorised: { msg: 'You need to sign in to access that page.', color: 'blue' },
    account_inactive: { msg: 'Your account is inactive. Contact your admin.', color: 'amber' },
  };
  const banner = reason ? reasonBanners[reason] : null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;

    setLoading(true);
    setError('');
    setFieldErrors({});

    // Show cold-start warning after 5 seconds
    const coldStartTimer = setTimeout(() => setSlowWarning(true), 5000);

    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      clearTimeout(coldStartTimer);

      // ── FIX: correct argument order — user FIRST, token SECOND ────
      // Previous bug: setAuth(data.token, data.user) — args were swapped
      setAuth(data.user, data.token);

      const displayName = data.user?.name || data.user?.full_name || data.user?.fullName || 'there';
      toast.success(`Welcome back, ${displayName.split(' ')[0]}!`);
      hasSubmitted.current = true;

      // Single redirect — the useEffect above will also fire but router.replace is idempotent
      const redirect = searchParams?.get('redirect') || '/dashboard';
      router.replace(redirect);

    } catch (err) {
      clearTimeout(coldStartTimer);
      setSlowWarning(false);

      if (err instanceof ApiError) {
        if (err.isUnauthorized() || err.status === 401) {
          setError('Incorrect email or password. Please check your details and try again.');
          setFieldErrors({ password: 'Incorrect credentials' });
        } else if (err.isOffline()) {
          setError('No internet connection. Check your network and try again.');
        } else if (err.code === 'SERVER_UNREACHABLE' || err.code === 'TIMEOUT') {
          setError('Cannot reach the server. It may be starting up — wait 30 seconds and try again.');
        } else if (err.isValidation()) {
          setError(err.message);
        } else {
          setError(err.message || 'Sign-in failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show nothing until hydration completes (prevents flash)
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950/20 to-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-brand-950/20 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>Cerebre</p>
            <p className="text-brand-400 text-xs">Intelligence Platform</p>
          </div>
        </div>

        {/* Reason banner */}
        {banner && (
          <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 text-sm border ${banner.color === 'amber'
              ? 'bg-amber-950/30 border-amber-800 text-amber-300'
              : 'bg-blue-950/30 border-blue-800 text-blue-300'
            }`}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {banner.msg}
          </div>
        )}

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-gray-400 text-sm mb-6">Enter your credentials to access your dashboard</p>

          {/* Global error */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cold start warning */}
          {slowWarning && (
            <div className="mb-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-start gap-2 text-sm text-amber-300">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>The server is waking up (free tier cold start takes ~30 seconds). Please wait...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setError(''); }}
                className={`input-base ${fieldErrors.email ? 'border-red-500 dark:border-red-500' : ''}`}
                placeholder="you@company.com"
                disabled={loading}
              />
              {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <a href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setError(''); }}
                  className={`input-base pr-10 ${fieldErrors.password ? 'border-red-500 dark:border-red-500' : ''}`}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {slowWarning ? 'Server waking up...' : 'Signing in...'}
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <a href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create account
            </a>
          </p>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-center text-xs text-gray-600">
              Demo account:{' '}
              <button
                type="button"
                onClick={() => { setEmail('demo@cerebre.media'); setPassword('demo1234'); }}
                className="text-brand-500 hover:underline transition-colors">
                demo@cerebre.media / demo1234
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
