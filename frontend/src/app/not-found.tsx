'use client';
import { ArrowLeft, Home } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060320' }}>
      <div className="text-center max-w-md">
        {/* Animated glitch number */}
        <div className="relative mb-8 inline-block">
          <p className="text-[120px] font-black leading-none select-none"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[120px] font-black leading-none opacity-10 text-white select-none" style={{ transform: 'translate(3px, 3px)' }}>
              404
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Page not found</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or you may not have access to it. Let's get you back on track.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
          <a href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            <Home className="w-4 h-4" /> Dashboard
          </a>
        </div>
        <p className="text-xs text-white/20 mt-8">{BRAND.name} · {BRAND.agency}</p>
      </div>
    </div>
  );
}
