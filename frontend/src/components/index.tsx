'use client';
/**
 * Sabi UI Component Library
 * ─────────────────────────────────────────────────────────────
 * Every reusable primitive in one file.
 * Import what you need: import { Button, Card, Badge } from '@/components'
 */

import React, { useState, useEffect, useRef, ReactNode, forwardRef } from 'react';
import { Loader2, X, Check, AlertCircle, Info, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

// ── Design tokens ─────────────────────────────────────────────
export const TOKENS = {
  brand:    '#6d28d9',
  brandMid: '#7c3aed',
  brandDark:'#4c1d95',
  accent:   '#a78bfa',
  bg:       '#060320',
  surface:  'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.08)',
  text:     'rgba(255,255,255,0.85)',
  muted:    'rgba(255,255,255,0.4)',
  faint:    'rgba(255,255,255,0.12)',
};

// ═══════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type BtnSize    = 'xs' | 'sm' | 'md' | 'lg';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
}

const BTN_BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-40 disabled:pointer-events-none select-none';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary:   'text-white shadow-lg shadow-purple-900/30 hover:brightness-110 active:scale-[0.98]',
  secondary: 'text-white/70 hover:text-white hover:bg-white/8 active:scale-[0.98]',
  ghost:     'text-white/50 hover:text-white/80 hover:bg-white/5',
  danger:    'text-red-300 hover:bg-red-500/15 hover:text-red-200',
  success:   'text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200',
};

