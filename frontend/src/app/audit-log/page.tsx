'use client';
import { useEffect, useState } from 'react';
import { Activity, Search, Filter, Loader2, User, Building2, FileText, Settings, Shield } from 'lucide-react';
import { PageHeader, Card, Badge, SearchInput, TOKENS } from '@/components';
import axios from 'axios';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const ACTION_ICONS: Record<string, { icon: typeof Activity; colour: string }> = {
  login:            { icon: User,      colour: '#6d28d9' },
  create_brand:     { icon: Building2, colour: '#059669' },
  upload_report:    { icon: FileText,  colour: '#3b82f6' },
  settings_change:  { icon: Settings,  colour: '#d97706' },
  invite_client:    { icon: User,      colour: '#a78bfa' },
  default:          { icon: Activity,  colour: '#6b7280' },
};

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
};

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = async (p = 1) => {
    if (p === 1) setLoading(true);
    try {
      const { data } = await axios.get(`${API}/settings/audit-log?page=${p}&limit=50`, { headers: hdrs() });
      const newLogs = data.logs || [];
      setLogs(prev => p === 1 ? newLogs : [...prev, ...newLogs]);
      setHasMore(newLogs.length === 50);
    } catch { setLogs([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.performed_by?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <PageHeader eyebrow="Compliance" title="Audit Log" subtitle="Every action taken across the workspace — who did what and when"/>

      <SearchInput value={search} onChange={setSearch} placeholder="Search actions, users, resources…" className="w-72 mb-6"/>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-purple-400 animate-spin"/></div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: TOKENS.border }}>
          <div className="divide-y" style={{ borderColor: TOKENS.border }}>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-25"/><p>No activity found</p>
              </div>
            ) : filtered.map((log, i) => {
              const { icon: Icon, colour } = ACTION_ICONS[log.action] || ACTION_ICONS.default;
              return (
                <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:`${colour}15` }}>
                    <Icon className="w-4 h-4" style={{ color: colour }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/75 capitalize">{log.action?.replace(/_/g,' ')}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-white/35">{log.performed_by || 'System'}</p>
                      {log.resource_name && <p className="text-xs text-white/25">· {log.resource_name}</p>}
                    </div>
                    {log.details && <p className="text-xs text-white/25 mt-0.5">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</p>}
                  </div>
                  <p className="text-[11px] text-white/25 flex-shrink-0">{timeAgo(log.created_at)}</p>
                </div>
              );
            })}
          </div>
          {hasMore && !search && (
            <div className="px-5 py-3 border-t text-center" style={{ borderColor: TOKENS.border }}>
              <button onClick={() => { const next = page + 1; setPage(next); load(next); }}
                className="text-xs text-purple-400 hover:underline">Load more</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
