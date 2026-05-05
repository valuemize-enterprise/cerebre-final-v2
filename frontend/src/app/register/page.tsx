'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { useGuestOnly } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { isLoading: authLoading } = useGuestOnly();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', company: '', password: '', confirm: '',
  });

  if (authLoading) return null;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match'); return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setLoading(true);
    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName, company: form.company });
      toast.success('Account created — please sign in');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cerebre Media Africa</h1>
          <p className="text-sm text-gray-400 mt-1">Create your analyst account</p>
        </div>

        <div className="card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-5">Get started</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name', key: 'fullName', type: 'text', placeholder: 'Amara Okafor' },
              { label: 'Email address', key: 'email', type: 'email', placeholder: 'analyst@cerebre.com' },
              { label: 'Company / Agency', key: 'company', type: 'text', placeholder: 'Cerebre Media Africa' },
              { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters' },
              { label: 'Confirm password', key: 'confirm', type: 'password', placeholder: 'Repeat password' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  required
                  value={(form as any)[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className="input-base"
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
