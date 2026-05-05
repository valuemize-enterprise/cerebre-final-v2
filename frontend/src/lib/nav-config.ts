// ══════════════════════════════════════════════════════════════
// UPDATED NAVIGATION FOR V2
// Replace the navItems array in frontend/src/app/layout.tsx with this
// ══════════════════════════════════════════════════════════════

// Add these imports to layout.tsx:
// import { Shield, Target, FileBarChart as Scorecard, GitCompareArrows, Link2 } from 'lucide-react';

export const NAV_ITEMS = [
  // ── Main ─────────────────────────────────────────────────────
  { href: '/dashboard',   label: 'Dashboard',       icon: 'LayoutDashboard', group: 'main' },
  { href: '/executive',   label: 'Executive view',  icon: 'Shield',          group: 'main' },

  // ── Data ─────────────────────────────────────────────────────
  { href: '/upload',      label: 'Upload reports',  icon: 'Upload',          group: 'data' },
  { href: '/reports',     label: 'Reports',         icon: 'FileBarChart',    group: 'data' },
  { href: '/platforms',   label: 'Platforms',       icon: 'BarChart2',       group: 'data' },
  { href: '/history',     label: 'History',         icon: 'History',         group: 'data' },

  // ── Strategy ──────────────────────────────────────────────────
  { href: '/goals',       label: 'Goals',           icon: 'Target',          group: 'strategy' },
  { href: '/scorecards',  label: 'Scorecards',      icon: 'ClipboardList',   group: 'strategy' },
  { href: '/benchmarks',  label: 'Benchmarks',      icon: 'Scale',           group: 'strategy' },
  { href: '/crm',         label: 'CRM',             icon: 'Link2',           group: 'strategy' },

  // ── Tools ─────────────────────────────────────────────────────
  { href: '/search',        label: 'Search',        icon: 'Search',          group: 'tools' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell',            group: 'tools' },
];

// NAV GROUP LABELS
export const NAV_GROUPS = {
  main: null,           // no label
  data: 'Data',
  strategy: 'Strategy',
  tools: 'Tools',
};

/* ─── FULL SIDEBAR COMPONENT REPLACEMENT ─────────────────────

Replace the <nav> section in layout.tsx with this:

<nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
  {['main', 'data', 'strategy', 'tools'].map(group => {
    const items = NAV_ITEMS.filter(n => n.group === group);
    const groupLabel = NAV_GROUPS[group];
    return (
      <div key={group}>
        {groupLabel && (
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {groupLabel}
          </p>
        )}
        {items.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    );
  })}
  {user?.role === 'admin' && (
    <div>
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
      {adminNavItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}>
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}
    </div>
  )}
</nav>

*/
