'use client';
import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, FileText, Target, Radar,
  MessageSquare, Calendar, Bell, LogOut, Menu, X, Users, Award,
} from 'lucide-react';
import clsx from 'clsx';
import BRAND from '@/lib/brand';

const NAV = [
  { href: '/client/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/client/platforms',   label: 'Platforms',        icon: BarChart2       },
  { href: '/client/reports',     label: 'Reports',          icon: FileText        },
  { href: '/client/goals',       label: 'Goals',            icon: Target          },
  { href: '/client/competitors', label: `${BRAND.features.depthView}`, icon: Radar },
  { href: '/client/team',        label: 'Our Team',         icon: Users           },
  { href: '/client/value',       label: 'Value Report',     icon: Award           },
  { href: '/client/ask',         label: `Ask ${BRAND.aria}`, icon: MessageSquare  },
  { href: '/client/moments',     label: 'Calendar',         icon: Calendar        },
];

const EXCLUDED = ['/client/login', '/client/set-password'];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [client, setClient]       = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread]       = useState(0);

  useEffect(() => {
    if (EXCLUDED.some(p => pathname?.startsWith(p))) return;
    const token = localStorage.getItem(BRAND.storage.clientToken);
    const info  = localStorage.getItem(BRAND.storage.clientInfo);
    if (!token) { router.replace('/client/login'); return; }
    if (info) setClient(JSON.parse(info));
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem(BRAND.storage.clientToken);
    localStorage.removeItem(BRAND.storage.clientInfo);
    router.replace('/client/login');
  };

  if (EXCLUDED.some(p => pathname?.startsWith(p))) return <>{children}</>;

  const SabiLogo = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
        <span className="text-white font-black text-base tracking-tighter">S</span>
      </div>
      <div className="min-w-0">
        <p className="text-white font-black text-sm truncate">{BRAND.name}</p>
        <p className="text-purple-400 text-[10px] truncate">{client?.brandName || 'Client Portal'}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060320' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>

        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <SabiLogo />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/client/dashboard' && pathname?.startsWith(href));
            return (
              <a key={href} href={href}
                className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/4')}
                style={active ? { background: 'rgba(109,40,217,0.3)', border: '1px solid rgba(109,40,217,0.4)' } : {}}>
                <Icon className={clsx('w-4 h-4 flex-shrink-0', active && 'text-purple-400')} />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
              {(client?.name || 'U').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold truncate">{client?.name}</p>
              <p className="text-white/30 text-[10px] truncate">{client?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/4 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
          <p className="text-center text-[9px] mt-3" style={{ color: 'rgba(255,255,255,0.1)' }}>
            {BRAND.name} · {BRAND.taglineShort}
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(6,3,32,0.9)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <SabiLogo />
        <button onClick={() => setMobileOpen(o=>!o)} className="text-white/60 p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 flex flex-col py-16 px-3 space-y-0.5"
            style={{ background: '#0d0630', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            {NAV.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className={clsx('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium',
                  pathname === href ? 'text-white bg-purple-900/40' : 'text-white/40')}>
                <Icon className="w-4 h-4" />{label}
              </a>
            ))}
            <div className="pt-4 border-t border-white/10">
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-xs text-white/30">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
