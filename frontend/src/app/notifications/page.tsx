'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck, TrendingUp, TrendingDown, AlertTriangle, FileText, Users, Zap, Star, Calendar, Loader2 } from 'lucide-react';
import { PageHeader, Card, Badge, Button, Tabs, EmptyState, TOKENS } from '@/components';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const TYPE_CONFIG: Record<string, { icon: typeof Bell; colour: string; bg: string }> = {
  metric_spike:   { icon: TrendingUp,    colour: '#059669', bg: 'rgba(5,150,105,0.15)'   },
  metric_drop:    { icon: TrendingDown,  colour: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  alert:          { icon: AlertTriangle, colour: '#d97706', bg: 'rgba(217,119,6,0.15)'   },
  new_report:     { icon: FileText,      colour: '#6d28d9', bg: 'rgba(109,40,217,0.15)'  },
  client_rating:  { icon: Star,          colour: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  team_update:    { icon: Users,         colour: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  strategy:       { icon: Zap,           colour: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  calendar:       { icon: Calendar,      colour: '#06b6d4', bg: 'rgba(6,182,212,0.15)'   },
};

const getIcon = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.alert;

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('all');
  const [marking, setMarking]             = useState(false);

  const load = () => {
    axios.get(`${API}/notifications`, { headers: hdrs() })
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read_at: new Date().toISOString() } : x));
    await axios.patch(`${API}/notifications/${id}/read`, {}, { headers: hdrs() }).catch(() => {});
  };

  const markAllRead = async () => {
    setMarking(true);
    setNotifications(n => n.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    await axios.post(`${API}/notifications/read-all`, {}, { headers: hdrs() }).catch(() => {});
    setMarking(false);
  };

  const filtered = notifications.filter(n => {
    if (tab === 'unread') return !n.read_at;
    if (tab === 'mentions') return n.alert_type === 'client_rating';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} loading={marking} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { key: 'all',      label: 'All',      count: notifications.length },
          { key: 'unread',   label: 'Unread',   count: unreadCount },
          { key: 'mentions', label: 'Ratings',  count: notifications.filter(n => n.alert_type === 'client_rating').length },
        ]}
        active={tab} onChange={setTab}
      />

      <div className="mt-5 space-y-1">
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl animate-pulse">
              <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: '60%' }} />
                <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.04)', width: '80%' }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Bell className="w-8 h-8" />} title={tab === 'unread' ? 'All caught up' : 'No notifications yet'}
            description={tab === 'unread' ? "You've read everything." : "Notifications will appear here as activity happens."} />
        ) : (
          filtered.map(n => {
            const cfg = getIcon(n.alert_type);
            const Icon = cfg.icon;
            const isUnread = !n.read_at;
            return (
              <div key={n.id} onClick={() => !n.read_at && markRead(n.id)}
                className={clsx('flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group', isUnread ? 'hover:border-purple-500/30' : 'opacity-60 hover:opacity-80')}
                style={{ background: isUnread ? 'rgba(109,40,217,0.07)' : 'rgba(255,255,255,0.02)', borderColor: isUnread ? 'rgba(109,40,217,0.2)' : 'rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                  <Icon className="w-5 h-5" style={{ color: cfg.colour }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm font-semibold leading-snug', isUnread ? 'text-white' : 'text-white/60')}>{n.title}</p>
                    <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{n.body}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {n.platform && <Badge variant="purple">{n.platform}</Badge>}
                    {n.severity === 'high' && <Badge variant="danger" dot>High priority</Badge>}
                    {isUnread && <span className="text-[10px] text-purple-400">Click to mark read</span>}
                  </div>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#6d28d9' }} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
