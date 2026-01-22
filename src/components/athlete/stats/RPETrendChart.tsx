// ============================================================
// F.Y.T - RPE TREND CHART
// src/components/athlete/stats/RPETrendChart.tsx
// Graphique tendance RPE hebdomadaire
// ============================================================

import React, { useState, useEffect } from 'react';
import { Loader2, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { fetchWeeklyRPETrend } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
}

interface ChartDataPoint {
  weekLabel: string;
  avgRpe: number;
  sessionCount: number;
}

// ===========================================
// COMPONENT
// ===========================================

export const RPETrendChart: React.FC<Props> = ({ userId }) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const trend = await fetchWeeklyRPETrend(userId, 12);

        const chartData: ChartDataPoint[] = trend
          .map((t) => ({
            weekLabel: `S${t.week}`,
            avgRpe: Math.round(t.avgRpe * 10) / 10,
            sessionCount: t.sessionCount,
          }))
          .reverse(); // Ordre chronologique

        setData(chartData);
      } catch (err) {
        console.error('Error loading RPE trend:', err);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center text-red-400">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucune donnée RPE disponible</p>
        <p className="text-slate-500 text-sm mt-1">Renseigne le RPE de tes séances</p>
      </div>
    );
  }

  const avgRpe = data.reduce((sum, d) => sum + d.avgRpe, 0) / data.length;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-amber-400" />
        Tendance RPE (12 semaines)
      </h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 3, 5, 7, 10]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => {
                if (name === 'avgRpe') return [value, 'RPE moyen'];
                return [value, name];
              }}
            />
            <ReferenceLine
              y={avgRpe}
              stroke="#64748b"
              strokeDasharray="5 5"
              label={{
                value: `Moy: ${avgRpe.toFixed(1)}`,
                fill: '#64748b',
                fontSize: 10,
                position: 'right',
              }}
            />
            <Line
              type="monotone"
              dataKey="avgRpe"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats summary */}
      <div className="mt-4 pt-3 border-t border-slate-700 grid grid-cols-3 gap-4 text-sm text-center">
        <div>
          <span className="text-slate-500 block">Min</span>
          <span className="text-white font-medium">
            {Math.min(...data.map((d) => d.avgRpe)).toFixed(1)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Moyenne</span>
          <span className="text-amber-400 font-medium">{avgRpe.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Max</span>
          <span className="text-white font-medium">
            {Math.max(...data.map((d) => d.avgRpe)).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RPETrendChart;
