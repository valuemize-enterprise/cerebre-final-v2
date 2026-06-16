'use client';
import { useEffect, useState } from 'react';
import { BarChart2, Loader2, Link2, ArrowUpRight } from 'lucide-react';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const COLOURS: Record<string,string> = { instagram:'#E1306C', facebook:'#1877F2', tiktok:'#69C9D0', twitter:'#1DA1F2', linkedin:'#0A66C2', youtube:'#FF0000', google_analytics:'#4285F4', website:'#6d28d9' };
const ICONS:   Record<string,string> = { instagram:'📸', facebook:'👥', tiktok:'🎵', twitter:'🐦', linkedin:'💼', youtube:'▶️', google_analytics:'📊', website:'🌐' };

export default function PlatformsOverview() {
  const [data, setData]     = useState<any>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/client/dashboard?period=${period}`, { headers: hdrs() })
      .then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  const platforms = data?.platforms || {};

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Platform Performance</h1>
          <p className="text-white/40 text-sm mt-1">{Object.keys(platforms).length} platform{Object.keys(platforms).length !== 1 ? 's' : ''} connected</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {[7,30,90].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period===p?'text-white':'text-white/30'}`}
              style={period===p ? { background:'rgba(109,40,217,0.4)', border:'1px solid rgba(109,40,217,0.4)' }:{}}>
              {p===90?'90d':p===30?'30d':'7d'}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      : Object.keys(platforms).length === 0 ? (
        <div className="text-center py-20">
          <Link2 className="w-12 h-12 mx-auto text-white/10 mb-4" />
          <p className="text-white/30 font-semibold">No platforms connected yet</p>
          <p className="text-white/15 text-sm mt-1">Your account manager will connect your platforms</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(platforms).map(([platform, d]: [string,any]) => {
            const colour = COLOURS[platform] || '#6d28d9';
            const icon   = ICONS[platform]   || '📊';
            const impressions = d.impressions || d.sessions || d.views || 0;
            const followers   = d.followers_total || d.subscribers || 0;
            const er          = d.engagement_rate;
            return (
              <a key={platform} href={`/client/platforms/${platform}`}
                className="group rounded-2xl border p-5 transition-all hover:scale-[1.02]"
                style={{ borderColor: `${colour}25`, background: `${colour}08` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{icon}</span>
                    <p className="text-sm font-bold text-white/90 capitalize">{platform.replace('_',' ')}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-3xl font-black text-white mb-1">
                  {impressions>=1000000?`${(impressions/1000000).toFixed(1)}M`:impressions>=1000?`${(impressions/1000).toFixed(0)}K`:impressions.toLocaleString()}
                </p>
                <p className="text-xs text-white/30 mb-3">impressions</p>
                {followers > 0 && <p className="text-xs font-semibold" style={{ color:`${colour}CC` }}>{followers.toLocaleString()} followers{er ? ` · ${(er*100).toFixed(1)}% ER` : ''}</p>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
