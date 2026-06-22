'use client';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, UserPlus, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { BRAND } from '@/lib/brand';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function RegisterPage() {
  const router   = useRouter();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ name:'', email:'', password:'', invite_code:'' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim())          e.name     = 'Full name is required';
    if (!form.email.includes('@'))  e.email    = 'Enter a valid email';
    if (form.password.length < 8)   e.password = 'Minimum 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register`, form);
      setAuth(data.user, data.token);
      router.replace('/onboarding');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed';
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else setErrors({ general: msg });
    } finally { setLoading(false); }
  };

  const f = (k: string) => (e: any) => { setForm(x => ({ ...x, [k]: e.target.value })); setErrors(x => ({ ...x, [k]: '' })); };
  const iStyle = (k: string) => ({
    background:'rgba(255,255,255,0.06)', color:'#fff',
    border:`1px solid ${errors[k] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
  });

  return (
    <div className="min-h-screen flex" style={{ background: '#060320' }}>
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-10"
        style={{ background:'rgba(109,40,217,0.08)', borderRight:'1px solid rgba(109,40,217,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
          <div>
            <p className="text-white font-black">{BRAND.name}</p>
            <p className="text-purple-400 text-xs">{BRAND.agency}</p>
          </div>
        </div>
        <div className="space-y-6">
          {[
            { icon:'🧠', title:'ARIA Intelligence', desc:'AI that reads your data and writes weekly brand narratives automatically' },
            { icon:'📊', title:'ClarityScore™', desc:'A live 0–1000 intelligence score updated daily across every platform' },
            { icon:'🏆', title:'Proof of Value Engine', desc:'Show clients exactly what moved — and why — every single month' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-black text-white/80">{title}</p>
                <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/20">{BRAND.tagline}</p>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-2">Create your account</h1>
            <p className="text-white/40 text-sm">
              Already have one?{' '}
              <a href="/login" className="text-purple-400 hover:underline">Sign in →</a>
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {errors.general && (
              <div className="text-sm text-red-300 px-4 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)' }}>
                {errors.general}
              </div>
            )}

            {[
              { k:'name',        l:'Full name',            t:'text',     p:'Tunde Adeyemi'    },
              { k:'email',       l:'Work email',           t:'email',    p:'tunde@company.com' },
              { k:'invite_code', l:'Invite code (if any)', t:'text',     p:'Leave blank if none' },
            ].map(({ k, l, t, p }) => (
              <div key={k}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>{l}</label>
                <input type={t} value={(form as any)[k]} onChange={f(k)} placeholder={p} autoComplete={k}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
                  style={iStyle(k)} />
                {errors[k] && <p className="text-xs text-red-400 mt-1.5">{errors[k]}</p>}
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Password</label>
              <div className="relative">
                <input type={show?'text':'password'} value={form.password} onChange={f('password')} placeholder="Minimum 8 characters" autoComplete="new-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
                  style={iStyle('password')} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:brightness-110 mt-2"
              style={{ background:'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow:'0 4px 20px rgba(109,40,217,0.35)' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Creating account…</> : <><UserPlus className="w-4 h-4"/>Create account</>}
            </button>
          </form>

          <p className="text-xs text-center text-white/20 mt-6">
            By creating an account you agree to Cerebre's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
