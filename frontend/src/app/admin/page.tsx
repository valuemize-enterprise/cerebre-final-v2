'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { adminApi } from '../../lib/api';
import {
  BarChart2, RefreshCw,
  Loader2, Shield, CheckCircle2, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AdminStats {
  users: { total: number; active: number; admins: number };
  files: { total: number; analyzed: number; failed: number };
  reports: { total: number; thisWeek: number };
  jobs: { pending: number; running: number; failed: number };
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: string;
  is_active: boolean;
  created_at: string;
  file_count: number;
  report_count: number;
}

const StatTile = ({ label, value, sub, color = 'text-gray-900 dark:text-white' }: any) => (
  <div className="card p-4">
    <p className="section-title mb-1">{label}</p>
    <p className={clsx('text-2xl font-semibold', color)}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users'>('overview');

  // Guard — admin only
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminApi.stats(),
        adminApi.users(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error('Admin access required');
        router.replace('/dashboard');
      } else {
        toast.error('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUser(userId, { isActive: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_active: !currentStatus } : u)
      );
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update user');
    }
  };

  const promoteToAdmin = async (userId: string) => {
    if (!confirm('Promote this user to admin?')) return;
    try {
      await adminApi.updateUser(userId, { role: 'admin' });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'admin' } : u));
      toast.success('User promoted to admin');
    } catch {
      toast.error('Failed to promote user');
    }
  };

  if (!user || user.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-500" /> Admin panel
          </h1>
          <p className="text-sm text-gray-400 mt-1">System overview and user management</p>
        </div>
        <button onClick={loadData} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['overview', 'users'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
              tab === t
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Total users" value={stats.users.total} sub={`${stats.users.active} active`} />
            <StatTile label="Files uploaded" value={stats.files.total}
              sub={`${stats.files.analyzed} analyzed · ${stats.files.failed} failed`}
              color={stats.files.failed > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'} />
            <StatTile label="Reports generated" value={stats.reports.total}
              sub={`${stats.reports.thisWeek} this week`} />
            <StatTile label="Queue jobs" value={stats.jobs.pending + stats.jobs.running}
              sub={`${stats.jobs.failed} failed`}
              color={stats.jobs.failed > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'} />
          </div>

          {/* Job queue health */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Job queue health
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Pending', value: stats.jobs.pending, color: 'text-amber-600' },
                { label: 'Running', value: stats.jobs.running, color: 'text-blue-600' },
                { label: 'Failed', value: stats.jobs.failed, color: stats.jobs.failed > 0 ? 'text-red-500' : 'text-green-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className={clsx('text-3xl font-semibold', color)}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              All users ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {['User', 'Company', 'Role', 'Files', 'Reports', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {u.company}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', u.role === 'admin' ? 'badge-info' : 'badge-neutral')}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      {u.file_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      {u.report_count}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="badge-success flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" />Active</span>
                        : <span className="badge-danger flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" />Disabled</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.id !== user?.id && (
                          <>
                            <button
                              onClick={() => toggleUserStatus(u.id, u.is_active)}
                              className="p-1.5 text-gray-400 hover:text-amber-500 transition-colors"
                              title={u.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => promoteToAdmin(u.id)}
                                className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                                title="Promote to admin"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
