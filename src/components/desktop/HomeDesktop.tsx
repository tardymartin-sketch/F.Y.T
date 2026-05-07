// ============================================================
// F.Y.T - HOME DESKTOP (V3 Desktop Adaptation)
// src/components/desktop/HomeDesktop.tsx
// Réutilise SessionBadgesGrid avec layout desktop
// Comportements critiques mobile préservés:
// - Détection séances complétées via historique semaine
// - Sélection multiple (jusqu'à 3 séances combinées)
// - Ordre de sélection affiché en badge
// ============================================================

import React, { useMemo, useState, useCallback } from 'react';
import { WorkoutRow, FilterState, User, SessionLog, WeekOrganizerLog } from '../../../types';
import { SessionBadgesGrid } from '../mobile/SessionBadgesGrid';
import { SessionPreview } from '../common/SessionPreview';
import {
  Play,
  Calendar,
  TrendingUp,
  Flame,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  MessageSquare,
  Timer,
  PlusCircle,
  Home as HomeIcon
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  data: WorkoutRow[];
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onStartSession: (exercises?: WorkoutRow[]) => void;
  user: User;
  history: SessionLog[];
  activeWeekOrganizers?: WeekOrganizerLog[];
  pastWeekOrganizers?: WeekOrganizerLog[];
  onNavigateToHistory?: () => void;
  // Session active indicators (comportement mobile)
  hasActiveSession?: boolean;
  onResumeSession?: () => void;
  // [DEAD CODE] hasAddSession?: boolean;
  // [DEAD CODE] onAddSession?: () => void;
}

interface WeekInfo {
  weekNumber: string;
  startDate?: string;
  endDate?: string;
  year: string;
  month: string;
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

function getCurrentProgramWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}


