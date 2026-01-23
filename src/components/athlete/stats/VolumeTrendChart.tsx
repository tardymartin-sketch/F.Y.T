// ============================================================
// F.Y.T - VOLUME TREND CHART
// src/components/athlete/stats/VolumeTrendChart.tsx
// Graphique tendance volume par date de session
// ============================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { fetchSessionTrends } from '../../../services/supabaseService';
import { ChartTooltipOverlay, formatVolume as formatVolumeOverlay, getRpeColor, formatRpeValue } from './ChartTooltipOverlay';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  weeksBack?: number; // 0 = all time
  onViewDate?: (date: string) => void;
}

interface ChartDataPoint {
  dateLabel: string;
  dateISO: string;
  totalVolume: number;
  sessionNames: string[];
  avgRpe: number | null;
}

// ===========================================
// HELPERS
// ===========================================

const formatVolume = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} Mt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} T`;
  }
  return `${Math.round(value)} kg`;
};

const formatVolumeAxis = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}Mt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}T`;
  }
  return `${Math.round(value)}`;
};

function formatDateLabel(dateISO: string): string {
  const date = new Date(dateISO + 'T12:00:00');
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getPeriodLabel(weeksBack: number): string {
  if (weeksBack === 0) return 'Historique complet';
  if (weeksBack === 6) return '6 semaines';
  if (weeksBack === 12) return '12 semaines';
  if (weeksBack === 52) return '1 an';
  return `${weeksBack} semaines`;
}

// ===========================================
// CUSTOM HOVER TOOLTIP
// ===========================================

interface HoverTooltipProps {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  viewBox?: { width: number; height: number };
  onViewDate?: (date: string) => void;
  onCoordinateChange?: (coord: { x: number; y: number }) => void;
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({ active, payload, coordinate, viewBox, onViewDate, onCoordinateChange }) => {
  if (!active || !payload || !payload[0] || !coordinate) return null;

  // Store coordinates for pinning
  if (onCoordinateChange) {
    onCoordinateChange(coordinate);
  }

  const data = payload[0].payload as ChartDataPoint;
  const sessionLabel = data.sessionNames.length > 1
    ? data.sessionNames.join(' + ')
    : data.sessionNames[0];

  return (
    <ChartTooltipOverlay
      data={{
        date: data.dateISO,
        label: sessionLabel,
        primaryValue: formatVolumeOverlay(data.totalVolume),
        primaryColor: 'text-blue-400',
        secondaryLabel: 'RPE:',
        secondaryValue: formatRpeValue(data.avgRpe),
        secondaryColor: getRpeColor(data.avgRpe),
      }}
      position={{
        x: coordinate.x,
        y: coordinate.y,
        containerWidth: viewBox?.width,
        containerHeight: viewBox?.height,
      }}
      onViewDate={onViewDate}
    />
  );
};

// ===========================================
// COMPONENT
// ===========================================

export const VolumeTrendChart: React.FC<Props> = ({ userId, weeksBack = 12, onViewDate }) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedData, setPinnedData] = useState<ChartDataPoint | null>(null);
  const [pinnedCoordinate, setPinnedCoordinate] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef<string>('');
  // Store last hover coordinates for pinning at exact same position
  const lastHoverCoordRef = useRef<{ x: number; y: number } | null>(null);

  // Charger les données uniquement quand userId ou weeksBack change
  useEffect(() => {
    const loadKey = `${userId}-${weeksBack}`;

    // Ne pas recharger si les données sont déjà chargées pour cette clé
    if (dataLoadedRef.current === loadKey && data.length > 0) {
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const trends = await fetchSessionTrends(userId, weeksBack || 9999);

        if (!isMounted) return;

        // Filtrer pour ne garder que les jours avec du volume
        const chartData: ChartDataPoint[] = trends
          .filter((t) => t.totalVolume > 0)
          .map((t) => ({
            dateLabel: formatDateLabel(t.date),
            dateISO: t.date,
            totalVolume: t.totalVolume,
            sessionNames: t.sessionNames,
            avgRpe: t.avgRpe,
          }));

        setData(chartData);
        setPinnedData(null);
        setPinnedCoordinate(null);
        dataLoadedRef.current = loadKey;
      } catch (err) {
        console.error('Error loading volume trend:', err);
        if (isMounted) setError('Erreur lors du chargement');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userId, weeksBack]);

  // Gestion du clic sur le graphique - stable reference
  const handleChartClick = useCallback((chartEvent: any) => {
    // Si déjà épinglé, un clic n'importe où ferme l'overlay
    if (pinnedData) {
      setPinnedData(null);
      setPinnedCoordinate(null);
      return;
    }

    // Sinon, épingler au point actif en utilisant les coordonnées du dernier hover
    if (chartEvent && chartEvent.activePayload && chartEvent.activePayload[0] && lastHoverCoordRef.current) {
      const clickedData = chartEvent.activePayload[0].payload as ChartDataPoint;
      setPinnedData(clickedData);
      setPinnedCoordinate({
        x: lastHoverCoordRef.current.x,
        y: lastHoverCoordRef.current.y,
      });
    }
  }, [pinnedData]);

  // Fermer le tooltip épinglé si on clique en dehors du graphique
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Ne pas fermer si on clique sur le tooltip lui-même
    if (target.closest('.pinned-tooltip')) {
      return;
    }
    // Fermer si on clique en dehors du graphique (mais dans le container)
    if (pinnedData && !target.closest('.recharts-wrapper')) {
      setPinnedData(null);
      setPinnedCoordinate(null);
    }
  }, [pinnedData]);

  // Callback to store hover coordinates
  const handleCoordinateChange = useCallback((coord: { x: number; y: number }) => {
    lastHoverCoordRef.current = coord;
  }, []);

  // Memoize hover tooltip component
  const renderHoverTooltip = useMemo(() => {
    return (props: any) => <HoverTooltip {...props} onViewDate={onViewDate} onCoordinateChange={handleCoordinateChange} />;
  }, [onViewDate, handleCoordinateChange]);

  // Calculer les stats une seule fois
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const avgVolume = data.reduce((sum, d) => sum + d.totalVolume, 0) / data.length;
    return {
      avgVolume,
      maxVolume: Math.max(...data.map((d) => d.totalVolume)),
      totalVolume: data.reduce((sum, d) => sum + d.totalVolume, 0),
    };
  }, [data]);

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

  if (data.length === 0 || !stats) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucune donnée de volume disponible</p>
        <p className="text-slate-500 text-sm mt-1">Complète des séances pour voir ta progression</p>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <h3 className="text-white font-medium mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Volume Total ({getPeriodLabel(weeksBack)})
      </h3>

      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              interval={data.length > 12 ? Math.floor(data.length / 6) : 0}
            />
            <YAxis
              tickFormatter={formatVolumeAxis}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
            />
            {!pinnedData && (
              <Tooltip
                content={renderHoverTooltip}
                cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                position={{ y: 0 }}
              />
            )}
            <ReferenceLine
              y={stats.avgVolume}
              stroke="#64748b"
              strokeDasharray="5 5"
              label={{
                value: `Moy: ${formatVolumeAxis(stats.avgVolume)}`,
                fill: '#64748b',
                fontSize: 10,
                position: 'right',
              }}
            />
            <Area
              type="monotone"
              dataKey="totalVolume"
              stroke="transparent"
              fill="url(#volumeGradient)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="totalVolume"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Pinned Tooltip Overlay */}
        {pinnedData && pinnedCoordinate && (
          <div className="pinned-tooltip" onClick={(e) => e.stopPropagation()}>
            <ChartTooltipOverlay
              data={{
                date: pinnedData.dateISO,
                label: pinnedData.sessionNames.length > 1
                  ? pinnedData.sessionNames.join(' + ')
                  : pinnedData.sessionNames[0],
                primaryValue: formatVolumeOverlay(pinnedData.totalVolume),
                primaryColor: 'text-blue-400',
                secondaryLabel: 'RPE:',
                secondaryValue: formatRpeValue(pinnedData.avgRpe),
                secondaryColor: getRpeColor(pinnedData.avgRpe),
              }}
              position={{
                x: pinnedCoordinate.x,
                y: pinnedCoordinate.y,
                containerWidth: containerRef.current?.offsetWidth,
                containerHeight: containerRef.current?.offsetHeight,
              }}
              onViewDate={onViewDate}
            />
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="mt-4 pt-3 border-t border-slate-700 grid grid-cols-3 gap-4 text-sm text-center">
        <div>
          <span className="text-slate-500 block">Total</span>
          <span className="text-white font-medium">{formatVolume(stats.totalVolume)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Moyenne/jour</span>
          <span className="text-blue-400 font-medium">{formatVolume(stats.avgVolume)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Max</span>
          <span className="text-white font-medium">{formatVolume(stats.maxVolume)}</span>
        </div>
      </div>
    </div>
  );
};

export default VolumeTrendChart;
