'use client';
import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Loader2, CheckCircle2, Smartphone, Key } from 'lucide-react';
import { PageHeader, Card, Input, Button, Callout, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

export default function SecuritySettingsPage() {
  const [pwd,   setPwd]   = useState({ old_password:'', new_password:'', confirm:'' });
  const [show,  setShow]  = useState({ old:false, new:false });
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle'|'qr'|'verify'|'done'>('idle');
  const [setupLoading, setSetupLoading] = useState(false);

  const savePwd = async () => {
    if (pwd.new_password !== pwd.confirm) { toast.error("Passwords don't match"); return; }
    if (pwd.new_password.length < 8)      { toast.error('Minimum 8 characters'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/auth/change-password`, { old_password: pwd.old_password, new_password: pwd.new_password }, { headers: hdrs() });
      toast.success('Password changed');
      setPwd({ old_password:'', new_password:'', confirm:'' });
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  };

  const setup2FA = async () => {
    setSetupLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/2fa/setup`, {}, { headers: hdrs() });
      setQrCode(data.qr_code || data.qrCode || '');
      setSetupStep('qr');
    } catch { toast.error('2FA setup failed'); } finally { setSetupLoading(false); }
  };

  const verify2FA = async () => {
    setSetupLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/verify`, { code: twoFACode }, { headers: hdrs() });
      setTwoFAEnabled(true); setSetupStep('done');
      toast.success('Two-factor authentication enabled!');
    } catch { toast.error('Invalid code — try again'); } finally { setSetupLoading(false); }
  };

  const iStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' };

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <PageHeader back="/settings" eyebrow="Settings" title="Security" subtitle="Password, two-factor auth, and session management"/>

      <div className="space-y-5">
        {/* Change password */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(109,40,217,0.15)', border:'1px solid rgba(109,40,217,0.2)' }}><Lock className="w-4 h-4 text-purple-400"/></div>
            <div><h2 className="text-sm font-bold text-white">Change password</h2><p className="text-xs text-white/35">Minimum 8 characters</p></div>
          </div>
          <div className="space-y-3">
            {[{l:'Current password',k:'old_password',s:'old'},{l:'New password',k:'new_password',s:'new'},{l:'Confirm new password',k:'confirm',s:'new'}].map(({l,k,s})=>(
              <div key={k}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:'#a78bfa' }}>{l}</label>
                <div className="relative">
                  <input type={(show as any)[s]?'text':'password'} value={(pwd as any)[k]} onChange={e=>setPwd(p=>({...p,[k]:e.target.value}))}
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle}/>
                  {k !== 'confirm' && (
                    <button onClick={()=>setShow(s2=>({...s2,[s]:!(s2 as any)[s]}))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/55">
                      {(show as any)[s]?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                    </button>
                  )}
                </div>
                {k==='confirm'&&pwd.confirm&&pwd.confirm!==pwd.new_password&&<p className="text-xs text-red-400 mt-1">Passwords don't match</p>}
              </div>
            ))}
          </div>
          <Button className="mt-4" loading={saving} onClick={savePwd} disabled={!pwd.old_password||!pwd.new_password||pwd.new_password!==pwd.confirm} icon={<Lock className="w-4 h-4"/>}>
            Change password
          </Button>
        </Card>

        {/* 2FA */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(5,150,105,0.15)', border:'1px solid rgba(5,150,105,0.2)' }}><Shield className="w-4 h-4 text-emerald-400"/></div>
            <div className="flex-1"><h2 className="text-sm font-bold text-white">Two-factor authentication</h2><p className="text-xs text-white/35">Extra security using an authenticator app</p></div>
            {twoFAEnabled && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Enabled</span>}
          </div>

          {setupStep === 'idle' && !twoFAEnabled && (
            <div>
              <p className="text-xs text-white/40 leading-relaxed mb-4">Protect your account with an authenticator app like Google Authenticator or Authy. Even if someone has your password, they'll still need your phone to log in.</p>
              <Button variant="secondary" loading={setupLoading} icon={<Smartphone className="w-4 h-4"/>} onClick={setup2FA}>Set up 2FA</Button>
            </div>
          )}
          {setupStep === 'qr' && (
            <div className="space-y-4">
              <Callout variant="info">Scan this QR code with your authenticator app, then enter the 6-digit code below.</Callout>
              {qrCode && <div className="flex justify-center p-4 rounded-xl" style={{ background:'#fff' }}><img src={qrCode} alt="QR code" className="w-40 h-40"/></div>}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'#a78bfa' }}>Verification code</label>
                <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6}
                  className="w-32 rounded-xl px-4 py-3 text-xl font-mono text-center outline-none focus:ring-2 focus:ring-purple-500/50" style={iStyle}/>
              </div>
              <Button loading={setupLoading} onClick={verify2FA} disabled={twoFACode.length !== 6} icon={<Key className="w-4 h-4"/>}>Verify and enable</Button>
            </div>
          )}
          {(setupStep === 'done' || twoFAEnabled) && (
            <Callout variant="success">Two-factor authentication is active. You'll be prompted for a code each time you sign in.</Callout>
          )}
        </Card>

        {/* Active sessions */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.2)' }}><Shield className="w-4 h-4 text-red-400"/></div>
            <div><h2 className="text-sm font-bold text-white">Sign out everywhere</h2><p className="text-xs text-white/35">Revoke all active sessions except this one</p></div>
          </div>
          <Button variant="danger" onClick={async()=>{
            await axios.post(`${API}/auth/revoke-all`, {}, { headers: hdrs() }).catch(()=>{});
            toast.success('All other sessions signed out');
          }}>Sign out all other sessions</Button>
        </Card>
      </div>
    </div>
  );
}
