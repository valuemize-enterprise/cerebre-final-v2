'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Target, Radar, MessageSquare, Users, Award, ArrowRight, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const FEATURES = [
  {
    icon: BarChart2,
    colour: '#6d28d9',
    name: 'Live Dashboard',
    description: `Your ${BRAND.features.clarityScore} — a live 0–1000 score of how your brand is performing across every platform, updated daily.`,
  },
  {
    icon: Target,
    colour: '#059669',
    name: BRAND.features.velocityTracker,
    description: 'Track your priority goals and see whether you\'re accelerating toward them or falling behind — with AI-powered projections.',
  },
  {
    icon: Radar,
    colour: '#3b82f6',
    name: BRAND.features.depthView,
    description: 'See exactly how your competitors are performing and where the gaps are — updated from live data.',
  },
  {
    icon: MessageSquare,
    colour: '#a78bfa',
    name: `Ask ${BRAND.aria}`,
    description: 'Ask anything about your brand performance in plain English. ARIA answers using your actual data, not generic advice.',
  },
  {
    icon: Users,
    colour: '#f59e0b',
    name: 'Your Team',
    description: `See every ${BRAND.agency} specialist working on your brand, their expertise, and rate their work monthly.`,
  },
  {
    icon: Award,
    colour: '#ef4444',
    name: BRAND.features.proofEngine,
    description: 'See a monthly report of exactly what your agency did — and what moved as a result. Evidence, not promises.',
  },
];

export default function ClientOnboardingPage() {
  const router  = useRouter();
  const [step, setStep]     = useState(0);
  const [client, setClient] = useState<any>(null);
  const [done, setDone]     = useState(false);

  useEffect(() => {
    const info = localStorage.getItem(BRAND.storage.clientInfo);
    if (info) setClient(JSON.parse(info));
  }, []);

  const finish = async () => {
    setDone(true);
    // Mark onboarding complete in the background
    await axios.post(`${API}/client/onboarding-complete`, {}, { headers: hdrs() }).catch(() => {});
    setTimeout(() => router.replace('/client/dashboard'), 800);
  };

  const isFeatureStep = step > 0 && step <= FEATURES.length;
  const feature = isFeatureStep ? FEATURES[step - 1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#060320', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,.2) 0%, transparent 55%)' }}>
      <div className="w-full max-w-lg">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, ...FEATURES.map((_, i) => i + 1)].map(s => (
            <div key={s} className={clsx('rounded-full transition-all duration-300', s === step ? 'w-6 h-2' : 'w-2 h-2')}
              style={{ background: s <= step ? '#6d28d9' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
              Welcome to {BRAND.name}
            </h1>
            <p className="text-lg text-purple-300 mb-2 font-medium">
              Hello{client?.name ? `, ${client.name.split(' ')[0]}` : ''} 👋
            </p>
            <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm mx-auto">
              Your brand intelligence portal is ready. Let us take 60 seconds to show you what is waiting inside.
            </p>
            <button onClick={() => setStep(1)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)', boxShadow: '0 8px 24px rgba(109,40,217,0.4)' }}>
              Show me around <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Feature steps */}
        {feature && (
          <div className="animate-in slide-in-from-right-8 fade-in-0 duration-300">
            <div className="rounded-3xl overflow-hidden border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              {/* Colour bar */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${feature.colour}, ${feature.colour}80)` }} />

              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${feature.colour}20`, border: `1px solid ${feature.colour}30` }}>
                  <feature.icon className="w-8 h-8" style={{ color: feature.colour }} />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">{feature.name}</h2>
                <p className="text-white/60 leading-relaxed text-base max-w-sm mx-auto">{feature.description}</p>
              </div>

              <div className="px-8 pb-8 flex gap-3">
                <button onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white/60 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Back
                </button>
                {step < FEATURES.length
                  ? <button onClick={() => setStep(s => s + 1)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  : <button onClick={finish}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                      style={{ background: done ? 'rgba(5,150,105,0.3)' : 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
                      {done ? <><CheckCircle2 className="w-4 h-4" />Taking you in…</> : <>Go to my dashboard <Sparkles className="w-4 h-4" /></>}
                    </button>
                }
              </div>
            </div>

            {/* Skip link */}
            <button onClick={finish} className="w-full text-center mt-4 text-xs text-white/20 hover:text-white/40 transition-colors py-2">
              Skip tour and go straight to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
