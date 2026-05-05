'use client';
import { useState } from 'react';
import { Presentation, Download, Loader2, Zap } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function BoardDeckPage() {
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState({ format:'quarterly', include_goals:true, include_competitors:true, include_predictions:true, include_recommendations:true });

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/board-deck/generate', config);
      if (data.fileUrl) window.open(data.fileUrl, '_blank');
      else toast.success('Board deck generation queued. You\'ll be notified when ready.');
    } catch { toast.error('Generation failed'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Board Deck Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Auto-generate a board-ready presentation with AI narrative</p></div>
      <div className="card p-5 space-y-5">
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report type</label>
          <div className="flex gap-2 flex-wrap">
            {['monthly','quarterly','yearly','campaign_review'].map(f => (
              <button key={f} onClick={() => setConfig(c => ({...c, format:f}))}
                className={`px-3 py-1.5 text-xs rounded-lg border capitalize ${config.format === f ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'}`}>
                {f.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Include sections</label>
          <div className="space-y-2">
            {[{k:'include_goals',l:'Goal progress & performance'},{k:'include_competitors',l:'Competitive landscape'},{k:'include_predictions',l:'30-day forecast'},{k:'include_recommendations',l:'AI strategic recommendations'}].map(({k,l}) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(config as any)[k]} onChange={e => setConfig(c => ({...c, [k]:e.target.checked}))} className="accent-brand-600 rounded" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{l}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-800 rounded-xl text-sm text-brand-800 dark:text-brand-300">
          <strong>What you get:</strong> A professionally designed presentation with executive summary, key metrics, goal health, competitor analysis, AI-generated narrative, and strategic recommendations. Export as PDF or PPTX.
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary w-full text-base py-3">
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {generating ? 'Generating board deck...' : 'Generate board deck'}
        </button>
      </div>
    </div>
  );
}
