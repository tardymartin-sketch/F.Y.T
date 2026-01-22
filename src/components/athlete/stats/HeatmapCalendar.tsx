// ============================================================
// F.Y.T - HEATMAP CALENDAR
// src/components/athlete/stats/HeatmapCalendar.tsx
// Calendrier type GitHub avec RPE quotidien (vue verticale)
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { fetchDailyVolume } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  onViewDate?: (date: string) => void;
}

interface DayData {
  date: string;
  volume: number;
  sessionCount: number;
  avgRpe: number | null;
}

interface TooltipPosition {
  x: number;
  y: number;
}

// ===========================================
// CONSTANTS
// ===========================================

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// ===========================================
// HELPERS
// ===========================================

function getRpeColor(rpe: number | null, hasTraining: boolean): string {
  if (!hasTraining) return 'bg-slate-800';
  if (rpe === null) return 'bg-blue-600'; // Entraînement sans RPE = bleu

  // Gradient basé sur RPE (1-10)
  if (rpe <= 4) return 'bg-green-500';
  if (rpe <= 6) return 'bg-yellow-500';
  if (rpe <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRpeTextColor(rpe: number | null, hasTraining: boolean): string {
  if (!hasTraining) return 'text-slate-600';
  if (rpe === null) return 'text-blue-200';
  if (rpe <= 4) return 'text-green-900';
  if (rpe <= 6) return 'text-yellow-900';
  if (rpe <= 8) return 'text-orange-900';
  return 'text-red-100';
}

function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}t`;
  }
  return `${Math.round(value)} kg`;
}

function getWeeksInYear(year: number): { week: Date[]; monthLabel?: string }[] {
  const weeks: { week: Date[]; monthLabel?: string }[] = [];
  const startDate = new Date(year, 0, 1);

  // Trouver le premier lundi de l'année
  const dayOfWeek = startDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  startDate.setDate(startDate.getDate() + daysToMonday);

  // Si on a reculé en décembre de l'année précédente, avancer d'une semaine
  if (startDate.getFullYear() < year) {
    startDate.setDate(startDate.getDate() + 7);
  }

  // Générer les semaines
  const currentDate = new Date(startDate);
  let lastMonth = -1;

  for (let weekNum = 0; weekNum < 53; weekNum++) {
    const weekDays: Date[] = [];
    let monthLabel: string | undefined;

    for (let day = 0; day < 7; day++) {
      const date = new Date(currentDate);
      if (date.getFullYear() === year) {
        weekDays.push(date);

        // Détecter le changement de mois (sur le premier jour de la semaine dans le nouveau mois)
        const currentMonth = date.getMonth();
        if (currentMonth !== lastMonth && day <= 3) {
          monthLabel = MONTHS_FR[currentMonth];
          lastMonth = currentMonth;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (weekDays.length > 0) {
      weeks.push({ week: weekDays, monthLabel });
    }
  }

  return weeks;
}

// ===========================================
// COMPONENT
// ===========================================

export const HeatmapCalendar: React.FC<Props> = ({ userId, onViewDate }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [volumeData, setVolumeData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchDailyVolume(userId, year);

        const dataMap = new Map<string, DayData>();
        data.forEach((d) => {
          dataMap.set(d.date, {
            date: d.date,
            volume: d.totalVolume,
            sessionCount: d.sessionCount,
            avgRpe: d.avgRpe,
          });
        });

        setVolumeData(dataMap);
        // Reset selected day when year changes
        setSelectedDay(null);
        setTooltipPosition(null);
      } catch (err) {
        console.error('Error loading heatmap data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, year]);

  const weeksData = useMemo(() => getWeeksInYear(year), [year]);

  const totalVolume = useMemo(() => {
    let total = 0;
    volumeData.forEach((d) => {
      total += d.volume;
    });
    return total;
  }, [volumeData]);

  const totalSessions = useMemo(() => {
    let total = 0;
    volumeData.forEach((d) => {
      total += d.sessionCount;
    });
    return total;
  }, [volumeData]);

  const handleDayClick = (
    dayData: DayData,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (dayData.sessionCount > 0 && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const cellRect = event.currentTarget.getBoundingClientRect();

      // Position relative au container
      setTooltipPosition({
        x: cellRect.left - containerRect.left + cellRect.width / 2,
        y: cellRect.top - containerRect.top - 8,
      });
      setSelectedDay(dayData);
    } else {
      // Jour sans séance → fermer l'overlay
      setSelectedDay(null);
      setTooltipPosition(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with year navigation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 relative" ref={containerRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            Activité {year}
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(year - 1)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <span className="text-white font-medium w-16 text-center">{year}</span>
            <button
              onClick={() => setYear(year + 1)}
              disabled={year >= new Date().getFullYear()}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Heatmap container - offset so Thursday is centered */}
        {/* Month label = 2rem, so we add 1rem padding on right to compensate */}
        <div className="pr-4">
          {/* Day labels (X-axis) */}
          <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5 mb-1">
            <div /> {/* Spacer for month label */}
            {DAYS_FR.map((day, i) => (
              <div
                key={i}
                className="text-[9px] text-slate-500 text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap Grid (vertical layout) */}
          <div className="space-y-0.5">
            {weeksData.map(({ week, monthLabel }, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-[2rem_repeat(7,1fr)] gap-0.5">
                {/* Month label */}
                <div className="text-[9px] text-slate-500 text-right pr-1 flex items-center justify-end">
                  {monthLabel || ''}
                </div>

                {/* Week days */}
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const date = week.find((d) => {
                    const dow = d.getDay();
                    // Convertir dimanche (0) en 6, et lundi (1) en 0
                    const mondayBasedDow = dow === 0 ? 6 : dow - 1;
                    return mondayBasedDow === dayIndex;
                  });

                  if (!date) {
                    return (
                      <div
                        key={dayIndex}
                        className="h-5 rounded-sm bg-transparent"
                      />
                    );
                  }

                  const dateStr = date.toISOString().split('T')[0];
                  const dayData = volumeData.get(dateStr);
                  const hasTraining = dayData && dayData.sessionCount > 0;
                  const dayNumber = date.getDate();
                  const isSelected = selectedDay?.date === dateStr;

                  return (
                    <div
                      key={dateStr}
                      className={`h-5 rounded-sm ${getRpeColor(dayData?.avgRpe ?? null, !!hasTraining)} cursor-pointer transition-all flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white' : 'hover:ring-2 hover:ring-white/30'
                      }`}
                      onClick={(e) =>
                        handleDayClick(
                          dayData || { date: dateStr, volume: 0, sessionCount: 0, avgRpe: null },
                          e
                        )
                      }
                    >
                      <span className={`text-[8px] font-medium ${getRpeTextColor(dayData?.avgRpe ?? null, !!hasTraining)}`}>
                        {dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Overlay Tooltip */}
        {selectedDay && selectedDay.sessionCount > 0 && tooltipPosition && (
          <div
            className="absolute z-50 bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)',
              minWidth: '180px',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(selectedDay.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="text-white font-medium text-sm">
                  {formatVolume(selectedDay.volume)}
                </div>
                <div className="text-slate-300 text-xs">
                  {selectedDay.sessionCount} séance{selectedDay.sessionCount > 1 ? 's' : ''}
                </div>
                {selectedDay.avgRpe !== null && (
                  <div className="text-xs mt-1">
                    <span className="text-slate-400">RPE:</span>{' '}
                    <span className={`font-medium ${
                      selectedDay.avgRpe <= 4 ? 'text-green-400' :
                      selectedDay.avgRpe <= 6 ? 'text-yellow-400' :
                      selectedDay.avgRpe <= 8 ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {selectedDay.avgRpe}
                    </span>
                  </div>
                )}
                {selectedDay.avgRpe === null && (
                  <div className="text-xs mt-1 text-blue-400">
                    RPE non renseigné
                  </div>
                )}
              </div>
              {onViewDate && (
                <button
                  onClick={() => onViewDate(selectedDay.date)}
                  className="p-1.5 bg-purple-500/20 hover:bg-purple-500/40 rounded-lg transition-colors"
                  title="Voir dans l'historique"
                >
                  <Eye className="w-4 h-4 text-purple-400" />
                </button>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
              <div className="border-8 border-transparent border-t-slate-900" />
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-1 text-[10px]">
            <div className="w-3 h-3 rounded-sm bg-slate-800" />
            <span className="text-slate-500">Repos</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <div className="w-3 h-3 rounded-sm bg-blue-600" />
            <span className="text-slate-500">Sans RPE</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <div className="w-3 h-3 rounded-sm bg-yellow-500" />
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <div className="w-3 h-3 rounded-sm bg-red-500" />
          </div>
          <span className="text-slate-500 text-[10px]">RPE ↑</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{totalSessions}</div>
          <div className="text-slate-400 text-sm">Séances</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{formatVolume(totalVolume)}</div>
          <div className="text-slate-400 text-sm">Volume total</div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
