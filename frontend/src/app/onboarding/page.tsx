'use client';
import { useState } from 'react';
import { Building2, Users, Zap, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Steps, Card, Input, Select, Button, Callout, TOKENS } from '@/components';
import { BRAND as B } from '@/lib/brand';
import { useAuthStore } from '@/lib/store';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const STEP_LABELS = ['Agency details', 'First brand', 'Done!'];

const INDUSTRIES = [
  { value:'banking',label:'Banking & Finance'}, { value:'fmcg',label:'FMCG'},
  { value:'telecom',label:'Telecom'}, { value:'real_estate',label:'Real estate'},
  { value:'tech',label:'Technology'}, { value:'other',label:'Other'},
];

export default function AgencyOnboardingPage() {
  const router      = useRouter();
  const { user }    = useAuthStore();
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  const [agency, setAgency] = useState<{ workspace_name: string; tagline: string }>({ workspace_name: B.agency, tagline: B.tagline });
  const [brand,  setBrand]  = useState({ name:'', industry:'', country:'Nigeria' });

  const save = async () => {
    setSaving(true);
    try {
      if (brand.name) {
        await axios.post(`${API}/admin/brands`, brand, { headers: hdrs() });
      }
      // Mark onboarding complete
      await axios.post(`${API}/settings/onboarding-complete`, {}, { headers: hdrs() }).catch(() => {});
      setStep(2);
    } catch { toast.error('Setup failed — try again'); } finally { setSaving(false); }
  };

  const firstName = (user?.name || '').split(' ')[0] || 'there';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#060320', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,.2) 0%, transparent 55%)' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)', boxShadow: '0 8px 24px rgba(109,40,217,0.4)' }}>
            S
          </div>
        </div>

        {step < 2 && <Steps steps={STEP_LABELS} current={step} />}

        {/* Step 0 — Agency */}
        {step === 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(109,40,217,0.3)' }}>
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Welcome, {firstName}!</h2>
                <p className="text-xs text-white/40">Let's get your workspace set up</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input label="Agency workspace name" value={agency.workspace_name}
                onChange={e => setAgency(a => ({ ...a, workspace_name: e.target.value }))}
                hint="This is how your workspace is labelled across Sabi" />
              <Input label="Agency tagline (optional)" value={agency.tagline}
                onChange={e => setAgency(a => ({ ...a, tagline: e.target.value }))}
                placeholder="e.g. Africa's intelligence-led digital agency" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button iconRight={<ArrowRight className="w-4 h-4" />} onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1 — First brand */}
        {step === 1 && (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(5,150,105,0.3)' }}>
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Add your first client brand</h2>
                <p className="text-xs text-white/40">You can add more anytime from the Clients page</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input label="Brand / company name *" placeholder="e.g. GTBank, Indomie, Stanbic IBTC" value={brand.name}
                onChange={e => setBrand(b => ({ ...b, name: e.target.value }))} />
              <Select label="Industry" options={INDUSTRIES} value={brand.industry}
                onChange={e => setBrand(b => ({ ...b, industry: e.target.value }))} placeholder="Select industry…" />
              <Input label="Country" value={brand.country} onChange={e => setBrand(b => ({ ...b, country: e.target.value }))} />
            </div>
            <Callout variant="info">
              Skipping this is fine — you can add your first brand from the dashboard anytime.
            </Callout>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep(0)}>Back</Button>
              <Button full loading={saving} onClick={save}>
                {brand.name ? 'Create brand & finish' : 'Skip and finish'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2 — Done */}
        {step === 2 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(5,150,105,0.12)', border: '2px solid rgba(5,150,105,0.3)' }}>
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">You're all set!</h1>
            <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm mx-auto">
              Your {B.name} workspace is ready. Upload your first report or onboard a new client to get started.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button full size="lg" onClick={() => router.replace('/dashboard')} iconRight={<ArrowRight className="w-5 h-5" />}>
                Go to dashboard
              </Button>
              <Button full variant="secondary" onClick={() => router.replace('/clients/new')}>
                Onboard a client
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
