import { AlertTriangle, RefreshCw } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export default function InviteExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background:'#060320' }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background:'rgba(217,119,6,0.12)', border:'2px solid rgba(217,119,6,0.3)' }}>
          <AlertTriangle className="w-8 h-8 text-amber-400"/>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Invite link expired</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          This invite link has either expired or already been used. Invite links are valid for 72 hours. Please ask your Cerebre account manager to send you a new one.
        </p>
        <div className="p-4 rounded-xl text-left mb-8" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-bold text-white/50 mb-2">Already have an account?</p>
          <a href="/client/login" className="text-sm text-purple-400 hover:underline">Go to sign in →</a>
        </div>
        <p className="text-xs text-white/25">{BRAND.name} · {BRAND.agency}</p>
      </div>
    </div>
  );
}
