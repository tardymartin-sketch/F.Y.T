// ============================================================
// F.Y.T - HEATMAP CALENDAR
// src/components/athlete/stats/HeatmapCalendar.tsx
// Calendrier avec blocs mensuels et RPE quotidien
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchDailyVolume } from '../../../services/supabaseService';
import { ChartTooltipOverlay, formatVolume as formatVolumeOverlay, getRpeColor as getRpeTextColorOverlay, formatRpeValue } from './ChartTooltipOverlay';

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

interface MonthData {
  month: number;
  name: string;
  weeks: (Date | null)[][]; // Grille de semaines, null pour les cases vides
}

// ===========================================
// CONSTANTS
// ===========================================

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ===========================================
// HELPERS
// ===========================================

function getRpeColor(rpe: number | null, hasTraining: boolean): string {
  if (!hasTraining) return 'bg-slate-800';
  if (rpe === null) return 'bg-blue-600';

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

function getMonthsData(year: number): MonthData[] {
  const months: MonthData[] = [];

  for (let month = 0; month < 12; month++) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Jour de la semaine du 1er (0=dim, 1=lun, ..., 6=sam)
    // On veut lundi=0, donc on convertit
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Lundi = 0

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Remplir les cases vides avant le 1er du mois
    for (let i = 0; i < startDow; i++) {
      currentWeek.push(null);
    }

    // Remplir les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Remplir les cases vides après le dernier jour
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    months.push({
      month,
      name: MONTHS_FR_FULL[month],
      weeks,
    });
  }

  return months;
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

  const monthsData = useMemo(() => getMonthsData(year), [year]);

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

      setTooltipPosition({
        x: cellRect.left - containerRect.left + cellRect.width / 2,
        y: cellRect.top - containerRect.top - 8,
      });
      setSelectedDay(dayData);
    } else {
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
      <div
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 relative"
        ref={containerRef}
        onClick={() => {
          // Fermer l'overlay si on clique n'importe où dans le container
          if (selectedDay) {
            setSelectedDay(null);
            setTooltipPosition(null);
          }
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            Activités
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

        {/* Monthly blocks grid - 2 columns on mobile, 3 on larger screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {monthsData.map((monthData) => (
            <div key={monthData.month} className="bg-slate-900/50 rounded-lg p-2">
              {/* Month name */}
              <div className="text-xs font-medium text-slate-300 text-center mb-2">
                {monthData.name}
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS_FR.map((day, i) => (
                  <div
                    key={i}
                    className="text-[8px] text-slate-500 text-center"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks grid */}
              <div className="space-y-0.5">
                {monthData.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-0.5">
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${dayIndex}`}
                            className="aspect-square rounded-sm bg-transparent"
                          />
                        );
                      }

                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const dayData = volumeData.get(dateStr);
                      const hasTraining = dayData && dayData.sessionCount > 0;
                      const dayNumber = date.getDate();
                      const isSelected = selectedDay?.date === dateStr;

                      return (
                        <div
                          key={dateStr}
                          className={`aspect-square rounded-sm ${getRpeColor(dayData?.avgRpe ?? null, !!hasTraining)} cursor-pointer transition-all flex items-center justify-center ${
                            isSelected ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/30'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation(); // Empêcher la fermeture par le container
                            handleDayClick(
                              dayData || { date: dateStr, volume: 0, sessionCount: 0, avgRpe: null },
                              e
                            );
                          }}
                        >
                          <span className={`text-[7px] font-medium ${getRpeTextColor(dayData?.avgRpe ?? null, !!hasTraining)}`}>
                            {dayNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overlay Tooltip */}
        {selectedDay && selectedDay.sessionCount > 0 && tooltipPosition && (
          <ChartTooltipOverlay
            data={{
              date: selectedDay.date,
              label: `${selectedDay.sessionCount} séance${selectedDay.sessionCount > 1 ? 's' : ''}`,
              primaryValue: formatVolumeOverlay(selectedDay.volume),
              primaryColor: 'text-blue-400',
              secondaryLabel: 'RPE:',
              secondaryValue: formatRpeValue(selectedDay.avgRpe),
              secondaryColor: getRpeTextColorOverlay(selectedDay.avgRpe),
            }}
            position={{
              x: tooltipPosition.x,
              y: tooltipPosition.y,
              containerWidth: containerRef.current?.offsetWidth,
              containerHeight: containerRef.current?.offsetHeight,
            }}
            onViewDate={onViewDate}
          />
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
