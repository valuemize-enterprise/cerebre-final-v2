'use client';
import { RefreshCw, Home } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060320' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.25)' }}>
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Something went wrong</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          An unexpected error occurred. This has been logged and will be fixed. Try refreshing — it usually resolves itself.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <a href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Home className="w-4 h-4" /> Dashboard
          </a>
        </div>
        <p className="text-xs text-white/15 mt-6">{error?.message || 'Unknown error'}</p>
      </div>
    </div>
  );
}
