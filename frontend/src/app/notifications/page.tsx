'use client';
import { useState } from 'react';
import { useNotifStore } from '../../components/ui/NotificationCenter';
import {
  Bell, CheckCircle2, AlertCircle, FileText,
  Check, Trash2, Filter,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

type FilterType = 'all' | 'unread' | 'success' | 'error' | 'info';

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', label: 'Success' },
  error:   { icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-950/20',     label: 'Error' },
  info:    { icon: FileText,     color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-950/20',   label: 'Info' },
};

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, clear } = useNotifStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'success' || filter === 'error' || filter === 'info') return n.type === filter;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: `All (${notifications.length})` },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'success', label: 'Success' },
    { key: 'error', label: 'Errors' },
    { key: 'info', label: 'Info' },
  ];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="btn-secondary text-xs py-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear all notifications?')) clear(); }}
              className="btn-secondary text-xs py-1.5 text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === key
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-brand-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <Bell className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Notifications appear here when files are processed or reports are ready
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {filtered.map((n, idx) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={clsx(
                  'flex gap-4 p-4 border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer transition-colors',
                  !n.read
                    ? 'bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
                onClick={() => {
                  markRead(n.id);
                  if (n.href) window.location.href = n.href;
                }}
              >
                {/* Icon */}
                <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                  <Icon className={clsx('w-4 h-4', cfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      'text-sm',
                      !n.read
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'font-medium text-gray-700 dark:text-gray-300'
                    )}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {n.body && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={clsx('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">
                      {format(n.createdAt, 'MMM d, h:mm a')}
                    </span>
                    {n.href && (
                      <span className="text-xs text-brand-500 hover:underline">
                        View →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
