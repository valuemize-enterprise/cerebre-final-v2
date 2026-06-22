'use client';
import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Target, Briefcase,
  Upload, Link2, Bell, Settings, LogOut, Menu, X,
  MessageSquare, Calendar, BarChart2, Zap, Search,
  ChevronDown, Award, UserCircle, Building2, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { BRAND } from '@/lib/brand';
import clsx from 'clsx';

// ── Nav structure ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',          label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/notifications',      label: 'Notifications', icon: Bell, badge: 'count' },
    ],
  },
  {
    label: 'Client Work',
    items: [
      { href: '/clients',            label: 'All Clients',   icon: Building2 },
      { href: '/upload',             label: 'Upload Report', icon: Upload },
      { href: '/connect',            label: 'Connect Platforms', icon: Link2 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/reports',            label: 'Reports',       icon: FileText },
      { href: '/goals',              label: 'Goals',         icon: Target },
      { href: '/campaigns',          label: 'Campaigns',     icon: TrendingUp },
      { href: '/calendar',           label: 'Calendar',      icon: Calendar },
      { href: '/ask',                label: `Ask ${BRAND.aria}`, icon: MessageSquare },
    ],
  },
  {
    label: 'Agency',
    items: [
      { href: '/agency/leadership',  label: 'Leadership',    icon: BarChart2 },
      { href: '/agency/staff',       label: 'Staff',         icon: Users },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings',           label: 'Settings',      icon: Settings },
    ],
  },
];

// ── Sabi logo mark ────────────────────────────────────────────
const SabiMark = ({ size = 32 }: { size?: number }) => (
  <div className="rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white"
    style={{ width: size, height: size, fontSize: size * 0.5, background: 'linear-gradient(135deg,#6d28d9,#a78bfa)', boxShadow: '0 4px 12px rgba(109,40,217,0.4)' }}>
    S
  </div>
);

export default function AgencyLayout({ children }: { children: ReactNode }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const { user, token, logout, isHydrated } = useAuthStore();
  const [mobile, setMobile]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [alerts, setAlerts]   = useState(3);

  // Route protection
  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}&reason=not_authorised`);
    }
  }, [isHydrated, token, user, router, pathname]);

  const handleLogout = () => { logout(); router.replace('/login'); };

  // Skip layout for auth-style pages
  const noLayout = ['/login','/register','/forgot-password','/reset-password','/onboarding']
    .some(p => pathname?.startsWith(p));
  if (noLayout) return <>{children}</>;
  if (!isHydrated || !user) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060320' }}>
      <div className="flex flex-col items-center gap-4">
        <SabiMark size={48} />
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060320' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={clsx(
        'hidden lg:flex flex-col border-r transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )} style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(6,3,32,0.95)', backdropFilter: 'blur(20px)' }}>

        {/* Brand header */}
        <div className={clsx('flex items-center border-b flex-shrink-0', collapsed ? 'p-3 justify-center' : 'px-4 py-4 gap-3')}
          style={{ borderColor: 'rgba(255,255,255,0.06)', height: 64 }}>
          <SabiMark />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base truncate">{BRAND.name}</p>
              <p className="text-[10px] font-medium truncate" style={{ color: 'rgba(167,139,250,0.7)' }}>{BRAND.agency}</p>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg transition-colors text-white/20 hover:text-white/50 hover:bg-white/5 flex-shrink-0">
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-3">
              {!collapsed && (
                <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {section.label}
                </p>
              )}
              {section.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href);
                return (
                  <a key={href} href={href}
                    className={clsx(
                      'flex items-center gap-3 mx-2 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                      active ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/4'
                    )}
                    style={active ? { background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(109,40,217,0.35)' } : {}}>
                    <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-purple-400' : 'group-hover:text-white/60')} />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && badge === 'count' && alerts > 0 && (
                      <span className="ml-auto text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
                        style={{ background: '#6d28d9', color: '#fff' }}>{alerts}</span>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 rounded-lg text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap"
                        style={{ background: '#1e1b4b', border: '1px solid rgba(109,40,217,0.3)' }}>
                        {label}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className={clsx('border-t flex-shrink-0', collapsed ? 'p-3' : 'p-3')} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/4 transition-colors group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                {(user.name || 'U').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-semibold truncate">{user.name}</p>
                <p className="text-white/30 text-[10px] truncate capitalize">{user.role}</p>
              </div>
              <button onClick={handleLogout}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile header ─────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 border-b"
        style={{ height: 56, background: 'rgba(6,3,32,0.92)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <SabiMark size={28} />
        <span className="text-white font-black text-sm flex-1">{BRAND.name}</span>
        {alerts > 0 && (
          <a href="/notifications" className="relative p-2">
            <Bell className="w-4 h-4 text-white/50" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#6d28d9' }} />
          </a>
        )}
        <button onClick={() => setMobile(m => !m)} className="p-2 text-white/50">
          {mobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobile(false)} />
          <div className="relative w-64 flex flex-col" style={{ background: '#0a0820', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <SabiMark size={28} />
              <span className="text-white font-black text-sm">{BRAND.name}</span>
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
              {NAV_SECTIONS.map(section => (
                <div key={section.label} className="mb-3">
                  <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>{section.label}</p>
                  {section.items.map(({ href, label, icon: Icon }) => (
                    <a key={href} href={href} onClick={() => setMobile(false)}
                      className={clsx('flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive(href) ? 'text-white' : 'text-white/40')}
                      style={isActive(href) ? { background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(109,40,217,0.35)' } : {}}>
                      <Icon className="w-4 h-4" />{label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
            <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-white/30 hover:text-red-400 py-2">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarColor: 'rgba(109,40,217,0.3) transparent', scrollbarWidth: 'thin' }}>
        <div className="lg:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
