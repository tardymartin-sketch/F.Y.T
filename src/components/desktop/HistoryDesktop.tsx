// ============================================================
// F.Y.T - HISTORY DESKTOP (V3 Split-Screen Layout)
// src/components/desktop/HistoryDesktop.tsx
// Layout split-screen : liste séances (gauche) + détail (droite)
// Exercices en tuiles carrées
// ============================================================

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SessionLog, WorkoutRow, groupExerciseLogs, isExerciseLogGroup, ExerciseLog, ExerciseLogGroup } from '../../../types';
import { Card } from '../shared/Card';
import {
  Calendar,
  Dumbbell,
  Search,
  X,
  Edit2,
  Trash2,
  Activity,
  Download,
  ChevronRight,
  MessageSquare,
  History as HistoryIcon
} from 'lucide-react';
import { RpeBadge } from '../common/RpeSelector';
import { ExerciseTile } from '../common/history/ExerciseTile';
import { SupersetTile } from '../common/history/SupersetTile';
import { DeleteConfirmModal } from '../common/history/DeleteConfirmModal';
import { EditConfirmModal } from '../common/history/EditConfirmModal';

// Fonctions utilitaires factorisées
import {
  formatDateFull,
  formatSetWeight,
  getCompletionRate,
  isManualSession,
  groupSessionsByPeriod
} from '../../utils/historyUtils';

// ===========================================
// HELPERS
// ===========================================

// Normaliser une chaîne pour recherche insensible aux accents
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ===========================================
// TYPES
// ===========================================

interface Props {
  history: SessionLog[];
  onEdit?: (session: SessionLog) => void;
  onDelete?: (sessionId: string) => void;
  // [DEAD CODE] onEditManualSession?: (session: SessionLog) => void;
  userId?: string;
  targetSessionLogId?: string | null;
  targetExerciseName?: string | null;
  targetDate?: string | null;
  onClearTarget?: () => void;
  /** Données du programme pour afficher repos/vidéo sur les exercices */
  workoutData?: WorkoutRow[];
}

// ===========================================
// COMPONENT
// ===========================================

