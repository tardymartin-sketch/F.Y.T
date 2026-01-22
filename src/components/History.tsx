// ============================================================
// F.Y.T - HISTORY (Version avec RPE)
// src/components/History.tsx
// Historique des séances avec affichage des RPE
// ============================================================

import React, { useState, useMemo, useRef, TouchEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SessionLog, getRpeColor, getRpeBgColor, getRpeInfo, SetLog, SetLoad } from '../../types';
import {
  Clock,
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
  Download
} from 'lucide-react';
import { RpeBadge } from './RpeSelector';
import { StravaHistoryCard } from './StravaHistoryCard';
import { HistoryKPICard } from './HistoryKPICard';

interface Props {
  history: SessionLog[];
  onDelete: (id: string) => void;
  onEdit: (log: SessionLog) => void;
  userId?: string;
  onEditManualSession?: (session: SessionLog) => void;
  // Navigation depuis Stats (pour voir la seance d'un PR)
  targetSessionLogId?: string | null;
  targetExerciseName?: string | null;
  targetDate?: string | null;
  onClearTarget?: () => void;
}

const isStravaSession = (log: SessionLog): boolean => {
  return log.sessionKey.seance.toLowerCase().includes('strava');
};

const MANUAL_ENTRY_MARKER = 'MANUAL_ENTRY';
const MANUAL_ENTRY_DISPLAY = 'Séance insérée manuellement';

const isManualSession = (log: SessionLog): boolean => {
  // Supporter l'ancien et le nouveau format
  return log.comments === MANUAL_ENTRY_MARKER || log.comments === 'manual_entry';
};

// Pour afficher le texte dans l'UI (au lieu de 'manual_entry' ou 'MANUAL_ENTRY')
const getSessionCommentDisplay = (log: SessionLog): string | null => {
  if (isManualSession(log)) {
    return MANUAL_ENTRY_DISPLAY;
  }
  return log.comments || null;
};

function formatSetWeight(set: SetLog): string {
  // Si pas de données JSONB (load), afficher simplement le poids
  if (!set.load) {
    const weight = set.weight || '-';
    return weight === '-' ? '-' : `${weight} kg.`;
  }

  const load = set.load;
  
  if (load.type === 'single') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `${weight} kg. (Haltères/Kettlebell)`;
  }
  
  if (load.type === 'double') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `2 X ${weight} kg. (2 X Haltères/Kettlebell)`;
  }
  
  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : null;
    const total = addedKg !== null ? barKg + addedKg : barKg;
    if (addedKg === null) {
      return `${total} kg. (Barre: ${barKg} + Poids: 0)`;
    }
    return `${total} kg. (Barre: ${barKg} + Poids: ${addedKg})`;
  }
  
  if (load.type === 'machine') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `${weight} kg. (Sur machine)`;
  }

  if (load.type === 'assisted') {
    const assistance = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (assistance === null) {
      return '- (Assisté)';
    }
    return `-${assistance} kg. (Assisté)`;
  }

  if (load.type === 'distance') {
    const distance = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (distance === null) {
      return '- (Distance)';
    }
    return `${distance} ${load.unit}`;
  }

  const weightText = set.weight || '-';
  return weightText === '-' ? '-' : `${weightText} kg.`;
}

