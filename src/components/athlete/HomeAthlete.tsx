// ============================================================
// F.Y.T - HOME ATHLETE (Mobile-First)
// src/components/athlete/HomeAthlete.tsx
// Écran d'accueil avec sélection multiple de séances via chips
// ============================================================

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { 
  WorkoutRow, 
  SessionLog, 
  User, 
  WeekOrganizerLog,
} from '../../../types';
import { Card, CardContent } from '../shared/Card';
import { 
  Play, 
  Clock, 
  Dumbbell,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Activity,
  Timer,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Check
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

interface WeekStats {
  completed: number;
  total: number;
  averageRpe: number | null;
  totalMinutes: number;
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

function getRpeDisplayColor(rpe: number): string {
  if (rpe <= 4) return 'text-green-400';
  if (rpe <= 6) return 'text-yellow-400';
  if (rpe <= 8) return 'text-orange-400';
  return 'text-red-400';
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
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  
  // ===========================================
  // COMPUTED: Week Info & Session Chips
  // ===========================================
  
  const { weekInfo, sessionChips, suggestedSessionName } = useMemo(() => {
    if (trainingData.length === 0) {
      return { weekInfo: null, sessionChips: [], suggestedSessionName: null };
    }
    
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);
    
    // Trouver la semaine courante dans les données
    // Priorité 1: Chercher par dates si disponibles
    let targetWeekData = trainingData.filter(d => {
      if (d.weekStartDate && d.weekEndDate) {
        const start = new Date(d.weekStartDate);
        const end = new Date(d.weekEndDate);
        return now >= start && now <= end;
      }
      return false;
    });
    
    // Priorité 2: Chercher par numéro de semaine
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
    
    // Extraire les infos de la semaine
    const firstRow = targetWeekData[0];
    const info: WeekInfo = {
      weekNumber: firstRow.semaine,
      startDate: firstRow.weekStartDate,
      endDate: firstRow.weekEndDate,
      year: firstRow.annee,
    };
    
    // Grouper par type de séance
    const sessionTypes = [...new Set(targetWeekData.map(d => d.seance))];
    
    // Trouver les séances complétées cette semaine
    const completedThisWeek = new Map<string, string>();
    history.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= weekStart && logDate <= weekEnd) {
        completedThisWeek.set(log.sessionKey.seance, log.date);
      }
    });
    
    // Construire les chips
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
    
    // Déterminer la séance suggérée (première non complétée)
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
  
  // Auto-sélectionner la séance suggérée au chargement
  useEffect(() => {
    if (suggestedSessionName && selectedSessions.size === 0) {
      setSelectedSessions(new Set([suggestedSessionName]));
    }
  }, [suggestedSessionName]);
  
  // Salutation personnalisée
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = getFirstName(user);
    return getGreeting(hour, firstName);
  }, [user]);
  
  // Statistiques de la semaine
  const weekStats = useMemo((): WeekStats => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());
    
    const weekSessions = history.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart && logDate <= weekEnd;
    });
    
    const completed = weekSessions.length;
    const total = sessionChips.length;
    
    const sessionsWithRpe = weekSessions.filter(log => log.sessionRpe !== undefined);
    const averageRpe = sessionsWithRpe.length > 0
      ? Math.round(
          (sessionsWithRpe.reduce((acc, log) => acc + (log.sessionRpe || 0), 0) / sessionsWithRpe.length) * 10
        ) / 10
      : null;
    
    const totalMinutes = weekSessions.reduce(
      (acc, log) => acc + (log.durationMinutes || 0), 
      0
    );
    
    return { completed, total, averageRpe, totalMinutes };
  }, [history, sessionChips]);
  
  const isWeekComplete = weekStats.total > 0 && weekStats.completed >= weekStats.total;
  
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
    
    // Fusionner les exercices des séances sélectionnées
    // En conservant l'ordre des séances puis l'ordre des exercices
    const allExercises: WorkoutRow[] = [];
    
    sessionChips.forEach(chip => {
      if (selectedSessions.has(chip.name)) {
        // Ajouter les exercices triés par ordre
        const sortedExercises = [...chip.exercises].sort((a, b) => a.ordre - b.ordre);
        allExercises.push(...sortedExercises);
      }
    });
    
    onStartSession(allExercises);
  }, [selectedSessions, sessionChips, onStartSession]);
  
  // Calculer les stats des séances sélectionnées
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
  
  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <div className="space-y-4 pb-4">
      {/* Header - Salutation */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">
          {greeting.text} <span className="ml-1">{greeting.emoji}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {isWeekComplete 
            ? "Programme de la semaine terminé !" 
            : "Prêt à repousser tes limites ?"}
        </p>
      </div>
      
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
                    {isWeekComplete && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Complète
                      </span>
                    )}
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
                          {/* Icône de sélection */}
                          {isSelected && !chip.isCompleted && (
                            <Check className="w-4 h-4" />
                          )}
                          {chip.isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          
                          <span>{chip.name}</span>
                          
                          {/* Badge nombre d'exercices */}
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
                          
                          {/* Badge suggéré */}
                          {chip.isSuggested && !chip.isCompleted && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Stats des séances sélectionnées */}
                  {selectedSessions.size > 0 && (
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4 pb-4 border-b border-slate-700/50">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-4 h-4" />
                        {selectedStats.totalExercises} exercices
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(selectedStats.totalDuration)}
                      </span>
                      {selectedSessions.size > 1 && (
                        <span className="text-blue-400">
                          {selectedSessions.size} séances
                        </span>
                      )}
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
                  
                  {/* Lien autre séance */}
                  {onSelectSession && (
                    <button
                      onClick={onSelectSession}
                      className="w-full mt-3 text-center text-sm text-slate-400 hover:text-white transition-colors py-2"
                    >
                      Choisir une autre séance
                    </button>
                  )}
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
                {onSelectSession && (
                  <button
                    onClick={onSelectSession}
                    className="text-blue-400 text-sm font-medium hover:text-blue-300"
                  >
                    Voir toutes les séances →
                  </button>
                )}
              </div>
            </Card>
          )}
        </>
      )}
      
      {/* Stats de la Semaine */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Cette semaine
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Séances */}
          <Card variant="default" className="p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {weekStats.completed}
              <span className="text-slate-500 text-lg">/{weekStats.total || '?'}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">séances</p>
          </Card>
          
          {/* RPE Moyen */}
          <Card variant="default" className="p-4 text-center">
            <p className={`text-2xl font-bold ${
              weekStats.averageRpe !== null 
                ? getRpeDisplayColor(weekStats.averageRpe)
                : 'text-slate-500'
            }`}>
              {weekStats.averageRpe !== null 
                ? weekStats.averageRpe.toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">RPE</p>
          </Card>
          
          {/* Temps Total */}
          <Card variant="default" className="p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {weekStats.totalMinutes > 120 
                ? `${Math.floor(weekStats.totalMinutes / 60)}h${(weekStats.totalMinutes % 60).toString().padStart(2, '0')}`
                : weekStats.totalMinutes}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {weekStats.totalMinutes > 120 ? '' : 'min'}
            </p>
          </Card>
        </div>
      </div>
      
      {/* Message de félicitations si semaine complète */}
      {isWeekComplete && (
        <Card variant="default" className="p-4 bg-gradient-to-r from-emerald-600/10 to-blue-600/10 border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-white">Bravo ! 🎉</p>
              <p className="text-sm text-slate-400">
                Tu as terminé ton programme de la semaine
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default HomeAthlete;
