// ============================================================
// F.Y.T - SESSION SELECTOR ATHLETE (Mobile-First)
// src/components/athlete/SessionSelectorAthlete.tsx
// Sélecteur de séance simplifié avec accordéons et recherche
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { WorkoutRow, SessionLog } from '../../../types';
import { Card, CardContent } from '../shared/Card';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Play,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  Calendar,
  ArrowLeft,
  Layers,
  AlertCircle
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  trainingData: WorkoutRow[];
  history: SessionLog[];
  onStartSession: (exercises: WorkoutRow[]) => void;
  onBack?: () => void;
}

interface SessionOption {
  name: string;
  exerciseCount: number;
  estimatedDuration: number;
  isCompleted: boolean;
  completedDate?: string;
  exercises: WorkoutRow[];
}

interface WeekGroup {
  weekNumber: string;
  year: string;
  month: string;
  monthName: string;
  isCurrentWeek: boolean;
  sessions: SessionOption[];
  completedCount: number;
}

interface SearchResult {
  key: string;
  name: string;
  week: string;
  year: string;
  exerciseCount: number;
  exercises: WorkoutRow[];
  matchedExercises: string[];
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
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
}

function getCompletedText(date: string): string {
  const completedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  completedDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor(
    (today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "fait aujourd'hui";
  if (diffDays === 1) return "fait hier";

  const dayName = completedDate.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `fait ${dayName}`;
}

// ===========================================
// COMPONENT
// ===========================================

export const SessionSelectorAthlete: React.FC<Props> = ({
  trainingData,
  history,
  onStartSession,
  onBack
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [combineMode, setCombineMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<WorkoutRow[][]>([]);

  // ===========================================
  // COMPUTED: Current Week Sessions
  // ===========================================
  const { currentWeekSessions, suggestedSession } = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    // Trouver les semaines disponibles
    const availableWeeks = [...new Set(trainingData.map(d => d.semaine))].sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    if (availableWeeks.length === 0) {
      return { currentWeekSessions: [], suggestedSession: null };
    }

    // Déterminer la semaine actuelle (ou la plus récente disponible)
    const currentWeekNum = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    
    const targetWeek = availableWeeks.find(w => parseInt(w) >= currentWeekNum % 52)
      || availableWeeks[availableWeeks.length - 1];

    // Filtrer les séances de cette semaine
    const weekData = trainingData.filter(d => d.semaine === targetWeek);
    const sessionTypes = [...new Set(weekData.map(d => d.seance))];

    // Séances complétées cette semaine
    const completedThisWeek = history
      .filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekStart && logDate <= weekEnd;
      })
      .reduce((acc, log) => {
        acc[log.sessionKey.seance] = log.date;
        return acc;
      }, {} as Record<string, string>);

    // Construire les options
    const sessions: SessionOption[] = sessionTypes.map(sessionType => {
      const exercises = weekData.filter(d => d.seance === sessionType);
      return {
        name: sessionType,
        exerciseCount: exercises.length,
        estimatedDuration: estimateSessionDuration(exercises),
        isCompleted: !!completedThisWeek[sessionType],
        completedDate: completedThisWeek[sessionType],
        exercises
      };
    });

    // Trouver la séance suggérée (première non faite)
    const suggested = sessions.find(s => !s.isCompleted) || null;

    return { currentWeekSessions: sessions, suggestedSession: suggested };
  }, [trainingData, history]);

  // ===========================================
  // COMPUTED: All Weeks (for accordion view)
  // ===========================================
  const weekGroups = useMemo((): WeekGroup[] => {
    const now = new Date();
    const currentWeekNum = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // Grouper par année + mois + semaine
    const groups = new Map<string, WeekGroup>();

    trainingData.forEach(row => {
      const key = `${row.annee}-${row.moisNum}-${row.semaine}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          weekNumber: row.semaine,
          year: row.annee,
          month: row.moisNum,
          monthName: row.moisNom || `Mois ${row.moisNum}`,
          isCurrentWeek: parseInt(row.semaine) === currentWeekNum % 52,
          sessions: [],
          completedCount: 0
        });
      }
    });

    // Remplir les sessions pour chaque groupe
    groups.forEach((group, key) => {
      const weekData = trainingData.filter(
        d => d.annee === group.year && d.moisNum === group.month && d.semaine === group.weekNumber
      );
      
      const sessionTypes = [...new Set(weekData.map(d => d.seance))];
      
      // Chercher les sessions complétées
      const completedSessions = new Map<string, string>();
      history.forEach(log => {
        if (
          log.sessionKey.annee === group.year &&
          log.sessionKey.moisNum === group.month &&
          log.sessionKey.semaine === group.weekNumber
        ) {
          completedSessions.set(log.sessionKey.seance, log.date);
        }
      });

      group.sessions = sessionTypes.map(sessionType => {
        const exercises = weekData.filter(d => d.seance === sessionType);
        const completedDate = completedSessions.get(sessionType);
        return {
          name: sessionType,
          exerciseCount: exercises.length,
          estimatedDuration: estimateSessionDuration(exercises),
          isCompleted: !!completedDate,
          completedDate,
          exercises
        };
      });

      group.completedCount = group.sessions.filter(s => s.isCompleted).length;
    });

    // Trier par année desc, mois desc, semaine desc
    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
      if (a.month !== b.month) return parseInt(b.month) - parseInt(a.month);
      return parseInt(b.weekNumber) - parseInt(a.weekNumber);
    });
  }, [trainingData, history]);

  // Auto-expand current week
  useMemo(() => {
    const currentWeekGroup = weekGroups.find(g => g.isCurrentWeek);
    if (currentWeekGroup) {
      const key = `${currentWeekGroup.year}-${currentWeekGroup.month}-${currentWeekGroup.weekNumber}`;
      setExpandedWeeks(new Set([key]));
    }
  }, [weekGroups]);

  // ===========================================
  // COMPUTED: Search Results
  // ===========================================
  const searchResults = useMemo((): SearchResult[] => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 2) return [];

    const results = new Map<string, SearchResult>();

    trainingData.forEach(row => {
      const matchesSession = row.seance.toLowerCase().includes(query);
      const matchesExercise = row.exercice.toLowerCase().includes(query);

      if (matchesSession || matchesExercise) {
        const key = `${row.annee}-${row.semaine}-${row.seance}`;
        
        if (!results.has(key)) {
          results.set(key, {
            key,
            name: row.seance,
            week: row.semaine,
            year: row.annee,
            exerciseCount: 0,
            exercises: [],
            matchedExercises: []
          });
        }

        const result = results.get(key)!;
        result.exercises.push(row);
        result.exerciseCount = result.exercises.length;

        if (matchesExercise && !result.matchedExercises.includes(row.exercice)) {
          result.matchedExercises.push(row.exercice);
        }
      }
    });

    return Array.from(results.values()).sort((a, b) => 
      parseInt(b.week) - parseInt(a.week)
    );
  }, [searchQuery, trainingData]);

  // ===========================================
  // HANDLERS
  // ===========================================
  const toggleWeek = useCallback((key: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectSession = useCallback((exercises: WorkoutRow[]) => {
    if (combineMode) {
      // Mode combinaison
      const sessionName = exercises[0]?.seance;
      const alreadySelected = selectedSessions.findIndex(
        s => s[0]?.seance === sessionName
      );

      if (alreadySelected >= 0) {
        setSelectedSessions(prev => prev.filter((_, i) => i !== alreadySelected));
      } else if (selectedSessions.length < 3) {
        setSelectedSessions(prev => [...prev, exercises]);
      }
    } else {
      onStartSession(exercises);
    }
  }, [combineMode, selectedSessions, onStartSession]);

  const handleStartCombined = useCallback(() => {
    if (selectedSessions.length > 0) {
      const merged = selectedSessions.flat();
      onStartSession(merged);
    }
  }, [selectedSessions, onStartSession]);

  const isSessionSelected = useCallback((sessionName: string) => {
    return selectedSessions.some(s => s[0]?.seance === sessionName);
  }, [selectedSessions]);

  // ===========================================
  // RENDER: Session Card
  // ===========================================
  const renderSessionCard = (
    session: SessionOption,
    isSuggested: boolean = false,
    showCombineCheckbox: boolean = false
  ) => {
    const isSelected = isSessionSelected(session.name);

    return (
      <button
        key={session.name}
        onClick={() => handleSelectSession(session.exercises)}
        className={`w-full text-left transition-all ${
          session.isCompleted ? 'opacity-60' : ''
        }`}
      >
        <div className={`
          flex items-center gap-3 p-3 rounded-xl border transition-all
          ${isSuggested 
            ? 'bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border-blue-500/50' 
            : isSelected
              ? 'bg-blue-600/20 border-blue-500'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }
        `}>
          {/* Icon / Checkbox */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${session.isCompleted 
              ? 'bg-emerald-500/20' 
              : isSuggested 
                ? 'bg-blue-500/20' 
                : isSelected
                  ? 'bg-blue-500'
                  : 'bg-slate-700'
            }
          `}>
            {showCombineCheckbox && isSelected ? (
              <Check className="w-5 h-5 text-white" />
            ) : session.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isSuggested ? (
              <Play className="w-5 h-5 text-blue-400 fill-current" />
            ) : (
              <Dumbbell className="w-5 h-5 text-slate-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${
              session.isCompleted ? 'text-slate-400 line-through' : 'text-white'
            }`}>
              {session.name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3 h-3" />
                {session.exerciseCount} exos
              </span>
              {!session.isCompleted && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(session.estimatedDuration)}
                </span>
              )}
              {session.isCompleted && session.completedDate && (
                <span className="text-emerald-400 text-xs">
                  {getCompletedText(session.completedDate)}
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          {!showCombineCheckbox && !session.isCompleted && (
            <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
          )}
        </div>
      </button>
    );
  };

  // ===========================================
  // RENDER: Main View (Week Sessions)
  // ===========================================
  const renderMainView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
        )}
        <h1 className="text-xl font-bold text-white">
          {onBack ? '' : 'Choisir une séance'}
        </h1>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Suggested Session */}
      {suggestedSession && (
        <div>
          <p className="text-sm text-slate-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Séance recommandée
          </p>
          {renderSessionCard(suggestedSession, true)}
        </div>
      )}

      {/* Other Week Sessions */}
      {currentWeekSessions.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-2">
            Autres séances cette semaine
          </p>
          <div className="space-y-2">
            {currentWeekSessions
              .filter(s => s.name !== suggestedSession?.name)
              .map(session => renderSessionCard(session, false, combineMode))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {currentWeekSessions.length === 0 && (
        <Card variant="default" className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">
              Aucune séance disponible
            </h3>
            <p className="text-sm text-slate-400">
              Consultez toutes les séances pour trouver votre programme
            </p>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {/* Combine Mode Toggle */}
        {currentWeekSessions.length > 1 && (
          <button
            onClick={() => {
              setCombineMode(!combineMode);
              setSelectedSessions([]);
            }}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
              combineMode
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            <Layers className="w-4 h-4" />
            {combineMode ? 'Annuler la combinaison' : 'Combiner des séances'}
          </button>
        )}

        {/* Start Combined Button */}
        {combineMode && selectedSessions.length > 0 && (
          <button
            onClick={handleStartCombined}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold shadow-lg shadow-blue-600/25"
          >
            <Play className="w-5 h-5 fill-current" />
            Démarrer ({selectedSessions.length} séance{selectedSessions.length > 1 ? 's' : ''})
          </button>
        )}

        {/* View All Sessions */}
        <button
          onClick={() => setShowAllSessions(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
        >
          <Calendar className="w-4 h-4" />
          Voir toutes les séances
        </button>
      </div>
    </div>
  );

  // ===========================================
  // RENDER: All Sessions View (Accordions)
  // ===========================================
  const renderAllSessionsView = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowAllSessions(false);
            setSearchQuery('');
          }}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Toutes les séances</h1>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher une séance ou un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="space-y-2">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Aucune séance trouvée pour "{searchQuery}"
            </div>
          ) : (
            searchResults.map(result => (
              <button
                key={result.key}
                onClick={() => onStartSession(result.exercises)}
                className="w-full text-left p-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{result.name}</h3>
                    <p className="text-sm text-slate-400">
                      Semaine {result.week} • {result.exerciseCount} exercices
                    </p>
                    {result.matchedExercises.length > 0 && (
                      <p className="text-xs text-blue-400 mt-1">
                        Contient : {result.matchedExercises.slice(0, 2).join(', ')}
                        {result.matchedExercises.length > 2 && '...'}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Week Accordions */}
      {searchQuery.length < 2 && (
        <div className="space-y-2">
          {weekGroups.map(group => {
            const key = `${group.year}-${group.month}-${group.weekNumber}`;
            const isExpanded = expandedWeeks.has(key);

            return (
              <div key={key} className="border border-slate-700 rounded-xl overflow-hidden">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleWeek(key)}
                  className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          Semaine {group.weekNumber}
                        </span>
                        {group.isCurrentWeek && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            actuelle
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {group.monthName} {group.year} • {group.completedCount}/{group.sessions.length} faites
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-3 space-y-2 border-t border-slate-700">
                    {group.sessions.map(session => (
                      <button
                        key={session.name}
                        onClick={() => onStartSession(session.exercises)}
                        className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {session.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Play className="w-5 h-5 text-slate-400" />
                          )}
                          <span className={session.isCompleted ? 'text-slate-400' : 'text-white'}>
                            {session.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">
                            {session.exerciseCount} exos
                          </span>
                          {!session.isCompleted && (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ===========================================
  // MAIN RENDER
  // ===========================================
  return (
    <div className="pb-4">
      {showAllSessions ? renderAllSessionsView() : renderMainView()}
    </div>
  );
};

export default SessionSelectorAthlete;
