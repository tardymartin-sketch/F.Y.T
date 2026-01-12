// ============================================================
// F.Y.T - ENCOURAGEMENT KPI (ATH-001)
// src/components/EncouragementKPI.tsx
// KPI encouragement dynamique basé sur stats douces
// ============================================================

import React, { useMemo } from 'react';
import { SessionLog } from '../../types';
import {
  Flame,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  history: SessionLog[];
  hasSessionToday?: boolean;
  className?: string;
}

interface KPIState {
  type:
    | 'session_today'
    | 'first_session'
    | 'second_session'
    | 'multiple_sessions'
    | 'near_milestone'
    | 'near_record'
    | 'record_equal'
    | 'new_record'
    | 'fallback';
  message: string;
  emoji: string;
  icon: React.ElementType;
  progress: number;
  target: number;
  subtext?: string;
  variant: 'success' | 'warning' | 'info' | 'default';
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// ===========================================
// KPI LOGIC
// ===========================================

function computeKPIState(history: SessionLog[], hasSessionToday: boolean): KPIState {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);

  // Sessions cette semaine
  const sessionsThisWeek = history.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= weekStart && logDate <= weekEnd;
  });

  // Sessions ce mois
  const sessionsThisMonth = history.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= monthStart && logDate <= monthEnd;
  });

  // Séance aujourd'hui
  const sessionToday = hasSessionToday || sessionsThisWeek.some(log => isToday(new Date(log.date)));

  // Calculer le record mensuel (tous les mois précédents)
  const monthlyRecord = computeMonthlyRecord(history, now);

  const weekCount = sessionsThisWeek.length;
  const monthCount = sessionsThisMonth.length;

  // PRIORITÉ 1: Séance aujourd'hui
  if (sessionToday) {
    return {
      type: 'session_today',
      message: 'Bravo pour cette séance !',
      emoji: '💪',
      icon: Sparkles,
      progress: weekCount,
      target: 5,
      subtext: `${weekCount} séance${weekCount > 1 ? 's' : ''} cette semaine`,
      variant: 'success',
    };
  }

  // PRIORITÉ 2: Séances cette semaine (1, 2, 3+)
  if (weekCount === 1) {
    return {
      type: 'first_session',
      message: "Première séance de la semaine, c'est parti !",
      emoji: '🚀',
      icon: Zap,
      progress: 1,
      target: 5,
      subtext: 'Continue comme ça !',
      variant: 'info',
    };
  }

  if (weekCount === 2) {
    return {
      type: 'second_session',
      message: 'Deuxième entraînement de la semaine, bravo !',
      emoji: '✨',
      icon: Star,
      progress: 2,
      target: 5,
      subtext: 'Tu es sur la bonne voie',
      variant: 'info',
    };
  }

  if (weekCount >= 3) {
    return {
      type: 'multiple_sessions',
      message: `Déjà ${weekCount} séances cette semaine, tu assures !`,
      emoji: '🔥',
      icon: Flame,
      progress: weekCount,
      target: 5,
      subtext: 'Impressionnant !',
      variant: 'success',
    };
  }

  // PRIORITÉ 3: Proche palier mensuel (8-9 → 10, 14-15 → 15)
  const milestones = [10, 15, 20, 25, 30];
  for (const milestone of milestones) {
    if (monthCount >= milestone - 2 && monthCount < milestone) {
      return {
        type: 'near_milestone',
        message: `Bientôt ${milestone} entraînements ce mois-ci !`,
        emoji: '📈',
        icon: TrendingUp,
        progress: monthCount,
        target: milestone,
        subtext: `Plus que ${milestone - monthCount} séance${milestone - monthCount > 1 ? 's' : ''}`,
        variant: 'warning',
      };
    }
  }

  // PRIORITÉ 4: Proche record mensuel (record - 2)
  if (monthlyRecord > 0 && monthCount >= monthlyRecord - 2 && monthCount < monthlyRecord) {
    return {
      type: 'near_record',
      message: 'Le record mensuel approche !',
      emoji: '🔥',
      icon: Flame,
      progress: monthCount,
      target: monthlyRecord,
      subtext: `Plus que ${monthlyRecord - monthCount} pour égaler ton record`,
      variant: 'warning',
    };
  }

  // PRIORITÉ 5: Record égalé
  if (monthlyRecord > 0 && monthCount === monthlyRecord) {
    return {
      type: 'record_equal',
      message: 'Record mensuel égalé !',
      emoji: '🏆',
      icon: Trophy,
      progress: monthCount,
      target: monthlyRecord,
      subtext: 'Tu peux faire encore mieux !',
      variant: 'success',
    };
  }

  // PRIORITÉ 6: Nouveau record
  if (monthlyRecord > 0 && monthCount > monthlyRecord) {
    return {
      type: 'new_record',
      message: 'Nouveau record mensuel !',
      emoji: '🎉',
      icon: Trophy,
      progress: monthCount,
      target: monthlyRecord,
      subtext: `${monthCount} séances ce mois`,
      variant: 'success',
    };
  }

  // PRIORITÉ 7: Fallback
  return {
    type: 'fallback',
    message: 'Prêt pour ta prochaine séance ?',
    emoji: '🚀',
    icon: Target,
    progress: weekCount,
    target: 5,
    subtext: 'Lance-toi !',
    variant: 'default',
  };
}

