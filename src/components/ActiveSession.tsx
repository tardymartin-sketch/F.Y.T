// ============================================================
// F.Y.T - ACTIVE SESSION (Version avec persistence)
// src/components/ActiveSession.tsx
// Séance d'entraînement active avec persistence localStorage
// ============================================================

import React, { useState, useEffect } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey, AthleteComment, SetLoad } from '../../types';
import {
  Save,
  Clock,
  ChevronDown,
  X,
  AlertTriangle,
  Video,
  ExternalLink,
  Calendar,
  History,
  Plus,
  Minus,
  Check,
  MessageSquare,
  Send,
  Edit2
} from 'lucide-react';
import { RpeSelector, SessionRpeModal, RpeBadge } from './RpeSelector';
import { ConversationThread, ThreadMessage } from './ConversationThread';
import { useTempData } from '../hooks/useUIState';
import { setLocalStorageWithEvent, removeLocalStorageWithEvent } from '../utils/localStorageEvents';

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[];
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
  userId?: string;
  onSaveComment?: (exerciseName: string, comment: string, sessionId: string) => Promise<void>;
  existingComments?: AthleteComment[];
  onMarkCommentsAsRead?: (commentIds: string[]) => Promise<void>;
  onNavigateToCoachTab?: (exerciseName: string) => void;
}

