// ============================================================
// F.Y.T - HISTORY MOBILE (Version avec RPE)
// src/components/mobile/HistoryMobile.tsx
// Historique des séances avec affichage des RPE
// ============================================================

import React, { useState, useMemo, useRef, TouchEvent, useEffect } from 'react';
import { SessionLog, getRpeColor, getRpeBgColor, getRpeInfo, SetLog, SetLoad, groupExerciseLogs, isExerciseLogGroup, ExerciseLog, ExerciseLogGroup, EXECUTION_MODES } from '../../../types';
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Search,
  Gauge,
  X,
  Calendar,
  Download,
  Link2,
  RefreshCw
} from 'lucide-react';
import { RpeBadge } from '../common/RpeSelector';
import { StravaHistoryCard } from '../desktop/StravaHistoryCard';
import { HistoryKPICard } from './HistoryKPICard';
import { DeleteConfirmModal } from '../common/history/DeleteConfirmModal';
import { EditConfirmModal } from '../common/history/EditConfirmModal';
import { RelaunchConfirmModal } from '../common/history/RelaunchConfirmModal';

interface Props {
  history: SessionLog[];
  onDelete: (id: string) => void;
  onEdit: (log: SessionLog) => void;
  onRelaunch?: (session: SessionLog) => void;
  userId?: string;
  // [DEAD CODE] onEditManualSession?: (session: SessionLog) => void;
  // Navigation depuis Stats (pour voir la seance d'un PR)
  targetSessionLogId?: string | null;
  targetExerciseName?: string | null;
  targetDate?: string | null;
  onClearTarget?: () => void;
}

const isStravaSession = (log: SessionLog): boolean => {
  return log.sessionKey.seance.toLowerCase().includes('strava');
};

// [DEAD CODE] Manual session support
// const MANUAL_ENTRY_MARKER = 'MANUAL_ENTRY';
// const MANUAL_ENTRY_DISPLAY = 'Séance insérée manuellement';

// const isManualSession = (log: SessionLog): boolean => {
//   // Supporter l'ancien et le nouveau format
//   return log.comments === MANUAL_ENTRY_MARKER || log.comments === 'manual_entry';
// };

// Pour afficher le texte dans l'UI (au lieu de 'manual_entry' ou 'MANUAL_ENTRY')
const getSessionCommentDisplay = (log: SessionLog): string | null => {
  // [DEAD CODE] if (isManualSession(log)) {
  //   return MANUAL_ENTRY_DISPLAY;
  // }
  return log.comments || null;
};

// Fonction pour séparer poids et type de charge
function getWeightAndType(set: SetLog): { weight: string; type: string | null } {
  // Si pas de données JSONB (load), afficher simplement le poids
  if (!set.load) {
    const weight = set.weight || '-';
    return { weight: weight === '-' ? '-' : `${weight} kg`, type: null };
  }

  const load = set.load;

  if (load.type === 'single') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return { weight: weightText === '-' ? '-' : `${weightText} kg`, type: 'Haltère' };
    }
    return { weight: `${weight} kg`, type: 'Haltère' };
  }

  if (load.type === 'double') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return { weight: weightText === '-' ? '-' : `${weightText} kg`, type: '2 × Haltères' };
    }
    return { weight: `2 × ${weight} kg`, type: '2 × Haltères' };
  }

  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : null;
    const total = addedKg !== null ? barKg + addedKg : barKg;
    return { weight: `${total} kg`, type: `Barre ${barKg} + ${addedKg ?? 0}` };
  }

  if (load.type === 'machine') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return { weight: weightText === '-' ? '-' : `${weightText} kg`, type: 'Machine' };
    }
    return { weight: `${weight} kg`, type: 'Machine' };
  }

  if (load.type === 'assisted') {
    const assistance = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (assistance === null) {
      return { weight: '-', type: 'Assisté' };
    }
    return { weight: `-${assistance} kg`, type: 'Assisté' };
  }

  if (load.type === 'distance') {
    const distance = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (distance === null) {
      return { weight: '-', type: 'Distance' };
    }
    return { weight: `${distance} ${load.unit}`, type: null };
  }

  const weightText = set.weight || '-';
  return { weight: weightText === '-' ? '-' : `${weightText} kg`, type: null };
}

