'use client';
import { useEffect, useState } from 'react';
import { DollarSign, Loader2, Info } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12am';
  if (i === 12) return '12pm';
  if (i < 12) return `${i}am`;
  return `${i - 12}pm`;
});

const getHeatColor = (efficiency: number, max: number) => {
  if (!max || efficiency === 0) return 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800';
  const pct = efficiency / max;
  if (pct >= 0.9) return 'bg-green-600 border-green-700 text-white';
  if (pct >= 0.75) return 'bg-green-500 border-green-600 text-white';
  if (pct >= 0.6) return 'bg-brand-400 border-brand-500 text-white';
  if (pct >= 0.45) return 'bg-brand-300 border-brand-400 text-gray-800';
  if (pct >= 0.3) return 'bg-amber-300 border-amber-400 text-gray-800';
  if (pct >= 0.15) return 'bg-red-200 border-red-300 text-gray-700';
  return 'bg-red-100 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-gray-500';
};

const TooltipContent = ({ data, day, hour }: any) => (
  <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl w-48 -translate-x-1/2 left-1/2 -top-28 pointer-events-none">
    <p className="font-semibold mb-1">{DAYS[day]} {HOURS[hour]}</p>
    <p>Spend: ₦{Number(data.spend || 0).toLocaleString()}</p>
    <p>Impressions: {Number(data.impressions || 0).toLocaleString()}</p>
    <p>CPM: ₦{parseFloat(data.cpm || 0).toFixed(0)}</p>
    <p>Efficiency: {parseFloat(data.efficiency_score || 0).toFixed(0)}/100</p>
  </div>
);

