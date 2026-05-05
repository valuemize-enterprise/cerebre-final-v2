'use client';
import { useState, useEffect } from 'react';
import { Shield, Zap, Check, AlertTriangle, Loader2, Edit3, Clock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLATFORMS = ['instagram','tiktok','facebook','linkedin','twitter','email','whatsapp'];
const TONES = ['professional','warm','bold','playful','luxury','inspiring','direct','educational','conversational','authoritative'];
const EMOJI_POLICIES = [{id:'none',label:'None – never use emojis'},{id:'minimal',label:'Minimal – rarely, only for key points'},{id:'moderate',label:'Moderate – occasionally for warmth'},{id:'frequent',label:'Frequent – high energy brand'}];

export default function VoiceGuardianPage() {
  const [profile, setProfile] = useState<any>({ tone_descriptors:[], avoid_words:[], preferred_words:[], formality_level:5, emoji_policy:'moderate' });
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [tab, setTab] = useState<'check'|'profile'|'history'>('check');

  useEffect(() => {
    Promise.all([api.get('/voice-guardian/profile'), api.get('/voice-guardian/history')])
      .then(([pRes, hRes]) => {
        if (pRes.data.profile) setProfile(pRes.data.profile);
        setHistory(hRes.data.checks || []);
      }).catch(() => {});
  }, []);

  const check = async () => {
    if (!content.trim()) return;
    setChecking(true); setResult(null);
    try {
      const { data } = await api.post('/voice-guardian/check', { content, platform });
      setResult(data);
      setHistory(h => [{ ...data, content: content.slice(0,100), platform, checked_at: new Date() }, ...h.slice(0,19)]);
    } catch { toast.error('Check failed'); }
    finally { setChecking(false); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/voice-guardian/profile', profile);
      toast.success('Brand voice profile saved');
    } catch { toast.error('Failed to save'); }
    finally { setSavingProfile(false); }
  };

  const toggleTone = (tone: string) => {
    setProfile((p: any) => ({
      ...p,
      tone_descriptors: p.tone_descriptors?.includes(tone)
        ? p.tone_descriptors.filter((t: string) => t !== tone)
        : [...(p.tone_descriptors||[]), tone]
    }));
  };

  const scoreColor = result ? (result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600') : '';
  const scoreBg = result ? (result.score >= 80 ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900' : result.score >= 60 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800' : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900') : '';

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-brand-500" /><span className="section-title text-brand-600">Brand Intelligence</span></div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Brand Voice Guardian</h1>
        <p className="text-sm text-gray-400 mt-1">Check any content against your brand voice before publishing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {([['check','Check content'],['profile','Voice profile'],['history','Check history']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('px-4 py-2 text-xs font-medium rounded-md transition-colors',
              tab === id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500')}>
            {label}
          </button>
        ))}
      </div>

      {/* CHECK TAB */}
      {tab === 'check' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content to check</label>
              <textarea className="input-base resize-none" rows={6} placeholder="Paste your caption, ad copy, email subject, or any content here..."
                value={content} onChange={e => setContent(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{content.length} characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={clsx('px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors',
                      platform === p ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={check} disabled={!content.trim() || checking} className="btn-primary w-full">
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</> : <><Shield className="w-4 h-4" /> Check brand voice</>}
            </button>
          </div>

          <div>
            {result ? (
              <div className={clsx('card p-5 border', scoreBg)}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Voice compliance score</p>
                  <span className={clsx('text-3xl font-bold', scoreColor)}>{result.score}<span className="text-lg font-normal text-gray-400">/100</span></span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div className={clsx('h-full rounded-full', result.score >= 80 ? 'bg-green-500' : result.score >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${result.score}%` }} />
                </div>
                <div className={clsx('flex items-center gap-2 p-3 rounded-lg mb-4', result.is_compliant ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30')}>
                  {result.is_compliant ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <p className={clsx('text-sm font-medium', result.is_compliant ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                    {result.is_compliant ? 'Compliant with brand voice' : 'Needs revision before publishing'}
                  </p>
                </div>
                {result.violations?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-600 mb-2">Issues found:</p>
                    {result.violations.map((v: string, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />{v}
                      </div>
                    ))}
                  </div>
                )}
                {result.suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-600 mb-2">Suggestions:</p>
                    {result.suggestions.map((s: string, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                        <Zap className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />{s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-8 text-center border-dashed">
                <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Paste content and click check</p>
                <p className="text-sm text-gray-400 mt-1">AI will score it against your brand voice profile</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Brand tone (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => (
                <button key={tone} onClick={() => toggleTone(tone)}
                  className={clsx('px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors',
                    profile.tone_descriptors?.includes(tone) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500')}>
                  {tone}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Formality level</label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">Very casual</span>
              <input type="range" min="1" max="10" value={profile.formality_level || 5}
                onChange={e => setProfile((p: any) => ({ ...p, formality_level: parseInt(e.target.value) }))}
                className="flex-1 accent-brand-600" />
              <span className="text-xs text-gray-400">Very formal</span>
              <span className="text-sm font-bold text-brand-600 w-6">{profile.formality_level}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emoji policy</label>
            <div className="space-y-2">
              {EMOJI_POLICIES.map(p => (
                <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="emoji" value={p.id}
                    checked={profile.emoji_policy === p.id}
                    onChange={() => setProfile((pr: any) => ({ ...pr, emoji_policy: p.id }))}
                    className="accent-brand-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Words to avoid (one per line)</label>
              <textarea className="input-base resize-none text-xs" rows={4}
                value={(profile.avoid_words||[]).join('\n')}
                onChange={e => setProfile((p: any) => ({ ...p, avoid_words: e.target.value.split('\n').filter(Boolean) }))}
                placeholder="cheap&#10;problems&#10;impossible" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred words (one per line)</label>
              <textarea className="input-base resize-none text-xs" rows={4}
                value={(profile.preferred_words||[]).join('\n')}
                onChange={e => setProfile((p: any) => ({ ...p, preferred_words: e.target.value.split('\n').filter(Boolean) }))}
                placeholder="innovative&#10;seamless&#10;transformative" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CTA style</label>
            <input className="input-base" placeholder='e.g. "Encouraging, action-focused, never pushy"'
              value={profile.cta_style || ''}
              onChange={e => setProfile((p: any) => ({ ...p, cta_style: e.target.value }))} />
          </div>
          <button onClick={saveProfile} disabled={savingProfile} className="btn-primary">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save voice profile
          </button>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="card text-center py-12 border-dashed">
              <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No checks yet</p>
            </div>
          ) : history.map((h: any, i: number) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className={clsx('text-xl font-bold w-12 text-center', h.score >= 80 ? 'text-green-600' : h.score >= 60 ? 'text-amber-600' : 'text-red-600')}>
                {h.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{h.content || 'Content checked'}</p>
                <p className="text-xs text-gray-400 capitalize">{h.platform} · {h.checked_at ? new Date(h.checked_at).toLocaleDateString() : 'just now'}</p>
              </div>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', h.is_compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                {h.is_compliant ? 'Pass' : 'Fail'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