export const ActiveSession: React.FC<Props> = ({
  sessionData,
  history,
  onSave,
  onCancel,
  initialLog,
  userId,
  onSaveComment,
  existingComments = [],
  onMarkCommentsAsRead,
  onNavigateToCoachTab
}) => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(0);
  
  // Mode rétroactif
  const [isRetroMode, setIsRetroMode] = useState(false);
  const [retroDate, setRetroDate] = useState({ year: '', month: '', day: '' });
  
  // Modal historique
  const [historyModalExercise, setHistoryModalExercise] = useState<string | null>(null);

  // Comments state (avec persistance via store singleton)
  const [persistedComments, setPersistedComments] = useTempData<Record<string, string>>('active-session-comments');
  const exerciseComments = persistedComments || {};
  const setExerciseComments = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setPersistedComments(updater(exerciseComments));
  };
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [sentComments, setSentComments] = useState<Set<string>>(new Set());

  // État pour le modal RPE de fin de séance
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(null);

  // V3: État pour le thread de conversation (ATH-006)
  const [activeThreadExercise, setActiveThreadExercise] = useState<string | null>(null);

  const isEditMode = !!initialLog;
  const [editingDateEnabled, setEditingDateEnabled] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');
  const toInputDateValue = (iso: string): string => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  useEffect(() => {
    if (initialLog) {
      setEditDateInput(toInputDateValue(initialLog.date));
    }
  }, [initialLog]);

  // Initialisation des logs
  useEffect(() => {
    // Vérifier s'il y a une session en cours dans localStorage
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (savedSession && !initialLog) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.logs && parsed.sessionData) {
          // Vérifier si c'est la même session
          const savedSessionIds = parsed.sessionData.map((s: any) => `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`).sort().join(',');
          const currentSessionIds = sessionData.map(s => `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`).sort().join(',');
          
          if (savedSessionIds === currentSessionIds) {
            setLogs(parsed.logs);
            
            // Restaurer l'exercice déplié
            if (typeof parsed.expandedExercise === 'number') {
              setExpandedExercise(parsed.expandedExercise);
            }
            
            // Restaurer la position de scroll après le rendu
            if (typeof parsed.scrollPosition === 'number') {
              setTimeout(() => {
                window.scrollTo(0, parsed.scrollPosition);
              }, 100);
            }
            
            return;
          }
        }
      } catch (e) {
        console.error('Erreur parsing session sauvegardée:', e);
      }
    }

    // Sinon, initialiser normalement
    if (initialLog) {
      setLogs(initialLog.exercises);
    } else {
      const grouped = new Map<string, WorkoutRow[]>();
      sessionData.forEach(row => {
        const key = row.exercice;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      });

      const initialLogs: ExerciseLog[] = Array.from(grouped.entries()).map(([name, rows]) => {
        const row = rows[0];
        const numSets = parseInt(row.series) || 3;
        return {
          exerciseName: name,
          originalSession: row.seance,
          sets: Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1,
            reps: '',
            weight: '',
            completed: false,
          })),
          notes: row.notes || '',
        };
      });
      
      setLogs(initialLogs);
    }
  }, [sessionData, initialLog]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // PERSISTENCE: Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    if (logs.length > 0 && !isEditMode) {
      saveToLocalStorage(logs, expandedExercise);
    }
  }, [logs, isEditMode, expandedExercise]);

  // Sauvegarder la position de scroll périodiquement
  useEffect(() => {
    const handleScroll = () => {
      if (logs.length > 0 && !isEditMode) {
        const savedSession = localStorage.getItem('F.Y.T_active_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            parsed.scrollPosition = window.scrollY;
            setLocalStorageWithEvent('F.Y.T_active_session', JSON.stringify(parsed));
          } catch (e) {
            // Ignorer les erreurs
          }
        }
      }
    };

    // Debounce le scroll pour éviter trop d'écritures
    let scrollTimeout: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 300);
    };

    window.addEventListener('scroll', debouncedScroll);
    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(scrollTimeout);
    };
  }, [logs, isEditMode]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    (newLogs[exerciseIndex].sets[setIndex] as any)[field] = value;
    setLogs(newLogs);
  };

  const updateExerciseRpe = (exerciseIndex: number, rpe: number) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex].rpe = rpe;
    setLogs(newLogs);
  };

  const saveToLocalStorage = (logsToSave: ExerciseLog[], currentExpandedExercise: number | null) => {
    setLocalStorageWithEvent('F.Y.T_active_session', JSON.stringify({
      logs: logsToSave,
      sessionData: sessionData.map(s => ({ seance: s.seance, annee: s.annee, moisNum: s.moisNum, semaine: s.semaine })),
      startTime,
      expandedExercise: currentExpandedExercise,
      scrollPosition: window.scrollY
    }));
  };

  const addSet = (exerciseIndex: number) => {
    const newLogs = [...logs];
    const currentSets = newLogs[exerciseIndex].sets;
    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: '',
      weight: '',
      completed: false
    });
    setLogs(newLogs);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newLogs = [...logs];
    newLogs[exerciseIndex].sets.splice(setIndex, 1);
    newLogs[exerciseIndex].sets.forEach((s, i) => s.setNumber = i + 1);
    setLogs(newLogs);
  };

  const handleFinish = async () => {
    if (isRetroMode && (!retroDate.year || !retroDate.month || !retroDate.day)) {
      alert("Veuillez remplir la date complète pour enregistrer une séance passée.");
      return;
    }

    const sessionKey: SessionKey = {
      annee: sessionData[0]?.annee || '',
      moisNum: sessionData[0]?.moisNum || '',
      semaine: sessionData[0]?.semaine || '',
      seance: Array.from(new Set(sessionData.map(d => d.seance))).join('+')
    };

    let finalDate = new Date().toISOString();
    
    if (isEditMode && initialLog) {
      if (editDateInput) {
        const [yy, mm, dd] = editDateInput.split('-').map(v => parseInt(v, 10));
        finalDate = new Date(yy, mm - 1, dd, 12, 0, 0).toISOString();
      } else {
        finalDate = initialLog.date;
      }
    }
    
    if (isRetroMode) {
      const d = new Date(
        parseInt(retroDate.year), 
        parseInt(retroDate.month) - 1, 
        parseInt(retroDate.day), 
        12, 0, 0
      );
      finalDate = d.toISOString();
    }

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: finalDate,
      sessionKey,
      exercises: logs,
      durationMinutes: isRetroMode ? 60 : Math.round(elapsedTime / 60),
      sessionRpe: undefined
    };

    setPendingSessionLog(finalLog);
    setShowSessionRpeModal(true);
  };

  const handleSessionRpeSubmit = async (sessionRpe: number) => {
    if (!pendingSessionLog) return;

    setSaving(true);
    const finalLog = { ...pendingSessionLog, sessionRpe };
    console.log('[ActiveSession] Sauvegarde avec RPE:', finalLog);

    try {
      await onSave(finalLog);
      removeLocalStorageWithEvent('F.Y.T_active_session');
      setShowSessionRpeModal(false);
    } catch (e: any) {
      console.error("[ActiveSession] Erreur sauvegarde:", e);
      console.error("[ActiveSession] Erreur message:", e?.message);
      console.error("[ActiveSession] Erreur code:", e?.code);
      const errorMsg = e?.message || "Erreur inconnue";
      alert(`Erreur lors de la sauvegarde: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipSessionRpe = async () => {
    if (!pendingSessionLog) return;

    setSaving(true);
    console.log('[ActiveSession] Sauvegarde sans RPE:', pendingSessionLog);

    try {
      await onSave(pendingSessionLog);
      removeLocalStorageWithEvent('F.Y.T_active_session');
      setShowSessionRpeModal(false);
    } catch (e: any) {
      console.error("[ActiveSession] Erreur sauvegarde:", e);
      console.error("[ActiveSession] Erreur message:", e?.message);
      console.error("[ActiveSession] Erreur code:", e?.code);
      const errorMsg = e?.message || "Erreur inconnue";
      alert(`Erreur lors de la sauvegarde: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const formatSetWeight = (set: SetLog): string => {
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
    
    const weightText = set.weight || '-';
    return weightText === '-' ? '-' : `${weightText} kg.`;
  };

  const getLastExerciseHistory = (name: string) => {
    // Chercher la dernière exécution complétée (toutes les séries complétées)
    for (const session of history) {
      const ex = session.exercises.find(e => e.exerciseName === name);
      if (ex && ex.sets.length > 0) {
        const allCompleted = ex.sets.every(s => s.completed);
        if (allCompleted) {
          return { date: session.date, sets: ex.sets, rpe: ex.rpe };
        }
      }
    }
    
    // Si aucune exécution complétée, prendre la dernière (même incomplète)
    for (const session of history) {
      const ex = session.exercises.find(e => e.exerciseName === name);
      if (ex && ex.sets.length > 0) {
        return { date: session.date, sets: ex.sets, rpe: ex.rpe };
      }
    }
    
    return null;
  };

  const getProgress = (): number => {
    const totalSets = logs.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = logs.reduce((acc, ex) => 
      acc + ex.sets.filter(s => s.completed).length, 0
    );
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  };

  const handleSendComment = async (exerciseName: string) => {
    const comment = exerciseComments[exerciseName]?.trim();
    if (!comment || !onSaveComment) return;
    
    setCommentSending(exerciseName);
    try {
      const sessionId = initialLog?.id || 'pending-session';
      await onSaveComment(exerciseName, comment, sessionId);
      setSentComments(prev => new Set([...prev, exerciseName]));
      setExerciseComments(prev => ({ ...prev, [exerciseName]: '' }));
    } catch (e) {
      console.error("Erreur envoi commentaire:", e);
      alert("Erreur lors de l'envoi du commentaire");
    } finally {
      setCommentSending(null);
    }
  };

  // V3: Fonctions pour le thread de conversation (ATH-006)
  const getThreadMessages = (exerciseName: string): ThreadMessage[] => {
    return existingComments
      .filter(c => c.exerciseName === exerciseName)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(c => ({
        id: c.id,
        content: c.comment,
        from: c.userId === userId ? 'me' : 'other',
        timestamp: c.createdAt,
        isRead: c.isRead
      })) as ThreadMessage[];
  };

  const handleOpenThread = (exerciseName: string) => {
    // Si onNavigateToCoachTab est fourni, naviguer vers l'onglet Coach avec la conversation ciblée
    if (onNavigateToCoachTab) {
      onNavigateToCoachTab(exerciseName);
    } else {
      // Sinon, ouvrir le thread local (comportement legacy)
      setActiveThreadExercise(exerciseName);
    }
  };

  const handleCloseThread = () => {
    setActiveThreadExercise(null);
  };

  const handleSendThreadMessage = async (content: string) => {
    if (!activeThreadExercise || !onSaveComment) return;
    const sessionId = initialLog?.id || 'pending-session';
    await onSaveComment(activeThreadExercise, content, sessionId);
  };

  const handleMarkThreadAsRead = async (messageIds: string[]) => {
    if (onMarkCommentsAsRead) {
      await onMarkCommentsAsRead(messageIds);
    }
  };

  const getUnreadCountForExercise = (exerciseName: string): number => {
    return existingComments.filter(
      c => c.exerciseName === exerciseName && c.userId !== userId && !c.isRead
    ).length;
  };

  const sessionTitle = Array.from(new Set(sessionData.map(d => d.seance))).join(' + ');
  const progress = getProgress();
  const currentHistoryData = historyModalExercise ? getLastExerciseHistory(historyModalExercise) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header fixe */}
      <div className="sticky top-0 z-30 -mx-4 px-4 lg:-mx-8 lg:px-8 py-4 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Session {sessionTitle}
            </h1>
            {isEditMode && (
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {editingDateEnabled ? (
                  <input
                    type="date"
                    value={editDateInput}
                    onChange={(e) => setEditDateInput(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-sm text-slate-400">
                    {initialLog ? new Date(initialLog.date).toLocaleDateString('fr-FR') : ''}
                  </span>
                )}
                <button
                  onClick={() => setEditingDateEnabled(v => !v)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  type="button"
                  title="Modifier la date"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-slate-400">{progress}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRetroMode(!isRetroMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isRetroMode 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isRetroMode ? 'Annuler' : 'Séance passée'}
              </span>
            </button>
            
            <button 
              onClick={() => setShowCancelModal(true)}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Terminer'}
            </button>
          </div>
        </div>

        {/* Mode rétroactif */}
        {isRetroMode && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <p className="text-orange-400 text-sm mb-3">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Mode séance passée - Saisissez la date de la séance
            </p>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Jour"
                min="1"
                max="31"
                value={retroDate.day}
                onChange={(e) => setRetroDate(prev => ({ ...prev, day: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center"
              />
              <input
                type="number"
                placeholder="Mois"
                min="1"
                max="12"
                value={retroDate.month}
                onChange={(e) => setRetroDate(prev => ({ ...prev, month: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center"
              />
              <input
                type="number"
                placeholder="Année"
                min="2020"
                max="2030"
                value={retroDate.year}
                onChange={(e) => setRetroDate(prev => ({ ...prev, year: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center"
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des exercices */}
      <div className="space-y-4">
        {logs.map((exercise, exerciseIndex) => {
          const isExpanded = expandedExercise === exerciseIndex;
          const originalData = sessionData.find(d => d.exercice === exercise.exerciseName);
          
          return (
            <div 
              key={exerciseIndex}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {/* Header exercice */}
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : exerciseIndex)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold text-sm">
                    {exerciseIndex + 1}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">{exercise.exerciseName}</h3>
                    <p className="text-xs text-slate-400">
                      {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} séries
                    </p>
                  </div>
                  {exercise.rpe && <RpeBadge rpe={exercise.rpe} size="sm" />}
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Contenu */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Infos exercice */}
                  {originalData && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
                        {originalData.series} × {originalData.repsDuree}
                      </span>
                      {originalData.repos && (
                        <span className="px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
                          {originalData.repos}s repos
                        </span>
                      )}
                      {originalData.tempoRpe && (
                        <span className="px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
                          {originalData.tempoRpe}
                        </span>
                      )}
                      {originalData.video && isValidUrl(originalData.video) && (
                        <a
                          href={originalData.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg flex items-center gap-1"
                        >
                          <Video className="w-3 h-3" /> Vidéo
                        </a>
                      )}
                      <button
                        onClick={() => setHistoryModalExercise(exercise.exerciseName)}
                        className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1"
                      >
                        <History className="w-3 h-3" /> Historique
                      </button>
                      {/* V3: Bouton Chat (ATH-007) */}
                      {onSaveComment && (
                        <button
                          onClick={() => handleOpenThread(exercise.exerciseName)}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg flex items-center gap-1 relative"
                        >
                          <MessageSquare className="w-3 h-3" /> Coach
                          {getUnreadCountForExercise(exercise.exerciseName) > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                              {getUnreadCountForExercise(exercise.exerciseName)}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {originalData?.notes && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                      {originalData.notes}
                    </div>
                  )}

                  {/* Séries */}
                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div 
                        key={setIndex}
                        className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl transition-all ${
                          set.completed 
                            ? 'bg-emerald-500/20 border border-emerald-500/30' 
                            : 'bg-slate-800/50'
                        }`}
                      >
                        <span className="w-7 sm:w-8 text-center text-slate-400 font-medium text-sm sm:text-base flex-shrink-0">
                          S{set.setNumber}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Reps"
                          value={set.reps}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                          className="w-16 sm:w-20 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-white text-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Kg"
                          value={set.weight}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                          className="w-16 sm:w-20 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-2 sm:px-3 py-2 text-white text-center text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => updateSet(exerciseIndex, setIndex, 'completed', !set.completed)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                            set.completed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        {exercise.sets.length > 1 && (
                          <button
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            className="p-1.5 sm:p-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addSet(exerciseIndex)}
                    className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une série
                  </button>

                  {/* RPE Exercice */}
                  <div className="pt-2 border-t border-slate-800">
                    <RpeSelector
                      value={exercise.rpe}
                      onChange={(rpe) => updateExerciseRpe(exerciseIndex, rpe)}
                      compact
                    />
                  </div>

                  {/* Commentaire pour le coach */}
                  {onSaveComment && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Message au coach</span>
                        {sentComments.has(exercise.exerciseName) && (
                          <span className="text-xs text-emerald-400">✓ Envoyé</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Un commentaire pour votre coach..."
                          value={exerciseComments[exercise.exerciseName] || ''}
                          onChange={(e) => setExerciseComments(prev => ({
                            ...prev,
                            [exercise.exerciseName]: e.target.value
                          }))}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleSendComment(exercise.exerciseName)}
                          disabled={!exerciseComments[exercise.exerciseName]?.trim() || commentSending === exercise.exerciseName}
                          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Historique */}
      {historyModalExercise && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{historyModalExercise}</h3>
                {currentHistoryData?.rpe && (
                  <RpeBadge rpe={currentHistoryData.rpe} size="sm" />
                )}
              </div>
              <button
                onClick={() => setHistoryModalExercise(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {currentHistoryData ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Dernière séance : {new Date(currentHistoryData.date).toLocaleDateString('fr-FR')}
                </p>
                <div className="space-y-2">
                  {currentHistoryData.sets.map((set, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3">
                      <span className="text_sm text-slate-400">Série {set.setNumber}</span>
                      <span className="text-white font-medium">{set.reps || '-'}</span>
                      <span className="text-slate-500">×</span>
                      <span className="text-emerald-400 font-medium">{formatSetWeight(set)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                Aucun historique pour cet exercice
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal Annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Abandonner la séance ?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Votre progression ne sera pas sauvegardée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Continuer
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal RPE de séance */}
      {showSessionRpeModal && pendingSessionLog && (
        <SessionRpeModal
          onSubmit={handleSessionRpeSubmit}
          onSkip={handleSkipSessionRpe}
          sessionName={sessionTitle}
          durationMinutes={pendingSessionLog.durationMinutes || 0}
          exerciseCount={logs.length}
        />
      )}

      {/* V3: Thread de conversation (ATH-006) */}
      {activeThreadExercise && (
        <div className="fixed inset-0 z-50 bg-slate-950">
          <ConversationThread
            exerciseName={activeThreadExercise}
            sessionName={sessionTitle}
            sessionDate={initialLog?.date}
            messages={getThreadMessages(activeThreadExercise)}
            currentUserId={userId || ''}
            onBack={handleCloseThread}
            onSendMessage={handleSendThreadMessage}
            onMarkAsRead={handleMarkThreadAsRead}
          />
        </div>
      )}
    </div>
  );
};

export default ActiveSession;
