'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Target, BarChart2, ChevronRight,
  ChevronLeft, Check, Zap, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const INDUSTRIES = [
  'FMCG / Consumer Goods', 'Fintech / Finance', 'E-commerce / Retail',
  'Media & Entertainment', 'Real Estate', 'Healthcare / Pharma',
  'Telecoms', 'Hospitality / Food', 'Fashion & Lifestyle',
  'Technology / SaaS', 'Education', 'Non-profit / NGO', 'Other',
];

const PLATFORMS = [
  { id: 'instagram',  label: 'Instagram',   color: '#E1306C' },
  { id: 'facebook',   label: 'Facebook',    color: '#1877F2' },
  { id: 'tiktok',     label: 'TikTok',      color: '#69C9D0' },
  { id: 'twitter',    label: 'Twitter / X', color: '#1DA1F2' },
  { id: 'linkedin',   label: 'LinkedIn',    color: '#0A66C2' },
  { id: 'youtube',    label: 'YouTube',     color: '#FF0000' },
  { id: 'google_ads', label: 'Google Ads',  color: '#4285F4' },
  { id: 'email',      label: 'Email',       color: '#F59E0B' },
  { id: 'website',    label: 'Website/GA4', color: '#10B981' },
];

const GOAL_TYPES = [
  { id: 'brand_awareness',  label: 'Brand Awareness',    icon: '📣', desc: 'Grow reach, impressions, and brand recognition' },
  { id: 'lead_generation',  label: 'Lead Generation',    icon: '🎯', desc: 'Capture qualified leads and prospects' },
  { id: 'sales_conversion', label: 'Sales & Revenue',    icon: '💰', desc: 'Convert leads and drive direct revenue' },
  { id: 'community_growth', label: 'Community Growth',   icon: '👥', desc: 'Build and engage a loyal audience' },
  { id: 'customer_retention', label: 'Customer Retention', icon: '🔄', desc: 'Reduce churn and keep customers longer' },
  { id: 'content_engagement', label: 'Content Engagement', icon: '❤️', desc: 'Drive interactions with your content' },
];

const HORIZONS = [
  { id: 'monthly',   label: '1 Month',  desc: 'Short sprint' },
  { id: 'quarterly', label: '1 Quarter', desc: '3-month plan' },
  { id: 'yearly',    label: '1 Year',    desc: 'AI breaks into months + quarters' },
];

