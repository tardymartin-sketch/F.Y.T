// ============================================================
// F.Y.T - VOLUME TREND CHART
// src/components/athlete/stats/VolumeTrendChart.tsx
// Graphique tendance volume hebdomadaire
// ============================================================

import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { fetchWeeklyVolume } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
}

interface ChartDataPoint {
  weekLabel: string;
  totalVolume: number;
  sessionCount: number;
}

// ===========================================
// HELPERS
// ===========================================

const formatVolume = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
};

// ===========================================
// COMPONENT
// ===========================================

export const VolumeTrendChart: React.FC<Props> = ({ userId }) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const trend = await fetchWeeklyVolume(userId, 12);

        const chartData: ChartDataPoint[] = trend
          .map((t) => ({
            weekLabel: `S${t.week}`,
            totalVolume: Math.round(t.totalVolume),
            sessionCount: t.sessionCount,
          }))
          .reverse(); // Ordre chronologique

        setData(chartData);
      } catch (err) {
        console.error('Error loading volume trend:', err);
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
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucune donnée de volume disponible</p>
        <p className="text-slate-500 text-sm mt-1">Complète des séances pour voir ta progression</p>
      </div>
    );
  }

  const avgVolume = data.reduce((sum, d) => sum + d.totalVolume, 0) / data.length;
  const maxVolume = Math.max(...data.map((d) => d.totalVolume));
  const totalVolume = data.reduce((sum, d) => sum + d.totalVolume, 0);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Volume Total (12 semaines)
      </h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              tickFormatter={formatVolume}
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
              formatter={(value: number) => [formatVolume(value) + ' kg', 'Volume']}
            />
            <ReferenceLine
              y={avgVolume}
              stroke="#64748b"
              strokeDasharray="5 5"
              label={{
                value: `Moy: ${formatVolume(avgVolume)}`,
                fill: '#64748b',
                fontSize: 10,
                position: 'right',
              }}
            />
            <Area
              type="monotone"
              dataKey="totalVolume"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats summary */}
      <div className="mt-4 pt-3 border-t border-slate-700 grid grid-cols-3 gap-4 text-sm text-center">
        <div>
          <span className="text-slate-500 block">Total</span>
          <span className="text-white font-medium">{formatVolume(totalVolume)} kg</span>
        </div>
        <div>
          <span className="text-slate-500 block">Moyenne/sem</span>
          <span className="text-blue-400 font-medium">{formatVolume(avgVolume)} kg</span>
        </div>
        <div>
          <span className="text-slate-500 block">Max</span>
          <span className="text-white font-medium">{formatVolume(maxVolume)} kg</span>
        </div>
      </div>
    </div>
  );
};

export default VolumeTrendChart;
