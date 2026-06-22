'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, Loader2, Sparkles, AlertCircle, Building2 } from 'lucide-react';
import { PageHeader, Card, Button, Select, Badge, Callout, TOKENS } from '@/components';
import axios from 'axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const REPORT_TYPES = [
  { value: 'monthly',    label: 'Monthly performance report' },
  { value: 'weekly',     label: 'Weekly update' },
  { value: 'campaign',   label: 'Campaign report' },
  { value: 'quarterly',  label: 'Quarterly review' },
  { value: 'instagram',  label: 'Instagram Insights export' },
  { value: 'facebook',   label: 'Facebook / Meta Analytics' },
  { value: 'google_analytics', label: 'Google Analytics report' },
  { value: 'tiktok',    label: 'TikTok Analytics' },
  { value: 'twitter',    label: 'X / Twitter Analytics' },
  { value: 'linkedin',   label: 'LinkedIn Analytics' },
  { value: 'ad_account', label: 'Ad account report' },
];

interface UploadFile { file: File; status: 'pending'|'uploading'|'done'|'error'; progress: number; reportId?: string; error?: string; }

export default function UploadPage() {
  const [files, setFiles]     = useState<UploadFile[]>([]);
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands]   = useState<any[]>([]);
  const [reportType, setReportType] = useState('monthly');
  const [dragging, setDragging] = useState(false);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load brands on mount
  useState(() => {
    axios.get(`${API}/admin/brands`, { headers: hdrs() })
      .then(r => { setBrands(r.data.brands || []); setBrandsLoaded(true); })
      .catch(() => setBrandsLoaded(true));
  });

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length !== newFiles.length) toast.error('Only PDF files are supported');
    setFiles(prev => [...prev, ...pdfs.map(f => ({ file: f, status: 'pending' as const, progress: 0 }))]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    addFiles([...e.dataTransfer.files]);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, j) => j !== i));

  const uploadAll = async () => {
    if (!brandId) { toast.error('Select a client brand first'); return; }
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      setFiles(f => f.map((x, j) => j === i ? { ...x, status: 'uploading' } : x));
      try {
        const form = new FormData();
        form.append('file', files[i].file);
        form.append('brand_id', brandId);
        form.append('report_type', reportType);
        const { data } = await axios.post(`${API}/upload/report`, form, {
          headers: { ...hdrs(), 'Content-Type': 'multipart/form-data' },
          onUploadProgress: e => {
            const pct = Math.round(((e.loaded || 0) / (e.total || 1)) * 100);
            setFiles(f => f.map((x, j) => j === i ? { ...x, progress: pct } : x));
          },
        });
        setFiles(f => f.map((x, j) => j === i ? { ...x, status: 'done', reportId: data.reportId } : x));
      } catch (err: any) {
        setFiles(f => f.map((x, j) => j === i ? { ...x, status: 'error', error: err.response?.data?.error || 'Upload failed' } : x));
      }
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount    = files.filter(f => f.status === 'done').length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageHeader
        eyebrow="Data Entry"
        title="Upload Report"
        subtitle="Upload PDF exports from any platform. ARIA reads and extracts all the numbers automatically."
      />

      {/* Config bar */}
      <Card className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Client brand *"
            options={brands.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Choose a brand…"
            value={brandId} onChange={e => setBrandId(e.target.value)}
          />
          <Select
            label="Report type"
            options={REPORT_TYPES}
            value={reportType} onChange={e => setReportType(e.target.value)}
          />
        </div>
      </Card>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx('border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 mb-6',
          dragging ? 'scale-[1.01]' : 'hover:border-purple-500/50')}
        style={{
          minHeight: 200,
          borderColor: dragging ? 'rgba(109,40,217,0.7)' : 'rgba(109,40,217,0.25)',
          background:  dragging ? 'rgba(109,40,217,0.08)' : 'rgba(109,40,217,0.04)',
        }}>
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
          onChange={e => addFiles([...(e.target.files || [])])} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.15)' }}>
          <Upload className="w-7 h-7 text-purple-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white mb-1">Drop PDF reports here</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>or click to browse your computer · PDF only · Up to 50MB each</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['Instagram Insights', 'Meta Analytics', 'Google Analytics', 'TikTok', 'LinkedIn'].map(s => (
            <span key={s} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(109,40,217,0.15)', color: 'rgba(167,139,250,0.8)' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-6">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: f.status === 'done' ? 'rgba(5,150,105,0.15)' : f.status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(109,40,217,0.15)' }}>
                {f.status === 'done'      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : f.status === 'error'    ? <AlertCircle  className="w-5 h-5 text-red-400" />
                : f.status === 'uploading'? <Loader2      className="w-5 h-5 text-purple-400 animate-spin" />
                : <FileText className="w-5 h-5 text-purple-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{f.file.name}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  {f.status === 'uploading' && (
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', maxWidth: 120 }}>
                      <div className="h-1 rounded-full transition-all" style={{ width: `${f.progress}%`, background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
                    </div>
                  )}
                  {f.status === 'done'  && <span className="text-xs text-emerald-400">✓ Uploaded — ARIA is analysing</span>}
                  {f.status === 'error' && <span className="text-xs text-red-400">{f.error}</span>}
                </div>
              </div>
              {f.status === 'pending' && (
                <button onClick={() => removeFile(i)} className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              )}
              {f.reportId && (
                <a href={`/reports/${f.reportId}`} className="text-xs text-purple-400 hover:underline">View report →</a>
              )}
            </div>
          ))}
        </div>
      )}

      {doneCount > 0 && (
        <Callout variant="success">
          <strong>{doneCount} report{doneCount > 1 ? 's' : ''} uploaded.</strong>{' '}
          ARIA is extracting metrics and generating analysis. The client's dashboard will update within a few minutes.
        </Callout>
      )}

      {pendingCount > 0 && (
        <Button full size="lg" icon={<Sparkles className="w-5 h-5" />} onClick={uploadAll}>
          Upload {pendingCount} report{pendingCount > 1 ? 's' : ''} and analyse with ARIA
        </Button>
      )}
    </div>
  );
}
