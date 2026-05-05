'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Send, Sparkles, Copy, Bookmark, Loader2,
  BarChart2, Target, TrendingUp, AlertTriangle,
  History, Plus, X,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

// ── Suggested questions grouped by intent ─────────────────────
const SUGGESTED_QUESTIONS = [
  {
    group: 'Performance',
    icon: BarChart2,
    questions: [
      "What drove our best-performing month in the last 6 months?",
      "Which platform has given us the best ROI this quarter?",
      "Why did our engagement drop last month?",
      "What's our cost per lead across all platforms right now?",
    ],
  },
  {
    group: 'Goals',
    icon: Target,
    questions: [
      "Are we on track to hit our primary goal?",
      "What's the gap between where we are and where we need to be?",
      "Which goal is most at risk and what should we do about it?",
      "If we doubled our Instagram budget, how would it affect our lead goal?",
    ],
  },
  {
    group: 'Strategy',
    icon: TrendingUp,
    questions: [
      "What content format should we invest in most this month?",
      "Where are we wasting budget right now?",
      "What are our competitors doing that we should be doing?",
      "What would move the needle fastest on brand awareness?",
    ],
  },
  {
    group: 'Alerts',
    icon: AlertTriangle,
    questions: [
      "Is there anything I should be worried about right now?",
      "What are the early warning signs I should watch this week?",
      "Are there any unusual patterns in our data this month?",
    ],
  },
];

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  chart?: any;
  loading?: boolean;
};

const MessageBubble = ({ msg, onSave }: { msg: Message; onSave: (m: Message) => void }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold',
        isUser
          ? 'bg-brand-600 text-white'
          : 'bg-gradient-to-br from-brand-500 to-purple-600 text-white'
      )}>
        {isUser ? 'You' : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={clsx(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-sm'
      )}>
        {msg.loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analysing your data...</span>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{msg.content}</div>

            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-1.5">Sources used:</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((s, i) => (
                    <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isUser && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copied'); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={() => onSave(msg)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors">
                  <Bookmark className="w-3 h-3" /> Save insight
                </button>
                <span className="text-xs text-gray-300 ml-auto">
                  {format(msg.timestamp, 'h:mm a')}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function AskPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/ask/conversations').then(({ data }) => setConversations(data.conversations || []));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = () => {
    setActiveConv(null);
    setMessages([]);
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const loadConversation = async (convId: string) => {
    const { data } = await api.get(`/ask/conversations/${convId}`);
    setActiveConv(convId);
    const msgs = (data.conversation.messages || []).map((m: any) => ({
      ...m,
      id: Math.random().toString(),
      timestamp: new Date(m.timestamp),
    }));
    setMessages(msgs);
    setShowSuggestions(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowSuggestions(false);

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    const loadingMsg: Message = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ask', {
        question: text,
        conversationId: activeConv,
        history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources,
      };

      setMessages(prev => [...prev.filter(m => m.id !== 'loading'), assistantMsg]);

      if (data.conversationId) {
        setActiveConv(data.conversationId);
        if (!conversations.find(c => c.id === data.conversationId)) {
          setConversations(prev => [{ id: data.conversationId, title: text.slice(0, 50), created_at: new Date() }, ...prev]);
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== 'loading'));
      toast.error('Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const saveInsight = async (msg: Message) => {
    try {
      await api.post('/ask/insights', {
        content: msg.content,
        conversationId: activeConv,
        title: msg.content.split('.')[0].slice(0, 100),
      });
      toast.success('Insight saved');
    } catch {
      toast.error('Failed to save insight');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar — conversation history */}
      <div className="w-64 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={startNewConversation} className="btn-primary w-full text-sm">
            <Plus className="w-4 h-4" /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="section-title px-2 mb-2">Recent</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">No conversations yet</p>
          ) : conversations.map(c => (
            <button key={c.id} onClick={() => loadConversation(c.id)}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors',
                activeConv === c.id
                  ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}>
              <p className="truncate font-medium">{c.title || 'Untitled'}</p>
              <p className="text-gray-400 mt-0.5">{format(new Date(c.created_at), 'MMM d')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Ask Your Data</h1>
              <p className="text-xs text-gray-400">Ask anything about your brand's performance</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && showSuggestions && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Welcome */}
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ask your marketing data anything</h2>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  I know your goals, your platforms, your metrics, and your history.
                  Ask me anything in plain language.
                </p>
              </div>

              {/* Suggested questions */}
              {SUGGESTED_QUESTIONS.map(group => {
                const Icon = group.icon;
                return (
                  <div key={group.group}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.group}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.questions.map(q => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="text-left px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-400 transition-all">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onSave={saveInsight} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your brand performance..."
                rows={1}
                className="w-full input-base resize-none pr-12 py-3 max-h-32"
                style={{ minHeight: '48px' }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
              {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
          <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-2">
            Answers are based on your uploaded data. Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </div>
    </div>
  );
}