function computeMonthlyRecord(history: SessionLog[], currentDate: Date): number {
  // Regrouper par mois et compter
  const monthCounts: Record<string, number> = {};
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  history.forEach(log => {
    const logDate = new Date(log.date);
    const monthKey = `${logDate.getFullYear()}-${logDate.getMonth()}`;

    // Exclure le mois courant
    if (monthKey !== currentMonthKey) {
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }
  });

  const counts = Object.values(monthCounts);
  return counts.length > 0 ? Math.max(...counts) : 0;
}

// ===========================================
// COMPONENT
// ===========================================

export const EncouragementKPI: React.FC<Props> = ({
  history,
  hasSessionToday = false,
  className = '',
}) => {
  const kpiState = useMemo(() => {
    return computeKPIState(history, hasSessionToday);
  }, [history, hasSessionToday]);

  const Icon = kpiState.icon;
  const progressPercent = Math.min((kpiState.progress / kpiState.target) * 100, 100);

  // Variantes de couleurs
  const variantStyles = {
    success: {
      bg: 'bg-gradient-to-r from-emerald-600/20 to-green-600/20',
      border: 'border-emerald-500/30',
      icon: 'bg-emerald-500/20 text-emerald-400',
      progress: 'from-emerald-500 to-green-500',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-600/20 to-orange-600/20',
      border: 'border-amber-500/30',
      icon: 'bg-amber-500/20 text-amber-400',
      progress: 'from-amber-500 to-orange-500',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20',
      border: 'border-blue-500/30',
      icon: 'bg-blue-500/20 text-blue-400',
      progress: 'from-blue-500 to-cyan-500',
    },
    default: {
      bg: 'bg-slate-800/50',
      border: 'border-slate-700/50',
      icon: 'bg-slate-700 text-slate-400',
      progress: 'from-slate-600 to-slate-500',
    },
  };

  const styles = variantStyles[kpiState.variant];

  return (
    <div
      className={`
        rounded-2xl p-4 border transition-all duration-300
        ${styles.bg} ${styles.border}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
          ${styles.icon}
        `}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message principal */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              {kpiState.message}
            </h3>
            <span className="text-xl">{kpiState.emoji}</span>
          </div>

          {/* Sous-texte */}
          {kpiState.subtext && (
            <p className="text-sm text-slate-400 mt-0.5">
              {kpiState.subtext}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{kpiState.progress}/{kpiState.target} cette semaine</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`
                  h-full bg-gradient-to-r ${styles.progress}
                  transition-all duration-500 ease-out rounded-full
                `}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncouragementKPI;
