// ============================================================
// F.Y.T - ACTIVE SESSION ATHLETE (Mobile-First Mode Focus)
// src/components/athlete/ActiveSessionAthlete.tsx
// Séance en deux phases: Récapitulatif → Mode Focus
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey } from '../../../types';
import { 
  Play,
  Pause,
  Clock, 
  X, 
  Video, 
  ExternalLink, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
  Dumbbell,
  ListChecks,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Send,
  Info
} from 'lucide-react';
import { RpeSelector, SessionRpeModal, RpeBadge } from '../RpeSelector';
import { Card, CardContent } from '../shared/Card';

// ===========================================
// TYPES
// ===========================================

interface Props {
  sessionData: WorkoutRow[];
  history: SessionLog[];
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null;
  userId?: string;
  onSaveComment?: (exerciseName: string, comment: string, sessionId: string) => Promise<void>;
}

type SessionPhase = 'recap' | 'focus';

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins}:${secs.toString().padStart(2, '0')}`;
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

function getSuggestedWeight(exerciseName: string, history: SessionLog[]): string | null {
  for (const session of history) {
    const exercise = session.exercises.find(
      ex => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exercise && exercise.sets.length > 0) {
      const completedSets = exercise.sets.filter(s => s.completed && s.weight);
      if (completedSets.length > 0) {
        return completedSets[completedSets.length - 1].weight;
      }
    }
  }
  return null;
}

function getLastPerformance(exerciseName: string, history: SessionLog[]): { reps: string; weight: string; rpe?: number } | null {
  for (const session of history) {
    const exercise = session.exercises.find(
      ex => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exercise && exercise.sets.length > 0) {
      const completedSets = exercise.sets.filter(s => s.completed);
      if (completedSets.length > 0) {
        const lastSet = completedSets[completedSets.length - 1];
        return {
          reps: lastSet.reps,
          weight: lastSet.weight,
          rpe: exercise.rpe
        };
      }
    }
  }
  return null;
}

// ===========================================
// COMPONENT
// ===========================================

export const ActiveSessionAthlete: React.FC<Props> = ({
  sessionData,
  history,
  onSave,
  onCancel,
  initialLog,
  userId,
  onSaveComment
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [phase, setPhase] = useState<SessionPhase>('recap');
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Mode focus state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null);
  
  // Comments
  const [exerciseComments, setExerciseComments] = useState<Record<string, string>>({});
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [sentComments, setSentComments] = useState<Set<string>>(new Set());

  const isEditMode = !!initialLog;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  useEffect(() => {
    // Vérifier s'il y a une session en cours dans localStorage
    const savedSession = localStorage.getItem('F.Y.T_active_session_athlete');
    if (savedSession && !initialLog) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.logs && parsed.sessionData) {
          const savedSessionIds = parsed.sessionData.map((s: any) => 
            `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`
          ).sort().join(',');
          const currentSessionIds = sessionData.map(s => 
            `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`
          ).sort().join(',');
          
          if (savedSessionIds === currentSessionIds) {
            setLogs(parsed.logs);
            setPhase(parsed.phase || 'recap');
            setStartTime(parsed.startTime || null);
            setCurrentExerciseIndex(parsed.currentExerciseIndex || 0);
            setCurrentSetIndex(parsed.currentSetIndex || 0);
            return;
          }
        }
      } catch (e) {
        console.error('Erreur parsing session sauvegardée:', e);
      }
    }

    // Initialiser les logs depuis sessionData
    if (initialLog) {
      setLogs(initialLog.exercises);
      setPhase('focus');
      setStartTime(Date.now());
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
        const suggestedWeight = getSuggestedWeight(name, history);
        
        return {
          exerciseName: name,
          originalSession: row.seance,
          sets: Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1,
            reps: '',
            weight: suggestedWeight || '',
            completed: false,
          })),
          notes: row.notes || '',
        };
      });
      
      setLogs(initialLogs);
    }
  }, [sessionData, initialLog, history]);

  // ===========================================
  // TIMER
  // ===========================================
  
  useEffect(() => {
    if (phase !== 'focus' || !startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [phase, startTime]);

  // ===========================================
  // PERSISTENCE
  // ===========================================
  
  useEffect(() => {
    if (logs.length > 0 && !isEditMode) {
      saveToLocalStorage();
    }
  }, [logs, phase, currentExerciseIndex, currentSetIndex]);

  const saveToLocalStorage = useCallback(() => {
    localStorage.setItem('F.Y.T_active_session_athlete', JSON.stringify({
      logs,
      sessionData: sessionData.map(s => ({ 
        seance: s.seance, 
        annee: s.annee, 
        moisNum: s.moisNum, 
        semaine: s.semaine 
      })),
      phase,
      startTime,
      currentExerciseIndex,
      currentSetIndex
    }));
  }, [logs, sessionData, phase, startTime, currentExerciseIndex, currentSetIndex]);

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem('F.Y.T_active_session_athlete');
  }, []);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  
  const progress = useMemo(() => {
    const totalSets = logs.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = logs.reduce(
      (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
      0
    );
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  }, [logs]);

  const currentExercise = logs[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  
  const originalExerciseData = useMemo(() => {
    if (!currentExercise) return null;
    return sessionData.find(d => d.exercice === currentExercise.exerciseName);
  }, [currentExercise, sessionData]);

  const lastPerformance = useMemo(() => {
    if (!currentExercise) return null;
    return getLastPerformance(currentExercise.exerciseName, history);
  }, [currentExercise, history]);

  const sessionTitle = useMemo(() => {
    const seances = [...new Set(sessionData.map(d => d.seance))];
    return seances.join(' + ');
  }, [sessionData]);

  // ===========================================
  // HANDLERS
  // ===========================================
  
  const handleStartSession = useCallback(() => {
    setPhase('focus');
    setStartTime(Date.now());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
  }, []);

  const updateSet = useCallback((field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    (newLogs[currentExerciseIndex].sets[currentSetIndex] as any)[field] = value;
    setLogs(newLogs);
  }, [logs, currentExerciseIndex, currentSetIndex]);

  // ===========================================
  // COMMENT AUTO-SAVE ON EXERCISE CHANGE
  // ===========================================
  
  const saveCurrentExerciseCommentIfNeeded = useCallback(async () => {
    if (!onSaveComment) return;
    
    const currentExerciseName = logs[currentExerciseIndex]?.exerciseName;
    const comment = exerciseComments[currentExerciseName]?.trim();
    
    if (!comment || sentComments.has(currentExerciseName)) return;
    
    console.log('[saveCurrentExerciseCommentIfNeeded] Sauvegarde auto du commentaire pour:', currentExerciseName);
    
    try {
      const sessionId = pendingSessionLog?.id || 'active';
      await onSaveComment(currentExerciseName, comment, sessionId);
      setSentComments(prev => new Set([...prev, currentExerciseName]));
      // On ne vide pas le champ pour que l'utilisateur puisse voir ce qu'il a écrit
      console.log('[saveCurrentExerciseCommentIfNeeded] Commentaire sauvegardé avec succès');
    } catch (error) {
      console.error('[saveCurrentExerciseCommentIfNeeded] Erreur:', error);
    }
  }, [onSaveComment, logs, currentExerciseIndex, exerciseComments, sentComments, pendingSessionLog]);

  const validateCurrentSet = useCallback(async () => {
    const newLogs = [...logs];
    newLogs[currentExerciseIndex].sets[currentSetIndex].completed = true;
    setLogs(newLogs);
    
    // Navigation automatique
    if (currentSetIndex < currentExercise.sets.length - 1) {
      // Prochaine série du même exercice
      setCurrentSetIndex(currentSetIndex + 1);
    } else if (currentExerciseIndex < logs.length - 1) {
      // Prochain exercice - sauvegarder le commentaire avant de changer
      await saveCurrentExerciseCommentIfNeeded();
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
    }
    // Sinon on reste sur la dernière série (l'utilisateur peut terminer)
  }, [logs, currentExerciseIndex, currentSetIndex, currentExercise, saveCurrentExerciseCommentIfNeeded]);

  const toggleSetValidation = useCallback(() => {
    const newLogs = [...logs];
    const isCurrentlyCompleted = newLogs[currentExerciseIndex].sets[currentSetIndex].completed;
    newLogs[currentExerciseIndex].sets[currentSetIndex].completed = !isCurrentlyCompleted;
    setLogs(newLogs);
  }, [logs, currentExerciseIndex, currentSetIndex]);

  const goToPreviousExercise = useCallback(async () => {
    if (currentExerciseIndex > 0) {
      // Sauvegarder le commentaire avant de changer d'exercice
      await saveCurrentExerciseCommentIfNeeded();
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex, saveCurrentExerciseCommentIfNeeded]);

  const goToNextExercise = useCallback(async () => {
    if (currentExerciseIndex < logs.length - 1) {
      // Sauvegarder le commentaire avant de changer d'exercice
      await saveCurrentExerciseCommentIfNeeded();
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
    }
  }, [currentExerciseIndex, logs.length, saveCurrentExerciseCommentIfNeeded]);

  const addSet = useCallback(() => {
    const newLogs = [...logs];
    const currentSets = newLogs[currentExerciseIndex].sets;
    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: '',
      weight: currentSets[currentSets.length - 1]?.weight || '',
      completed: false
    });
    setLogs(newLogs);
  }, [logs, currentExerciseIndex]);

  const removeCurrentSet = useCallback(() => {
    if (currentExercise.sets.length <= 1) return;
    
    const newLogs = [...logs];
    newLogs[currentExerciseIndex].sets.splice(currentSetIndex, 1);
    newLogs[currentExerciseIndex].sets.forEach((s, i) => s.setNumber = i + 1);
    setLogs(newLogs);
    
    if (currentSetIndex >= newLogs[currentExerciseIndex].sets.length) {
      setCurrentSetIndex(newLogs[currentExerciseIndex].sets.length - 1);
    }
  }, [logs, currentExerciseIndex, currentSetIndex, currentExercise]);

  const updateExerciseRpe = useCallback((rpe: number) => {
    const newLogs = [...logs];
    newLogs[currentExerciseIndex].rpe = rpe;
    setLogs(newLogs);
  }, [logs, currentExerciseIndex]);

  const handleFinish = useCallback(async () => {
    // Sauvegarder le commentaire du dernier exercice avant de terminer
    await saveCurrentExerciseCommentIfNeeded();
    
    const sessionKey: SessionKey = {
      annee: sessionData[0]?.annee || '',
      moisNum: sessionData[0]?.moisNum || '',
      semaine: sessionData[0]?.semaine || '',
      seance: Array.from(new Set(sessionData.map(d => d.seance))).join('+')
    };

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: new Date().toISOString(),
      sessionKey,
      exercises: logs,
      durationMinutes: Math.round(elapsedTime / 60),
      sessionRpe: undefined
    };

    setPendingSessionLog(finalLog);
    setShowSessionRpeModal(true);
  }, [sessionData, logs, elapsedTime, isEditMode, initialLog, saveCurrentExerciseCommentIfNeeded]);

  const handleSessionRpeSubmit = useCallback(async (sessionRpe: number) => {
    if (!pendingSessionLog) return;
    
    setSaving(true);
    const finalLog = { ...pendingSessionLog, sessionRpe };

    try {
      await onSave(finalLog);
      clearLocalStorage();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
      setShowSessionRpeModal(false);
    }
  }, [pendingSessionLog, onSave, clearLocalStorage]);

  const handleSkipSessionRpe = useCallback(async () => {
    if (!pendingSessionLog) return;
    
    setSaving(true);
    try {
      await onSave(pendingSessionLog);
      clearLocalStorage();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
      setShowSessionRpeModal(false);
    }
  }, [pendingSessionLog, onSave, clearLocalStorage]);

  const handleCancel = useCallback(() => {
    clearLocalStorage();
    onCancel();
  }, [clearLocalStorage, onCancel]);

  const handleSendComment = useCallback(async (exerciseName: string) => {
    if (!onSaveComment || !exerciseComments[exerciseName]?.trim()) return;
    
    setCommentSending(exerciseName);
    try {
      const sessionId = pendingSessionLog?.id || 'active';
      await onSaveComment(exerciseName, exerciseComments[exerciseName], sessionId);
      setSentComments(prev => new Set([...prev, exerciseName]));
      setExerciseComments(prev => ({ ...prev, [exerciseName]: '' }));
    } catch (error) {
      console.error('Erreur envoi commentaire:', error);
    } finally {
      setCommentSending(null);
    }
  }, [exerciseComments, onSaveComment, pendingSessionLog]);

  // ===========================================
  // RENDER: RECAP PHASE
  // ===========================================
  
  const renderRecapPhase = () => (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Annuler</span>
          </button>
          <h1 className="text-lg font-semibold text-white">{sessionTitle}</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stats Summary */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{logs.length}</p>
            <p className="text-sm text-slate-400">exercices</p>
          </div>
          <div className="w-px h-12 bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {logs.reduce((acc, ex) => acc + ex.sets.length, 0)}
            </p>
            <p className="text-sm text-slate-400">séries</p>
          </div>
          <div className="w-px h-12 bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {formatDuration(estimateSessionDuration(sessionData)).replace('~', '')}
            </p>
            <p className="text-sm text-slate-400">estimé</p>
          </div>
        </div>

        {/* Exercise List */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Programme de la séance
          </h2>
          
          {logs.map((exercise, index) => {
            const exerciseData = sessionData.find(d => d.exercice === exercise.exerciseName);
            const lastPerf = getLastPerformance(exercise.exerciseName, history);
            
            return (
              <Card key={index} variant="default" className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-slate-400">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {exercise.exerciseName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-400">
                        {exerciseData?.series || exercise.sets.length} × {exerciseData?.repsDuree || '?'}
                      </span>
                      {lastPerf && (
                        <span className="text-xs text-blue-400">
                          Dernier: {lastPerf.reps}×{lastPerf.weight}
                        </span>
                      )}
                    </div>
                    {exercise.notes && (
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {exercise.notes}
                      </p>
                    )}
                  </div>
                  
                  {exerciseData?.video && (
                    <button
                      onClick={() => setShowVideoModal(exerciseData.video)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <button
          onClick={handleStartSession}
          className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
        >
          <Play className="w-6 h-6 fill-current" />
          <span className="text-lg">Lancer la séance</span>
        </button>
      </div>
    </div>
  );

  // ===========================================
  // RENDER: FOCUS PHASE
  // ===========================================
  
  const renderFocusPhase = () => {
    if (!currentExercise || !currentSet) {
      return <div className="p-4 text-white">Chargement...</div>;
    }

    const isLastSet = currentSetIndex === currentExercise.sets.length - 1;
    const isLastExercise = currentExerciseIndex === logs.length - 1;
    const allSetsCompleted = currentExercise.sets.every(s => s.completed);

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Pause className="w-5 h-5" />
              <span>Pause</span>
            </button>
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-slate-400 w-12 text-right">{progress}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Exercice {currentExerciseIndex + 1}/{logs.length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto" ref={scrollContainerRef}>
          {/* Exercise Card */}
          <Card variant="gradient" className="overflow-hidden">
            <CardContent className="p-0">
              {/* Exercise Header */}
              <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {currentExercise.exerciseName}
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {originalExerciseData?.series} × {originalExerciseData?.repsDuree}
                      {originalExerciseData?.tempoRpe && originalExerciseData.tempoRpe !== '-' && (
                        <span className="ml-2 text-slate-500">
                          Tempo: {originalExerciseData.tempoRpe}
                        </span>
                      )}
                    </p>
                  </div>
                  {originalExerciseData?.video && (
                    <button
                      onClick={() => setShowVideoModal(originalExerciseData.video)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              {currentExercise.notes && (
                <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200">{currentExercise.notes}</p>
                  </div>
                </div>
              )}

              {/* Series Selector */}
              <div className="px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Séries</span>
                  <div className="flex gap-1">
                    <button
                      onClick={addSet}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentExercise.sets.map((set, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSetIndex(idx)}
                      className={`
                        w-10 h-10 rounded-lg font-medium transition-all
                        ${idx === currentSetIndex
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                          : set.completed
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }
                      `}
                    >
                      {set.completed ? <Check className="w-4 h-4 mx-auto" /> : idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Set Inputs */}
              <div className="p-4 space-y-4">
                <div className="text-center mb-4">
                  <span className="text-lg font-semibold text-white">
                    Série {currentSetIndex + 1}
                  </span>
                  {currentSet.completed && (
                    <span className="ml-2 text-emerald-400 text-sm">✓ Validée</span>
                  )}
                </div>

                {/* Reps Input - Numeric Keyboard */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Répétitions</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={originalExerciseData?.repsDuree?.replace(/[^0-9]/g, '') || '8'}
                    value={currentSet.reps}
                    onChange={(e) => updateSet('reps', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white text-center text-2xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Weight Input - Full Keyboard */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Charge</label>
                  <input
                    type="text"
                    placeholder="ex: 80kg, PDC, élastique..."
                    value={currentSet.weight}
                    onChange={(e) => updateSet('weight', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white text-center text-xl font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Validate Button */}
                <button
                  onClick={currentSet.completed ? toggleSetValidation : validateCurrentSet}
                  className={`
                    w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]
                    ${currentSet.completed
                      ? 'bg-emerald-600 text-white'
                      : isLastSet && isLastExercise
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                    }
                  `}
                >
                  <Check className="w-5 h-5" />
                  <span>
                    {currentSet.completed 
                      ? 'Validée (tap pour annuler)' 
                      : isLastSet && isLastExercise
                        ? 'Valider & Terminer'
                        : 'Valider la série'
                    }
                  </span>
                </button>

                {/* Remove Set Button */}
                {currentExercise.sets.length > 1 && (
                  <button
                    onClick={removeCurrentSet}
                    className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                    <span className="text-sm">Supprimer cette série</span>
                  </button>
                )}
              </div>

              {/* Exercise RPE */}
              {allSetsCompleted && (
                <div className="px-4 py-3 border-t border-slate-700/50">
                  <RpeSelector
                    value={currentExercise.rpe}
                    onChange={updateExerciseRpe}
                    compact
                  />
                </div>
              )}

              {/* Comment for Coach */}
              {onSaveComment && (
                <div className="px-4 py-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400">Message au coach</span>
                    </div>
                    {sentComments.has(currentExercise.exerciseName) ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Envoyé
                      </span>
                    ) : exerciseComments[currentExercise.exerciseName]?.trim() ? (
                      <span className="text-xs text-blue-400">Sera envoyé au changement d'exercice</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Douleur, sensation, question..."
                      value={exerciseComments[currentExercise.exerciseName] || ''}
                      onChange={(e) => setExerciseComments(prev => ({
                        ...prev,
                        [currentExercise.exerciseName]: e.target.value
                      }))}
                      disabled={sentComments.has(currentExercise.exerciseName)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleSendComment(currentExercise.exerciseName)}
                      disabled={!exerciseComments[currentExercise.exerciseName]?.trim() || commentSending === currentExercise.exerciseName || sentComments.has(currentExercise.exerciseName)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      title="Envoyer maintenant"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Performance */}
          {lastPerformance && (
            <div className="mt-4 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">💡 Dernière fois:</span>
                <span className="text-white font-medium">
                  {lastPerformance.reps} × {lastPerformance.weight}
                </span>
                {lastPerformance.rpe && (
                  <RpeBadge rpe={lastPerformance.rpe} size="sm" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousExercise}
              disabled={currentExerciseIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            {/* Dots Indicator */}
            <div className="flex gap-1.5">
              {logs.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentExerciseIndex(idx);
                    setCurrentSetIndex(0);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentExerciseIndex
                      ? 'bg-blue-500 w-4'
                      : logs[idx].sets.every(s => s.completed)
                        ? 'bg-emerald-500'
                        : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {isLastExercise && allSetsCompleted ? (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold transition-colors"
              >
                <span>Terminer</span>
                <Check className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={goToNextExercise}
                disabled={currentExerciseIndex === logs.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // MODALS
  // ===========================================
  
  const renderCancelModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Abandonner ?</h3>
            <p className="text-sm text-slate-400">Ta progression sera perdue</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowCancelModal(false)}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            Continuer
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
          >
            Abandonner
          </button>
        </div>
      </div>
    </div>
  );

  const renderVideoModal = () => {
    if (!showVideoModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowVideoModal(null)}
              className="p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <a
            href={showVideoModal}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Ouvrir la vidéo
          </a>
        </div>
      </div>
    );
  };

  // ===========================================
  // MAIN RENDER
  // ===========================================
  
  return (
    <>
      {phase === 'recap' ? renderRecapPhase() : renderFocusPhase()}
      
      {showCancelModal && renderCancelModal()}
      {showVideoModal && renderVideoModal()}
      
      {showSessionRpeModal && pendingSessionLog && (
        <SessionRpeModal
          onSubmit={handleSessionRpeSubmit}
          onSkip={handleSkipSessionRpe}
          sessionName={sessionTitle}
          durationMinutes={pendingSessionLog.durationMinutes || 0}
          exerciseCount={logs.length}
        />
      )}
    </>
  );
};

export default ActiveSessionAthlete;
