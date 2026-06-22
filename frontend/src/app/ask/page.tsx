'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Copy, Check, Lightbulb, Building2, Zap } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem('sabi_token') : null;
  return { Authorization: `Bearer ${token}` };
};

const STARTERS = [
  { label: 'Brand insight',   q: 'Which of our brands has the strongest social media presence right now?' },
  { label: 'Strategy advice', q: 'What content format is performing best across our entire client portfolio this month?' },
  { label: 'Competitor',      q: 'Are any of our clients falling behind their competitors significantly?' },
  { label: 'Goal check',      q: 'Which client goals are most at risk of being missed this quarter?' },
  { label: 'Team perf',       q: 'What type of work is generating the most client satisfaction?' },
  { label: 'Recommendation',  q: 'Which client should we focus the most strategic attention on this week?' },
];

type Message = { role: 'user'|'assistant'; content: string; };

const CopyBtn = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="p-1 rounded text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all">
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

export default function AgencyAskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [brandId, setBrandId]   = useState('');
  const [brands, setBrands]     = useState<any[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    axios.get(`${API}/admin/brands`, { headers: hdrs() })
      .then(r => setBrands(r.data.brands || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    const userMsg: Message = { role: 'user', content: q };
    setMessages(m => [...m, userMsg]);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { data } = await axios.post(`${API}/ask`, { question: q, history, brand_id: brandId || undefined }, { headers: hdrs() });
      setMessages(m => [...m, { role: 'assistant', content: data.answer }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'I encountered an error. Please try again in a moment.' }]);
    } finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 50); }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Ask {BRAND.aria}</p>
            <p className="text-purple-400 text-xs">Agency Intelligence Mode</p>
          </div>
        </div>
        {/* Context selector */}
        <select value={brandId} onChange={e => setBrandId(e.target.value)}
          className="text-xs rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: brandId ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          <option value="">All clients (portfolio view)</option>
          {brands.map(b => <option key={b.id} value={b.id} style={{ background: '#0f0a2e' }}>{b.name}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {!hasMessages && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.25)' }}>
                <Lightbulb className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">What can I help you strategise?</h2>
              <p className="text-white/40 text-sm">I have access to all client data, task history, and performance trends.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {STARTERS.map(({ label, q }) => (
                <button key={label} onClick={() => send(q)}
                  className="text-left p-4 rounded-xl text-sm text-white/60 hover:text-white/80 transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold text-purple-400 mb-1">{label}</p>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-lg px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white" style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 max-w-2xl">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}>
                  {msg.content.split('\n').map((l, j) => <span key={j}>{l}{j < msg.content.split('\n').length - 1 && <br />}</span>)}
                </div>
                <div className="flex items-center gap-2 mt-1 pl-1">
                  <p className="text-[10px] text-white/20">ARIA</p>
                  <CopyBtn text={msg.content} />
                </div>
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
              <span className="text-xs text-purple-400/60">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea ref={inputRef} rows={1} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
            placeholder="Ask about clients, strategies, performance, or anything on your mind…"
            className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none focus:ring-2 focus:ring-purple-500/40 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', minHeight: 48, maxHeight: 120 }} />
          <button onClick={() => send()} disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-white/15 mt-2">Shift+Enter for new line · Context: {brandId ? brands.find(b => b.id === brandId)?.name : 'All clients'}</p>
      </div>
    </div>
  );
}
