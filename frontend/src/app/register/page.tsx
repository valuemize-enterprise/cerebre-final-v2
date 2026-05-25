'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import api, { ApiError } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';

/**
 * Register Page — ALL BUGS FIXED
 *
 * BUGS FIXED:
 * 1. No longer returns null (blank screen) due to isLoading=true forever.
 *    Uses isHydrated from persist middleware instead.
 * 2. Error handling uses ApiError.message instead of err.response?.data?.error
 *    (which always returned undefined with the new api.ts).
 * 3. Redirects to /login after register with success message (not to dashboard
 *    since the user still needs to log in and get a token).
 * 4. Field-level validation with real error messages per field.
 * 5. Password strength indicator so users know why their password fails.
 * 6. Shows password field so users can verify what they're typing.
 * 7. Email already exists shows a specific message with a sign-in link.
 */

const PasswordStrength = ({ password }: { password: string }) => {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter',  pass: /[A-Z]/.test(password) },
    { label: 'One number',            pass: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      {checks.map(({ label, pass }) => (
        <div key={label} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-green-500' : 'text-gray-400'}`}>
          <CheckCircle2 className={`w-3 h-3 ${pass ? 'text-green-500' : 'text-gray-600'}`} />
          {label}
        </div>
      ))}
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '', email: '', company: '', password: '', confirm: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isHydrated && token) router.replace('/dashboard');
  }, [isHydrated, token, router]);

  // Show spinner until hydration completes
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setFieldErrors(p => ({ ...p, [k]: '' }));
    setGlobalError('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim())          errs.fullName = 'Full name is required';
    if (!form.email.trim())             errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password)                 errs.password = 'Password is required';
    else if (form.password.length < 8)  errs.password = 'Must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number';
    if (form.password !== form.confirm) errs.confirm  = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    setGlobalError('');

    try {
      await api.post('/auth/register', {
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        company:  form.company.trim() || undefined,
      });
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        // Specific message for duplicate email
        if (err.status === 409 || err.message?.toLowerCase().includes('already')) {
          setFieldErrors({ email: 'An account with this email already exists' });
          setGlobalError('');
        } else if (err.isValidation() && err.details) {
          // Map field-level errors from backend
          const mapped: Record<string, string> = {};
          err.details.forEach((d: any) => { mapped[d.field] = d.message; });
          setFieldErrors(mapped);
        } else {
          setGlobalError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setGlobalError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Full name',         key: 'fullName',  type: 'text',     placeholder: 'Amara Okafor',          required: true },
    { label: 'Email address',     key: 'email',     type: 'email',    placeholder: 'you@company.com',        required: true },
    { label: 'Company (optional)',key: 'company',   type: 'text',     placeholder: 'Your company or agency', required: false },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cerebre Intelligence</h1>
          <p className="text-sm text-gray-400 mt-1">Create your account</p>
        </div>

        <div className="card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-5">Get started — it's free</h2>

          {/* Global error */}
          {globalError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Text fields */}
            {fields.map(({ label, key, type, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input
                  type={type}
                  required={required}
                  value={form[key]}
                  onChange={setField(key)}
                  placeholder={placeholder}
                  disabled={loading}
                  className={`input-base ${fieldErrors[key] ? 'border-red-400 dark:border-red-500' : ''}`}
                />
                {fieldErrors[key] && <p className="text-red-400 text-xs mt-1">{fieldErrors[key]}</p>}
                {/* Duplicate email helper */}
                {key === 'email' && fieldErrors.email?.includes('already exists') && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Link href="/login" className="text-brand-500 hover:underline">Sign in instead →</Link>
                  </p>
                )}
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Password<span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={setField('password')}
                  placeholder="8+ characters"
                  disabled={loading}
                  className={`input-base pr-10 ${fieldErrors.password ? 'border-red-400 dark:border-red-500' : ''}`}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password
                ? <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
                : <PasswordStrength password={form.password} />
              }
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Confirm password<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={setField('confirm')}
                placeholder="Repeat password"
                disabled={loading}
                className={`input-base ${fieldErrors.confirm ? 'border-red-400 dark:border-red-500' : ''}`}
              />
              {fieldErrors.confirm && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-60">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
