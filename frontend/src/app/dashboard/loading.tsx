'use client';
import { TOKENS } from '@/components';
export default function DashboardLoading() {
  const sk = (w: string, h: string) => (
    <div className="animate-pulse rounded-xl" style={{ width: w, height: h, background:'rgba(255,255,255,0.06)' }}/>
  );
  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-6">
      <div className="space-y-2">{sk('200px','28px')}{sk('320px','16px')}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${TOKENS.border}`, height:100 }}/>)}</div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">{[1,2].map(i=><div key={i} className="rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${TOKENS.border}`, height:280 }}/>)}</div>
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${TOKENS.border}`, height:140 }}/>)}</div>
      </div>
    </div>
  );
}
