'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck, TrendingUp, TrendingDown, FileText, Star, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem(BRAND.storage.clientToken)}` });

const ICON_MAP: Record<string, { icon: typeof Bell; colour: string; bg: string }> = {
  metric_spike:   { icon: TrendingUp,    colour: '#059669', bg: 'rgba(5,150,105,0.15)'   },
  metric_drop:    { icon: TrendingDown,  colour: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  alert:          { icon: AlertTriangle, colour: '#d97706', bg: 'rgba(217,119,6,0.15)'   },
  new_report:     { icon: FileText,      colour: '#6d28d9', bg: 'rgba(109,40,217,0.15)'  },
  client_rating:  { icon: Star,          colour: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  aria:           { icon: Zap,           colour: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
};

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [marking,   setMarking]   = useState(false);

  const load = () => {
    axios.get(`${API}/client/alerts`, { headers: hdrs() })
      .then(r => setNotifications(r.data.alerts || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
    await axios.patch(`${API}/client/alerts/${id}/read`, {}, { headers: hdrs() }).catch(() => {});
  };

  const markAllRead = async () => {
    setMarking(true);
    setNotifications(n => n.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    await axios.post(`${API}/client/alerts/read-all`, {}, { headers: hdrs() }).catch(() => {});
    setMarking(false);
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: '#6d28d9' }} />
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Activity</p>
          </div>
          <h1 className="text-2xl font-black text-white">Notifications</h1>
          <p className="text-sm text-white/40 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={marking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.15)' }}>
            <Bell className="w-8 h-8 text-purple-400/40" />
          </div>
          <p className="text-white/40 font-semibold">No notifications yet</p>
          <p className="text-white/20 text-sm mt-1">ARIA will alert you when something important changes on your brand.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const cfg  = ICON_MAP[n.alert_type] || ICON_MAP.alert;
            const Icon = cfg.icon;
            const unread = !n.read_at;
            return (
              <div key={n.id} onClick={() => unread && markRead(n.id)}
                className={clsx('flex items-start gap-4 p-4 rounded-xl border transition-all', unread ? 'cursor-pointer hover:border-purple-500/30' : 'opacity-55')}
                style={{
                  background:   unread ? 'rgba(109,40,217,0.07)' : 'rgba(255,255,255,0.02)',
                  borderColor:  unread ? 'rgba(109,40,217,0.2)'  : 'rgba(255,255,255,0.06)',
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                  <Icon className="w-5 h-5" style={{ color: cfg.colour }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold leading-snug', unread ? 'text-white' : 'text-white/55')}>{n.title}</p>
                    <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{n.body}</p>}
                  {unread && <p className="text-[10px] mt-2 text-purple-400/60">Tap to mark as read</p>}
                </div>
                {unread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#6d28d9' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