export const HistoryMobile: React.FC<Props> = ({
  history,
  onDelete,
  onEdit,
  onRelaunch,
  userId,
  // [DEAD CODE] onEditManualSession,
  targetSessionLogId,
  targetExerciseName,
  targetDate,
  onClearTarget
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEditId, setConfirmEditId] = useState<string | null>(null);
  const [confirmRelaunchSession, setConfirmRelaunchSession] = useState<SessionLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [tempDateBySessionId, setTempDateBySessionId] = useState<Record<string, string>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<string, Set<number>>>({});

  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const targetSessionRef = useRef<HTMLDivElement>(null);

  const filteredHistory = useMemo(() => {
    let result = [...history];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.exercises.some(ex => ex.exerciseName.toLowerCase().includes(term)) ||
        log.sessionKey.seance.toLowerCase().includes(term)
      );
    }
    
    if (selectedMonth !== null) {
      result = result.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
      });
    }
    
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return result;
  }, [history, searchTerm, selectedMonth, currentYear]);

  // ===========================================
  // AUTO-EXPAND TARGET SESSION (from Stats page)
  // ===========================================
  useEffect(() => {
    if (!targetSessionLogId) return;

    // Trouver la seance ciblee
    const targetSession = history.find(log => log.id === targetSessionLogId);
    if (!targetSession) {
      // Seance non trouvee, nettoyer
      onClearTarget?.();
      return;
    }

    // Deplier la seance
    setExpandedId(targetSessionLogId);

    // Trouver et deplier l'exercice cible
    if (targetExerciseName) {
      const exerciseIndex = targetSession.exercises.findIndex(
        ex => ex.exerciseName.toLowerCase() === targetExerciseName.toLowerCase()
      );
      if (exerciseIndex !== -1) {
        setExpandedExercises(prev => ({
          ...prev,
          [targetSessionLogId]: new Set([...(prev[targetSessionLogId] || []), exerciseIndex])
        }));
      }
    }

    // Scroller vers la seance avec un petit delai pour laisser le DOM se mettre a jour
    setTimeout(() => {
      targetSessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    // Nettoyer le target apres navigation
    // On ne le fait pas immediatement pour permettre le scroll
    setTimeout(() => {
      onClearTarget?.();
    }, 500);
  }, [targetSessionLogId, targetExerciseName, history, onClearTarget]);

  // ===========================================
  // AUTO-EXPAND TARGET DATE SESSIONS (from Heatmap)
  // ===========================================
  useEffect(() => {
    if (!targetDate) return;

    // Trouver les séances de cette date
    const sessionsOfDay = history.filter(log => log.date === targetDate);
    if (sessionsOfDay.length === 0) {
      onClearTarget?.();
      return;
    }

    // Déplier la première séance du jour
    const firstSession = sessionsOfDay[0];
    setExpandedId(firstSession.id);

    // Scroller vers la séance
    setTimeout(() => {
      targetSessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    // Nettoyer après navigation
    setTimeout(() => {
      onClearTarget?.();
    }, 500);
  }, [targetDate, history, onClearTarget]);

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const handleTouchStart = (id: string, e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (id: string, e: TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 50) {
      setSwipedId(id);
    } else if (diff < -50) {
      setSwipedId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const toInputDateValue = (iso: string): string => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleStartEditDate = (sessionId: string, isoDate: string) => {
    setEditingDateId(sessionId);
    setTempDateBySessionId(prev => ({
      ...prev,
      [sessionId]: toInputDateValue(isoDate)
    }));
  };

  const handleSaveDate = (log: SessionLog) => {
    const value = tempDateBySessionId[log.id];
    if (!value) {
      setEditingDateId(null);
      return;
    }
    const [yy, mm, dd] = value.split('-').map(v => parseInt(v, 10));
    const newDate = new Date(yy, mm - 1, dd, 12, 0, 0).toISOString();
    onEdit({ ...log, date: newDate });
    setEditingDateId(null);
  };

  const toggleExerciseExpand = (sessionId: string, index: number) => {
    setExpandedExercises(prev => {
      const current = new Set(prev[sessionId] || []);
      if (current.has(index)) current.delete(index); else current.add(index);
      return { ...prev, [sessionId]: current };
    });
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* V3: Stats Header agrandissable (ATH-003) */}
      <HistoryKPICard history={history} />

      {/* Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-theme-secondary border border-theme rounded-xl text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-2 text-theme-muted hover:text-theme"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-theme font-medium min-w-[60px] text-center">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-2 text-theme-muted hover:text-theme"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMonth(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedMonth === null
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-theme-tertiary text-theme-muted hover:text-theme'
                }`}
              >
                Tous
              </button>
              {months.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMonth(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedMonth === i
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-theme-tertiary text-theme-muted hover:text-theme'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-theme-muted mx-auto mb-4" />
          <p className="text-theme-muted">Aucune séance trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((log) => {
            if (isStravaSession(log) && userId) {
              return (
                <StravaHistoryCard
                  key={log.id}
                  log={log}
                  onDelete={onDelete}
                  userId={userId}
                />
              );
            }

            const isExpanded = expandedId === log.id;
            const isSwiped = swipedId === log.id;
            const isDeleting = deletingId === log.id;

            const isTargetSession = targetSessionLogId === log.id || (targetDate === log.date && history.filter(l => l.date === targetDate)[0]?.id === log.id);

            return (
              <div
                key={log.id}
                ref={isTargetSession ? targetSessionRef : undefined}
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                  isDeleting ? 'opacity-0 scale-95' : ''
                } ${isTargetSession ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-theme' : ''}`}
                onTouchStart={(e) => handleTouchStart(log.id, e)}
                onTouchMove={(e) => handleTouchMove(log.id, e)}
              >
                {/* Swipe Action */}
                <div className={`absolute inset-y-0 right-0 flex items-center justify-end bg-red-600 transition-all ${
                  isSwiped ? 'w-24' : 'w-0'
                }`}>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="w-full h-full flex items-center justify_center text-white"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                {/* Main Card */}
                <div className={`bg-theme-secondary border border-theme transition-transform ${
                  isSwiped ? '-translate-x-24' : ''
                }`}>
                  {/* Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-4 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-theme font-semibold">
                            {log.sessionKey.seance}
                          </span>
                          {/* Boutons edit/delete/relaunch visibles uniquement quand déplié */}
                          {isExpanded && (
                            <>
                              {onRelaunch && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmRelaunchSession(log);
                                  }}
                                  className="p-1.5 hover:bg-[var(--color-accent)]/20 rounded-lg transition-colors"
                                  title="Relancer cette séance"
                                >
                                  <RefreshCw className="w-4 h-4 text-[var(--color-accent)]" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmEditId(log.id);
                                }}
                                className="p-1.5 hover:bg-theme-tertiary rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-theme-muted" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(log.id);
                                }}
                                className="p-1.5 hover:bg-[var(--color-danger)]/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-theme-muted">
                          <span>{formatDate(log.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* RPE */}
                        {/* [DEAD CODE] isManualSession(log) ? (
                          <div className="relative w-12 h-12 flex items-center justify-center bg-[var(--color-primary)]/20 rounded-full" title="Séance importée manuellement">
                            <Download className="w-6 h-6 text-[var(--color-primary)]" />
                          </div>
                        ) : */ log.sessionRpe ? (
                          <RpeBadge rpe={log.sessionRpe} size="md" showLabel={false} />
                        ) : null}

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-theme-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-theme-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-theme pt-4">
                      {/* Exercises (avec support superset) */}
                      <div className="space-y-3">
                        {groupExerciseLogs(log.exercises).map((item, idx) => {
                          const isExExpanded = expandedExercises[log.id]?.has(idx) || false;

                          // Affichage d'un groupe (superset/triset)
                          if (isExerciseLogGroup(item)) {
                            const group = item as ExerciseLogGroup;
                            const maxSets = Math.max(...group.exercises.map(ex => ex.sets.length));
                            return (
                              <button
                                key={group.groupId}
                                className="w-full text-left bg-theme-tertiary rounded-xl p-3 border-l-4 border-[var(--color-primary)]"
                                onClick={() => toggleExerciseExpand(log.id, idx)}
                                type="button"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Noms des exercices empilés */}
                                  <div className="flex-1 min-w-0">
                                    {group.exercises.map((ex, exIdx) => (
                                      <p key={exIdx} className={`font-medium text-theme text-sm truncate ${exIdx > 0 ? 'mt-0.5 border-t border-theme/20 pt-0.5' : ''}`}>
                                        {ex.exerciseName}
                                      </p>
                                    ))}
                                  </div>
                                  {/* RPE + icône mode */}
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-sm text-theme-secondary">
                                      {typeof group.avgRpe === 'number' ? `RPE ${group.avgRpe}` : 'RPE -'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Link2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                      <ChevronDown className={`w-4 h-4 text-theme-muted transition-transform ${isExExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                </div>
                                {/* Séries groupées */}
                                {isExExpanded && (
                                  <div className="mt-3 space-y-2">
                                    {Array.from({ length: maxSets }, (_, setIdx) => (
                                      <div key={setIdx} className="bg-theme-secondary/50 rounded-lg p-2">
                                        <div className="text-[10px] text-theme-muted font-medium mb-1">Série {setIdx + 1}</div>
                                        {group.exercises.map((ex, exIdx) => {
                                          const set = ex.sets[setIdx];
                                          if (!set) return (
                                            <div key={exIdx} className="text-sm text-theme-muted/50 pl-1">-</div>
                                          );
                                          const { weight, type } = getWeightAndType(set);
                                          return (
                                            <div key={exIdx} className={`flex items-center gap-2 text-sm ${set.completed ? '' : 'opacity-50'}`}>
                                              <span className="text-theme flex-1">{set.reps || '—'} × {weight}</span>
                                              {set.completed && <span className="text-[var(--color-success)]">✓</span>}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </button>
                            );
                          }

                          // Affichage d'un exercice simple
                          const exercise = item as ExerciseLog;
                          return (
                            <button
                              key={idx}
                              className="w-full text-left bg-theme-tertiary rounded-xl p-3"
                              onClick={() => toggleExerciseExpand(log.id, idx)}
                              type="button"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-theme text-sm truncate">{exercise.exerciseName}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-theme-secondary">
                                    {typeof exercise.rpe === 'number' ? `RPE ${exercise.rpe}` : 'RPE -'}
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-theme-muted transition-transform ${isExExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              {isExExpanded && (
                                <div className="mt-2 space-y-1">
                                  {exercise.sets.map((set, setIdx) => {
                                    const { weight, type } = getWeightAndType(set);
                                    return (
                                      <div
                                        key={setIdx}
                                        className={`flex items-center gap-3 text-sm p-2 rounded-lg ${set.completed ? 'bg-[var(--color-success)]/10' : 'bg-theme-secondary'}`}
                                      >
                                        <span className="text-theme-muted w-8">#{set.setNumber}</span>
                                        <span className="text-theme flex-1">{set.reps || '—'}</span>
                                        <span className="text-theme-muted">×</span>
                                        <div className="flex flex-col items-end">
                                          <span className="text-theme-secondary">{weight}</span>
                                          {type && <span className="text-theme-muted text-[10px]">{type}</span>}
                                        </div>
                                        {set.completed && <span className="text-[var(--color-success)]">✓</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Comments */}
                      {getSessionCommentDisplay(log) && (
                        <div className="bg-theme-tertiary rounded-xl p-3 text-sm text-theme-muted italic">
                          {getSessionCommentDisplay(log)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Pop-up confirmation de suppression */}
      {confirmDeleteId && (() => {
        const sessionToDelete = history.find(h => h.id === confirmDeleteId);
        if (!sessionToDelete) return null;
        return (
          <DeleteConfirmModal
            session={sessionToDelete}
            onConfirm={() => {
              setDeletingId(confirmDeleteId);
              onDelete(confirmDeleteId);
              setConfirmDeleteId(null);
              setSwipedId(null);
            }}
            onCancel={() => setConfirmDeleteId(null)}
            showCloseButton
          />
        );
      })()}

      {/* Pop-up confirmation de modification */}
      {confirmEditId && (() => {
        const sessionToEdit = history.find(h => h.id === confirmEditId);
        if (!sessionToEdit) return null;
        // [DEAD CODE] const isManual = isManualSession(sessionToEdit);
        return (
          <EditConfirmModal
            session={sessionToEdit}
            onConfirm={() => {
              // [DEAD CODE] if (isManual && onEditManualSession) {
              //   onEditManualSession(sessionToEdit);
              // } else {
              onEdit(sessionToEdit);
              // }
              setConfirmEditId(null);
            }}
            onCancel={() => setConfirmEditId(null)}
            // [DEAD CODE] isManualSession={isManual}
            showCloseButton
          />
        );
      })()}

      {/* Pop-up confirmation de relance */}
      {confirmRelaunchSession && (
        <RelaunchConfirmModal
          session={confirmRelaunchSession}
          onConfirm={() => {
            onRelaunch?.(confirmRelaunchSession);
            setConfirmRelaunchSession(null);
          }}
          onCancel={() => setConfirmRelaunchSession(null)}
        />
      )}
    </div>
  );
};

// Alias pour compatibilité
export const History = HistoryMobile;
export const HistoryAthlete = HistoryMobile;

export default HistoryMobile;