const BTN_SIZES: Record<BtnSize, string> = {
  xs: 'h-7  px-3  text-xs',
  sm: 'h-8  px-4  text-xs',
  md: 'h-10 px-5  text-sm',
  lg: 'h-12 px-7  text-base',
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, full, children, className, ...rest }, ref) => {
    const isPrimary = variant === 'primary';
    return (
      <button
        ref={ref}
        className={clsx(BTN_BASE, BTN_VARIANTS[variant], BTN_SIZES[size], full && 'w-full', className)}
        style={isPrimary ? { background: 'linear-gradient(135deg,#6d28d9,#9333ea)' } : {
          background: variant === 'secondary' ? 'rgba(255,255,255,0.06)' : undefined,
          border:     variant === 'secondary' ? '1px solid rgba(255,255,255,0.1)' : undefined,
        }}
        disabled={loading || rest.disabled}
        {...rest}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ═══════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, ...rest }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: TOKENS.accent }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{icon}</div>}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-xl py-3 text-sm text-white placeholder-white/25 outline-none transition-all',
            'focus:ring-2 focus:ring-purple-500/60',
            icon    ? 'pl-10 pr-4' : 'px-4',
            iconRight ? 'pr-10' : '',
            error ? 'ring-1 ring-red-500/70' : '',
            className
          )}
          style={{ background: TOKENS.surface, border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : TOKENS.border}` }}
          {...rest}
        />
        {iconRight && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">{iconRight}</div>}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: TOKENS.muted }}>{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ═══════════════════════════════════════════════════
// TEXTAREA
// ═══════════════════════════════════════════════════
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...rest }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: TOKENS.accent }}>{label}</label>}
      <textarea
        ref={ref}
        className={clsx('w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all resize-none focus:ring-2 focus:ring-purple-500/60', error && 'ring-1 ring-red-500/70', className)}
        style={{ background: TOKENS.surface, border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : TOKENS.border}` }}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: TOKENS.muted }}>{hint}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ═══════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...rest }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: TOKENS.accent }}>{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={clsx('w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none focus:ring-2 focus:ring-purple-500/60 cursor-pointer', className)}
          style={{ background: '#0f0a2e', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : TOKENS.border}` }}
          {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0f0a2e' }}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ═══════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════
interface CardProps { children: ReactNode; className?: string; style?: React.CSSProperties; hover?: boolean; onClick?: () => void; padding?: 'sm'|'md'|'lg'|'none'; }

export const Card = ({ children, className, style, hover, onClick, padding = 'md' }: CardProps) => {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-7' : 'p-5 lg:p-6';
  return (
    <div
      onClick={onClick}
      className={clsx('rounded-2xl border overflow-hidden transition-all duration-200',
        hover && 'cursor-pointer hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/20 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        pad, className)}
      style={{ background: TOKENS.surface, borderColor: TOKENS.border, ...style }}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════
type BadgeVariant = 'default'|'success'|'warning'|'danger'|'info'|'purple'|'amber';

const BADGE_STYLES: Record<BadgeVariant,{bg:string;text:string;border:string}> = {
  default: { bg:'rgba(255,255,255,0.08)', text:'rgba(255,255,255,0.6)', border:'rgba(255,255,255,0.12)' },
  success: { bg:'rgba(5,150,105,0.15)',   text:'#6ee7b7',               border:'rgba(5,150,105,0.25)' },
  warning: { bg:'rgba(245,158,11,0.15)',  text:'#fcd34d',               border:'rgba(245,158,11,0.25)' },
  danger:  { bg:'rgba(239,68,68,0.15)',   text:'#fca5a5',               border:'rgba(239,68,68,0.25)' },
  info:    { bg:'rgba(59,130,246,0.15)',  text:'#93c5fd',               border:'rgba(59,130,246,0.25)' },
  purple:  { bg:'rgba(109,40,217,0.2)',   text:'#c4b5fd',               border:'rgba(109,40,217,0.35)' },
  amber:   { bg:'rgba(217,119,6,0.15)',   text:'#fde68a',               border:'rgba(217,119,6,0.25)' },
};

interface BadgeProps { variant?: BadgeVariant; children: ReactNode; className?: string; dot?: boolean; }
export const Badge = ({ variant = 'default', children, className, dot }: BadgeProps) => {
  const s = BADGE_STYLES[variant];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />}
      {children}
    </span>
  );
};

// ═══════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════
export const Skeleton = ({ className, h, w, rounded }: { className?: string; h?: string; w?: string; rounded?: string }) => (
  <div className={clsx('animate-pulse', className)}
    style={{ height: h, width: w, borderRadius: rounded || 8, background: 'rgba(255,255,255,0.06)' }} />
);

export const SkeletonCard = () => (
  <Card>
    <Skeleton h="14px" w="60%" className="mb-3" />
    <Skeleton h="32px" w="40%" className="mb-2" />
    <Skeleton h="12px" w="80%" />
  </Card>
);

export const SkeletonPage = () => (
  <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
    <div><Skeleton h="28px" w="200px" className="mb-2" /><Skeleton h="14px" w="300px" /></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><SkeletonCard key={i}/>)}</div>
    <div className="grid lg:grid-cols-2 gap-4">{[1,2].map(i=><Card key={i}><Skeleton h="200px" rounded="12" /></Card>)}</div>
  </div>
);

// ═══════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════
interface ModalProps { open: boolean; onClose: () => void; title?: string; children: ReactNode; width?: string; }

export const Modal = ({ open, onClose, title, children, width = '480px' }: ModalProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else       document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ maxWidth: width, background: '#0d0630', border: '1px solid rgba(109,40,217,0.3)' }}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: TOKENS.border }}>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════
interface StatCardProps { label: string; value: string | number; change?: number; icon?: ReactNode; colour?: string; loading?: boolean; onClick?: () => void; }

export const StatCard = ({ label, value, change, icon, colour = TOKENS.brand, loading, onClick }: StatCardProps) => (
  <Card hover={!!onClick} onClick={onClick}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: TOKENS.muted }}>{label}</p>
        {loading
          ? <Skeleton h="30px" w="70%" />
          : <p className="text-2xl font-black text-white truncate">{value}</p>
        }
        {change !== undefined && !loading && (
          <p className={clsx('text-xs font-semibold flex items-center gap-1 mt-1.5',
            change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-white/30')}>
            {change > 0 ? '↑' : change < 0 ? '↓' : '—'}
            {Math.abs(change).toFixed(1)}% vs last period
          </p>
        )}
      </div>
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${colour}20`, border: `1px solid ${colour}30` }}>
          <div style={{ color: colour }}>{icon}</div>
        </div>
      )}
    </div>
  </Card>
);

// ═══════════════════════════════════════════════════
// PAGE HEADER
// ═══════════════════════════════════════════════════
interface PageHeaderProps { title: string; subtitle?: string; actions?: ReactNode; back?: string; eyebrow?: string; }

export const PageHeader = ({ title, subtitle, actions, back, eyebrow }: PageHeaderProps) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
    <div>
      {back && (
        <a href={back} className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors"
          style={{ color: TOKENS.muted }} onMouseEnter={e=>(e.currentTarget.style.color=TOKENS.accent)} onMouseLeave={e=>(e.currentTarget.style.color=TOKENS.muted)}>
          ← Back
        </a>
      )}
      {eyebrow && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-4 rounded-full" style={{ background: TOKENS.brand }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TOKENS.accent }}>{eyebrow}</p>
        </div>
      )}
      <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm mt-1" style={{ color: TOKENS.muted }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
  </div>
);

