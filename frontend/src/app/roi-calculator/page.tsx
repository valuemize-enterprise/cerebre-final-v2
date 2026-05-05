'use client';
import { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Users, MousePointer } from 'lucide-react';
import api from '../../lib/api';

const FMT_NGN = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const FMT_NUM = (n: number) => Math.round(n).toLocaleString();

export default function ROICalculatorPage() {
  const [inputs, setInputs] = useState({ monthly_budget: 500000, avg_order_value: 15000, conversion_rate: 2, avg_cpc: 500 });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setInputs(p => ({ ...p, [k]: parseFloat(v) || 0 }));

  const calculate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/roi-calculator', { ...inputs, conversion_rate: inputs.conversion_rate / 100 });
      setResult(data.outputs);
    } catch {
      const budget = inputs.monthly_budget, cpc = inputs.avg_cpc || 1, cvr = inputs.conversion_rate / 100, aov = inputs.avg_order_value;
      const clicks = budget / cpc, leads = clicks * cvr, revenue = leads * aov;
      setResult({ clicks: Math.round(clicks), leads: Math.round(leads), revenue: Math.round(revenue),
        roi: Math.round(budget > 0 ? ((revenue - budget) / budget) * 100 : 0),
        roas: parseFloat((budget > 0 ? revenue / budget : 0).toFixed(2)),
        cpl: Math.round(leads > 0 ? budget / leads : 0) });
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ROI Calculator</h1>
        <p className="text-sm text-gray-400 mt-1">Model your marketing budget and predict returns</p></div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your inputs</h3>
          {[
            { key:'monthly_budget', label:'Monthly ad budget (₦)', icon:DollarSign },
            { key:'avg_order_value', label:'Average order / deal value (₦)', icon:DollarSign },
            { key:'conversion_rate', label:'Conversion rate (%)', icon:TrendingUp },
            { key:'avg_cpc', label:'Average cost per click (₦)', icon:MousePointer },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />{label}
              </label>
              <input type="number" className="input-base" value={inputs[key as keyof typeof inputs]}
                onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <button onClick={calculate} disabled={loading} className="btn-primary w-full">
            {loading ? 'Calculating...' : 'Calculate ROI →'}
          </button>
        </div>
        <div className="space-y-3">
          {result ? (
            <>
              <div className="card p-5 bg-gradient-to-br from-brand-600 to-purple-600 border-0 text-white">
                <p className="text-sm font-medium text-brand-200">Estimated ROI</p>
                <p className="text-5xl font-bold mt-1">{result.roi}%</p>
                <p className="text-brand-200 text-sm mt-1">Return on ad spend: {result.roas}x</p>
              </div>
              {[
                { label:'Estimated clicks', value:FMT_NUM(result.clicks), icon:'🖱️' },
                { label:'Estimated leads', value:FMT_NUM(result.leads), icon:'🎯' },
                { label:'Estimated revenue', value:FMT_NGN(result.revenue), icon:'💰' },
                { label:'Cost per lead', value:FMT_NGN(result.cpl), icon:'📊' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="card p-4 flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div><p className="text-xs text-gray-400">{label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p></div>
                </div>
              ))}
            </>
          ) : (
            <div className="card p-12 text-center border-dashed">
              <Calculator className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">Enter your budget and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