export const HistoryDesktop: React.FC<Props> = ({
  history,
  onEdit,
  onDelete,
  // [DEAD CODE] onEditManualSession,
  targetSessionLogId,
  targetExerciseName,
  targetDate,
  onClearTarget,
  workoutData = []
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editConfirm, setEditConfirm] = useState<string | null>(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [highlightedExerciseIndex, setHighlightedExerciseIndex] = useState<number | null>(null);

  // Refs for scroll-to-target
  const sessionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Refs for Popover anchors (edit/delete buttons)
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return sortedHistory;

    const query = normalizeForSearch(searchQuery);
    return sortedHistory.filter(session => {
      if (normalizeForSearch(session.sessionKey.seance).includes(query)) return true;
      if (session.exercises.some(ex =>
        normalizeForSearch(ex.exerciseName).includes(query)
      )) return true;
      return false;
    });
  }, [sortedHistory, searchQuery]);

  const groupedHistory = useMemo(() => {
    return groupSessionsByPeriod(filteredHistory);
  }, [filteredHistory]);

  // Lookup map pour repos/video par nom d'exercice (normalisé)
  const exerciseDataMap = useMemo(() => {
    const map = new Map<string, { repos?: string; videoUrl?: string }>();
    workoutData.forEach(row => {
      const key = row.exercice.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          repos: row.repos || undefined,
          videoUrl: row.video || undefined
        });
      }
    });
    return map;
  }, [workoutData]);

  // Résultats de recherche d'exercices (quand searchQuery non vide)
  interface ExerciseSearchResult {
    sessionId: string;
    sessionName: string;
    exerciseName: string;
    exerciseIndex: number;
    date: string;
  }

  const exerciseSearchResults = useMemo((): ExerciseSearchResult[] => {
    if (!searchQuery.trim()) return [];

    const query = normalizeForSearch(searchQuery);
    const results: ExerciseSearchResult[] = [];

    sortedHistory.forEach(session => {
      session.exercises.forEach((exercise, index) => {
        if (normalizeForSearch(exercise.exerciseName).includes(query)) {
          results.push({
            sessionId: session.id,
            sessionName: session.sessionKey.seance,
            exerciseName: exercise.exerciseName,
            exerciseIndex: index,
            date: session.date
          });
        }
      });
    });

    return results;
  }, [sortedHistory, searchQuery]);

  // Session sélectionnée
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return history.find(s => s.id === selectedSessionId) || null;
  }, [selectedSessionId, history]);

  // Stats globales
  const globalStats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthSessions = history.filter(s => new Date(s.date) >= thisMonth);
    const sessionsWithRpe = monthSessions.filter(s => s.sessionRpe);
    const avgRpe = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((acc, s) => acc + (s.sessionRpe || 0), 0) / sessionsWithRpe.length
      : null;

    return {
      sessionsThisMonth: monthSessions.length,
      avgRpe
    };
  }, [history]);

  // ===========================================
  // PRÉSÉLECTION DERNIÈRE SÉANCE À L'OUVERTURE
  // ===========================================

  useEffect(() => {
    // Si pas de session sélectionnée et pas de target, sélectionner la dernière
    if (!selectedSessionId && !targetSessionLogId && !targetDate && sortedHistory.length > 0) {
      setSelectedSessionId(sortedHistory[0].id);
    }
  }, [sortedHistory, selectedSessionId, targetSessionLogId, targetDate]);

  // ===========================================
  // NAVIGATION DEPUIS STATS
  // ===========================================

  useEffect(() => {
    if (targetSessionLogId && history.length > 0) {
      const targetExists = history.some(s => s.id === targetSessionLogId);

      if (targetExists) {
        setSelectedSessionId(targetSessionLogId);
        setHighlightedSessionId(targetSessionLogId);

        // Scroll dans le conteneur de liste (pas la page entière)
        setTimeout(() => {
          const element = sessionRefs.current[targetSessionLogId];
          const container = listContainerRef.current;
          if (element && container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
            container.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }, 100);

        setTimeout(() => setHighlightedSessionId(null), 3000);
        if (onClearTarget) setTimeout(() => onClearTarget(), 500);
      }
    }
  }, [targetSessionLogId, history, onClearTarget]);

  useEffect(() => {
    if (targetDate && history.length > 0) {
      const targetDateStart = new Date(targetDate);
      targetDateStart.setHours(0, 0, 0, 0);
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      const targetSession = history.find(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= targetDateStart && sessionDate <= targetDateEnd;
      });

      if (targetSession) {
        setSelectedSessionId(targetSession.id);
        setHighlightedSessionId(targetSession.id);

        // Scroll dans le conteneur de liste (pas la page entière)
        setTimeout(() => {
          const element = sessionRefs.current[targetSession.id];
          const container = listContainerRef.current;
          if (element && container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
            container.scrollTo({ top: scrollTop, behavior: 'smooth' });
          }
        }, 100);

        setTimeout(() => setHighlightedSessionId(null), 3000);
        if (onClearTarget) setTimeout(() => onClearTarget(), 500);
      }
    }
  }, [targetDate, history, onClearTarget]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setHighlightedExerciseIndex(null);
  }, []);

  // Handler pour naviguer vers une date depuis le tooltip du graphique (bouton œil)
  const handleViewDate = useCallback((dateISO: string) => {
    // Chercher une session à cette date
    const targetDateStart = new Date(dateISO);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(dateISO);
    targetDateEnd.setHours(23, 59, 59, 999);

    const sessionOfDay = history.find(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= targetDateStart && sessionDate <= targetDateEnd;
    });

    if (sessionOfDay) {
      setSelectedSessionId(sessionOfDay.id);
      setHighlightedSessionId(sessionOfDay.id);
      setTimeout(() => setHighlightedSessionId(null), 3000);

      // Scroll vers la session dans la liste (dans le conteneur, pas la page)
      setTimeout(() => {
        const element = sessionRefs.current[sessionOfDay.id];
        const container = listContainerRef.current;
        if (element && container) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [history]);

  const handleSelectExerciseFromSearch = useCallback((result: ExerciseSearchResult) => {
    setSelectedSessionId(result.sessionId);
    setHighlightedExerciseIndex(result.exerciseIndex);
    setSearchQuery(''); // Effacer la recherche après sélection

    // Highlight la session aussi
    setHighlightedSessionId(result.sessionId);
    setTimeout(() => setHighlightedSessionId(null), 3000);

    // Effacer le highlight de l'exercice après 3s
    setTimeout(() => setHighlightedExerciseIndex(null), 3000);

    // Scroll vers la session (dans le conteneur, pas la page)
    setTimeout(() => {
      const element = sessionRefs.current[result.sessionId];
      const container = listContainerRef.current;
      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = element.offsetTop - container.offsetTop - (containerRect.height / 2) + (elementRect.height / 2);
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const handleDelete = useCallback((sessionId: string) => {
    if (onDelete) {
      onDelete(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
    setDeleteConfirm(null);
  }, [onDelete, selectedSessionId]);

  const handleEditConfirmed = useCallback((session: SessionLog) => {
    // [DEAD CODE] const isManual = isManualSession(session);
    // if (isManual && onEditManualSession) {
    //   onEditManualSession(session);
    // } else
    if (onEdit) {
      onEdit(session);
    }
    setEditConfirm(null);
  }, [onEdit]);

  // ===========================================
  // RENDER: Session List Item (panneau gauche)
  // ===========================================

  const renderSessionListItem = (session: SessionLog) => {
    const dateInfo = formatDateFull(session.date);
    const completionRate = getCompletionRate(session.exercises);
    const isManual = isManualSession(session);
    const isSelected = selectedSessionId === session.id;
    const isHighlighted = highlightedSessionId === session.id;

    return (
      <div
        key={session.id}
        ref={(el) => { sessionRefs.current[session.id] = el; }}
      >
        <button
          onClick={() => handleSelectSession(session.id)}
          className={`
            w-full text-left p-3 rounded-xl transition-all duration-200
            ${isSelected
              ? 'bg-blue-600/20 border-2 border-blue-500'
              : isHighlighted
                ? 'bg-blue-500/10 border-2 border-blue-400 ring-2 ring-blue-500/50'
                : 'bg-theme-secondary/50 border border-theme hover:bg-theme-secondary hover:border-theme'
            }
          `}
          type="button"
        >
          <div className="flex items-center gap-3">
            {/* Date Badge compact */}
            {/* Ticket #6babc194 - Couleur de fond des dates de selection de séances dans history */}
            <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
              isSelected ? 'bg-blue-200' : 'bg-theme-tertiary'
            }`}>
              <span className="text-sm font-bold text-theme leading-none">{dateInfo.day}</span>
              <span className="text-[9px] text-theme-secondary uppercase">{dateInfo.month}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-theme text-sm truncate">
                {session.sessionKey.seance.replace(/\+/g, ' + ')}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-theme-muted">
                  {session.exercises.length} exos
                </span>
              </div>
            </div>

            {/* Right: RPE + indicators */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isManual && (
                <Download className="w-3.5 h-3.5 text-blue-400" />
              )}
              {/* Ticket - Badge RPE : afficher uniquement le chiffre */}
              {session.sessionRpe && (
                <RpeBadge rpe={session.sessionRpe} size="sm" showLabel={false} />
              )}
              <ChevronRight className={`w-4 h-4 transition-colors ${
                isSelected ? 'text-blue-400' : 'text-theme-muted'
              }`} />
            </div>
          </div>

          {/* Completion bar */}
          <div className="mt-2">
            {isManual ? (
              <div className="h-1 bg-blue-500/30 rounded-full" />
            ) : (
              <div className="h-1 bg-theme-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            )}
          </div>
        </button>
      </div>
    );
  };

  // ===========================================
  // RENDER: Session Detail Panel (panneau droit)
  // ===========================================

  const renderDetailPanel = () => {
    if (!selectedSession) {
      return (
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-16 h-16 text-theme-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-theme-muted mb-2">
              Sélectionnez une séance
            </h3>
            <p className="text-sm text-theme-muted">
              Cliquez sur une séance à gauche pour voir les détails
            </p>
          </div>
        </div>
      );
    }

    const dateInfo = formatDateFull(selectedSession.date);
    const isManual = isManualSession(selectedSession);
    const completionRate = getCompletionRate(selectedSession.exercises);

    return (
      <div>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-secondary/95 backdrop-blur-sm p-4 border-b border-theme">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-theme truncate">
                  {selectedSession.sessionKey.seance.replace(/\+/g, ' + ')}
                </h2>
                {/* Boutons modifier et supprimer à côté du nom */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* [DEAD CODE] (onEdit || onEditManualSession) */ onEdit && (
                    <button
                      ref={editButtonRef}
                      onClick={() => setEditConfirm(selectedSession.id)}
                      className="p-2 bg-theme-tertiary hover:bg-theme-secondary rounded-lg transition-colors"
                      title="Modifier la séance"
                      type="button"
                    >
                      <Edit2 className="w-4 h-4 text-theme-secondary" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      ref={deleteButtonRef}
                      onClick={() => setDeleteConfirm(selectedSession.id)}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                      title="Supprimer la séance"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-theme-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {dateInfo.full}
                </span>
                <span className="text-theme-muted">•</span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4" />
                  {selectedSession.exercises.length} exercices
                </span>
              </div>
            </div>

            {/* RPE et badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isManual && (
                <div className="px-2 py-1 bg-blue-500/20 rounded-lg flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-400">Importée</span>
                </div>
              )}
              {selectedSession.sessionRpe && (
                <RpeBadge rpe={selectedSession.sessionRpe} size="lg" />
              )}
            </div>
          </div>

          {/* Completion bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
              <span>Complétion</span>
              <span>{completionRate}%</span>
            </div>
            {isManual ? (
              <div className="h-2 bg-blue-500/30 rounded-full" />
            ) : (
              <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Exercices en tuiles carrées (grille 4 colonnes) */}
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groupExerciseLogs(selectedSession.exercises).map((item, index) => {
              if (isExerciseLogGroup(item)) {
                // Superset/Triset group
                const group = item as ExerciseLogGroup;
                // Highlight si un des exercices du groupe est ciblé
                const isGroupHighlighted = group.exercises.some((ex, exIndex) => {
                  const originalIndex = selectedSession.exercises.findIndex(
                    e => e.exerciseName === ex.exerciseName &&
                         e.executionGroupId === ex.executionGroupId
                  );
                  const isTargetExercise = targetExerciseName &&
                    ex.exerciseName.toLowerCase() === targetExerciseName.toLowerCase();
                  const isHighlightedFromSearch = highlightedExerciseIndex === originalIndex;
                  return isTargetExercise || isHighlightedFromSearch;
                });

                // Récupérer repos/video pour chaque exercice du groupe
                const exercisesWithInfo = group.exercises.map(ex => {
                  const exerciseKey = ex.exerciseName.toLowerCase().trim();
                  const exerciseInfo = exerciseDataMap.get(exerciseKey);
                  return {
                    exercise: ex,
                    repos: exerciseInfo?.repos,
                    videoUrl: exerciseInfo?.videoUrl
                  };
                });

                return (
                  <SupersetTile
                    key={`${selectedSession.id}-group-${group.groupId}`}
                    group={group}
                    history={history}
                    isHighlighted={isGroupHighlighted}
                    onViewDate={handleViewDate}
                    layout="desktop"
                    repos={exercisesWithInfo[0]?.repos}
                  />
                );
              } else {
                // Exercice individuel (straight)
                const exercise = item as ExerciseLog;
                const originalIndex = selectedSession.exercises.findIndex(
                  e => e.exerciseName === exercise.exerciseName &&
                       !e.executionGroupId
                );
                // Highlight si c'est l'exercice ciblé par la recherche OU par targetExerciseName
                const isTargetExercise = targetExerciseName &&
                  exercise.exerciseName.toLowerCase() === targetExerciseName.toLowerCase();
                const isHighlightedFromSearch = highlightedExerciseIndex === originalIndex;

                // Récupérer repos/video depuis le programme
                const exerciseKey = exercise.exerciseName.toLowerCase().trim();
                const exerciseInfo = exerciseDataMap.get(exerciseKey);

                return (
                  <ExerciseTile
                    key={`${selectedSession.id}-${index}`}
                    exercise={exercise}
                    history={history}
                    isHighlighted={isTargetExercise || isHighlightedFromSearch}
                    onViewDate={handleViewDate}
                    layout="desktop"
                    repos={exerciseInfo?.repos}
                    videoUrl={exerciseInfo?.videoUrl}
                  />
                );
              }
            })}
          </div>

          {/* Commentaires */}
          {selectedSession.comments && !isManualSession(selectedSession) && (
            <div className="mt-6 p-4 bg-theme-tertiary/50 rounded-xl border border-theme">
              <div className="flex items-center gap-2 text-sm text-theme-muted mb-2">
                <MessageSquare className="w-4 h-4" />
                Commentaires
              </div>
              <p className="text-sm text-theme-secondary whitespace-pre-wrap">
                {selectedSession.comments}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===========================================
  // RENDER - Structure avec hauteurs explicites
  // ===========================================

  return (
    <>
      {/*
        LAYOUT SIMPLIFIÉ :
        - Container prend 100% du parent (chaîne: html > body > #root > App > main > div)
        - Header fixe avec flexShrink: 0
        - Contenu flex-1 avec overflow
      */}
      <div
        className="bg-theme"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {/* ==================== ZONE 1 : HEADER ==================== */}
        <header
          className="p-4 border-b border-theme"
          style={{ flexShrink: 0 }}
        >
          {/* Ticket - Titre positionné à côté du bouton burger (fixed left) */}
          <div className="flex items-center justify-between gap-4 pl-12">
            {/* Titre */}
            <div className="flex items-center gap-3">
              <HistoryIcon className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-theme">Historique</h1>
                <p className="text-sm text-theme-muted">
                  {history.length} séance{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Stats globales */}
            <div className="flex items-center gap-3">
              <Card variant="default" className="px-4 py-2 text-center">
                <p className="text-lg font-bold text-theme">{globalStats.sessionsThisMonth}</p>
                <p className="text-[10px] text-theme-muted uppercase">ce mois</p>
              </Card>
              <Card variant="default" className="px-4 py-2 text-center">
                <p className={`text-lg font-bold ${
                  globalStats.avgRpe
                    ? globalStats.avgRpe <= 5 ? 'text-green-400'
                      : globalStats.avgRpe <= 7 ? 'text-yellow-400'
                      : 'text-orange-400'
                    : 'text-theme-muted'
                }`}>
                  {globalStats.avgRpe ? globalStats.avgRpe.toFixed(1) : '-'}
                </p>
                <p className="text-[10px] text-theme-muted uppercase">RPE moy</p>
              </Card>
            </div>
          </div>
        </header>

        {/* ==================== ZONE 2 : CONTENU SPLIT ==================== */}
        <div
          className="p-4"
          style={{
            display: 'flex',
            gap: '1rem',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* ========== PANNEAU GAUCHE : LISTE ========== */}
          <div
            className="bg-theme-secondary/50 border border-theme rounded-xl"
            style={{
              width: '40%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Barre de recherche (fixe) */}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-theme-tertiary border border-theme rounded-lg pl-9 pr-8 py-2 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-dark"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Liste scrollable */}
            <div
              ref={listContainerRef}
              className="px-3 pb-3 space-y-4"
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}
            >
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-theme-muted mx-auto mb-2" />
                  <p className="text-sm text-theme-muted">Aucune séance</p>
                </div>
              ) : searchQuery.trim() ? (
                // Mode recherche
                exerciseSearchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-theme-muted">
                      Aucun exercice trouvé pour "{searchQuery}"
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Dumbbell className="w-3 h-3" />
                      {exerciseSearchResults.length} exercice{exerciseSearchResults.length > 1 ? 's' : ''} trouvé{exerciseSearchResults.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-2">
                      {exerciseSearchResults.map((result, index) => {
                        const dateInfo = formatDateFull(result.date);
                        const isSelected = selectedSessionId === result.sessionId && highlightedExerciseIndex === result.exerciseIndex;
                        return (
                          <button
                            key={`${result.sessionId}-${result.exerciseIndex}-${index}`}
                            onClick={() => handleSelectExerciseFromSearch(result)}
                            className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-600/20 border-2 border-blue-500'
                                : 'bg-theme-secondary/50 border border-theme hover:bg-theme-secondary hover:border-theme'
                            }`}
                            type="button"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-blue-600' : 'bg-theme-tertiary'
                              }`}>
                                <span className="text-sm font-bold text-theme leading-none">{dateInfo.day}</span>
                                <span className="text-[9px] text-theme-secondary uppercase">{dateInfo.month}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-theme text-sm truncate">{result.exerciseName}</h3>
                                <p className="text-xs text-theme-muted truncate">{result.sessionName.replace(/\+/g, ' + ')}</p>
                              </div>
                              <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                isSelected ? 'text-blue-400' : 'text-theme-muted'
                              }`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                // Mode normal : séances groupées
                groupedHistory.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <h3 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {group.label}
                    </h3>
                    <div className="space-y-2">
                      {group.sessions.map(session => renderSessionListItem(session))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========== PANNEAU DROIT : DÉTAIL ========== */}
          <div
            className="bg-theme-secondary/50 border border-theme rounded-xl"
            style={{
              width: '60%',
              height: '100%',
              overflowY: 'auto'
            }}
          >
            {renderDetailPanel()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {deleteConfirm && (() => {
        const sessionToDelete = history.find(s => s.id === deleteConfirm);
        if (!sessionToDelete) return null;
        return (
          <DeleteConfirmModal
            session={sessionToDelete}
            onConfirm={() => handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
            anchorRef={deleteButtonRef}
          />
        );
      })()}

      {editConfirm && (() => {
        const sessionToEdit = history.find(s => s.id === editConfirm);
        if (!sessionToEdit) return null;
        return (
          <EditConfirmModal
            session={sessionToEdit}
            onConfirm={() => handleEditConfirmed(sessionToEdit)}
            onCancel={() => setEditConfirm(null)}
            isManualSession={isManualSession(sessionToEdit)}
            anchorRef={editButtonRef}
          />
        );
      })()}
    </>
  );
};

// Alias pour compatibilité
export const History = HistoryDesktop;
export default HistoryDesktop;