export default function SpendHeatmapPage() {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [metric, setMetric] = useState('efficiency_score');
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get(`/spend-heatmap?platform=${platform}`),
      api.get('/brands/current'),
    ]).then(([hRes, bRes]) => {
      setHeatmapData(hRes.data.heatmap || []);
      setActivePlatforms(bRes.data.brand?.active_platforms || []);
    }).finally(() => setLoading(false));
  }, [platform]);

  // Build 7x24 grid
  const grid: Record<string, any> = {};
  heatmapData.forEach(d => {
    const key = `${d.day_of_week}-${d.hour_of_day}`;
    if (!grid[key]) grid[key] = { spend: 0, impressions: 0, cpm: 0, efficiency_score: 0, count: 0 };
    grid[key].spend += Number(d.spend || 0);
    grid[key].impressions += Number(d.impressions || 0);
    grid[key].efficiency_score = (grid[key].efficiency_score * grid[key].count + Number(d.efficiency_score || 0)) / (grid[key].count + 1);
    grid[key].cpm = grid[key].impressions > 0 ? (grid[key].spend / grid[key].impressions) * 1000 : 0;
    grid[key].count++;
  });

  const values = Object.values(grid).map(d => parseFloat(d[metric] || 0));
  const maxValue = Math.max(...values, 1);

  // Find best and worst slots
  const sortedSlots = Object.entries(grid)
    .map(([key, d]) => ({ key, day: parseInt(key.split('-')[0]), hour: parseInt(key.split('-')[1]), ...d }))
    .sort((a, b) => parseFloat(b[metric] || 0) - parseFloat(a[metric] || 0));
  const bestSlots = sortedSlots.slice(0, 5);
  const worstSlots = sortedSlots.filter(s => parseFloat(s[metric] || 0) > 0).slice(-5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-brand-500" />
          <span className="section-title text-brand-600">Budget Intelligence</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Ad Spend Heatmap</h1>
        <p className="text-sm text-gray-400 mt-1">See exactly when your budget works hardest — by hour and day of week</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select className="input-base text-xs py-2 w-auto" value={platform}
          onChange={e => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {activePlatforms.map(p => (
            <option key={p} value={p} className="capitalize">{p.replace('_', ' ')}</option>
          ))}
        </select>
        <select className="input-base text-xs py-2 w-auto" value={metric}
          onChange={e => setMetric(e.target.value)}>
          <option value="efficiency_score">Efficiency score</option>
          <option value="impressions">Impressions</option>
          <option value="spend">Spend</option>
          <option value="conversions">Conversions</option>
          <option value="cpm">CPM (lower = better)</option>
        </select>
      </div>

      {heatmapData.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No spend data yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload ad platform reports with hourly breakdown to see spend patterns</p>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {metric.replace('_', ' ')} by day and hour
              </h3>
            </div>
            <div className="overflow-x-auto p-4">
              {/* Hour labels */}
              <div className="flex mb-1 ml-12">
                {HOURS.filter((_, i) => i % 3 === 0).map((h, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-gray-400">{h}</div>
                ))}
              </div>
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center mb-0.5">
                  <span className="w-10 text-xs text-gray-400 text-right pr-2 shrink-0">{day}</span>
                  <div className="flex flex-1 gap-0.5">
                    {HOURS.map((_, hourIdx) => {
                      const key = `${dayIdx}-${hourIdx}`;
                      const cellData = grid[key];
                      const value = cellData ? parseFloat(cellData[metric] || 0) : 0;
                      const colorClass = getHeatColor(value, maxValue);
                      const isHovered = hoveredCell?.day === dayIdx && hoveredCell?.hour === hourIdx;

                      return (
                        <div key={hourIdx} className="relative flex-1 group"
                          onMouseEnter={() => cellData && setHoveredCell({ day: dayIdx, hour: hourIdx })}
                          onMouseLeave={() => setHoveredCell(null)}>
                          <div className={clsx(
                            'w-full aspect-square rounded-sm border transition-all cursor-default',
                            colorClass,
                            isHovered && 'ring-2 ring-white dark:ring-gray-300 scale-110 z-10 relative'
                          )} />
                          {isHovered && cellData && (
                            <TooltipContent data={cellData} day={dayIdx} hour={hourIdx} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-4 ml-12">
                <span className="text-xs text-gray-400">Low</span>
                {['bg-red-100', 'bg-amber-300', 'bg-brand-300', 'bg-brand-400', 'bg-green-500', 'bg-green-600'].map(c => (
                  <div key={c} className={clsx('w-5 h-5 rounded-sm border border-gray-100', c)} />
                ))}
                <span className="text-xs text-gray-400">High</span>
              </div>
            </div>
          </div>

          {/* Best / worst slots */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">🏆 Best performing slots</h3>
              <div className="space-y-2">
                {bestSlots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {DAYS[slot.day]} at {HOURS[slot.hour]}
                    </span>
                    <span className="font-semibold text-green-600">
                      {metric === 'spend' ? `₦${Number(slot[metric] || 0).toLocaleString()}` :
                       metric === 'cpm' ? `₦${parseFloat(slot[metric] || 0).toFixed(0)}` :
                       parseFloat(slot[metric] || 0).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">📉 Worst performing slots</h3>
              <div className="space-y-2">
                {worstSlots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {DAYS[slot.day]} at {HOURS[slot.hour]}
                    </span>
                    <span className="font-semibold text-red-500">
                      {metric === 'spend' ? `₦${Number(slot[metric] || 0).toLocaleString()}` :
                       parseFloat(slot[metric] || 0).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI insight */}
          <div className="card p-5 bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-800">
            <p className="text-xs font-semibold text-brand-600 mb-2 uppercase tracking-wider">💡 Budget Optimisation Insight</p>
            <p className="text-sm text-brand-800 dark:text-brand-300 leading-relaxed">
              {bestSlots[0] && worstSlots[0] && (
                <>
                  Your ads are most efficient on <strong>{DAYS[bestSlots[0].day]}s between {HOURS[bestSlots[0].hour]}</strong> and perform worst on {DAYS[worstSlots[0].day]}s at {HOURS[worstSlots[0].hour]}.
                  Shifting 20% of budget from your lowest-performing hours to your top 5 slots could improve overall campaign efficiency by an estimated 15-25%.
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