const steps = ['Company', 'Platforms', 'Primary Goal', 'Target'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    // Company
    companyName: '',
    industry: '',
    companySize: 'sme',
    website: '',
    // Platforms
    platforms: [] as string[],
    // Goal
    goalType: '',
    goalHorizon: 'quarterly',
    goalTitle: '',
    // Target
    targetValue: '',
    primaryMetric: 'leads',
    unit: 'count',
  });

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const togglePlatform = (id: string) =>
    set('platforms', form.platforms.includes(id)
      ? form.platforms.filter(p => p !== id)
      : [...form.platforms, id]);

  const goNext = () => setStep(s => Math.min(steps.length - 1, s + 1));
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Create company
      const companyRes = await api.post('/onboarding/company', {
        name: form.companyName,
        industry: form.industry,
        companySize: form.companySize,
        website: form.website,
        platforms: form.platforms,
      });

      // 2. Create goal
      const today = new Date();
      const periodStart = today.toISOString().split('T')[0];
      let periodEnd = new Date(today);
      if (form.goalHorizon === 'monthly')   periodEnd.setMonth(periodEnd.getMonth() + 1);
      if (form.goalHorizon === 'quarterly') periodEnd.setMonth(periodEnd.getMonth() + 3);
      if (form.goalHorizon === 'yearly')    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await api.post('/goals', {
        goal_type: form.goalType,
        title: form.goalTitle || `${form.goalType.replace('_', ' ')} goal`,
        horizon: form.goalHorizon,
        period_start: periodStart,
        period_end: periodEnd.toISOString().split('T')[0],
        primary_metric: form.primaryMetric,
        target_value: parseFloat(form.targetValue),
        baseline_value: 0,
        unit: form.unit,
        target_platforms: form.platforms,
      });

      // 3. Mark onboarding done
      await api.post('/onboarding/complete');

      toast.success('Setup complete! AI is generating your strategy...');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const canProgress = () => {
    if (step === 0) return form.companyName && form.industry;
    if (step === 1) return form.platforms.length > 0;
    if (step === 2) return form.goalType && form.goalHorizon;
    if (step === 3) return form.targetValue;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-gray-950 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Cerebre Media Africa</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                i < step  ? 'bg-green-500 text-white' :
                i === step ? 'bg-brand-500 text-white' :
                'bg-gray-800 text-gray-500'
              )}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={clsx('text-xs hidden sm:block', i === step ? 'text-white' : 'text-gray-500')}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={clsx('flex-1 h-px', i < step ? 'bg-brand-500' : 'bg-gray-800')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-7 shadow-2xl">

          {/* Step 0: Company */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tell us about your company</h2>
                <p className="text-sm text-gray-400 mt-1">This helps the AI tailor recommendations to your market</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Company name</label>
                <input className="input-base" placeholder="Cerebre Media Africa" value={form.companyName}
                  onChange={e => set('companyName', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Industry</label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button key={ind} type="button"
                      onClick={() => set('industry', ind)}
                      className={clsx(
                        'px-3 py-2 text-xs rounded-lg border text-left transition-colors',
                        form.industry === ind
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      )}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Company website</label>
                <input className="input-base" placeholder="https://yourcompany.com" value={form.website}
                  onChange={e => set('website', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Platforms */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Which platforms do you use?</h2>
                <p className="text-sm text-gray-400 mt-1">Select all that apply — you can add more later</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all',
                      form.platforms.includes(p.id)
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    )}>
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ background: form.platforms.includes(p.id) ? p.color : '#d1d5db' }}
                    />
                    {p.label}
                    {form.platforms.includes(p.id) && <Check className="w-3 h-3 text-brand-500" />}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">{form.platforms.length} platform{form.platforms.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}

          {/* Step 2: Goal type */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What is your primary goal?</h2>
                <p className="text-sm text-gray-400 mt-1">The AI will build a strategy around this</p>
              </div>
              <div className="space-y-2">
                {GOAL_TYPES.map(g => (
                  <button key={g.id} type="button" onClick={() => set('goalType', g.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                      form.goalType === g.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    )}>
                    <span className="text-xl">{g.icon}</span>
                    <div>
                      <p className={clsx('text-sm font-medium', form.goalType === g.id ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200')}>{g.label}</p>
                      <p className="text-xs text-gray-400">{g.desc}</p>
                    </div>
                    {form.goalType === g.id && <Check className="w-4 h-4 text-brand-500 ml-auto" />}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Timeframe</label>
                <div className="grid grid-cols-3 gap-2">
                  {HORIZONS.map(h => (
                    <button key={h.id} type="button" onClick={() => set('goalHorizon', h.id)}
                      className={clsx(
                        'p-3 rounded-xl border text-center text-xs transition-all',
                        form.goalHorizon === h.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                      )}>
                      <p className="font-semibold">{h.label}</p>
                      <p className="text-gray-400 mt-0.5">{h.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Target */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Set your target</h2>
                <p className="text-sm text-gray-400 mt-1">Give the AI a concrete number to aim for</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Goal title (optional)</label>
                <input className="input-base" placeholder={`e.g. "Grow Instagram to 50K followers by Q2"`}
                  value={form.goalTitle} onChange={e => set('goalTitle', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target metric</label>
                  <select className="input-base" value={form.primaryMetric} onChange={e => set('primaryMetric', e.target.value)}>
                    <option value="leads">Leads</option>
                    <option value="impressions">Impressions</option>
                    <option value="followers_total">Followers</option>
                    <option value="revenue">Revenue (₦)</option>
                    <option value="conversions">Conversions</option>
                    <option value="engagement_rate">Engagement rate</option>
                    <option value="website_visits">Website visits</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target value</label>
                  <input type="number" className="input-base" placeholder="e.g. 1000"
                    value={form.targetValue} onChange={e => set('targetValue', e.target.value)} />
                </div>
              </div>

              {/* Preview */}
              {form.targetValue && (
                <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-xl border border-brand-100 dark:border-brand-800">
                  <p className="text-xs font-medium text-brand-600 mb-1">Goal preview</p>
                  <p className="text-sm text-brand-800 dark:text-brand-300">
                    Achieve <strong>{Number(form.targetValue).toLocaleString()} {form.primaryMetric}</strong> in <strong>{form.goalHorizon === 'yearly' ? '1 year' : form.goalHorizon === 'quarterly' ? '3 months' : '1 month'}</strong>.
                    {form.goalHorizon === 'yearly' && ' The AI will break this into monthly and quarterly milestones.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t border-gray-100 dark:border-gray-800">
            {step > 0 ? (
              <button onClick={goBack} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < steps.length - 1 ? (
              <button onClick={goNext} disabled={!canProgress()} className="btn-primary disabled:opacity-50">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canProgress() || loading} className="btn-primary disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Setting up...' : 'Launch dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