export const History: React.FC<Props> = ({
  history,
  onDelete,
  onEdit,
  userId,
  onEditManualSession,
  targetSessionLogId,
  targetExerciseName,
  targetDate,
  onClearTarget
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium min-w-[60px] text-center">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMonth(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedMonth === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
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
          <Dumbbell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Aucune séance trouvée</p>
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
            
            const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
            const completedSets = log.exercises.reduce((acc, ex) => 
              acc + ex.sets.filter(s => s.completed).length, 0
            );
            const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

            const isTargetSession = targetSessionLogId === log.id || (targetDate === log.date && history.filter(l => l.date === targetDate)[0]?.id === log.id);

            return (
              <div
                key={log.id}
                ref={isTargetSession ? targetSessionRef : undefined}
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                  isDeleting ? 'opacity-0 scale-95' : ''
                } ${isTargetSession ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950' : ''}`}
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
                <div className={`bg-slate-900 border border-slate-800 transition-transform ${
                  isSwiped ? '-translate-x-24' : ''
                }`}>
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">
                            {log.sessionKey.seance}
                          </span>
                          {log.sessionRpe && (
                            <RpeBadge rpe={log.sessionRpe} size="sm" showLabel={false} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span>{formatDate(log.date)}</span>
                          {log.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {log.durationMinutes}min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Progress Ring ou Icône Import pour séances manuelles */}
                        {isManualSession(log) ? (
                          <div className="relative w-12 h-12 flex items-center justify-center bg-blue-500/20 rounded-full" title="Séance importée manuellement">
                            <Download className="w-6 h-6 text-blue-400" />
                          </div>
                        ) : (
                          <div className="relative w-12 h-12">
                            <svg className="w-12 h-12 -rotate-90">
                              <circle
                                cx="24" cy="24" r="20"
                                fill="none"
                                stroke="#1e293b"
                                strokeWidth="4"
                              />
                              <circle
                                cx="24" cy="24" r="20"
                                fill="none"
                                stroke={progress === 100 ? '#10b981' : '#3b82f6'}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${progress * 1.256} 125.6`}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        )}

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (isManualSession(log) && onEditManualSession) {
                              onEditManualSession(log);
                            } else {
                              onEdit(log);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* RPE Global */}
                      {log.sessionRpe && (
                        <div className={`p-3 rounded-xl ${getRpeBgColor(log.sessionRpe)} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <Gauge className={`w-5 h-5 ${getRpeColor(log.sessionRpe)}`} />
                            <span className="text-sm font-medium text-slate-300">RPE de la séance</span>
                          </div>
                          <RpeBadge rpe={log.sessionRpe} size="md" />
                        </div>
                      )}

                      {/* Exercises */}
                      <div className="space-y-3">
                        {log.exercises.map((exercise, idx) => {
                          const isExExpanded = expandedExercises[log.id]?.has(idx) || false;
                          return (
                            <button
                              key={idx}
                              className="w-full text-left bg-slate-800/50 rounded-xl p-3"
                              onClick={() => toggleExerciseExpand(log.id, idx)}
                              type="button"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-white text-sm truncate">{exercise.exerciseName}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-300">
                                    {typeof exercise.rpe === 'number' ? `RPE ${exercise.rpe}` : 'RPE -'}
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              {isExExpanded && (
                                <div className="mt-2 space-y-1">
                                  {exercise.sets.map((set, setIdx) => (
                                    <div
                                      key={setIdx}
                                      className={`flex items-center gap-3 text-sm p-2 rounded-lg ${set.completed ? 'bg-emerald-500/10' : 'bg-slate-800/50'}`}
                                    >
                                      <span className="text-slate-500 w-8">#{set.setNumber}</span>
                                      <span className="text-white flex-1">{set.reps || '—'}</span>
                                      <span className="text-slate-400">×</span>
                                      <span className="text-slate-400">{formatSetWeight(set)}</span>
                                      {set.completed && <span className="text-emerald-400">✓</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Comments */}
                      {getSessionCommentDisplay(log) && (
                        <div className="bg-slate-800/30 rounded-xl p-3 text-sm text-slate-400 italic">
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
      {(() => {
        if (!confirmDeleteId) return null;
        const sessionToDelete = history.find(h => h.id === confirmDeleteId);
        if (!sessionToDelete) return null;
        const fullDate = new Date(sessionToDelete.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        return createPortal(
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Supprimer la séance ?</h3>
                    <p className="text-sm text-slate-400">Cette action est irréversible</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
                <h4 className="font-semibold text-white text-lg mb-1">
                  {sessionToDelete.sessionKey.seance}
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  {fullDate}
                </div>
                {sessionToDelete.sessionRpe && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase font-bold">RPE</span>
                    <RpeBadge rpe={sessionToDelete.sessionRpe} size="sm" />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setDeletingId(confirmDeleteId);
                    onDelete(confirmDeleteId);
                    setConfirmDeleteId(null);
                    setSwipedId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default History;
