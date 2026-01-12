// ============================================================
// F.Y.T - HOME ATHLETE (Mobile-First) - V3
// src/components/athlete/HomeAthlete.tsx
// Écran d'accueil avec KPI encouragement, sélection de séances,
// modal preview et vue filtres avancés
// ============================================================

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  WorkoutRow,
  SessionLog,
  User,
  WeekOrganizerLog,
} from '../../../types';
import { Card, CardContent } from '../shared/Card';
import { EncouragementKPI } from '../EncouragementKPI';
import { SessionPreviewModal } from '../SessionPreviewModal';
import {
  Play,
  Clock,
  Dumbbell,
  ChevronRight,
  ChevronDown,
  Calendar,
  Timer,
  CheckCircle2,
  AlertCircle,
  Check,
  FolderOpen,
  ArrowLeft,
  Eye
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  user: User;
  trainingData: WorkoutRow[];
  history: SessionLog[];
  activeWeekOrganizers?: WeekOrganizerLog[];
  onStartSession: (exercises: WorkoutRow[]) => void;
  onResumeSession?: () => void;
  hasActiveSession?: boolean;
  onSelectSession?: () => void;
}

interface SessionChip {
  name: string;
  exercises: WorkoutRow[];
  exerciseCount: number;
  estimatedDuration: number;
  isCompleted: boolean;
  completedDate?: string;
  isSuggested: boolean;
}

interface WeekInfo {
  weekNumber: string;
  startDate?: string;
  endDate?: string;
  year: string;
}

