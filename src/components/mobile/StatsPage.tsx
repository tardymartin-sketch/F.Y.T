// ============================================================
// F.Y.T - STATS PAGE
// src/components/mobile/StatsPage.tsx
// Page dédiée aux statistiques
// ============================================================

import React, { useState } from 'react';
import { Trophy, TrendingUp, Calendar, Activity, Target, BarChart3 } from 'lucide-react';
import { PersonalRecordsList } from '../common/stats/PersonalRecordsList';
import { OneRMProgressChart } from '../common/stats/OneRMProgressChart';
import { CategoryRadarChart } from '../common/stats/CategoryRadarChart';
import { HeatmapCalendar } from '../common/stats/HeatmapCalendar';
import { RPETrendChart } from '../common/stats/RPETrendChart';
import { VolumeTrendChart } from '../common/stats/VolumeTrendChart';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  onViewSession?: (sessionLogId: string, exerciseName: string) => void;
  onViewDate?: (date: string) => void;
  // Desktop adaptation - default preserves mobile behavior
  layout?: 'mobile' | 'desktop';
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

export const StatsPage: React.FC<Props> = ({
  userId,
  onViewSession,
  onViewDate,
  layout = 'mobile' // Desktop adaptation - default preserves mobile behavior
}) => {
  // Layout helpers
  const isDesktop = layout === 'desktop';
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
    <div className="min-h-full bg-theme pb-24">
      {/* Header */}
      <div className={`${isDesktop ? 'sticky top-0 z-10' : ''} bg-theme/95 backdrop-blur-sm ${isDesktop ? 'border-b border-theme' : ''} px-4 ${isDesktop ? 'py-4' : 'pt-2 pb-3'}`}>
        {/* Titre + icône : affiché uniquement en desktop (en mobile, géré par le header global App.tsx) */}
        {isDesktop && (
          <div className="flex items-center gap-3 mb-4 pl-12">
            <BarChart3 className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-theme">Statistiques</h1>
              <p className="text-sm text-theme-muted">Analyse de tes performances</p>
            </div>
          </div>
        )}

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
                  : 'bg-theme-tertiary text-theme-muted hover:bg-theme-secondary hover:text-theme'
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
          <PersonalRecordsList userId={userId} onViewSession={onViewSession} layout={layout} />
        )}

        {activeSection === '1rm' && (
          <OneRMProgressChart userId={userId} onViewDate={onViewDate} layout={layout} />
        )}

        {activeSection === 'distribution' && (
          <CategoryRadarChart userId={userId} />
        )}

        {activeSection === 'heatmap' && (
          <HeatmapCalendar userId={userId} onViewDate={onViewDate} layout={layout} />
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
                      : 'bg-theme-tertiary text-theme-muted hover:bg-theme-secondary hover:text-theme'
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
