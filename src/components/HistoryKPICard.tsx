// ============================================================
// F.Y.T - HISTORY KPI CARD (ATH-003)
// src/components/HistoryKPICard.tsx
// Encart stats agrandissable en haut de l'historique
// ============================================================

import React, { useMemo } from 'react';
import { SessionLog, getRpeColor } from '../../types';
import { useExpandedState } from '../hooks/useUIState';
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  history: SessionLog[];
  className?: string;
}

interface MonthStats {
  sessions: number;
  totalMinutes: number;
  avgRpe: number | null;
  uniqueExercises: number;
  bestWeek: {
    count: number;
    weekNumber: string;
  } | null;
}

interface Comparison {
  sessions: number;
  minutes: number;
  rpe: number | null;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getMonthName(monthIndex: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[monthIndex];
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

function formatDurationDiff(minutes: number): string {
  if (minutes === 0) return '—';
  const sign = minutes > 0 ? '+' : '';
  if (Math.abs(minutes) < 60) return `${sign}${minutes}min`;
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  if (mins === 0) return `${sign}${minutes > 0 ? '' : '-'}${hours}h`;
  return `${sign}${minutes > 0 ? '' : '-'}${hours}h${mins.toString().padStart(2, '0')}`;
}

// ===========================================
// STATS COMPUTATION
// ===========================================

function computeMonthStats(history: SessionLog[], year: number, month: number): MonthStats {
  const monthSessions = history.filter(log => {
    const d = new Date(log.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Sessions count
  const sessions = monthSessions.length;

  // Total time
  const totalMinutes = monthSessions.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);

  // Average RPE
  const sessionsWithRpe = monthSessions.filter(log => log.sessionRpe !== undefined && log.sessionRpe !== null);
  const avgRpe = sessionsWithRpe.length > 0
    ? Math.round((sessionsWithRpe.reduce((acc, log) => acc + (log.sessionRpe || 0), 0) / sessionsWithRpe.length) * 10) / 10
    : null;

  // Unique exercises
  const exerciseNames = new Set<string>();
  monthSessions.forEach(log => {
    log.exercises.forEach(ex => {
      exerciseNames.add(ex.exerciseName.toLowerCase().trim());
    });
  });
  const uniqueExercises = exerciseNames.size;

  // Best week (most sessions in a single week)
  const weekCounts: Record<string, number> = {};
  monthSessions.forEach(log => {
    const d = new Date(log.date);
    const weekNum = getWeekNumber(d);
    const key = `S${weekNum}`;
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });

  let bestWeek: { count: number; weekNumber: string } | null = null;
  Object.entries(weekCounts).forEach(([weekNumber, count]) => {
    if (!bestWeek || count > bestWeek.count) {
      bestWeek = { count, weekNumber };
    }
  });

  return {
    sessions,
    totalMinutes,
    avgRpe,
    uniqueExercises,
    bestWeek
  };
}

function computeComparison(current: MonthStats, previous: MonthStats): Comparison {
  return {
    sessions: current.sessions - previous.sessions,
    minutes: current.totalMinutes - previous.totalMinutes,
    rpe: current.avgRpe !== null && previous.avgRpe !== null
      ? Math.round((current.avgRpe - previous.avgRpe) * 10) / 10
      : null
  };
}

// ===========================================
// TREND ICON COMPONENT
// ===========================================

interface TrendIconProps {
  value: number | null;
  inverted?: boolean; // For RPE, lower is better
}

const TrendIcon: React.FC<TrendIconProps> = ({ value, inverted = false }) => {
  if (value === null || value === 0) {
    return <Minus className="w-4 h-4 text-slate-400" />;
  }

  const isPositive = inverted ? value < 0 : value > 0;

  if (isPositive) {
    return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  }
  return <TrendingDown className="w-4 h-4 text-red-400" />;
};

// ===========================================
// COMPONENT
// ===========================================

export const HistoryKPICard: React.FC<Props> = ({ history, className = '' }) => {
  // V3: Persistance de l'état expanded via localStorage
  const [isExpanded, toggleExpanded] = useExpandedState('history-kpi-expanded', false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Compute stats
  const currentStats = useMemo(
    () => computeMonthStats(history, currentYear, currentMonth),
    [history, currentYear, currentMonth]
  );

  const previousStats = useMemo(
    () => computeMonthStats(history, previousYear, previousMonth),
    [history, previousYear, previousMonth]
  );

  const comparison = useMemo(
    () => computeComparison(currentStats, previousStats),
    [currentStats, previousStats]
  );

  const previousMonthName = getMonthName(previousMonth).toLowerCase().slice(0, 3);

  // Toggle handler
  const handleToggle = () => {
    toggleExpanded();
  };

  return (
    <div
      className={`
        bg-gradient-to-br from-slate-900 to-slate-800
        border border-slate-700/50 rounded-2xl
        overflow-hidden transition-all duration-300 ease-out
        ${className}
      `}
    >
      {/* Collapsed Header (always visible) */}
      <button
        onClick={handleToggle}
        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls="history-kpi-expanded"
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">Ce mois-ci</span>
          </div>
          <div className="text-slate-400">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Stats grid - 3 columns */}
        <div className="grid grid-cols-3 gap-3">
          {/* Sessions */}
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{currentStats.sessions}</p>
            <p className="text-xs text-slate-400 mt-0.5">séances</p>
          </div>

          {/* Duration */}
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatDuration(currentStats.totalMinutes)}</p>
            <p className="text-xs text-slate-400 mt-0.5">temps total</p>
          </div>

          {/* RPE */}
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            {currentStats.avgRpe !== null ? (
              <>
                <p className={`text-2xl font-bold ${getRpeColor(Math.round(currentStats.avgRpe))}`}>
                  {currentStats.avgRpe}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">RPE moy.</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-500">—</p>
                <p className="text-xs text-slate-400 mt-0.5">RPE moy.</p>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        id="history-kpi-expanded"
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          {/* Title */}
          <div className="pt-3 pb-1">
            <h3 className="text-lg font-semibold text-white">
              Statistiques {getMonthName(currentMonth)}
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="space-y-2">
            {/* Sessions */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2 text-slate-300">
                <Dumbbell className="w-4 h-4 text-slate-500" />
                <span>Séances</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{currentStats.sessions}</span>
                {comparison.sessions !== 0 && (
                  <span className={`text-sm ${comparison.sessions > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({comparison.sessions > 0 ? '+' : ''}{comparison.sessions} vs {previousMonthName})
                  </span>
                )}
              </div>
            </div>

            {/* Total Time */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Temps total</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{formatDuration(currentStats.totalMinutes)}</span>
                {comparison.minutes !== 0 && (
                  <span className={`text-sm ${comparison.minutes > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ({formatDurationDiff(comparison.minutes)})
                  </span>
                )}
              </div>
            </div>

            {/* Average RPE */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-slate-500">RPE</span>
                <span>RPE moyen</span>
              </div>
              <div className="flex items-center gap-2">
                {currentStats.avgRpe !== null ? (
                  <>
                    <span className={`font-semibold ${getRpeColor(Math.round(currentStats.avgRpe))}`}>
                      {currentStats.avgRpe}
                    </span>
                    {comparison.rpe !== null && (
                      <div className="flex items-center gap-1">
                        <TrendIcon value={comparison.rpe} inverted />
                        {comparison.rpe !== 0 && (
                          <span className={`text-sm ${comparison.rpe < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {comparison.rpe > 0 ? '+' : ''}{comparison.rpe}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>

            {/* Unique Exercises */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2 text-slate-300">
                <Dumbbell className="w-4 h-4 text-slate-500" />
                <span>Exercices</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{currentStats.uniqueExercises}</span>
                <span className="text-sm text-slate-400">uniques</span>
              </div>
            </div>
          </div>

          {/* Record Section */}
          {currentStats.bestWeek && currentStats.bestWeek.count >= 2 && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div className="text-sm">
                  <span className="text-amber-200/80">Record ce mois: </span>
                  <span className="text-white font-medium">
                    {currentStats.bestWeek.count} séances en 1 semaine ({currentStats.bestWeek.weekNumber})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryKPICard;
