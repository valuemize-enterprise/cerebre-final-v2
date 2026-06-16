'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Zap, Loader2, MessageSquare, Lightbulb, Copy, Check } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

const API  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('cerebre_client_token')}` });

const STARTERS = [
  'Why did our engagement drop last week?',
  'Which platform is performing best this month?',
  'Are we on track to hit our Q2 goals?',
  'What content type drives the most reach for us?',
  'How do we compare to our competitors on Instagram?',
  'What should we focus on for the next 30 days?',
  'When is the best time to post for our audience?',
  'What cultural moments should we plan content for?',
];

type Message = {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
};

const UserBubble = ({ content }: { content: string }) => (
  <div className="flex justify-end">
    <div className="max-w-lg px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white"
      style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
      {content}
    </div>
  </div>
);

const ARIABubble = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white/85 leading-relaxed relative"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Render markdown-ish formatting */}
          {content.split('\n').map((line, i) => (
            <span key={i}>
              {line.startsWith('**') ? (
                <strong className="text-white font-semibold">{line.replace(/\*\*/g, '')}</strong>
              ) : line.startsWith('- ') || line.startsWith('• ') ? (
                <span className="block pl-4 text-white/80">{line}</span>
              ) : (
                <span className="text-white/80">{line}</span>
              )}
              {i < content.split('\n').length - 1 && <br />}
            </span>
          ))}
          <button onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1 pl-1">ARIA · Cerebre Intelligence</p>
      </div>
    </div>
  );
};

const ThinkingBubble = () => (
  <div className="flex gap-3">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
      <Zap className="w-4 h-4 text-white" />
    </div>
    <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-purple-400/60">ARIA is analysing your data...</span>
    </div>
  </div>
);

export default function AskARIAPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [client, setClient]     = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const info = localStorage.getItem('cerebre_client_info');
    if (info) setClient(JSON.parse(info));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { role: 'user', content: q, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { data } = await axios.post(`${API}/client/ask`, { question: q, history }, { headers: hdrs() });
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, ts: new Date().toISOString() }]);
    } catch (err: any) {
      const errorMsg = err.response?.status === 503
        ? "I'm not able to connect to the AI right now. Please try again in a moment."
        : 'I encountered an error. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, ts: new Date().toISOString() }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen" style={{ maxHeight: 'calc(100vh - 0px)' }}>

      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Ask ARIA</p>
            <p className="text-purple-400 text-xs">Your AI brand intelligence analyst</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400/70">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {!hasMessages && (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.3),rgba(147,51,234,0.2))', border: '1px solid rgba(109,40,217,0.3)' }}>
                <MessageSquare className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">
                Ask me anything about {client?.brandName || 'your brand'}
              </h2>
              <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                I have access to all your platform data, goals, and reports.
                Ask me about performance, strategy, competitors, or anything else.
              </p>
            </div>

            {/* Starter questions */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Lightbulb className="w-3.5 h-3.5" /> Try asking
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {STARTERS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-left px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white/90 transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user'
            ? <UserBubble key={i} content={msg.content} />
            : <ARIABubble key={i} content={msg.content} />
        )}
        {sending && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your brand performance, goals, competitors..."
              className="w-full rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/20 outline-none resize-none transition-all focus:ring-2 focus:ring-purple-500/40"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: 48,
                maxHeight: 120,
              }}
            />
          </div>
          <button onClick={() => send()}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)' }}>
            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-white/15 mt-2">
          ARIA uses your live platform data and reports · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