interface FilterOptions {
  years: string[];
  months: { num: string; name: string }[];
  weeks: string[];
  sessions: string[];
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

function estimateSessionDuration(exercises: WorkoutRow[]): number {
  let totalMinutes = 0;
  exercises.forEach(exercise => {
    const sets = parseInt(exercise.series) || 3;
    const effortTime = sets * 0.75;
    const restSeconds = parseInt(exercise.repos) || 90;
    const restTime = (sets - 1) * (restSeconds / 60);
    const transitionTime = 1;
    totalMinutes += effortTime + restTime + transitionTime;
  });
  return Math.round(totalMinutes / 5) * 5;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h${mins.toString().padStart(2, '0')}`;
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function getGreeting(hour: number, firstName: string): { text: string; emoji: string } {
  if (hour >= 5 && hour < 12) return { text: `Bonjour ${firstName}`, emoji: '🌅' };
  if (hour >= 12 && hour < 18) return { text: `Salut ${firstName}`, emoji: '👋' };
  if (hour >= 18 && hour < 22) return { text: `Bonsoir ${firstName}`, emoji: '🌆' };
  return { text: `Hey ${firstName}`, emoji: '🌙' };
}

function getFirstName(user: User): string {
  if (user.firstName) return user.firstName;
  if (user.username?.includes('.')) {
    const parts = user.username.split('.');
    const firstName = parts[parts.length - 1];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  return user.username || 'Athlète';
}

// ===========================================
// COMPONENT
// ===========================================

export const HomeAthlete: React.FC<Props> = ({
  user,
  trainingData,
  history,
  activeWeekOrganizers = [],
  onStartSession,
  onResumeSession,
  hasActiveSession = false,
  onSelectSession,
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtres avancés
  const [filterYear, setFilterYear] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterWeek, setFilterWeek] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState<string | null>(null);

  // ===========================================
  // COMPUTED: Week Info & Session Chips (Vue suggérée)
  // ===========================================

  const { weekInfo, sessionChips, suggestedSessionName } = useMemo(() => {
    if (trainingData.length === 0) {
      return { weekInfo: null, sessionChips: [], suggestedSessionName: null };
    }

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    // Trouver la semaine courante dans les données
    let targetWeekData = trainingData.filter(d => {
      if (d.weekStartDate && d.weekEndDate) {
        const start = new Date(d.weekStartDate);
        const end = new Date(d.weekEndDate);
        return now >= start && now <= end;
      }
      return false;
    });

    if (targetWeekData.length === 0) {
      const availableWeeks = [...new Set(trainingData.map(d => d.semaine))].sort(
        (a, b) => parseInt(a) - parseInt(b)
      );
      const currentWeekNumber = getCurrentProgramWeek();
      const targetWeek = availableWeeks.find(w => parseInt(w) >= currentWeekNumber % 52)
        || availableWeeks[availableWeeks.length - 1];

      targetWeekData = trainingData.filter(d => d.semaine === targetWeek);
    }

    if (targetWeekData.length === 0) {
      return { weekInfo: null, sessionChips: [], suggestedSessionName: null };
    }

    const firstRow = targetWeekData[0];
    const info: WeekInfo = {
      weekNumber: firstRow.semaine,
      startDate: firstRow.weekStartDate,
      endDate: firstRow.weekEndDate,
      year: firstRow.annee,
    };

    const sessionTypes = [...new Set(targetWeekData.map(d => d.seance))];

    const completedThisWeek = new Map<string, string>();
    history.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= weekStart && logDate <= weekEnd) {
        completedThisWeek.set(log.sessionKey.seance, log.date);
      }
    });

    const chips: SessionChip[] = sessionTypes.map(sessionType => {
      const exercises = targetWeekData
        .filter(d => d.seance === sessionType)
        .sort((a, b) => a.ordre - b.ordre);

      const completedDate = completedThisWeek.get(sessionType);

      return {
        name: sessionType,
        exercises,
        exerciseCount: exercises.length,
        estimatedDuration: estimateSessionDuration(exercises),
        isCompleted: !!completedDate,
        completedDate,
        isSuggested: false,
      };
    });

    const suggested = chips.find(c => !c.isCompleted);
    if (suggested) {
      suggested.isSuggested = true;
    }

    return {
      weekInfo: info,
      sessionChips: chips,
      suggestedSessionName: suggested?.name || null,
    };
  }, [trainingData, history]);

  // ===========================================
  // COMPUTED: Filter Options (Vue filtres avancés)
  // ===========================================

  const filterOptions = useMemo((): FilterOptions => {
    const years = [...new Set(trainingData.map(d => d.annee))].sort().reverse();

    let filteredData = trainingData;

    // Filtrer par année si sélectionnée
    if (filterYear) {
      filteredData = filteredData.filter(d => d.annee === filterYear);
    }

    // Mois disponibles
    const monthsSet = new Map<string, string>();
    filteredData.forEach(d => {
      if (d.moisNum && d.moisNom) {
        monthsSet.set(d.moisNum, d.moisNom);
      }
    });
    const months = Array.from(monthsSet.entries())
      .map(([num, name]) => ({ num, name }))
      .sort((a, b) => parseInt(a.num) - parseInt(b.num));

    // Filtrer par mois si sélectionné
    if (filterMonth) {
      filteredData = filteredData.filter(d => d.moisNum === filterMonth);
    }

    // Semaines disponibles
    const weeks = [...new Set(filteredData.map(d => d.semaine))]
      .sort((a, b) => parseInt(a) - parseInt(b));

    // Filtrer par semaine si sélectionnée
    if (filterWeek) {
      filteredData = filteredData.filter(d => d.semaine === filterWeek);
    }

    // Séances disponibles
    const sessions = [...new Set(filteredData.map(d => d.seance))];

    return { years, months, weeks, sessions };
  }, [trainingData, filterYear, filterMonth, filterWeek]);

  // ===========================================
  // COMPUTED: Filtered Exercises (Vue filtres avancés)
  // ===========================================

  const filteredExercises = useMemo(() => {
    if (!showAdvancedFilters) return [];

    let filtered = trainingData;

    if (filterYear) {
      filtered = filtered.filter(d => d.annee === filterYear);
    }
    if (filterMonth) {
      filtered = filtered.filter(d => d.moisNum === filterMonth);
    }
    if (filterWeek) {
      filtered = filtered.filter(d => d.semaine === filterWeek);
    }
    if (filterSession) {
      filtered = filtered.filter(d => d.seance === filterSession);
    }

    return filtered.sort((a, b) => a.ordre - b.ordre);
  }, [trainingData, showAdvancedFilters, filterYear, filterMonth, filterWeek, filterSession]);

  const filteredSessionName = useMemo(() => {
    if (filterSession) return filterSession;
    if (filteredExercises.length > 0) {
      const sessions = [...new Set(filteredExercises.map(e => e.seance))];
      return sessions.length === 1 ? sessions[0] : sessions.join(' + ');
    }
    return 'Séance';
  }, [filterSession, filteredExercises]);

  // ===========================================
  // EFFECTS
  // ===========================================

  // Auto-sélectionner la séance suggérée au chargement
  useEffect(() => {
    if (suggestedSessionName && selectedSessions.size === 0 && !showAdvancedFilters) {
      setSelectedSessions(new Set([suggestedSessionName]));
    }
  }, [suggestedSessionName, showAdvancedFilters]);

  // Réinitialiser les filtres dépendants lors du changement
  useEffect(() => {
    setFilterMonth(null);
    setFilterWeek(null);
    setFilterSession(null);
  }, [filterYear]);

  useEffect(() => {
    setFilterWeek(null);
    setFilterSession(null);
  }, [filterMonth]);

  useEffect(() => {
    setFilterSession(null);
  }, [filterWeek]);

  // ===========================================
  // COMPUTED: Greeting
  // ===========================================

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = getFirstName(user);
    return getGreeting(hour, firstName);
  }, [user]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const toggleSessionChip = useCallback((sessionName: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionName)) {
        next.delete(sessionName);
      } else {
        next.add(sessionName);
      }
      return next;
    });
  }, []);

  const handleStartSelectedSessions = useCallback(() => {
    if (selectedSessions.size === 0) return;

    const allExercises: WorkoutRow[] = [];

    sessionChips.forEach(chip => {
      if (selectedSessions.has(chip.name)) {
        const sortedExercises = [...chip.exercises].sort((a, b) => a.ordre - b.ordre);
        allExercises.push(...sortedExercises);
      }
    });

    onStartSession(allExercises);
  }, [selectedSessions, sessionChips, onStartSession]);

  const handleStartFilteredSession = useCallback(() => {
    if (filteredExercises.length === 0) return;
    onStartSession(filteredExercises);
  }, [filteredExercises, onStartSession]);

  const handleOpenPreview = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  const handleToggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
    // Reset filtres quand on ferme
    if (showAdvancedFilters) {
      setFilterYear(null);
      setFilterMonth(null);
      setFilterWeek(null);
      setFilterSession(null);
    }
  }, [showAdvancedFilters]);

  // ===========================================
  // COMPUTED: Selected Stats
  // ===========================================

  const selectedStats = useMemo(() => {
    let totalExercises = 0;
    let totalDuration = 0;

    sessionChips.forEach(chip => {
      if (selectedSessions.has(chip.name)) {
        totalExercises += chip.exerciseCount;
        totalDuration += chip.estimatedDuration;
      }
    });

    return { totalExercises, totalDuration };
  }, [selectedSessions, sessionChips]);

  // Exercices pour le modal (séances sélectionnées)
  const previewExercises = useMemo(() => {
    const exercises: WorkoutRow[] = [];
    sessionChips.forEach(chip => {
      if (selectedSessions.has(chip.name)) {
        exercises.push(...chip.exercises);
      }
    });
    return exercises.sort((a, b) => a.ordre - b.ordre);
  }, [selectedSessions, sessionChips]);

  const previewSessionName = useMemo(() => {
    const names = sessionChips
      .filter(c => selectedSessions.has(c.name))
      .map(c => c.name);
    return names.length > 1 ? names.join(' + ') : names[0] || 'Séance';
  }, [selectedSessions, sessionChips]);

  // ===========================================
  // RENDER: Vue Suggérée (par défaut)
  // ===========================================

  const renderSuggestedView = () => (
    <>
      {/* KPI Encouragement */}
      <EncouragementKPI history={history} />

      {/* Carte Session Active (si en cours) */}
      {hasActiveSession && onResumeSession && (
        <button
          onClick={onResumeSession}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-lg shadow-orange-500/25 animate-pulse-slow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Séance en cours</p>
                <p className="text-white/80 text-sm">Reprendre là où tu en étais</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </button>
      )}

      {/* Carte Sélection de Séances */}
      {!hasActiveSession && (
        <>
          {sessionChips.length > 0 ? (
            <Card variant="gradient" className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header avec infos semaine */}
                <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 px-4 py-3 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">
                        Semaine {weekInfo?.weekNumber}
                      </span>
                      {weekInfo?.startDate && weekInfo?.endDate && (
                        <span className="text-xs text-slate-500">
                          • {formatDateRange(weekInfo.startDate, weekInfo.endDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chips de sélection */}
                <div className="p-4">
                  <p className="text-sm text-slate-400 mb-3">
                    Sélectionne une ou plusieurs séances :
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {sessionChips.map(chip => {
                      const isSelected = selectedSessions.has(chip.name);

                      return (
                        <button
                          key={chip.name}
                          onClick={() => toggleSessionChip(chip.name)}
                          disabled={chip.isCompleted}
                          className={`
                            relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                            ${chip.isCompleted
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed line-through'
                              : isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }
                          `}
                        >
                          {isSelected && !chip.isCompleted && (
                            <Check className="w-4 h-4" />
                          )}
                          {chip.isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}

                          <span>{chip.name}</span>

                          <span className={`
                            text-xs px-1.5 py-0.5 rounded-full
                            ${chip.isCompleted
                              ? 'bg-slate-700 text-slate-500'
                              : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-700 text-slate-400'
                            }
                          `}>
                            {chip.exerciseCount}
                          </span>

                          {chip.isSuggested && !chip.isCompleted && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stats des séances sélectionnées + bouton Preview */}
                  {selectedSessions.size > 0 && (
                    <div className="flex items-center justify-between gap-4 text-sm text-slate-400 mb-4 pb-4 border-b border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-4 h-4" />
                          {selectedStats.totalExercises} exercices
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(selectedStats.totalDuration)}
                        </span>
                      </div>

                      {/* Bouton voir preview */}
                      <button
                        onClick={handleOpenPreview}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir</span>
                      </button>
                    </div>
                  )}

                  {/* Bouton Démarrer */}
                  <button
                    onClick={handleStartSelectedSessions}
                    disabled={selectedSessions.size === 0}
                    className={`
                      w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]
                      ${selectedSessions.size > 0
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }
                    `}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>
                      {selectedSessions.size === 0
                        ? 'Sélectionne une séance'
                        : selectedSessions.size === 1
                          ? 'Démarrer'
                          : `Démarrer (${selectedSessions.size} séances)`
                      }
                    </span>
                  </button>

                  {/* Bouton Choisir ma séance */}
                  <button
                    onClick={handleToggleAdvancedFilters}
                    className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-3 rounded-xl border border-slate-700/50 hover:border-slate-600/50"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Choisir ma séance
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Aucun programme */
            <Card variant="default" className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Aucune séance programmée
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Ton programme n'est pas encore configuré
                </p>
                <button
                  onClick={handleToggleAdvancedFilters}
                  className="text-blue-400 text-sm font-medium hover:text-blue-300"
                >
                  Voir toutes les séances →
                </button>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );

  // ===========================================
  // RENDER: Vue Filtres Avancés (ATH-NEW-002)
  // ===========================================

  const renderAdvancedFiltersView = () => (
    <>
      {/* KPI Encouragement (même en vue filtres) */}
      <EncouragementKPI history={history} />

      {/* Carte Filtres */}
      <Card variant="gradient" className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">
                Choisir ma séance
              </span>
            </div>
          </div>

          {/* Filtres */}
          <div className="p-4 space-y-4">
            {/* Année */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Année</label>
              <div className="relative">
                <select
                  value={filterYear || ''}
                  onChange={(e) => setFilterYear(e.target.value || null)}
                  className="
                    w-full bg-slate-800 border border-slate-700 rounded-xl
                    px-4 py-3 text-white appearance-none cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  "
                >
                  <option value="">Toutes les années</option>
                  {filterOptions.years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Mois */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Mois</label>
              <div className="relative">
                <select
                  value={filterMonth || ''}
                  onChange={(e) => setFilterMonth(e.target.value || null)}
                  disabled={!filterYear}
                  className="
                    w-full bg-slate-800 border border-slate-700 rounded-xl
                    px-4 py-3 text-white appearance-none cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  "
                >
                  <option value="">Tous les mois</option>
                  {filterOptions.months.map(month => (
                    <option key={month.num} value={month.num}>{month.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Semaine */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Semaine</label>
              <div className="relative">
                <select
                  value={filterWeek || ''}
                  onChange={(e) => setFilterWeek(e.target.value || null)}
                  disabled={!filterMonth}
                  className="
                    w-full bg-slate-800 border border-slate-700 rounded-xl
                    px-4 py-3 text-white appearance-none cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  "
                >
                  <option value="">Toutes les semaines</option>
                  {filterOptions.weeks.map(week => (
                    <option key={week} value={week}>Semaine {week}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Séance */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Séance</label>
              <div className="relative">
                <select
                  value={filterSession || ''}
                  onChange={(e) => setFilterSession(e.target.value || null)}
                  disabled={!filterWeek}
                  className="
                    w-full bg-slate-800 border border-slate-700 rounded-xl
                    px-4 py-3 text-white appearance-none cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  "
                >
                  <option value="">Toutes les séances</option>
                  {filterOptions.sessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Preview de la séance filtrée */}
          {filteredExercises.length > 0 && (
            <div className="px-4 pb-4">
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {filteredSessionName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {filteredExercises.length} exercices • {formatDuration(estimateSessionDuration(filteredExercises))}
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filteredExercises.slice(0, 5).map((ex, i) => (
                    <div key={`${ex.id}-${i}`} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-500">#{ex.ordre}</span>
                      <span className="truncate">{ex.exercice}</span>
                      {ex.series && ex.repsDuree && (
                        <span className="text-slate-500 ml-auto">{ex.series}×{ex.repsDuree}</span>
                      )}
                    </div>
                  ))}
                  {filteredExercises.length > 5 && (
                    <p className="text-xs text-slate-500 italic">
                      + {filteredExercises.length - 5} autres exercices...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 pt-0 space-y-3">
            {/* Bouton Démarrer */}
            <button
              onClick={handleStartFilteredSession}
              disabled={filteredExercises.length === 0}
              className={`
                w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]
                ${filteredExercises.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Démarrer</span>
            </button>

            {/* Bouton Retour */}
            <button
              onClick={handleToggleAdvancedFilters}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors py-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour séance suggérée
            </button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  // ===========================================
  // MAIN RENDER
  // ===========================================

  return (
    <div className="space-y-4 pb-4">
      {/* Header - Salutation */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">
          {greeting.text} <span className="ml-1">{greeting.emoji}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Prêt à repousser tes limites ?
        </p>
      </div>

      {/* Contenu principal */}
      {showAdvancedFilters ? renderAdvancedFiltersView() : renderSuggestedView()}

      {/* Modal Preview */}
      <SessionPreviewModal
        isOpen={showPreviewModal}
        onClose={handleClosePreview}
        sessionName={previewSessionName}
        exercises={previewExercises}
        onStartSession={handleStartSelectedSessions}
      />
    </div>
  );
};

export default HomeAthlete;
