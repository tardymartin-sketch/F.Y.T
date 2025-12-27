// ============================================================
// F.Y.T - STRAVA ACTIVITY CHARTS
// src/components/StravaActivityCharts.tsx
// Graphiques détaillés pour une activité Strava
// ============================================================

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Legend
} from 'recharts';
import { Activity, Heart, Mountain, Zap, TrendingUp, Clock } from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface StreamData {
  time?: { data: number[] };
  distance?: { data: number[] };
  velocity_smooth?: { data: number[] };
  heartrate?: { data: number[] };
  altitude?: { data: number[] };
  cadence?: { data: number[] };
  watts?: { data: number[] };
  grade_smooth?: { data: number[] };
}

interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_index: number;
  end_index: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    climb_category: number;
  };
  pr_rank?: number | null;
  achievements?: { type_id: number; type: string; rank: number }[];
}

interface StravaActivityChartsProps {
  streams: StreamData | null;
  segments?: StravaSegmentEffort[];
  sportType: string;
  compact?: boolean;
}

// ============================================================
// Helpers
// ============================================================

const formatDistance = (meters: number): string => {
  return (meters / 1000).toFixed(2);
};

const formatPace = (speedMs: number): string => {
  if (!speedMs || speedMs === 0) return '-';
  const paceSecondsPerKm = 1000 / speedMs;
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatSpeed = (speedMs: number): string => {
  if (!speedMs) return '-';
  return (speedMs * 3.6).toFixed(1);
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}min`;
  return `${m}min${s.toString().padStart(2, '0')}s`;
};

const getClimbCategoryLabel = (category: number): string => {
  const labels: Record<number, string> = {
    0: '',
    1: 'Cat 4',
    2: 'Cat 3',
    3: 'Cat 2',
    4: 'Cat 1',
    5: 'HC',
  };
  return labels[category] || '';
};

const getClimbCategoryColor = (category: number): string => {
  const colors: Record<number, string> = {
    0: 'bg-slate-600',
    1: 'bg-green-600',
    2: 'bg-yellow-600',
    3: 'bg-orange-600',
    4: 'bg-red-600',
    5: 'bg-purple-600',
  };
  return colors[category] || 'bg-slate-600';
};

// ============================================================
// Chart Components
// ============================================================

const ChartCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color: string;
}> = ({ title, icon, children, color }) => (
  <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
    <div className={`px-4 py-2 border-b border-slate-700/50 flex items-center gap-2 ${color}`}>
      {icon}
      <span className="font-medium text-sm">{title}</span>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label, unit, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label} km</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value} {unit}
        </p>
      ))}
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const StravaActivityCharts: React.FC<StravaActivityChartsProps> = ({
  streams,
  segments,
  sportType,
  compact = false,
}) => {
  // Préparer les données pour les graphiques
  const chartData = useMemo(() => {
    if (!streams?.distance?.data) return [];

    const distanceData = streams.distance.data;
    const velocityData = streams.velocity_smooth?.data || [];
    const heartrateData = streams.heartrate?.data || [];
    const altitudeData = streams.altitude?.data || [];
    const cadenceData = streams.cadence?.data || [];
    const gradeData = streams.grade_smooth?.data || [];

    // Échantillonner les données pour ne pas surcharger le graphique
    const sampleRate = Math.max(1, Math.floor(distanceData.length / 500));
    
    const data = [];
    for (let i = 0; i < distanceData.length; i += sampleRate) {
      const distKm = distanceData[i] / 1000;
      
      data.push({
        distance: parseFloat(distKm.toFixed(2)),
        speed: velocityData[i] ? parseFloat((velocityData[i] * 3.6).toFixed(1)) : null,
        heartrate: heartrateData[i] || null,
        altitude: altitudeData[i] ? parseFloat(altitudeData[i].toFixed(0)) : null,
        cadence: cadenceData[i] || null,
        grade: gradeData[i] ? parseFloat(gradeData[i].toFixed(1)) : null,
        // Pour le pace (running)
        pace: velocityData[i] && velocityData[i] > 0 
          ? parseFloat((1000 / velocityData[i] / 60).toFixed(2)) 
          : null,
      });
    }
    
    return data;
  }, [streams]);

  const hasVelocity = chartData.some(d => d.speed !== null);
  const hasHeartrate = chartData.some(d => d.heartrate !== null);
  const hasAltitude = chartData.some(d => d.altitude !== null);
  const hasCadence = chartData.some(d => d.cadence !== null);
  
  const isRunning = ['Run', 'TrailRun', 'Walk', 'Hike'].includes(sportType);
  const isCycling = ['Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'VirtualRide'].includes(sportType);

  if (!streams || chartData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Pas de données détaillées disponibles</p>
        <p className="text-xs mt-1">Les streams n'ont pas été synchronisés pour cette activité</p>
      </div>
    );
  }

  const chartHeight = compact ? 150 : 200;

  return (
    <div className="space-y-4">
      {/* Graphique Vitesse / Allure */}
      {hasVelocity && (
        <ChartCard 
          title={isRunning ? "Allure" : "Vitesse"} 
          icon={<Zap className="w-4 h-4" />}
          color="text-blue-400"
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="distance" 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => isRunning ? formatPace(v / 3.6) : `${v}`}
              />
              <Tooltip 
                content={
                  <CustomTooltip 
                    unit={isRunning ? '/km' : 'km/h'} 
                    formatter={(v: number) => isRunning ? formatPace(v / 3.6) : v.toFixed(1)}
                  />
                } 
              />
              <Area
                type="monotone"
                dataKey="speed"
                stroke="#3b82f6"
                fill="url(#speedGradient)"
                strokeWidth={2}
                name={isRunning ? "Allure" : "Vitesse"}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Graphique Fréquence Cardiaque */}
      {hasHeartrate && (
        <ChartCard 
          title="Fréquence cardiaque" 
          icon={<Heart className="w-4 h-4" />}
          color="text-red-400"
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="distance" 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip content={<CustomTooltip unit="bpm" />} />
              <Area
                type="monotone"
                dataKey="heartrate"
                stroke="#ef4444"
                fill="url(#hrGradient)"
                strokeWidth={2}
                name="FC"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Graphique Altitude */}
      {hasAltitude && (
        <ChartCard 
          title="Altitude" 
          icon={<Mountain className="w-4 h-4" />}
          color="text-emerald-400"
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="distance" 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                domain={['dataMin - 20', 'dataMax + 20']}
              />
              <Tooltip content={<CustomTooltip unit="m" />} />
              <Area
                type="monotone"
                dataKey="altitude"
                stroke="#10b981"
                fill="url(#altGradient)"
                strokeWidth={2}
                name="Altitude"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Graphique combiné FC + Altitude (compact mode) */}
      {compact && hasHeartrate && hasAltitude && (
        <ChartCard 
          title="FC & Altitude" 
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-purple-400"
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="distance" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#ef4444" tick={{ fill: '#ef4444', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fill: '#10b981', fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="heartrate" stroke="#ef4444" dot={false} name="FC (bpm)" />
              <Area yAxisId="right" type="monotone" dataKey="altitude" fill="#10b98133" stroke="#10b981" dot={false} name="Altitude (m)" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Liste des segments */}
      {segments && segments.length > 0 && (
        <ChartCard 
          title={`Segments (${segments.length})`} 
          icon={<Activity className="w-4 h-4" />}
          color="text-orange-400"
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {segments.map((effort) => (
              <div 
                key={effort.id}
                className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm truncate">
                      {effort.segment.name}
                    </span>
                    {effort.segment.climb_category > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs rounded font-bold text-white ${getClimbCategoryColor(effort.segment.climb_category)}`}>
                        {getClimbCategoryLabel(effort.segment.climb_category)}
                      </span>
                    )}
                    {effort.pr_rank === 1 && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500 text-yellow-900 font-bold">
                        PR 🏆
                      </span>
                    )}
                    {effort.pr_rank === 2 && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-slate-400 text-slate-900 font-bold">
                        2nd
                      </span>
                    )}
                    {effort.pr_rank === 3 && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-orange-700 text-orange-100 font-bold">
                        3rd
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{(effort.distance / 1000).toFixed(2)} km</span>
                    {effort.segment.average_grade !== 0 && (
                      <span className={effort.segment.average_grade > 0 ? 'text-red-400' : 'text-green-400'}>
                        {effort.segment.average_grade > 0 ? '↑' : '↓'} {Math.abs(effort.segment.average_grade).toFixed(1)}%
                      </span>
                    )}
                    {effort.average_heartrate && (
                      <span className="text-red-400">
                        ♥ {Math.round(effort.average_heartrate)} bpm
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-white text-sm">
                    {formatDuration(effort.moving_time)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isRunning 
                      ? formatPace(effort.distance / effort.moving_time) + ' /km'
                      : formatSpeed(effort.distance / effort.moving_time) + ' km/h'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default StravaActivityCharts;

