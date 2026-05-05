'use client';
import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Loader2, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';
import clsx from 'clsx';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SeasonalPage() {
  const { colors } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');

  useEffect(() => { api.get(`/seasonal?platform=${platform}`).then(({data})=>setData(data.seasonal||[])).finally(()=>setLoading(false)); },[platform]);

  const chartData = data.map(d=>({
    month: MONTHS[(d.month||1)-1],
    index: parseFloat(d.seasonality_index||1)*100,
    avgER: parseFloat(d.avg_er||0)*100,
    leads: d.avg_leads||0,
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin"/></div>;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-brand-500"/><span className="section-title text-brand-600">Seasonal Intelligence</span></div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Seasonal Performance</h1>
          <p className="text-sm text-gray-400 mt-1">Month-by-month performance patterns to plan campaigns and budget</p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {['all','instagram','facebook','google_ads','email'].map(p=>(
            <button key={p} onClick={()=>setPlatform(p)} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors',platform===p?'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm':'text-gray-500')}>{p==='all'?'All':p.replace('_',' ')}</button>
          ))}
        </div>
      </div>

      {chartData.length>0?(
        <>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Seasonality index (100 = average month)</h3>
            <p className="text-xs text-gray-400 mb-4">Months above 100 historically perform better. Allocate more budget here.</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:colors.textMuted}}/>
                <YAxis domain={[0,'auto']} tick={{fontSize:10,fill:colors.textMuted}}/>
                <Tooltip formatter={(v:any)=>[`${Number(v).toFixed(0)}`,'Seasonality']}/>
                <ReferenceLine y={100} stroke="#7c3aed" strokeDasharray="4 4" label={{value:'Average',fill:'#7c3aed',fontSize:10}}/>
                <Bar dataKey="index" name="Seasonality index" radius={[4,4,0,0]}
                  fill="#7c3aed"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {chartData.map((d,i)=>{
              const isHigh = d.index>110;
              const isLow = d.index<90;
              return (
                <div key={i} className={clsx('card p-3 text-center',isHigh?'border-green-200 dark:border-green-900':isLow?'border-red-100 dark:border-red-900':'')} >
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{d.month}</p>
                  <p className={clsx('text-lg font-bold mt-1',isHigh?'text-green-600':isLow?'text-red-500':'text-gray-700 dark:text-gray-300')}>{d.index.toFixed(0)}</p>
                  {isHigh?<TrendingUp className="w-3 h-3 text-green-500 mx-auto mt-1"/>:isLow?<TrendingDown className="w-3 h-3 text-red-400 mx-auto mt-1"/>:<Minus className="w-3 h-3 text-gray-400 mx-auto mt-1"/>}
                </div>
              );
            })}
          </div>
        </>
      ):(
        <div className="card text-center py-16 border-dashed"><Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">No seasonal data yet</p><p className="text-sm text-gray-400 mt-1">Upload 12+ months of data to discover seasonal patterns</p></div>
      )}
    </div>
  );
}