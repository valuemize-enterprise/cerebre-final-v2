'use client';
import { useEffect, useState } from 'react';
import {
  Building2, ShoppingCart, Utensils, Store,
  Shield, TrendingUp, TrendingDown, AlertTriangle,
  Star, MessageSquare, Loader2, Zap,
} from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const INDUSTRY_CONFIGS = {
  banking: {
    label: 'Banking & Finance',
    icon: Building2,
    color: '#1877F2',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    kpis: ['Trust Score', 'Complaint Volume', 'Sentiment', 'App Rating', 'SOV'],
    description: 'Monitor brand trust, regulatory compliance signals, and customer sentiment in real-time',
  },
  fmcg: {
    label: 'FMCG',
    icon: ShoppingCart,
    color: '#E1306C',
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    kpis: ['Product Buzz', 'UGC Volume', 'Out-of-Stock Mentions', 'Retailer Sentiment', 'Promotion Awareness'],
    description: 'Track product-level buzz, retailer sentiment, and seasonal demand signals',
  },
  qsr: {
    label: 'Restaurant / QSR',
    icon: Utensils,
    color: '#F59E0B',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    kpis: ['Average Rating', 'Review Response Rate', 'Menu Item Buzz', 'Delivery Ratings', 'Food Creator Mentions'],
    description: 'Monitor location-level reviews, food creator mentions, and menu performance',
  },
  retail: {
    label: 'Retail',
    icon: Store,
    color: '#10B981',
    bg: 'bg-green-50 dark:bg-green-950/20',
    kpis: ['Social Commerce Revenue', 'Influencer Attribution', 'Product Launch Awareness', 'Review Rating', 'Seasonal Readiness'],
    description: 'Track social commerce, influencer ROI, and seasonal campaign performance',
  },
};

const TrustMeter = ({ score }: { score: number }) => {
  const color = score >= 75 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
  const label = score >= 75 ? 'Healthy' : score >= 60 ? 'Monitor' : 'ALERT';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10"
            stroke={color}
            strokeDasharray={`${(score / 100) * 251} 251`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
          <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">Trust Score</p>
    </div>
  );
};

const ReviewCard = ({ location }: { location: any }) => (
  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{location.locationName}</p>
      <div className="flex items-center gap-1 shrink-0">
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{parseFloat(location.avgRating || 0).toFixed(1)}</span>
      </div>
    </div>
    <p className="text-xs text-gray-400">{location.reviewCount} reviews · </p>
    {location.recentReviews?.[0]?.comment && (
      <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{location.recentReviews[0].comment}"</p>
    )}
  </div>
);

export default function IndustryIntelligencePage() {
  const [industryData, setIndustryData] = useState<any>(null);
  const [industryCode, setIndustryCode] = useState<keyof typeof INDUSTRY_CONFIGS>('banking');
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analysing, setAnalysing] = useState(false);

  useEffect(() => {
    api.get('/industry-intelligence').then(({ data }) => {
      setIndustryData(data);
      setIndustryCode(data.industryCode || 'banking');
    }).finally(() => setLoading(false));
  }, []);

  const runAnalysis = async () => {
    setAnalysing(true);
    try {
      const { data } = await api.post('/industry-intelligence/analyse');
      setAiAnalysis(data.analysis);
    } finally {
      setAnalysing(false);
    }
  };

  const cfg = INDUSTRY_CONFIGS[industryCode] || INDUSTRY_CONFIGS.retail;
  const Icon = cfg.icon;
  const bankingData = industryData?.banking;
  const reviews = industryData?.reviews || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Industry Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{cfg.label} Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{cfg.description}</p>
        </div>
        <button onClick={runAnalysis} disabled={analysing} className="btn-primary">
          {analysing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {analysing ? 'Analysing...' : 'Run industry analysis'}
        </button>
      </div>

      {/* Banking specific */}
      {industryCode === 'banking' && bankingData && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 flex flex-col items-center">
              <TrustMeter score={parseFloat(bankingData.trust_score || 65)} />
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Positive sentiment</p>
              <p className="text-3xl font-bold text-green-600">
                {((parseFloat(bankingData.positive_sentiment_pct || 0)) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Complaint volume</p>
              <p className={clsx('text-3xl font-bold', (bankingData.complaint_volume || 0) > 200 ? 'text-red-500' : 'text-gray-900 dark:text-white')}>
                {Number(bankingData.complaint_volume || 0).toLocaleString()}
              </p>
            </div>
            <div className="card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">App store rating</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {parseFloat(bankingData.app_store_rating || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {bankingData.crisis_flag && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">⚠ Crisis signal detected</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                  Unusual negative sentiment pattern detected. Review recent mentions immediately.
                </p>
              </div>
            </div>
          )}

          {bankingData.product_mentions && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Product mention breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(typeof bankingData.product_mentions === 'string'
                  ? JSON.parse(bankingData.product_mentions)
                  : bankingData.product_mentions).map(([product, count]: [string, any]) => (
                  <div key={product} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{Number(count).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{product}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Restaurant/QSR specific */}
      {industryCode === 'qsr' && reviews.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Location reviews ({reviews.length} locations)
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {reviews.map((loc: any, i: number) => (
              <ReviewCard key={i} location={loc} />
            ))}
          </div>
        </div>
      )}

      {/* AI Industry Analysis */}
      {aiAnalysis && (
        <div className="space-y-4">
          <div className={clsx('card p-6 border-l-4')}
            style={{ borderLeftColor: cfg.color }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Industry Analysis</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {aiAnalysis.board_summary}
            </p>
          </div>

          {aiAnalysis.immediate_actions?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Industry-specific actions
              </h3>
              <div className="space-y-2">
                {aiAnalysis.immediate_actions.map((action: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-bold text-brand-500 shrink-0">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{action.action}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="badge-neutral text-xs">{action.timeline}</span>
                        <span className="text-xs text-brand-600">{action.goal_served}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!aiAnalysis && !loading && (
        <div className="card text-center py-12 border-dashed">
          <Icon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No industry analysis yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Run industry analysis" for {cfg.label}-specific insights</p>
        </div>
      )}
    </div>
  );
}
