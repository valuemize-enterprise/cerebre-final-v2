'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Upload, FileBarChart, History,
  LogOut, Settings, Zap, BarChart2, Shield, Search,
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { Toaster } from 'react-hot-toast';
import clsx from 'clsx';
import './globals.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload reports', icon: Upload },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/history', label: 'History', icon: History },
  { href: '/platforms', label: 'Platforms', icon: BarChart2 },
  { href: '/search',    label: 'Search',         icon: Search },
];

const adminNavItems = [
  { href: '/admin', label: 'Admin panel', icon: Shield },
];

// Sync JWT to cookie so Next.js middleware can read it server-side
function useCookieSync(token: string | null) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (token) {
      document.cookie = `cm_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    } else {
      document.cookie = 'cm_token=; path=/; max-age=0';
    }
  }, [token]);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isLoading, loadFromStorage, logout } = useAuthStore();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';
  const isPublicPage = pathname.startsWith('/share/');

  // Sync JWT → cookie so Next.js middleware can check auth server-side
  useCookieSync(token);

  useEffect(() => { loadFromStorage(); }, []);

  useEffect(() => {
    if (!isLoading && !user && !isAuthPage && !isPublicPage) router.push('/login');
    if (!isLoading && user && isAuthPage) router.push('/dashboard');
  }, [user, isLoading, isAuthPage, isPublicPage]);

  if (isLoading) {
    return (
      <html lang="en">
        <body className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <Zap className="w-8 h-8 text-brand-500 animate-pulse" />
            <p className="text-sm text-gray-400">Loading Cerebre Media...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="description" content="AI-powered marketing intelligence for African brands — extract insights from any platform report in seconds." />
        <meta property="og:title" content="Cerebre Media Africa" />
        <meta property="og:description" content="AI Marketing Intelligence Platform" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <title>Cerebre Media Africa</title>
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        <Toaster position="top-right" toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', borderRadius: '10px' },
        }} />

        {user && !isAuthPage && !isPublicPage ? (
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-60 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">
              {/* Logo */}
              <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      Cerebre Media
                    </p>
                    <p className="text-xs text-gray-400 leading-tight">Africa</p>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      pathname.startsWith(href)
                        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <>
                    <div className="pt-3 pb-1 px-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
                    </div>
                    {adminNavItems.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          pathname.startsWith(href)
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </>
                )}
              </nav>

              {/* Sidebar footer */}
              <div className="border-t border-gray-100 dark:border-gray-800">
                <div className="px-3 py-3 space-y-0.5">
                  <Link href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => { logout(); router.push('/login'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <NotificationCenter />
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
