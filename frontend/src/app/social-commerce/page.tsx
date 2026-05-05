'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, TrendingUp, DollarSign, Loader2, ShoppingCart, Link2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../lib/api';
import { useTheme } from '../../hooks/useTheme';

const PLATFORM_COLORS: Record<string,string> = { instagram:'#E1306C', tiktok:'#69C9D0', facebook:'#1877F2', whatsapp:'#25D366' };

export default function SocialCommercePage() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/social-commerce').then(({data}) => setData(data)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>;

  const metrics = data?.metrics || {};
  const totalRevenue = Object.values(metrics).reduce((s:number,m:any) => s+(parseFloat(m.revenue||0)),0);
  const totalOrders = Object.values(metrics).reduce((s:number,m:any) => s+(parseInt(m.purchases||0)),0);
  const chartData = Object.entries(metrics).map(([platform,m]:any) => ({ platform, revenue: parseFloat(m.revenue||0), orders: parseInt(m.purchases||0) }));

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-brand-500" /><span className="section-title text-brand-600">Commerce Intelligence</span></div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Social Commerce</h1>
        <p className="text-sm text-gray-400 mt-1">Revenue and orders attributed directly to social media content</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total revenue', value: `₦${(totalRevenue/1000).toFixed(0)}k`, icon: DollarSign, color: 'text-green-600' },
          { label: 'Total orders', value: totalOrders.toLocaleString(), icon: ShoppingCart, color: 'text-brand-600' },
          { label: 'Avg order value', value: `₦${totalOrders>0?(totalRevenue/totalOrders).toFixed(0):0}`, icon: TrendingUp, color: 'text-amber-600' },
          { label: 'Platforms tracked', value: Object.keys(metrics).length, icon: Link2, color: 'text-gray-700 dark:text-gray-200' },
        ].map(({label,value,icon:Icon,color}) => (
          <div key={label} className="card p-4 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      {chartData.length > 0 ? (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue by platform</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="platform" tick={{fontSize:11,fill:colors.textMuted}} />
              <YAxis tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`} tick={{fontSize:10,fill:colors.textMuted}} />
              <Tooltip formatter={(v:any)=>[`₦${Number(v).toLocaleString()}`,"Revenue"]} />
              <Bar dataKey="revenue" radius={[4,4,0,0]}>
                {chartData.map((_,i) => <Cell key={i} fill={PLATFORM_COLORS[_.platform]||'#7c3aed'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card text-center py-16 border-dashed"><ShoppingBag className="w-10 h-10 mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No social commerce data yet</p><p className="text-sm text-gray-400 mt-1">Connect Instagram Shopping, TikTok Shop, or WhatsApp Business to track revenue</p></div>
      )}
    </div>
  );
}