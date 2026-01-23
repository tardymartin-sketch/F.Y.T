// ============================================================
// F.Y.T - STATS PAGE
// src/components/athlete/StatsPage.tsx
// Page dédiée aux statistiques de l'athlète
// ============================================================

import React, { useState } from 'react';
import { Trophy, TrendingUp, Calendar, Activity, Target, BarChart3 } from 'lucide-react';
import { PersonalRecordsList } from './stats/PersonalRecordsList';
import { OneRMProgressChart } from './stats/OneRMProgressChart';
import { CategoryRadarChart } from './stats/CategoryRadarChart';
import { HeatmapCalendar } from './stats/HeatmapCalendar';
import { RPETrendChart } from './stats/RPETrendChart';
import { VolumeTrendChart } from './stats/VolumeTrendChart';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  onViewSession?: (sessionLogId: string, exerciseName: string) => void;
  onViewDate?: (date: string) => void;
}

type StatsSection = 'prs' | '1rm' | 'distribution' | 'heatmap' | 'trends';
type TrendPeriod = 6 | 12 | 52 | 0; // 0 = all time

const TREND_PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: 6, label: '6 sem.' },
  { value: 12, label: '12 sem.' },
  { value: 52, label: '1 an' },
  { value: 0, label: 'Tout' },
];

// ===========================================
// COMPONENT
// ===========================================

export const StatsPage: React.FC<Props> = ({ userId, onViewSession, onViewDate }) => {
  const [activeSection, setActiveSection] = useState<StatsSection>('prs');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(12);

  const sections: { id: StatsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'prs', label: 'Records', icon: <Trophy className="w-4 h-4" /> },
    { id: '1rm', label: '1RM', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'distribution', label: 'Ratio', icon: <Target className="w-4 h-4" /> },
    { id: 'heatmap', label: 'Activité', icon: <Calendar className="w-4 h-4" /> },
    { id: 'trends', label: 'Tendances', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-full bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Statistiques</h1>
            <p className="text-sm text-slate-400">Analyse de tes performances</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all
                ${activeSection === section.id
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeSection === 'prs' && (
          <PersonalRecordsList userId={userId} onViewSession={onViewSession} />
        )}

        {activeSection === '1rm' && (
          <OneRMProgressChart userId={userId} onViewDate={onViewDate} />
        )}

        {activeSection === 'distribution' && (
          <CategoryRadarChart userId={userId} />
        )}

        {activeSection === 'heatmap' && (
          <HeatmapCalendar userId={userId} onViewDate={onViewDate} />
        )}

        {activeSection === 'trends' && (
          <div className="space-y-6">
            {/* Period Filter */}
            <div className="flex gap-2">
              {TREND_PERIODS.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTrendPeriod(period.value)}
                  className={`
                    flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                    ${trendPeriod === period.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  {period.label}
                </button>
              ))}
            </div>

            <RPETrendChart userId={userId} weeksBack={trendPeriod} onViewDate={onViewDate} />
            <VolumeTrendChart userId={userId} weeksBack={trendPeriod} onViewDate={onViewDate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPage;
