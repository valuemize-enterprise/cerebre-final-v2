'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs?: Crumb[];   // explicit crumbs override auto-generation
  className?: string;
}

// Maps URL segments → human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload',
  reports: 'Reports',
  history: 'History',
  platforms: 'Platforms',
  settings: 'Settings',
  notifications: 'Notifications',
  admin: 'Admin',
  compare: 'Compare',
  share: 'Shared report',
};

const autocrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Home', href: '/dashboard' }];

  segments.forEach((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    // UUID segments — show shortened form
    const isUUID = /^[0-9a-f-]{32,}$/i.test(seg);
    const label = isUUID
      ? seg.slice(0, 8) + '…'
      : SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: i < segments.length - 1 ? href : undefined });
  });

  return crumbs;
};

export const Breadcrumb = ({ crumbs, className }: BreadcrumbProps) => {
  const pathname = usePathname();
  const items = crumbs ?? autocrumbs(pathname);

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={clsx('flex items-center gap-1 text-xs text-gray-400', className)}>
      {items.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              {i === 0 && <Home className="w-3 h-3" />}
              {i > 0 && crumb.label}
            </Link>
          ) : (
            <span className="text-gray-600 dark:text-gray-300 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};
