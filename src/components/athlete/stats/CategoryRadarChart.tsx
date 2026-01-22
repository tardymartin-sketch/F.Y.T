// ============================================================
// F.Y.T - CATEGORY RADAR CHART
// src/components/athlete/stats/CategoryRadarChart.tsx
// Radar Chart distribution Push/Pull/Legs
// ============================================================

import React, { useState, useEffect } from 'react';
import { Loader2, Target } from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { fetchCategoryDistribution } from '../../../services/supabaseService';
import type { CategoryDistribution } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
}

interface ChartDataPoint {
  category: string;
  categoryLabel: string;
  volume: number;
  percentage: number;
}

// ===========================================
// CONSTANTS
// ===========================================

const CATEGORY_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs_squat: 'Legs (Squat)',
  legs_hinge: 'Legs (Hinge)',
  core: 'Core',
  arms: 'Arms',
  other: 'Autre',
};

const CATEGORY_COLORS: Record<string, string> = {
  push: '#ef4444',
  pull: '#3b82f6',
  legs_squat: '#22c55e',
  legs_hinge: '#10b981',
  core: '#f59e0b',
  arms: '#a855f7',
  other: '#64748b',
};

// ===========================================
// HELPERS
// ===========================================

function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}t`;
  }
  return `${Math.round(value)} kg`;
}

// ===========================================
// COMPONENT
// ===========================================

export const CategoryRadarChart: React.FC<Props> = ({ userId }) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [rawData, setRawData] = useState<CategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const distribution = await fetchCategoryDistribution(userId);
        setRawData(distribution);

        const chartData: ChartDataPoint[] = distribution.map((d) => ({
          category: d.category,
          categoryLabel: CATEGORY_LABELS[d.category] || d.category,
          volume: d.totalVolume,
          percentage: d.percentage,
        }));

        setData(chartData);
      } catch (err) {
        console.error('Error loading category distribution:', err);
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
        <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucune donnée de distribution</p>
        <p className="text-slate-500 text-sm mt-1">Complète des séances pour voir ton ratio</p>
      </div>
    );
  }

  const totalVolume = rawData.reduce((sum, d) => sum + d.totalVolume, 0);

  return (
    <div className="space-y-4">
      {/* Radar Chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Distribution du Volume
        </h3>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="categoryLabel"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 'auto']}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}t`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatVolume(value), 'Volume']}
              />
              <Radar
                name="Volume"
                dataKey="volume"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Détail par catégorie</h3>

        <div className="space-y-3">
          {rawData.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#64748b' }}
              />
              <span className="text-white text-sm flex-1 truncate">
                {CATEGORY_LABELS[cat.category] || cat.category}
              </span>
              <span className="text-slate-400 text-sm">{formatVolume(cat.totalVolume)}</span>
              <span className="text-slate-500 text-xs w-12 text-right">
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
          <span className="text-slate-400 text-sm">Volume total</span>
          <span className="text-white font-medium">{formatVolume(totalVolume)}</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryRadarChart;
