'use client';
import { create } from 'zustand';
import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, FileText, X, Check } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import Link from 'next/link';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

interface NotifStore {
  notifications: Notification[];
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotifStore = create<NotifStore>((set) => ({
  notifications: [],
  add: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date(),
        },
        ...s.notifications,
      ].slice(0, 50), // Keep last 50
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  clear: () => set({ notifications: [] }),
}));

// ── Notification Bell + Dropdown ─────────────────────────────
export const NotificationCenter = () => {
  const { token } = useAuthStore();
  const { notifications, add, markRead, markAllRead } = useNotifStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Wire WebSocket events → notifications
  useSocket({
    token,
    onAnalysisComplete: ({ fileId, reportId }) => {
      add({
        type: 'success',
        title: 'Report ready',
        body: 'AI analysis complete — view your insights',
        href: `/reports/${reportId}`,
      });
    },
    onFileFailed: ({ fileId, error }) => {
      add({
        type: 'error',
        title: 'Processing failed',
        body: error || 'A file could not be processed',
        href: '/upload',
      });
    },
    onFileExtracted: ({ fileId }) => {
      add({
        type: 'info',
        title: 'Extraction complete',
        body: 'Data extracted — running AI analysis',
      });
    },
  });

  const iconFor = (type: Notification['type']) => {
    if (type === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
    if (type === 'error') return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
    return <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'relative p-2 rounded-lg transition-colors',
          open
            ? 'bg-gray-100 dark:bg-gray-800'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
      >
        <Bell className="w-4 h-4 text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white font-bold"
            style={{ fontSize: 9 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden"
          style={{ zIndex: 50, top: '100%' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={clsx(
                    'px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    !n.read && 'bg-blue-50/50 dark:bg-blue-950/10'
                  )}
                  onClick={() => {
                    markRead(n.id);
                    if (n.href) window.location.href = n.href;
                  }}
                >
                  <div className="flex gap-2.5">
                    {iconFor(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>}
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
