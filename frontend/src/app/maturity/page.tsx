'use client';
import { useEffect, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { Award, ChevronRight, CheckCircle2, AlertCircle, ArrowRight, Loader2, Zap } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const MATURITY_LEVELS = [
  { level: 'Reactive',    range: [1, 2],   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/20',    desc: 'Posting without strategy, no measurement' },
  { level: 'Developing',  range: [2, 3],   color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/20', desc: 'Some planning but inconsistent execution' },
  { level: 'Defined',     range: [3, 4],   color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20', desc: 'Clear goals, regular measurement, improving' },
  { level: 'Optimised',   range: [4, 4.5], color: 'text-brand-600',  bg: 'bg-brand-50 dark:bg-brand-950/20',  desc: 'Data-driven, systematic improvement, clear ROI' },
  { level: 'Innovative',  range: [4.5, 5], color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/20',  desc: 'AI-powered, predictive, industry leader' },
];

const DIMENSIONS = [
  { key: 'strategy_score',     label: 'Strategy',     desc: 'Goal clarity, long-term planning, audience focus' },
  { key: 'execution_score',    label: 'Execution',    desc: 'Consistency, content quality, publishing frequency' },
  { key: 'measurement_score',  label: 'Measurement',  desc: 'Analytics depth, attribution, reporting rigour' },
  { key: 'technology_score',   label: 'Technology',   desc: 'Tools, automation, AI usage, integration quality' },
  { key: 'audience_score',     label: 'Audience',     desc: 'Understanding, segmentation, persona development' },
  { key: 'integration_score',  label: 'Integration',  desc: 'Cross-channel coordination, CRM alignment' },
  { key: 'talent_score',       label: 'Talent',       desc: 'Team skill, training investment, specialist knowledge' },
  { key: 'innovation_score',   label: 'Innovation',   desc: 'Experimentation culture, early adoption, testing' },
];

const ASSESSMENT_QUESTIONS = [
  { dimension: 'strategy_score',    question: 'How clearly defined are your social media goals?',
    options: ['We post without specific goals', 'We have general direction', 'Goals are defined but not tracked', 'SMART goals with regular reviews', 'Goals drive all decisions, AI-aligned'] },
  { dimension: 'execution_score',   question: 'How consistent is your content publishing?',
    options: ['Irregular, whenever we have time', 'Some weeks are good, some not', 'Usually consistent, occasional gaps', 'Always consistent with content calendar', 'Automated, AI-optimised scheduling'] },
  { dimension: 'measurement_score', question: 'How sophisticated is your analytics tracking?',
    options: ['Only follower counts', 'Basic platform analytics', 'Custom dashboards, some attribution', 'Full funnel attribution with CRM', 'Predictive modelling and AI insights'] },
  { dimension: 'technology_score',  question: 'What describes your marketing tech stack?',
    options: ['Just native platform tools', 'Scheduling tool only', 'Multiple tools, not integrated', 'Integrated stack with automation', 'AI-powered, fully automated workflows'] },
  { dimension: 'audience_score',    question: 'How well do you know your audience?',
    options: ['Limited understanding', 'Basic demographic data', 'Some behavioural insights', 'Detailed personas with data backing', 'Real-time audience intelligence with AI'] },
  { dimension: 'integration_score', question: 'How integrated is your social with other channels?',
    options: ['Social is isolated', 'Email connected sometimes', 'Regular cross-channel campaigns', 'Unified customer journey tracking', 'Full omnichannel orchestration'] },
  { dimension: 'talent_score',      question: 'What describes your social media team?',
    options: ['One person doing everything', 'Small team learning on the job', 'Specialists but knowledge gaps', 'Strong team with ongoing training', 'World-class team with AI augmentation'] },
  { dimension: 'innovation_score',  question: 'How much do you experiment and test?',
    options: ['Never test, just post', 'Occasional informal tests', 'Regular A/B testing on content', 'Structured experimentation programme', 'Continuous ML-driven optimisation'] },
];

export default function MaturityPage() {
  const [assessment, setAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'view' | 'assess'>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    api.get('/maturity/latest')
      .then(({ data }) => setAssessment(data.assessment))
      .finally(() => setLoading(false));
  }, []);

  const handleAnswer = (dimension: string, score: number) => {
    setAnswers(prev => ({ ...prev, [dimension]: score }));
    if (currentQ < ASSESSMENT_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(q => q + 1), 300);
    }
  };

  const submitAssessment = async () => {
    if (Object.keys(answers).length < ASSESSMENT_QUESTIONS.length) {
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/maturity/assess', { answers });
      setAssessment(data.assessment);
      setMode('view');
    } finally {
      setSaving(false);
    }
  };

  const getLevel = (score: number) =>
    MATURITY_LEVELS.find(l => score >= l.range[0] && score < l.range[1]) || MATURITY_LEVELS[0];

  const radarData = assessment
    ? DIMENSIONS.map(d => ({ dimension: d.label, score: parseFloat(assessment[d.key] || 0) * 20, fullMark: 100 }))
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-brand-500" />
            <span className="section-title text-brand-600">Benchmark Intelligence</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Digital Maturity Assessment</h1>
          <p className="text-sm text-gray-400 mt-1">
            Measure where your brand sits on the marketing sophistication ladder
          </p>
        </div>
        {mode === 'view' && (
          <button onClick={() => { setMode('assess'); setCurrentQ(0); setAnswers({}); }} className="btn-primary">
            {assessment ? 'Reassess' : 'Take assessment'}
          </button>
        )}
      </div>

      {/* Assessment mode */}
      {mode === 'assess' && (
        <div className="card p-6">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${((currentQ + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">{currentQ + 1}/{ASSESSMENT_QUESTIONS.length}</span>
          </div>

          {/* Question */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
              {DIMENSIONS.find(d => d.key === ASSESSMENT_QUESTIONS[currentQ]?.dimension)?.label}
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {ASSESSMENT_QUESTIONS[currentQ]?.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {ASSESSMENT_QUESTIONS[currentQ]?.options.map((opt, i) => (
              <button key={i}
                onClick={() => handleAnswer(ASSESSMENT_QUESTIONS[currentQ].dimension, i + 1)}
                className={clsx(
                  'w-full text-left p-4 rounded-xl border transition-all text-sm',
                  answers[ASSESSMENT_QUESTIONS[currentQ].dimension] === i + 1
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-300'
                )}>
                <span className="text-xs font-bold text-gray-400 mr-3">{i + 1}</span>
                {opt}
              </button>
            ))}
          </div>

          {currentQ > 0 && (
            <button onClick={() => setCurrentQ(q => q - 1)} className="btn-secondary mt-4">← Back</button>
          )}

          {Object.keys(answers).length === ASSESSMENT_QUESTIONS.length && (
            <button onClick={submitAssessment} disabled={saving} className="btn-primary mt-4 ml-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {saving ? 'Calculating...' : 'See your results'}
            </button>
          )}
        </div>
      )}

      {/* Results view */}
      {mode === 'view' && assessment && (
        <>
          {/* Overall level */}
          {(() => {
            const level = getLevel(parseFloat(assessment.overall_maturity));
            return (
              <div className={clsx('card p-6 border', level.bg)}>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-900 flex flex-col items-center justify-center shadow-sm">
                    <p className={clsx('text-3xl font-bold', level.color)}>
                      {parseFloat(assessment.overall_maturity).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">/ 5.0</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Maturity level</p>
                    <p className={clsx('text-2xl font-bold', level.color)}>{level.level}</p>
                    <p className="text-sm text-gray-500 mt-1">{level.desc}</p>
                    {assessment.percentile && (
                      <p className="text-xs text-brand-600 mt-1 font-medium">
                        Top {100 - assessment.percentile}% of brands in your industry
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Radar chart */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Maturity profile</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                  <Radar name="Maturity" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Dimension scores</h3>
              <div className="space-y-2.5">
                {DIMENSIONS.map(d => {
                  const score = parseFloat(assessment[d.key] || 0);
                  const pct = (score / 5) * 100;
                  return (
                    <div key={d.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{d.label}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{score.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full',
                          pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-brand-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gaps + roadmap */}
          {assessment.gaps && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key gaps to close</h3>
                {(typeof assessment.gaps === 'string' ? JSON.parse(assessment.gaps) : assessment.gaps).map((gap: string, i: number) => (
                  <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{gap}
                  </div>
                ))}
              </div>
              {assessment.roadmap && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">90-day improvement roadmap</h3>
                  {(typeof assessment.roadmap === 'string' ? JSON.parse(assessment.roadmap) : assessment.roadmap).map((step: string, i: number) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                      <ArrowRight className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />{step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* No assessment yet */}
      {mode === 'view' && !assessment && (
        <div className="card text-center py-16 border-dashed">
          <Award className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No assessment taken yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Take the 8-question assessment to benchmark your digital marketing maturity
          </p>
          <button onClick={() => { setMode('assess'); setCurrentQ(0); setAnswers({}); }}
            className="btn-primary mt-4 inline-flex">
            Start assessment
          </button>
        </div>
      )}
    </div>
  );
}
