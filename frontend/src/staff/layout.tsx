'use client';
/**
 * Staff Portal Layout
 * Used by all /staff/* pages
 */
import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, User, Star, LogOut, Menu, X, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { BRAND } from '@/lib/brand';
import clsx from 'clsx';

const NAV = [
  { href: '/staff/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { href: '/staff/brands',    label: 'My Brands',    icon: Building2       },
  { href: '/staff/ratings',   label: 'My Ratings',   icon: Star            },
  { href: '/staff/profile',   label: 'My Profile',   icon: User            },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, token, logout, isHydrated } = useAuthStore();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !user) router.replace('/login?redirect=' + encodeURIComponent(pathname || '/staff/dashboard'));
  }, [isHydrated, token, user]);

  if (!isHydrated || !user) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060320' }}>
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const active = (href: string) => pathname?.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060320' }}>
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)', height: 64 }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
          <div>
            <p className="text-white font-black text-sm">{BRAND.name}</p>
            <p className="text-[10px] text-purple-400">Staff Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href}
              className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active(href) ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/4')}
              style={active(href) ? { background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(109,40,217,0.35)' } : {}}>
              <Icon className={clsx('w-4 h-4', active(href) && 'text-purple-400')} />{label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl group hover:bg-white/4 transition-colors">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>{user.name?.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-semibold truncate">{user.name}</p>
              <p className="text-white/30 text-[10px] truncate capitalize">{user.role}</p>
            </div>
            <button onClick={() => { logout(); router.replace('/login'); }} className="p-1 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 h-14 border-b"
        style={{ background: 'rgba(6,3,32,0.9)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
        <span className="text-white font-black text-sm flex-1">Staff</span>
        <button onClick={() => setMobile(m => !m)} className="p-2 text-white/50">{mobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
          <div className="relative w-56 flex flex-col pt-14" style={{ background: '#0a0820', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <nav className="px-2 py-3 space-y-0.5">
              {NAV.map(({ href, label, icon: Icon }) => (
                <a key={href} href={href} onClick={() => setMobile(false)}
                  className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium', active(href) ? 'text-white bg-purple-900/40' : 'text-white/40')}>
                  <Icon className="w-4 h-4" />{label}
                </a>
              ))}
            </nav>
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