// ═══════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════
interface EmptyStateProps { icon?: ReactNode; title: string; description?: string; action?: ReactNode; }

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {icon && (
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.15)' }}>
        <div className="text-purple-400/50">{icon}</div>
      </div>
    )}
    <h3 className="text-base font-bold text-white/60 mb-2">{title}</h3>
    {description && <p className="text-sm max-w-xs leading-relaxed" style={{ color: TOKENS.muted }}>{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// ═══════════════════════════════════════════════════
// CALLOUT
// ═══════════════════════════════════════════════════
type CalloutVariant = 'info' | 'success' | 'warning' | 'danger';
const CALLOUT_STYLES: Record<CalloutVariant,{bg:string;border:string;text:string;icon:typeof Info}> = {
  info:    { bg:'rgba(59,130,246,0.1)', border:'rgba(59,130,246,0.25)', text:'#93c5fd', icon:Info },
  success: { bg:'rgba(5,150,105,0.1)',  border:'rgba(5,150,105,0.25)',  text:'#6ee7b7', icon:CheckCircle2 },
  warning: { bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.25)', text:'#fcd34d', icon:AlertTriangle },
  danger:  { bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.25)',  text:'#fca5a5', icon:AlertCircle },
};

export const Callout = ({ variant = 'info', children }: { variant?: CalloutVariant; children: ReactNode }) => {
  const s = CALLOUT_STYLES[variant];
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// PROGRESS STEPS
// ═══════════════════════════════════════════════════
export const Steps = ({ steps, current }: { steps: string[]; current: number }) => (
  <div className="flex items-center gap-0 w-full mb-8">
    {steps.map((label, i) => {
      const done    = i < current;
      const active  = i === current;
      const isLast  = i === steps.length - 1;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300',
              done ? 'scale-90' : active ? 'scale-110' : '')}
              style={{
                background: done ? '#059669' : active ? 'linear-gradient(135deg,#6d28d9,#9333ea)' : TOKENS.surface,
                border: done || active ? 'none' : `1px solid ${TOKENS.border}`,
                color: done || active ? '#fff' : TOKENS.muted,
                boxShadow: active ? '0 0 16px rgba(109,40,217,0.5)' : 'none',
              }}>
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <p className="text-[10px] font-semibold mt-1.5 whitespace-nowrap"
              style={{ color: active ? TOKENS.accent : done ? '#6ee7b7' : TOKENS.muted }}>
              {label}
            </p>
          </div>
          {!isLast && (
            <div className="flex-1 h-px mx-2 transition-all duration-500"
              style={{ background: done ? '#059669' : TOKENS.border }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════
export const Avatar = ({ name, src, size = 'md', colour }: { name: string; src?: string; size?: 'xs'|'sm'|'md'|'lg'; colour?: string }) => {
  const sz = size==='xs'?'w-6 h-6 text-[10px]':size==='sm'?'w-8 h-8 text-xs':size==='lg'?'w-12 h-12 text-base':'w-10 h-10 text-sm';
  return src
    ? <img src={src} alt={name} className={clsx(sz, 'rounded-full object-cover flex-shrink-0')} />
    : <div className={clsx(sz, 'rounded-full flex items-center justify-center font-black text-white flex-shrink-0')}
        style={{ background: colour || 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
        {name.charAt(0).toUpperCase()}
      </div>;
};

// ═══════════════════════════════════════════════════
// SCORE GAUGE (ClarityScore™)
// ═══════════════════════════════════════════════════
export const ScoreGauge = ({ score, max = 1000, size = 120 }: { score: number; max?: number; size?: number }) => {
  const pct     = Math.min(1, score / max);
  const r       = 44;
  const circ    = 2 * Math.PI * r;
  const dash    = pct * circ * 0.75;
  const colour  = score >= 800 ? '#059669' : score >= 600 ? '#6d28d9' : score >= 400 ? '#d97706' : '#ef4444';
  const label   = score >= 800 ? 'Excellent' : score >= 600 ? 'Healthy' : score >= 400 ? 'Developing' : 'Needs attention';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-225deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${circ * 0.75} ${circ}`} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={colour} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease-out', filter: `drop-shadow(0 0 6px ${colour}60)` }} />
      </svg>
      <div style={{ marginTop: -size * 0.45 }} className="text-center">
        <p className="font-black text-white leading-none" style={{ fontSize: size * 0.22 }}>{Math.round(score)}</p>
        <p className="text-[10px] font-bold mt-0.5" style={{ color: `${colour}CC` }}>{label}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// SECTION DIVIDER
// ═══════════════════════════════════════════════════
export const Divider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px" style={{ background: TOKENS.border }} />
    {label && <span className="text-xs font-semibold" style={{ color: TOKENS.muted }}>{label}</span>}
    {label && <div className="flex-1 h-px" style={{ background: TOKENS.border }} />}
  </div>
);

// ═══════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════
export const Spinner = ({ size = 'md' }: { size?: 'sm'|'md'|'lg' }) => {
  const sz = size==='sm'?'w-5 h-5':size==='lg'?'w-10 h-10':'w-7 h-7';
  return <Loader2 className={clsx(sz, 'text-purple-400 animate-spin')} />;
};

export const FullPageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: TOKENS.bg }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
        <span className="text-white font-black text-xl">S</span>
      </div>
      <Spinner size="md" />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════
// SEARCH INPUT
// ═══════════════════════════════════════════════════
import { Search } from 'lucide-react';
export const SearchInput = ({ value, onChange, placeholder = 'Search...', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <div className={clsx('relative', className)}>
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 focus:ring-purple-500/60 transition-all"
      style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.border}` }}
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ═══════════════════════════════════════════════════
// CONFIRMATION DIALOG
// ═══════════════════════════════════════════════════
interface ConfirmProps { open: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string; confirmLabel?: string; variant?: 'danger'|'primary'; loading?: boolean; }

export const Confirm = ({ open, onConfirm, onCancel, title, message, confirmLabel = 'Confirm', variant = 'primary', loading }: ConfirmProps) => (
  <Modal open={open} onClose={onCancel} width="400px">
    <div className="p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: variant === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(109,40,217,0.15)' }}>
          {variant === 'danger' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Info className="w-5 h-5 text-purple-400" />}
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">{title}</h3>
          <p className="text-sm" style={{ color: TOKENS.muted }}>{message}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel} full>Cancel</Button>
        <Button variant={variant === 'danger' ? 'secondary' : 'primary'} size="sm" onClick={onConfirm} loading={loading} full
          style={variant === 'danger' ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' } : {}}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);

// ═══════════════════════════════════════════════════
// TABLE
// ═══════════════════════════════════════════════════
interface ColDef<T> { key?: string; header: string; render?: (row: T) => ReactNode; width?: string; }
export const Table = <T extends Record<string, any>>({ cols, rows, loading, emptyMessage = 'No data yet', onRowClick }: { cols: ColDef<T>[]; rows: T[]; loading?: boolean; emptyMessage?: string; onRowClick?: (row: T) => void }) => (
  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: TOKENS.border }}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${TOKENS.border}` }}>
          <tr>{cols.map(c => <th key={c.header} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.muted, width: c.width }}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: TOKENS.border }}>
          {loading
            ? [1,2,3].map(i => <tr key={i}>{cols.map((c,j) => <td key={j} className="px-4 py-3"><Skeleton h="14px" w="80%" /></td>)}</tr>)
            : rows.length === 0
              ? <tr><td colSpan={cols.length} className="px-4 py-12 text-center text-sm" style={{ color: TOKENS.muted }}>{emptyMessage}</td></tr>
              : rows.map((row, i) => (
                <tr key={i} onClick={() => onRowClick?.(row)}
                  className={clsx('transition-colors', onRowClick && 'cursor-pointer')}
                  style={{ background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  onMouseEnter={e => onRowClick && (e.currentTarget.style.background = 'rgba(109,40,217,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)')}>
                  {cols.map((c, j) => <td key={j} className="px-4 py-3 text-white/70">{c.render ? c.render(row) : c.key ? row[c.key] : ''}</td>)}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════
export const Tabs = ({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) => (
  <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)}
        className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all', active === t.key ? 'text-white' : 'text-white/40 hover:text-white/60')}
        style={active === t.key ? { background: 'rgba(109,40,217,0.35)', border: '1px solid rgba(109,40,217,0.4)' } : {}}>
        {t.label}
        {t.count !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: active === t.key ? 'rgba(109,40,217,0.4)' : 'rgba(255,255,255,0.08)', color: active === t.key ? '#c4b5fd' : 'rgba(255,255,255,0.3)' }}>
            {t.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════
// COPY BUTTON
// ═══════════════════════════════════════════════════
import { Copy } from 'lucide-react';
export const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
      style={{ background: ok ? 'rgba(5,150,105,0.15)' : TOKENS.surface, border: `1px solid ${ok ? 'rgba(5,150,105,0.3)' : TOKENS.border}`, color: ok ? '#6ee7b7' : TOKENS.muted }}>
      {ok ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {ok ? 'Copied' : (label || 'Copy')}
    </button>
  );
};
