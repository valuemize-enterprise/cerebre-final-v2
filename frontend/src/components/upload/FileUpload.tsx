'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Image, X, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { uploadApi } from '../../lib/api';
import { validateFiles, formatFileSize } from '../../lib/validators';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface UploadedFile {
  fileId: string;
  originalName: string;
  status: 'uploading' | 'queued' | 'processing' | 'extracted' | 'analyzed' | 'failed';
  progress: number;
  error?: string;
}

interface FileUploadProps {
  onUploadComplete?: (fileIds: string[]) => void;
}

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Client-side validation before hitting the server
    const validation = validateFiles(acceptedFiles);
    if (!validation.valid) {
      validation.errors.forEach((e) => toast.error(e));
      return;
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => toast(w, { icon: '⚠️' }));
    }

    setIsUploading(true);

    // Initialise file state
    const fileStates: UploadedFile[] = acceptedFiles.map((f) => ({
      fileId: '',
      originalName: f.name,
      status: 'uploading',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...fileStates]);

    const startIdx = files.length;

    try {
      const formData = new FormData();
      acceptedFiles.forEach((f) => formData.append('files', f));

      const { data } = await uploadApi.upload(formData, (pct: any) => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i >= startIdx ? { ...f, progress: pct } : f
          )
        );
      });

      // Update with server-assigned fileIds
      setFiles((prev) =>
        prev.map((f, i) => {
          if (i < startIdx) return f;
          const serverFile = data.files[i - startIdx];
          return serverFile
            ? { ...f, fileId: serverFile.fileId, status: 'queued', progress: 100 }
            : f;
        })
      );

      const fileIds = data.files.map((f: any) => f.fileId);
      toast.success(`${acceptedFiles.length} file(s) uploaded — processing started`);
      onUploadComplete?.(fileIds);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Upload failed';
      toast.error(msg);
      setFiles((prev) =>
        prev.map((f, i) =>
          i >= startIdx ? { ...f, status: 'failed', error: msg } : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [files.length, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  });

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50',
          isUploading && 'opacity-60 pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={clsx(
            'mx-auto mb-3 w-10 h-10 transition-colors',
            isDragActive ? 'text-brand-500' : 'text-gray-400'
          )}
        />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDragActive ? 'Drop files here' : 'Drag & drop reports here'}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          PDF, PNG, JPG, WEBP · Max 50MB per file · Up to 10 files
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
        >
          Browse files
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              {/* Icon */}
              {file.originalName.endsWith('.pdf') ? (
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
              ) : (
                <Image className="w-5 h-5 text-blue-500 shrink-0" />
              )}

              {/* Name + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {file.originalName}
                </p>
                {file.status === 'uploading' && (
                  <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                {file.status !== 'uploading' && (
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{file.status}</p>
                )}
                {file.error && (
                  <p className="text-xs text-red-500 mt-0.5">{file.error}</p>
                )}
              </div>

              {/* Status icon */}
              <div className="shrink-0">
                {file.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                )}
                {(file.status === 'queued' || file.status === 'processing') && (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                )}
                {(file.status === 'extracted' || file.status === 'analyzed') && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {file.status === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              {/* Remove */}
              {(file.status === 'queued' || file.status === 'failed') && (
                <button onClick={() => removeFile(idx)}>
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