function calculateStreak(logs: SessionLog[]): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const logDate = new Date(sorted[i].date);
    logDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    const diffDays = Math.abs(Math.floor((logDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (diffDays <= 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ===========================================
// COMPONENT
// ===========================================

export const Home: React.FC<Props> = ({
  data,
  filters,
  setFilters,
  onStartSession,
  user,
  history,
  activeWeekOrganizers = [],
  pastWeekOrganizers = [],
  onNavigateToHistory,
  hasActiveSession,
  onResumeSession,
  // [DEAD CODE] hasAddSession,
  // [DEAD CODE] onAddSession
}) => {
  const [showPastOrganizers, setShowPastOrganizers] = useState(false);

  // State pour sélection multiple (comportement critique mobile)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);

  // ===========================================
  // COMPUTED: Week Info & Session Data
  // ===========================================

  const { weekInfo, sessionNames, sessionExercisesMap } = useMemo(() => {
    if (data.length === 0) {
      return { weekInfo: null, sessionNames: [], sessionExercisesMap: new Map() };
    }

    const now = new Date();

    // Trouver la semaine courante dans les données
    let targetWeekData = data.filter(d => {
      if (d.weekStartDate && d.weekEndDate) {
        const start = new Date(d.weekStartDate);
        const end = new Date(d.weekEndDate);
        return now >= start && now <= end;
      }
      return false;
    });

    // Fallback: prendre la semaine la plus proche
    if (targetWeekData.length === 0) {
      const availableWeeks = [...new Set(data.map(d => d.semaine))].sort(
        (a, b) => parseInt(a) - parseInt(b)
      );
      const currentWeekNumber = getCurrentProgramWeek();
      const targetWeek = availableWeeks.find(w => parseInt(w) >= currentWeekNumber % 52)
        || availableWeeks[availableWeeks.length - 1];

      targetWeekData = data.filter(d => d.semaine === targetWeek);
    }

    if (targetWeekData.length === 0) {
      return { weekInfo: null, sessionNames: [], sessionExercisesMap: new Map() };
    }

    const firstRow = targetWeekData[0];
    const info: WeekInfo = {
      weekNumber: firstRow.semaine,
      startDate: firstRow.weekStartDate,
      endDate: firstRow.weekEndDate,
      year: firstRow.annee,
      month: firstRow.moisNum,
    };

    // Grouper les exercices par séance
    const exercisesMap = new Map<string, WorkoutRow[]>();
    const sessionTypes = [...new Set(targetWeekData.map(d => d.seance))].sort();

    sessionTypes.forEach(sessionType => {
      const exercises = targetWeekData
        .filter(d => d.seance === sessionType)
        .sort((a, b) => a.ordre - b.ordre);
      exercisesMap.set(sessionType, exercises);
    });

    return {
      weekInfo: info,
      sessionNames: sessionTypes,
      sessionExercisesMap: exercisesMap,
    };
  }, [data]);

  // Order map pour SessionBadgesGrid (comportement critique mobile)
  const selectionOrder = useMemo(() => {
    const order = new Map<string, number>();
    selectedOrder.forEach((name, index) => {
      order.set(name, index + 1);
    });
    return order;
  }, [selectedOrder]);

  // Stats calculées
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeek = history.filter(h => {
      const d = new Date(h.date);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    });

    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      weekSessions: thisWeek.length,
      monthSessions: thisMonth.length,
      streak: calculateStreak(history),
    };
  }, [history]);

  // ===========================================
  // COMPUTED: Selected Session Data
  // ===========================================

  const currentSessionData = useMemo(() => {
    if (selectedSessions.size === 0) return [];

    const allExercises: WorkoutRow[] = [];

    // Respecter l'ordre de sélection (comportement critique mobile)
    selectedOrder.forEach(name => {
      const exercises = sessionExercisesMap.get(name);
      if (exercises) {
        allExercises.push(...exercises);
      }
    });

    return allExercises;
  }, [selectedSessions, selectedOrder, sessionExercisesMap]);

  const selectedStats = useMemo(() => {
    let totalExercises = 0;

    selectedOrder.forEach(name => {
      const exercises = sessionExercisesMap.get(name);
      if (exercises) {
        totalExercises += exercises.length;
      }
    });

    return { totalExercises };
  }, [selectedOrder, sessionExercisesMap]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const getDisplayName = () => {
    if (user.firstName) {
      return user.firstName;
    }
    if (user.username?.includes('.')) {
      const parts = user.username.split('.');
      const firstName = parts[parts.length - 1];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return user.username;
  };

  // Handler de toggle avec ordre de sélection (comportement critique mobile)
  const handleToggleSession = useCallback((sessionName: string) => {
    setSelectedOrder(prev => {
      const next = prev.includes(sessionName)
        ? prev.filter(n => n !== sessionName)
        : [...prev, sessionName];
      setSelectedSessions(new Set(next));
      return next;
    });
  }, []);

  const handleStartSession = useCallback(() => {
    if (currentSessionData.length === 0) return;
    onStartSession(currentSessionData);
  }, [currentSessionData, onStartSession]);

  // ===========================================
  // RENDER
  // ===========================================

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec salutation */}
      <div className="flex items-end justify-between pl-12">
        <div className="flex items-center gap-3">
          <HomeIcon className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
          <div>
            <p className="text-theme-muted text-sm mb-0.5">{getGreeting()}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-theme">
              {getDisplayName()}
              <span className="text-gradient ml-2">👋</span>
            </h1>
            <p className="text-theme-muted text-sm mt-1">Prêt à repousser vos limites aujourd'hui ?</p>
          </div>
        </div>

        {/* Bouton démarrer */}
        {currentSessionData.length > 0 && (
          <button
            onClick={handleStartSession}
            className="flex items-center gap-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] hover:from-[var(--color-primary-light)] hover:to-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-[var(--shadow-color)] transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="max-w-xs truncate">
              {selectedOrder.join(' + ')}
            </span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Cartes Session Active (comportement mobile reproduit) */}
      <div className="flex gap-4">
        {/* Carte Session Active (si en cours) */}
        {hasActiveSession && onResumeSession && (() => {
          // Déterminer si c'est une modification ou une nouvelle séance
          let isEditMode = false;
          try {
            const saved = localStorage.getItem('F.Y.T_active_session');
            if (saved) {
              const data = JSON.parse(saved);
              isEditMode = data.isEditMode === true;
            }
          } catch (e) {
            // ignore
          }
          return (
            <button
              onClick={onResumeSession}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-lg shadow-orange-500/25 animate-pulse-slow hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Timer className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">
                      {isEditMode ? 'Modification de séance en cours' : 'Séance en cours'}
                    </p>
                    <p className="text-white/80 text-sm">
                      {isEditMode ? 'Reprendre la modification' : 'Reprendre là où tu en étais'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-white" />
              </div>
            </button>
          );
        })()}

        {/* [DEAD CODE] Carte Ajout/Modification de Séance en cours */}
        {/* hasAddSession && onAddSession && (() => {
          // Déterminer si c'est un ajout ou une modification
          let isEditMode = false;
          try {
            const saved = localStorage.getItem('F.Y.T_add_session');
            if (saved) {
              const data = JSON.parse(saved);
              isEditMode = data.isEditMode === true;
            }
          } catch (e) {
            // ignore
          }

          return (
            <button
              onClick={onAddSession}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 shadow-lg shadow-blue-500/25 animate-pulse-slow hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <PlusCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">
                      {isEditMode ? 'Modification de séance en cours' : 'Ajout de séance en cours'}
                    </p>
                    <p className="text-white/80 text-sm">
                      {isEditMode ? 'Reprendre la modification' : 'Reprendre l\'ajout de ta séance'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-white" />
              </div>
            </button>
          );
        })() */}
      </div>

      {/* Week Organizers actifs */}
      {activeWeekOrganizers.length > 0 && (
        <div className="space-y-4">
          {activeWeekOrganizers.map((organizer, index) => (
            <div
              key={organizer.id}
              className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-theme">{organizer.title}</h3>
                    {activeWeekOrganizers.length > 1 && (
                      <span className="text-xs bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                        {index + 1}/{activeWeekOrganizers.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-theme-muted mb-2">
                    {new Date(organizer.startDate).toLocaleDateString('fr-FR')} - {new Date(organizer.endDate).toLocaleDateString('fr-FR')}
                  </p>
                  <div
                    className="text-sm text-theme-secondary prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: organizer.message }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats rapides - Layout horizontal compact pour desktop */}
      <div className="grid grid-cols-4 gap-3 bg-theme-secondary border border-theme rounded-2xl p-4">
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-primary)]/10 rounded-xl">
          <Calendar className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
          <span className="text-lg font-bold text-theme">{stats.weekSessions}</span>
          <span className="text-xs text-theme-muted">cette semaine</span>
        </div>
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-success)]/10 rounded-xl">
          <TrendingUp className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
          <span className="text-lg font-bold text-theme">{stats.monthSessions}</span>
          <span className="text-xs text-theme-muted">ce mois</span>
        </div>
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-danger)]/10 rounded-xl">
          <Flame className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" />
          <span className="text-lg font-bold text-theme">{stats.streak}</span>
          <span className="text-xs text-theme-muted">série 🔥</span>
        </div>
      </div>

      {/* Layout 2 colonnes: Sélection + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche: Sélection de séances */}
        <div className="bg-theme-secondary border border-theme rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="font-semibold text-theme">Choisir une séance</h2>
              <p className="text-sm text-theme-muted">
                {weekInfo ? `Semaine ${weekInfo.weekNumber}` : 'Sélectionnez votre programme'}
              </p>
            </div>
          </div>

          {/* SessionBadgesGrid avec columns=4 pour desktop */}
          {sessionNames.length > 0 ? (
            <SessionBadgesGrid
              sessions={sessionNames}
              selectedSessions={selectedSessions}
              selectionOrder={selectionOrder}
              onToggle={handleToggleSession}
              showCompletionStatus={true}
              history={history}
              weekStartDate={weekInfo?.startDate}
              weekEndDate={weekInfo?.endDate}
              columns={4} // Desktop: 4 colonnes au lieu de 3
              maxVisibleItems={12}
            />
          ) : (
            <div className="text-center py-8 text-theme-muted">
              Aucune séance disponible
            </div>
          )}

          {/* Stats de sélection */}
          {selectedSessions.size > 0 && (
            <div className="mt-4 pt-4 border-t border-theme flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-theme-muted">
                  <Dumbbell className="w-4 h-4" />
                  {selectedStats.totalExercises} exercices
                </span>
              </div>
              <span className="text-[var(--color-primary)] font-medium">
                {selectedSessions.size} séance{selectedSessions.size > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Colonne droite: Preview */}
        <div className="bg-theme-secondary border border-theme rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-success)]/20 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-[var(--color-success)]" />
              </div>
              <div>
                <h2 className="font-semibold text-theme">
                  {selectedSessions.size > 0
                    ? selectedOrder.join(' + ')
                    : 'Prévisualisation'
                  }
                </h2>
                <p className="text-sm text-theme-muted">
                  {currentSessionData.length > 0
                    ? `${currentSessionData.length} exercice${currentSessionData.length > 1 ? 's' : ''}`
                    : 'Sélectionnez une séance'
                  }
                </p>
              </div>
            </div>
          </div>

          {currentSessionData.length > 0 ? (
            <SessionPreview
              exercises={currentSessionData}
              selectedOrder={selectedOrder}
            />
          ) : (
            <div className="text-center py-12 text-theme-muted">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Sélectionnez une ou plusieurs séances<br />pour voir les exercices</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages passés */}
      {pastWeekOrganizers.length > 0 && (
        <div className="bg-theme-secondary border border-theme rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowPastOrganizers(!showPastOrganizers)}
            className="w-full flex items-center justify-between p-5 hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-theme-tertiary rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-theme-muted" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-theme">Messages précédents</h3>
                <p className="text-xs text-theme-muted">{pastWeekOrganizers.length} message{pastWeekOrganizers.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            {showPastOrganizers ? (
              <ChevronUp className="w-5 h-5 text-theme-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-theme-muted" />
            )}
          </button>

          {showPastOrganizers && (
            <div className="border-t border-theme p-5 space-y-4">
              {pastWeekOrganizers.map((organizer) => (
                <div key={organizer.id} className="bg-theme-tertiary rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-theme">{organizer.title}</h4>
                    <span className="text-xs text-theme-muted">
                      {new Date(organizer.startDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div
                    className="text-sm text-theme-secondary prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: organizer.message }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Alias pour nouveau nom + compatibilité
export const HomeDesktop = Home;
export default HomeDesktop;
