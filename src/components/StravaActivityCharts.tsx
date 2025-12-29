import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Activity, Heart, Mountain, Zap, TrendingUp, Clock } from 'lucide-react';

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
}

interface StravaActivityChartsProps {
  streams: StreamData | null;
  segments?: StravaSegmentEffort[];
  sportType: string;
  compact?: boolean;
}

export const StravaActivityCharts: React.FC<StravaActivityChartsProps> = ({
  streams,
  segments,
  sportType,
  compact = false
}) => {
  const chartData = useMemo(() => {
    if (!streams?.time?.data) return [];

    const timeData = streams.time.data;
    const step = compact ? Math.max(1, Math.floor(timeData.length / 100)) : 1;
    
    return timeData
      .filter((_, i) => i % step === 0)
      .map((time, i) => ({
        time: Math.round(time / 60),
        distance: streams.distance?.data[i * step] ? Math.round(streams.distance.data[i * step] / 100) / 10 : null,
        heartrate: streams.heartrate?.data[i * step] || null,
        altitude: streams.altitude?.data[i * step] ? Math.round(streams.altitude.data[i * step]) : null,
        speed: streams.velocity_smooth?.data[i * step] ? Math.round(streams.velocity_smooth.data[i * step] * 3.6 * 10) / 10 : null,
        cadence: streams.cadence?.data[i * step] || null,
        watts: streams.watts?.data[i * step] || null,
        grade: streams.grade_smooth?.data[i * step] ? Math.round(streams.grade_smooth.data[i * step] * 10) / 10 : null,
      }));
  }, [streams, compact]);

  const hasHeartrate = streams?.heartrate?.data && streams.heartrate.data.length > 0;
  const hasAltitude = streams?.altitude?.data && streams.altitude.data.length > 0;
  const hasSpeed = streams?.velocity_smooth?.data && streams.velocity_smooth.data.length > 0;
  const hasPower = streams?.watts?.data && streams.watts.data.length > 0;

  if (chartData.length === 0) {
    return (
      <div className="h-32 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-500 text-sm">
        <Activity className="w-5 h-5 mr-2 opacity-50" />
        Pas de données disponibles
      </div>
    );
  }

  const chartHeight = compact ? 150 : 200;

  return (
    <div className={`space-y-${compact ? '3' : '4'}`}>
      {/* Heart Rate Chart */}
      {hasHeartrate && (
        <div className="bg-slate-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white">Fréquence cardiaque</span>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}min`} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(v) => `${v} min`}
                formatter={(value: number) => [`${value} bpm`, 'FC']}
              />
              <Area type="monotone" dataKey="heartrate" stroke="#ef4444" fill="url(#hrGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Altitude Chart */}
      {hasAltitude && (
        <div className="bg-slate-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Mountain className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">Altitude</span>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}min`} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(v) => `${v} min`}
                formatter={(value: number) => [`${value} m`, 'Altitude']}
              />
              <Area type="monotone" dataKey="altitude" stroke="#10b981" fill="url(#altGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Speed Chart */}
      {hasSpeed && (
        <div className="bg-slate-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Vitesse</span>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}min`} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(v) => `${v} min`}
                formatter={(value: number) => [`${value} km/h`, 'Vitesse']}
              />
              <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Power Chart */}
      {hasPower && (
        <div className="bg-slate-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Puissance</span>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}min`} />
              <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(v) => `${v} min`}
                formatter={(value: number) => [`${value} W`, 'Puissance']}
              />
              <Line type="monotone" dataKey="watts" stroke="#eab308" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Segments */}
      {segments && segments.length > 0 && !compact && (
        <div className="bg-slate-800/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-white">Segments ({segments.length})</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {segments.map((seg) => (
              <div key={seg.id} className="bg-slate-900/50 rounded-lg p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate">{seg.segment.name}</span>
                  {seg.pr_rank && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      seg.pr_rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                      seg.pr_rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                      seg.pr_rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      PR #{seg.pr_rank}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-xs text-slate-400 mt-1">
                  <span>{(seg.distance / 1000).toFixed(2)} km</span>
                  <span>{Math.floor(seg.moving_time / 60)}:{(seg.moving_time % 60).toString().padStart(2, '0')}</span>
                  <span>{seg.segment.average_grade.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StravaActivityCharts;
