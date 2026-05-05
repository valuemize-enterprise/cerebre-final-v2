'use client';
import { useEffect, useState, useCallback } from 'react';
import { FileUpload } from '../../components/upload/FileUpload';
import { uploadApi, reportsApi } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useSocket } from '../../hooks/useSocket';
import { useBatchPolling } from '../../hooks/usePolling';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import {
  FileText, Image, Loader2, CheckCircle2, AlertCircle,
  Clock, BarChart2, Trash2, Play, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  uploaded:   { label: 'Queued',      color: 'badge-neutral', icon: Clock },
  processing: { label: 'Extracting',  color: 'badge-warning', icon: Loader2 },
  extracted:  { label: 'Extracted',   color: 'badge-info',    icon: CheckCircle2 },
  analyzed:   { label: 'Analyzed',    color: 'badge-success', icon: CheckCircle2 },
  failed:     { label: 'Failed',      color: 'badge-danger',  icon: AlertCircle },
};

export default function UploadPage() {
  const { token } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const loadFiles = useCallback(async () => {
    try {
      const { data } = await uploadApi.list(1);
      setFiles(data.files || []);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Real-time updates
  useSocket({
    token,
    onFileProgress: ({ fileId, progress: p }) =>
      setProgress((prev) => ({ ...prev, [fileId]: p })),
    onFileExtracted: ({ fileId }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'extracted' } : f));
    },
    onFileFailed: ({ fileId }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'failed' } : f));
    },
    onAnalysisComplete: ({ fileId, reportId }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'analyzed', reportId } : f));
      toast.success('Analysis complete — report ready!');
    },
  });

  const handleAnalyze = async (fileId: string) => {
    try {
      await reportsApi.analyze(fileId);
      toast.success('AI analysis started');
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'processing' } : f));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start analysis');
    }
  };

  const handleRetry = async (fileId: string) => {
    try {
      await reportsApi.retry(fileId);
      toast.success('File queued for retry');
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'uploaded', error_message: undefined } : f));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Retry failed');
    }
  };

  const handleDelete = async (fileId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await uploadApi.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('File deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  // Polling fallback for files not yet in terminal state (supplements WebSocket)
  const pendingFileIds = files
    .filter((f) => !['analyzed', 'failed'].includes(f.status))
    .map((f) => f.id)
    .filter(Boolean);

  useBatchPolling(pendingFileIds, (fileId, statusData) => {
    setFiles((prev) =>
      prev.map((f) => f.id === fileId ? { ...f, status: statusData.status } : f)
    );
  });

  return (
    <ErrorBoundary>
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Upload reports</h1>
        <p className="text-sm text-gray-400 mt-1">
          Drop in PDFs or screenshots from any platform — we'll extract, normalize, and analyze them automatically.
        </p>
      </div>

      {/* Supported platforms */}
      <div className="card p-4">
        <p className="section-title mb-3">Supported platforms</p>
        <div className="flex flex-wrap gap-2">
          {['Instagram', 'Facebook', 'Twitter/X', 'TikTok', 'YouTube', 'Google Ads', 'Website (GA4)', 'Email', 'LinkedIn'].map((p) => (
            <span key={p} className="badge-neutral">{p}</span>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div className="card p-6">
        <FileUpload onUploadComplete={loadFiles} />
      </div>

      {/* File list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Your files ({files.length})
          </h2>
          <button onClick={loadFiles} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No files yet. Upload your first report above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {files.map((file) => {
              const cfg = STATUS_CONFIG[file.status] || STATUS_CONFIG.uploaded;
              const Icon = cfg.icon;
              const pct = progress[file.id];
              const isImage = file.file_type?.startsWith('image/');

              return (
                <li key={file.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* File icon */}
                    <div className={clsx(
                      'mt-0.5 p-2 rounded-lg shrink-0',
                      isImage ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30'
                    )}>
                      {isImage
                        ? <Image className="w-4 h-4 text-blue-500" />
                        : <FileText className="w-4 h-4 text-red-500" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {file.original_name}
                        </p>
                        <span className={cfg.color}>
                          <Icon className={clsx('w-3 h-3 mr-1 inline',
                            file.status === 'processing' && 'animate-spin'
                          )} />
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{((file.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                        {file.platform_count > 0 && (
                          <span>{file.platform_count} platform{file.platform_count > 1 ? 's' : ''} detected</span>
                        )}
                        <span>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</span>
                      </div>

                      {/* Progress bar */}
                      {pct !== undefined && pct < 100 && file.status === 'processing' && (
                        <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden w-48">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}

                      {file.error_message && (
                        <p className="mt-1 text-xs text-red-500">{file.error_message}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Retry failed */}
                      {file.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(file.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}

                      {/* Analyze button */}
                      {file.status === 'extracted' && (
                        <button
                          onClick={() => handleAnalyze(file.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Analyze
                        </button>
                      )}

                      {/* View report */}
                      {file.status === 'analyzed' && file.report_count > 0 && (
                        <Link
                          href={`/reports?fileId=${file.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <BarChart2 className="w-3 h-3" />
                          View report
                        </Link>
                      )}

                      {/* Re-analyze */}
                      {file.status === 'analyzed' && (
                        <button
                          onClick={() => handleAnalyze(file.id)}
                          className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                          title="Re-analyze"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(file.id, file.original_name)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
