// ============================================================
// F.Y.T - ACTIVE SESSION ATHLETE (Mobile-First Mode Focus)
// src/components/athlete/ActiveSessionAthlete.tsx
// Séance en deux phases: Récapitulatif → Mode Focus
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, SessionKey, SetLoad, RPE_SCALE } from '../../../types';
import {
  Play,
  Pause,
  Clock,
  X,
  Calendar,
  Video,
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
  Info,
  Edit2
} from 'lucide-react';
import { RpeSelector, SessionRpeModal, RpeBadge } from '../RpeSelector';
import { Card, CardContent } from '../shared/Card';
import { setLocalStorageWithEvent, removeLocalStorageWithEvent } from '../../utils/localStorageEvents';
import { fetchGhostSession, GhostSession } from '../../services/supabaseService';

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

function parseKgLikeToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getLoadTotalKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  if (load.type === 'single' || load.type === 'machine') {
    return typeof load.weightKg === 'number' ? load.weightKg : null;
  }
  if (load.type === 'double') {
    return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
  }
  if (load.type === 'barbell') {
    const added = typeof load.addedKg === 'number' ? load.addedKg : null;
    if (typeof load.barKg !== 'number') return null;
    if (added === null) return null;
    return load.barKg + added;
  }
  if (load.type === 'assisted') {
    // Pour assisted, on retourne la valeur négative (assistance)
    return typeof load.assistanceKg === 'number' ? -load.assistanceKg : null;
  }
  if (load.type === 'distance') {
    // Distance n'a pas de poids
    return null;
  }
  return null;
}

function getLoadLabel(load: SetLoad | undefined): string {
  if (!load) return 'Charge';
  if (load.type === 'single') return 'Haltère / KB';
  if (load.type === 'double') return '2x Haltères / KB';
  if (load.type === 'barbell') return 'Barre + poids';
  if (load.type === 'machine') return 'Machine';
  if (load.type === 'assisted') return 'Assisté';
  if (load.type === 'distance') return 'Distance';
  return 'Charge';
}

function createDefaultLoad(type: SetLoad['type'] = 'single', fromTotalKg: number | null = null): SetLoad {
  if (type === 'barbell') {
    const barKg = 20;
    const addedKg = typeof fromTotalKg === 'number' ? Math.max(fromTotalKg - barKg, 0) : null;
    return { type: 'barbell', unit: 'kg', barKg, addedKg };
  }
  if (type === 'double') {
    const weightKg = typeof fromTotalKg === 'number' ? fromTotalKg / 2 : null;
    return { type: 'double', unit: 'kg', weightKg };
  }
  if (type === 'machine') {
    const weightKg = typeof fromTotalKg === 'number' ? fromTotalKg : null;
    return { type: 'machine', unit: 'kg', weightKg };
  }
  if (type === 'assisted') {
    // Assisted: valeur positive = assistance
    const assistanceKg = typeof fromTotalKg === 'number' ? Math.abs(fromTotalKg) : null;
    return { type: 'assisted', unit: 'kg', assistanceKg };
  }
  if (type === 'distance') {
    return { type: 'distance', unit: 'cm', distanceValue: null };
  }
  const weightKg = typeof fromTotalKg === 'number' ? fromTotalKg : null;
  return { type: 'single', unit: 'kg', weightKg };
}

function normalizeExerciseLogs(exercises: ExerciseLog[]): ExerciseLog[] {
  return exercises.map(ex => ({
    ...ex,
    sets: (Array.isArray(ex.sets) ? ex.sets : []).map((s) => {
      const anySet = s as any;
      const weightStr = typeof anySet.weight === 'string' ? anySet.weight : '';
      const existingLoad = anySet.load as SetLoad | undefined;
      if (existingLoad) return s;
      const inferredKg = weightStr ? parseKgLikeToNumber(weightStr) : null;
      return {
        ...s,
        load: createDefaultLoad('single', inferredKg),
      };
    })
  }));
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

function formatSetWeight(set: SetLog): React.ReactNode {
  // Si pas de données JSONB (load), afficher simplement le poids
  if (!set.load) {
    const weight = set.weight || '-';
    return weight === '-' ? '-' : `${weight} kg.`;
  }

  const load = set.load;
  const smallTextClass = "text-xs text-slate-400 font-normal block mt-0.5 leading-tight";
  
  if (load.type === 'single') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{weight} kg.</span>
        <span className={smallTextClass}>(Haltères/Kettlebell)</span>
      </div>
    );
  }
  
  if (load.type === 'double') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>2 X {weight} kg.</span>
        <span className={smallTextClass}>(2 X Haltères/Kettlebell)</span>
      </div>
    );
  }
  
  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : null;
    const total = addedKg !== null ? barKg + addedKg : barKg;
    if (addedKg === null) {
      return (
        <div className="flex flex-col items-center justify-center w-full">
          <span>{total} kg.</span>
          <span className={smallTextClass}>(Barre: {barKg} + Poids: 0)</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{total} kg.</span>
        <span className={smallTextClass}>(Barre: {barKg} + Poids: {addedKg})</span>
      </div>
    );
  }
  
  if (load.type === 'machine') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{weight} kg.</span>
        <span className={smallTextClass}>(Sur machine)</span>
      </div>
    );
  }

  if (load.type === 'assisted') {
    const assistance = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (assistance === null) {
      return '-';
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>-{assistance} kg.</span>
        <span className={smallTextClass}>(Assisté)</span>
      </div>
    );
  }

  if (load.type === 'distance') {
    const distance = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (distance === null) {
      return '-';
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{distance} {load.unit}</span>
        <span className={smallTextClass}>(Distance)</span>
      </div>
    );
  }

  const weightText = set.weight || '-';
  return weightText === '-' ? '-' : `${weightText} kg.`;
}

function getLastExerciseHistory(
  exerciseName: string,
  history: SessionLog[]
): { date: string; sets: SetLog[]; rpe?: number } | null {
  // Chercher la dernière exécution complétée (toutes les séries complétées)
  for (const session of history) {
    const exercise = session.exercises.find(
      ex => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exercise && exercise.sets.length > 0) {
      // Vérifier si toutes les séries sont complétées
      const allCompleted = exercise.sets.every(s => s.completed);
      if (allCompleted) {
        return {
          date: session.date,
          sets: exercise.sets,
          rpe: exercise.rpe
        };
      }
    }
  }
  
  // Si aucune exécution complétée, prendre la dernière (même incomplète)
  for (const session of history) {
    const exercise = session.exercises.find(
      ex => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exercise && exercise.sets.length > 0) {
      return {
        date: session.date,
        sets: exercise.sets,
        rpe: exercise.rpe
      };
    }
  }
  
  return null;
}

/**
 * Récupère les données ghost pour un set spécifique
 * Retourne le set correspondant de la meilleure performance passée
 */
function getGhostSetForDisplay(
  ghost: GhostSession | undefined,
  setIndex: number
): { weight: number; reps: number; volume: number } | null {
  if (!ghost || !ghost.sets || ghost.sets.length === 0) return null;

  // Utiliser le set correspondant ou le dernier set disponible
  const ghostSet = ghost.sets[setIndex] || ghost.sets[ghost.sets.length - 1];
  if (!ghostSet) return null;

  // Extraire le poids depuis le load JSONB ou weight string
  let weight = 0;
  const anySet = ghostSet as any;
  if (anySet.load) {
    const load = anySet.load;
    if (load.type === 'single' || load.type === 'machine') {
      weight = typeof load.weightKg === 'number' ? load.weightKg : 0;
    } else if (load.type === 'double') {
      weight = typeof load.weightKg === 'number' ? load.weightKg * 2 : 0;
    } else if (load.type === 'barbell') {
      weight = (load.barKg || 0) + (load.addedKg || 0);
    }
  } else if (anySet.weight) {
    const parsed = parseFloat(String(anySet.weight).replace(',', '.'));
    weight = Number.isFinite(parsed) ? parsed : 0;
  }

  // Extraire les reps
  const reps = typeof anySet.reps === 'number'
    ? anySet.reps
    : parseInt(String(anySet.reps || '0').replace(/[^0-9]/g, '')) || 0;

  const volume = weight * reps;

  return { weight, reps, volume };
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
  const [currentSetIndexes, setCurrentSetIndexes] = useState<Record<number, number>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<number, boolean>>({});
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(null);
  
  // Comments
  const [exerciseComments, setExerciseComments] = useState<Record<string, string>>({});
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [sentComments, setSentComments] = useState<Set<string>>(new Set());

  // Ghost Mode
  const [ghostSessions, setGhostSessions] = useState<Record<string, GhostSession>>({});
  const [recapOpenConsignes, setRecapOpenConsignes] = useState<Record<number, boolean>>({});
  const [recapOpenHistory, setRecapOpenHistory] = useState<Record<number, boolean>>({});
  const [focusOpenConsignes, setFocusOpenConsignes] = useState<Record<number, boolean>>({});
  const [focusOpenHistory, setFocusOpenHistory] = useState<Record<number, boolean>>({});
  const [showForceFinishModal, setShowForceFinishModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<number | null>(null);
  const [showConsignesModal, setShowConsignesModal] = useState<number | null>(null);

  const isEditMode = !!initialLog;
  const [editingDateEnabled, setEditingDateEnabled] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');
  const [validatedEditDate, setValidatedEditDate] = useState<string | null>(null);

  // Animation changement de série
  const [setAnimating, setSetAnimating] = useState<Record<number, boolean>>({});
  const [prevSetIndex, setPrevSetIndex] = useState<Record<number, number>>({});
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
      setValidatedEditDate(toInputDateValue(initialLog.date));
    }
  }, [initialLog]);
  const handleStartEditDate = useCallback(() => {
    setEditDateInput(validatedEditDate ?? (initialLog ? toInputDateValue(initialLog.date) : ''));
    setEditingDateEnabled(true);
  }, [validatedEditDate, initialLog]);
  const handleValidateEditDate = useCallback(() => {
    if (editDateInput) {
      setValidatedEditDate(editDateInput);
    }
    setEditingDateEnabled(false);
  }, [editDateInput]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rpeSectionRef = useRef<HTMLDivElement>(null);
  const scrollToRpeOnNextCompletedRef = useRef(false);
  const focusRpeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const focusCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pendingScrollToRpeExerciseIndexRef = useRef<number | null>(null);

  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  useEffect(() => {
    // Vérifier s'il y a une session en cours dans localStorage
    const savedSession = localStorage.getItem('F.Y.T_active_session');
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
            setLogs(normalizeExerciseLogs(parsed.logs));
            setPhase(parsed.phase || 'recap');
            setStartTime(parsed.startTime || null);
            setCurrentExerciseIndex(parsed.currentExerciseIndex || 0);
            setCurrentSetIndex(parsed.currentSetIndex || 0);
            setCurrentSetIndexes(parsed.currentSetIndexes || {});
            setExpandedExercises(parsed.expandedExercises || {});
            return;
          }
        }
      } catch (e) {
        console.error('Erreur parsing session sauvegardée:', e);
      }
    }

    // Initialiser les logs depuis sessionData
    if (initialLog) {
      setLogs(normalizeExerciseLogs(initialLog.exercises));
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
        const suggestedKg = suggestedWeight ? parseKgLikeToNumber(suggestedWeight) : null;
        const defaultReps = row.repsDuree
          ? row.repsDuree.replace(/[^0-9]/g, '')
          : '';

        return {
          exerciseId: row.exerciseId,  // Transférer l'ID de l'exercice
          exerciseName: name,
          originalSession: row.seance,
          sets: Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1,
            reps: defaultReps,
            weight: suggestedWeight || '',
            load: createDefaultLoad('single', suggestedKg),
            completed: false,
          })),
          notes: row.notes || '',
        };
      });
      
      setLogs(initialLogs);
    }
  }, [sessionData, initialLog, history]);

  // ===========================================
  // GHOST MODE - Load best performances
  // ===========================================

  useEffect(() => {
    if (!userId || logs.length === 0) return;

    const loadGhostSessions = async () => {
      const ghosts: Record<string, GhostSession> = {};

      for (const exercise of logs) {
        try {
          const ghost = await fetchGhostSession(userId, exercise.exerciseName);
          if (ghost) {
            ghosts[exercise.exerciseName] = ghost;
          }
        } catch (error) {
          console.error(`Error loading ghost for ${exercise.exerciseName}:`, error);
        }
      }

      setGhostSessions(ghosts);
    };

    loadGhostSessions();
  }, [userId, logs.length]); // Reload only when logs are initialized

  useEffect(() => {
    if (!scrollToRpeOnNextCompletedRef.current) return;
    const ex = logs[currentExerciseIndex];
    if (!ex) return;
    const allCompleted = ex.sets.every(s => s.completed);
    if (!allCompleted) return;
    scrollToRpeOnNextCompletedRef.current = false;
    rpeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [logs, currentExerciseIndex]);

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
  
  const saveToLocalStorage = useCallback(() => {
    const value = JSON.stringify({
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
      currentSetIndex,
      currentSetIndexes,
      expandedExercises,
      isEditMode,
      editingSessionId: isEditMode && initialLog ? initialLog.id : null
    });
    setLocalStorageWithEvent('F.Y.T_active_session', value);
  }, [logs, sessionData, phase, startTime, currentExerciseIndex, currentSetIndex, currentSetIndexes, expandedExercises, isEditMode, initialLog]);

  useEffect(() => {
    if (logs.length > 0) {
      saveToLocalStorage();
    }
  }, [logs, phase, currentExerciseIndex, currentSetIndex, currentSetIndexes, expandedExercises, saveToLocalStorage]);

  useEffect(() => {
    const idx = pendingScrollToRpeExerciseIndexRef.current;
    if (idx === null) return;
    const el = focusRpeRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollToRpeExerciseIndexRef.current = null;
    }
  }, [logs]);

  const clearLocalStorage = useCallback(() => {
    removeLocalStorageWithEvent('F.Y.T_active_session');
  }, []);

  const getSetIndexForExercise = useCallback((exerciseIndex: number): number => {
    return typeof currentSetIndexes[exerciseIndex] === 'number' ? currentSetIndexes[exerciseIndex] : 0;
  }, [currentSetIndexes]);

  const setSetIndexForExercise = useCallback((exerciseIndex: number, nextIndex: number) => {
    setCurrentSetIndexes(prev => ({
      ...prev,
      [exerciseIndex]: nextIndex
    }));
  }, []);

  const toggleExerciseExpanded = useCallback((exerciseIndex: number) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseIndex]: !prev[exerciseIndex]
    }));
  }, []);

  const scrollToExerciseCard = useCallback((exerciseIndex: number) => {
    const el = focusCardRefs.current[exerciseIndex];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const allExercisesCompleted = useMemo(() => {
    if (logs.length === 0) return false;
    return logs.every(ex => {
      const allSetsDone = ex.sets.length > 0 && ex.sets.every(s => s.completed);
      const hasRpe = typeof ex.rpe === 'number';
      return allSetsDone && hasRpe;
    });
  }, [logs]);

  // ===========================================
  // HANDLERS
  // ===========================================
  
  const handleStartSession = useCallback(() => {
    setPhase('focus');
    setStartTime(Date.now());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const updateSet = useCallback((field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    (newLogs[currentExerciseIndex].sets[currentSetIndex] as any)[field] = value;
    setLogs(newLogs);
  }, [logs, currentExerciseIndex, currentSetIndex]);

  const updateCurrentSetLoad = useCallback((load: SetLoad) => {
    const totalKg = getLoadTotalKg(load);
    const newLogs = [...logs];
    const set = newLogs[currentExerciseIndex].sets[currentSetIndex];
    (set as any).load = load;
    (set as any).weight = typeof totalKg === 'number' ? String(Math.round(totalKg * 100) / 100) : '';
    setLogs(newLogs);
  }, [logs, currentExerciseIndex, currentSetIndex]);

  const updateSetForExercise = useCallback((exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    const newLogs = [...logs];
    const set = newLogs[exerciseIndex]?.sets?.[setIndex];
    if (!set) return;
    (set as any)[field] = value;
    setLogs(newLogs);
  }, [logs]);

  const updateSetLoadForExercise = useCallback((exerciseIndex: number, setIndex: number, load: SetLoad) => {
    const totalKg = getLoadTotalKg(load);
    const newLogs = [...logs];
    const set = newLogs[exerciseIndex]?.sets?.[setIndex];
    if (!set) return;
    (set as any).load = load;
    (set as any).weight = typeof totalKg === 'number' ? String(Math.round(totalKg * 100) / 100) : '';
    setLogs(newLogs);
  }, [logs]);

  const cycleSetLoadTypeForExercise = useCallback((exerciseIndex: number, setIndex: number) => {
    const set = logs[exerciseIndex]?.sets?.[setIndex];
    if (!set) return;
    const currentLoad = set.load;
    const totalKg = getLoadTotalKg(currentLoad) ?? (set.weight ? parseKgLikeToNumber(set.weight) : null);
    const typeOrder: SetLoad['type'][] = ['single', 'double', 'barbell', 'machine', 'assisted', 'distance'];
    const currentType = currentLoad?.type ?? 'single';
    const idx = typeOrder.indexOf(currentType);
    const nextType = typeOrder[(idx + 1) % typeOrder.length];
    updateSetLoadForExercise(exerciseIndex, setIndex, createDefaultLoad(nextType, totalKg));
  }, [logs, updateSetLoadForExercise]);

  const cycleCurrentSetLoadType = useCallback(() => {
    const set = logs[currentExerciseIndex]?.sets[currentSetIndex];
    if (!set) return;
    const currentLoad = set.load;
    const totalKg = getLoadTotalKg(currentLoad) ?? (set.weight ? parseKgLikeToNumber(set.weight) : null);
    const typeOrder: SetLoad['type'][] = ['single', 'double', 'barbell', 'machine', 'assisted', 'distance'];
    const currentType = currentLoad?.type ?? 'single';
    const idx = typeOrder.indexOf(currentType);
    const nextType = typeOrder[(idx + 1) % typeOrder.length];
    updateCurrentSetLoad(createDefaultLoad(nextType, totalKg));
  }, [logs, currentExerciseIndex, currentSetIndex, updateCurrentSetLoad]);

  const goToPreviousSet = useCallback(() => {
    if (currentSetIndex > 0) setCurrentSetIndex(currentSetIndex - 1);
  }, [currentSetIndex]);

  const goToNextSet = useCallback(() => {
    if (!currentExercise) return;
    if (currentSetIndex < currentExercise.sets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  }, [currentExercise, currentSetIndex]);

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
    } else {
      scrollToRpeOnNextCompletedRef.current = true;
    }
    // Sinon on reste sur la dernière série (l'utilisateur peut terminer)
  }, [logs, currentExerciseIndex, currentSetIndex, currentExercise, saveCurrentExerciseCommentIfNeeded]);

  const validateSetForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    const ex = logs[exerciseIndex];
    const set = ex?.sets?.[setIndex];
    if (!ex || !set) return;

    const newLogs = [...logs];
    newLogs[exerciseIndex].sets[setIndex].completed = true;

    // Pré-remplir la prochaine série avec les valeurs de la série actuelle
    const hasNextSet = setIndex < newLogs[exerciseIndex].sets.length - 1;
    if (hasNextSet) {
      const nextSet = newLogs[exerciseIndex].sets[setIndex + 1];
      nextSet.reps = set.reps;
      (nextSet as any).weight = (set as any).weight;
      if ((set as any).load) {
        (nextSet as any).load = { ...(set as any).load };
      }
    }

    setLogs(newLogs);

    const isLastSet = setIndex === newLogs[exerciseIndex].sets.length - 1;
    if (!isLastSet) {
      // Sauvegarder l'ancien index pour l'animation
      setPrevSetIndex(prev => ({ ...prev, [exerciseIndex]: setIndex }));

      // Déclencher l'animation de changement de série
      setSetAnimating(prev => ({ ...prev, [exerciseIndex]: true }));

      // Changer l'index immédiatement
      setSetIndexForExercise(exerciseIndex, setIndex + 1);

      // Arrêter l'animation après sa durée
      setTimeout(() => {
        setSetAnimating(prev => ({ ...prev, [exerciseIndex]: false }));
      }, 300); // Durée de l'animation (0.3s)

      return;
    }

    if (typeof newLogs[exerciseIndex].rpe !== 'number') {
      pendingScrollToRpeExerciseIndexRef.current = exerciseIndex;
      return;
    }

    setExpandedExercises(prev => ({ ...prev, [exerciseIndex]: false }));
    const nextExerciseIndex = Math.min(exerciseIndex + 1, newLogs.length - 1);
    if (nextExerciseIndex !== exerciseIndex) {
      setExpandedExercises(prev => ({ ...prev, [nextExerciseIndex]: false }));
      setTimeout(() => scrollToExerciseCard(nextExerciseIndex), 50);
    }
  }, [logs, getSetIndexForExercise, setSetIndexForExercise, scrollToExerciseCard]);

  const toggleSetValidationForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    const ex = logs[exerciseIndex];
    const set = ex?.sets?.[setIndex];
    if (!ex || !set) return;

    const newLogs = [...logs];
    newLogs[exerciseIndex].sets[setIndex].completed = !newLogs[exerciseIndex].sets[setIndex].completed;
    setLogs(newLogs);
  }, [logs, getSetIndexForExercise]);

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
    const prev = currentSets[currentSets.length - 1];
    const prevTotalKg = prev?.load ? getLoadTotalKg(prev.load) : (prev?.weight ? parseKgLikeToNumber(prev.weight) : null);
    const nextLoad = prev?.load ? ({ ...prev.load } as SetLoad) : createDefaultLoad('single', prevTotalKg);
    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: '',
      weight: prev?.weight || '',
      load: nextLoad,
      completed: false
    });
    setLogs(newLogs);
  }, [logs, currentExerciseIndex]);

  const addSetForExercise = useCallback((exerciseIndex: number) => {
    const newLogs = [...logs];
    const sets = newLogs[exerciseIndex]?.sets;
    if (!sets) return;
    const prev = sets[sets.length - 1];
    const prevTotalKg = prev?.load ? getLoadTotalKg(prev.load) : (prev?.weight ? parseKgLikeToNumber(prev.weight) : null);
    const nextLoad = prev?.load ? ({ ...prev.load } as SetLoad) : createDefaultLoad('single', prevTotalKg);
    sets.push({
      setNumber: sets.length + 1,
      reps: '',
      weight: prev?.weight || '',
      load: nextLoad,
      completed: false
    });
    setLogs(newLogs);
  }, [logs]);

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

  const removeSetForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    const ex = logs[exerciseIndex];
    if (!ex || ex.sets.length <= 1) return;

    const newLogs = [...logs];
    newLogs[exerciseIndex].sets.splice(setIndex, 1);
    newLogs[exerciseIndex].sets.forEach((s, i) => s.setNumber = i + 1);
    setLogs(newLogs);

    const nextSetIndex = Math.min(setIndex, newLogs[exerciseIndex].sets.length - 1);
    setSetIndexForExercise(exerciseIndex, nextSetIndex);
  }, [logs, getSetIndexForExercise, setSetIndexForExercise]);

  const updateExerciseRpe = useCallback((rpe: number | undefined) => {
    const newLogs = [...logs];
    newLogs[currentExerciseIndex].rpe = rpe;
    setLogs(newLogs);
  }, [logs, currentExerciseIndex]);

  const updateExerciseRpeForExercise = useCallback((exerciseIndex: number, rpe: number | undefined) => {
    const newLogs = [...logs];
    if (!newLogs[exerciseIndex]) return;
    newLogs[exerciseIndex].rpe = rpe;
    setLogs(newLogs);

    if (typeof rpe === 'number' && newLogs[exerciseIndex].sets.every(s => s.completed)) {
      setExpandedExercises(prev => ({ ...prev, [exerciseIndex]: false }));
      const nextExerciseIndex = Math.min(exerciseIndex + 1, newLogs.length - 1);
      if (nextExerciseIndex !== exerciseIndex) {
        setExpandedExercises(prev => ({ ...prev, [nextExerciseIndex]: false }));
        setTimeout(() => scrollToExerciseCard(nextExerciseIndex), 50);
      }
    }
  }, [logs, scrollToExerciseCard]);

  const handleFinish = useCallback(async () => {
    // Sauvegarder le commentaire du dernier exercice avant de terminer
    await saveCurrentExerciseCommentIfNeeded();
    
    const sessionKey: SessionKey = {
      annee: sessionData[0]?.annee || '',
      moisNum: sessionData[0]?.moisNum || '',
      semaine: sessionData[0]?.semaine || '',
      seance: Array.from(new Set(sessionData.map(d => d.seance))).join('+')
    };

    let finalDate = new Date().toISOString();
    if (isEditMode && initialLog) {
      if (validatedEditDate) {
        const [yy, mm, dd] = validatedEditDate.split('-').map(v => parseInt(v, 10));
        finalDate = new Date(yy, mm - 1, dd, 12, 0, 0).toISOString();
      } else {
        finalDate = initialLog.date;
      }
    }

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: finalDate,
      sessionKey,
      exercises: logs.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => {
          if (s.completed) return s;
          return {
            ...s,
            reps: '-',
            weight: '-',
            load: undefined
          };
        })
      })),
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
      // Conserver le RPE existant si présent (mode édition)
      const finalLog = initialLog?.sessionRpe !== undefined 
        ? { ...pendingSessionLog, sessionRpe: initialLog.sessionRpe }
        : pendingSessionLog;
      await onSave(finalLog);
      clearLocalStorage();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
      setShowSessionRpeModal(false);
    }
  }, [pendingSessionLog, initialLog, onSave, clearLocalStorage]);

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
    <div className="min-h-screen bg-slate-950 pb-32">
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
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">{sessionTitle}</h1>
            {isEditMode && (
              <div className="mt-1 flex items-center gap-2 justify-center">
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
                    {validatedEditDate
                      ? new Date(validatedEditDate).toLocaleDateString('fr-FR')
                      : initialLog
                        ? new Date(initialLog.date).toLocaleDateString('fr-FR')
                        : ''}
                  </span>
                )}
                {editingDateEnabled ? (
                  <button
                    onClick={handleValidateEditDate}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    type="button"
                    title="Valider la date"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartEditDate}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    type="button"
                    title="Modifier la date"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Exercise List */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Programme de la séance
          </h2>
          
          {logs.map((exercise, index) => {
            const exerciseData = sessionData.find(d => d.exercice === exercise.exerciseName);
            
            return (
              <Card key={index} variant="default" className="p-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-white line-clamp-3">
                    {exercise.exerciseName}
                  </h3>
                  <div className="mt-3 text-center">
                    <div className="text-xl font-semibold text-white">
                      {exerciseData?.series || exercise.sets.length} × {exerciseData?.repsDuree || '?'}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 justify-center">
                    <button
                      onClick={() => setShowHistoryModal(index)}
                      className="px-3 py-1.5 border border-red-500/40 text-red-300 hover:text-white hover:border-red-400 rounded-lg text-xs font-semibold transition-colors"
                      type="button"
                    >
                      Historique
                    </button>
                    <button
                      onClick={() => setShowConsignesModal(index)}
                      className="px-3 py-1.5 border border-yellow-500/40 text-yellow-200 hover:text-white hover:border-yellow-400 rounded-lg text-xs font-semibold transition-colors"
                      type="button"
                    >
                      Consignes
                    </button>
                    {exerciseData?.video && (
                      <a
                        href={exerciseData.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-300 hover:text-white hover:bg-blue-500/30 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div
        className="fixed right-4 z-20"
        style={{ bottom: 'calc(16px + env(safe-area-inset-bottom) + 64px)' }}
      >
        <button
          onClick={handleStartSession}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold shadow-xl shadow-blue-600/25 transition-all active:scale-[0.98]"
          type="button"
        >
          Go
        </button>
      </div>
    </div>
  );

  // ===========================================
  // RENDER: FOCUS PHASE
  // ===========================================
  
  const renderFocusPhase = () => {
    if (logs.length === 0) {
      return <div className="p-4 text-white">Chargement...</div>;
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 pt-4 pb-3">
          {/* Progress Bar */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-slate-400 w-12 text-right">{progress}%</span>
            </div>
          </div>
          
          <div className="px-4 flex items-center justify-between">
             <div className="flex-1 min-w-0">
             <h1 className="text-lg font-semibold text-white truncate">{sessionTitle}</h1>
              {isEditMode && (
                <div className="mt-1 flex items-center gap-2">
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
                      {validatedEditDate
                        ? new Date(validatedEditDate).toLocaleDateString('fr-FR')
                        : initialLog
                          ? new Date(initialLog.date).toLocaleDateString('fr-FR')
                          : ''}
                    </span>
                  )}
                  {editingDateEnabled ? (
                    <button
                      onClick={handleValidateEditDate}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                      type="button"
                      title="Valider la date"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleStartEditDate}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      type="button"
                      title="Modifier la date"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
             </div>
             <button
              onClick={() => setShowCancelModal(true)}
              className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto" ref={scrollContainerRef}>
          <div className="space-y-3">
            {logs.map((exercise, exerciseIndex) => {
              const exerciseData = sessionData.find(d => d.exercice === exercise.exerciseName);
              const setIndex = getSetIndexForExercise(exerciseIndex);
              const set = exercise.sets[setIndex];
              const isExpanded = !!expandedExercises[exerciseIndex];
              const allSetsCompletedForExercise = exercise.sets.every(s => s.completed);
              const isLastSetIndex = setIndex === exercise.sets.length - 1;
              const isExerciseDone = allSetsCompletedForExercise && typeof exercise.rpe === 'number';
              const lastPerf = getLastPerformance(exercise.exerciseName, history);
              const isConsignesOpen = !!focusOpenConsignes[exerciseIndex];
              const isHistoryOpen = !!focusOpenHistory[exerciseIndex];

              if (!set) return null;

              return (
                <div key={exerciseIndex} className="relative" ref={(el) => { focusCardRefs.current[exerciseIndex] = el; }}>
                  {isExerciseDone && (
                    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-2 pointer-events-none">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                        <Check className="w-5 h-5" />
                      </div>
                      {typeof exercise.rpe === 'number' && (
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-white font-bold shadow-lg text-sm ${RPE_SCALE.find(r => r.value === exercise.rpe)?.color || 'bg-slate-700'}`}>
                          {exercise.rpe}
                        </div>
                      )}
                    </div>
                  )}
                  <Card
                    variant={isExpanded ? 'gradient' : 'default'}
                    className={`overflow-hidden relative ${isExerciseDone ? 'border-2 border-emerald-500/50 bg-emerald-500/10' : ''}`}
                  >
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleExerciseExpanded(exerciseIndex)}
                      className="w-full text-left"
                      type="button"
                    >
                      <div className={`${isExpanded ? 'bg-gradient-to-r from-blue-600/20 to-emerald-600/20' : ''} px-4 py-3 border-b border-slate-700/50`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white line-clamp-3">
                              {exercise.exerciseName}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <div className="px-3 py-1.5 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold">
                                {exerciseData?.series || exercise.sets.length} × {exerciseData?.repsDuree || '?'}
                              </div>
                              {exerciseData?.repos && (
                                <div className="px-3 py-1.5 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold">
                                  {exerciseData.repos}s
                                </div>
                              )}
                              {exerciseData?.tempoRpe && (
                                <div className="px-3 py-1.5 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold">
                                  {exerciseData.tempoRpe}
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowHistoryModal(exerciseIndex);
                                }}
                                className="px-3 py-1.5 border border-red-500/40 text-red-300 hover:text-white hover:border-red-400 rounded-lg text-xs font-semibold transition-colors"
                                type="button"
                              >
                                Historique
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowConsignesModal(exerciseIndex);
                                }}
                                className="px-3 py-1.5 border border-yellow-500/40 text-yellow-200 hover:text-white hover:border-yellow-400 rounded-lg text-xs font-semibold transition-colors"
                                type="button"
                              >
                                Consignes
                              </button>
                              {exerciseData?.video && (
                                <a
                                  href={exerciseData.video}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-2 bg-blue-500/20 border border-blue-500/40 rounded-full text-blue-300 hover:text-white hover:bg-blue-500/30 transition-colors"
                                >
                                  <Video className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <>
                        <div className="px-4 py-3 border-b border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-slate-300">
                                Série {setIndex + 1}/{exercise.sets.length}
                              </div>
                              {set.completed && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
                                  <Check className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeSetForExercise(exerciseIndex)}
                                className="p-1 text-slate-400 hover:text-white transition-colors"
                                type="button"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => addSetForExercise(exerciseIndex)}
                                className="p-1 text-slate-400 hover:text-white transition-colors"
                                type="button"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="text-center overflow-hidden relative h-8 flex items-center justify-center">
                            {setAnimating[exerciseIndex] && prevSetIndex[exerciseIndex] !== undefined ? (
                              <>
                                {/* Ancien label qui sort */}
                                <div
                                  className="text-2xl font-bold text-white absolute"
                                  style={{
                                    animation: 'slideOut 0.3s ease-in-out forwards'
                                  }}
                                >
                                  Série {prevSetIndex[exerciseIndex] + 1}
                                </div>
                                {/* Nouveau label qui entre */}
                                <div
                                  className="text-2xl font-bold text-white absolute"
                                  style={{
                                    animation: 'slideIn 0.3s ease-in-out forwards'
                                  }}
                                >
                                  Série {setIndex + 1}
                                </div>
                              </>
                            ) : (
                              /* Label statique quand pas d'animation */
                              <div className="text-2xl font-bold text-white">
                                Série {setIndex + 1}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-slate-400 mb-2">Répétitions</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={exerciseData?.repsDuree?.replace(/[^0-9]/g, '') || '8'}
                                value={set.reps}
                                onChange={(e) => updateSetForExercise(exerciseIndex, setIndex, 'reps', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm text-slate-400">Charge</label>
                                <button
                                  onClick={() => cycleSetLoadTypeForExercise(exerciseIndex, setIndex)}
                                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                                  type="button"
                                  aria-label="Changer type de charge"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Barbell: 2 inputs (barre + poids ajoutés) */}
                              {set.load?.type === 'barbell' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="20"
                                      value={Number.isFinite(set.load.barKg) ? String(set.load.barKg) : ''}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const n = raw === '' ? 20 : Number(raw.replace(',', '.'));
                                        const prev = set.load as Extract<SetLoad, { type: 'barbell' }>;
                                        const next: SetLoad = {
                                          type: 'barbell',
                                          unit: 'kg',
                                          barKg: Number.isFinite(n) ? n : 20,
                                          addedKg: typeof prev.addedKg === 'number' ? prev.addedKg : null
                                        };
                                        updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                      }}
                                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <div className="text-sm text-slate-500 text-center mt-1">Barre</div>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={typeof set.load.addedKg === 'number' ? String(set.load.addedKg) : ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const n = v === '' ? null : Number(v.replace(',', '.'));
                                        const prev = set.load as Extract<SetLoad, { type: 'barbell' }>;
                                        const next: SetLoad = {
                                          type: 'barbell',
                                          unit: 'kg',
                                          barKg: prev.barKg,
                                          addedKg: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null)
                                        };
                                        updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                      }}
                                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <div className="text-sm text-slate-500 text-center mt-1">Poids ajoutés</div>
                                  </div>
                                </div>
                              )}

                              {/* Assisted: 1 input (assistance en kg) */}
                              {set.load?.type === 'assisted' && (
                                <div>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={typeof set.load.assistanceKg === 'number' ? String(set.load.assistanceKg) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      const n = v === '' ? null : Number(v.replace(',', '.'));
                                      const next: SetLoad = {
                                        type: 'assisted',
                                        unit: 'kg',
                                        assistanceKg: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null)
                                      };
                                      updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <div className="text-sm text-slate-500 text-center mt-1">Assistance (kg)</div>
                                </div>
                              )}

                              {/* Distance: 1 input + sélecteur unité */}
                              {set.load?.type === 'distance' && (
                                <div>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={typeof set.load.distanceValue === 'number' ? String(set.load.distanceValue) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      const n = v === '' ? null : Number(v.replace(',', '.'));
                                      const prev = set.load as Extract<SetLoad, { type: 'distance' }>;
                                      const next: SetLoad = {
                                        type: 'distance',
                                        unit: prev.unit,
                                        distanceValue: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null)
                                      };
                                      updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <div className="flex items-center justify-center gap-2 mt-1">
                                    <span className="text-sm text-slate-500">Distance en</span>
                                    <select
                                      value={set.load.unit}
                                      onChange={(e) => {
                                        const prev = set.load as Extract<SetLoad, { type: 'distance' }>;
                                        const next: SetLoad = {
                                          type: 'distance',
                                          unit: e.target.value as 'cm' | 'm',
                                          distanceValue: prev.distanceValue
                                        };
                                        updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                      }}
                                      className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="cm">cm</option>
                                      <option value="m">m</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* Single, Double, Machine: 1 input (poids en kg) */}
                              {(set.load?.type === 'single' || set.load?.type === 'double' || set.load?.type === 'machine' || !set.load?.type) && (
                                <div>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={(() => {
                                      const load = set.load;
                                      if (!load) return '';
                                      if (load.type === 'single' || load.type === 'double' || load.type === 'machine') {
                                        return typeof load.weightKg === 'number' ? String(load.weightKg) : '';
                                      }
                                      return '';
                                    })()}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      const n = v === '' ? null : Number(v.replace(',', '.'));
                                      const t: 'single' | 'double' | 'machine' = set.load?.type === 'double'
                                        ? 'double'
                                        : (set.load?.type === 'machine' ? 'machine' : 'single');
                                      const next: SetLoad = t === 'double'
                                        ? { type: 'double', unit: 'kg', weightKg: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null) }
                                        : t === 'machine'
                                          ? { type: 'machine', unit: 'kg', weightKg: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null) }
                                          : { type: 'single', unit: 'kg', weightKg: v === '' ? null : (Number.isFinite(n as number) ? (n as number) : null) };
                                      updateSetLoadForExercise(exerciseIndex, setIndex, next);
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <div className="text-sm text-slate-500 text-center mt-1">
                                    {set.load?.type === 'double' ? '2x Haltères / Kettlebell' : set.load?.type === 'machine' ? 'Machine' : 'Haltère / Kettlebell'}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Ghost Mode - Meilleure performance passée */}
                            {(() => {
                              const ghost = ghostSessions[exercise.exerciseName];
                              const ghostSet = getGhostSetForDisplay(ghost, setIndex);
                              if (!ghostSet || (ghostSet.weight === 0 && ghostSet.reps === 0)) return null;

                              // Calculer si le set actuel bat le ghost
                              const currentWeight = getLoadTotalKg(set.load) || 0;
                              const currentReps = parseInt(String(set.reps || '0').replace(/[^0-9]/g, '')) || 0;
                              const currentVolume = currentWeight * currentReps;
                              const isBeatingGhost = currentVolume > ghostSet.volume && currentVolume > 0;

                              return (
                                <div className={`mt-3 p-3 rounded-xl border ${isBeatingGhost ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-medium ${isBeatingGhost ? 'text-emerald-400' : 'text-slate-400'}`}>
                                      {isBeatingGhost ? '🔥 Tu bats ton record !' : '👻 Meilleur:'}
                                    </span>
                                    <span className={`text-sm font-semibold ${isBeatingGhost ? 'text-emerald-300' : 'text-slate-300'}`}>
                                      {ghostSet.weight}kg × {ghostSet.reps}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <button
                            onClick={() => (set.completed ? toggleSetValidationForExercise(exerciseIndex) : validateSetForExercise(exerciseIndex))}
                            className={`
                              w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]
                              ${set.completed
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                              }
                            `}
                            type="button"
                          >
                            <Check className="w-5 h-5" />
                            <span>
                              {setIndex === exercise.sets.length - 1 ? "Finir l'exercice" : 'Valider la série'}
                            </span>
                          </button>

                          <div className="flex items-center justify-center gap-6">
                            <button
                              onClick={() => setSetIndexForExercise(exerciseIndex, Math.max(setIndex - 1, 0))}
                              disabled={setIndex === 0}
                              className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl transition-colors"
                              aria-label="Série précédente"
                              type="button"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() => setSetIndexForExercise(exerciseIndex, Math.min(setIndex + 1, exercise.sets.length - 1))}
                              disabled={setIndex === exercise.sets.length - 1}
                              className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl transition-colors"
                              aria-label="Série suivante"
                              type="button"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                          </div>

                          {onSaveComment && (
                            <div className="pt-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-400">Message au coach</span>
                                </div>
                                {sentComments.has(exercise.exerciseName) ? (
                                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Envoyé
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Douleur, sensation, question..."
                                  value={exerciseComments[exercise.exerciseName] || ''}
                                  onChange={(e) => setExerciseComments(prev => ({
                                    ...prev,
                                    [exercise.exerciseName]: e.target.value
                                  }))}
                                  disabled={sentComments.has(exercise.exerciseName)}
                                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <button
                                  onClick={() => handleSendComment(exercise.exerciseName)}
                                  disabled={!exerciseComments[exercise.exerciseName]?.trim() || commentSending === exercise.exerciseName || sentComments.has(exercise.exerciseName)}
                                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                  title="Envoyer maintenant"
                                  type="button"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <div ref={(el) => { focusRpeRefs.current[exerciseIndex] = el; }} />
                            <RpeSelector
                              value={exercise.rpe}
                              onChange={(rpe) => updateExerciseRpeForExercise(exerciseIndex, rpe)}
                              size="sm"
                            />
                          </div>

                          {allSetsCompletedForExercise && (
                            <div className="text-center text-xs text-emerald-400">Toutes les séries sont validées</div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-3">
          <button
            onClick={() => {
              if (!allExercisesCompleted) {
                setShowForceFinishModal(true);
                return;
              }
              void handleFinish();
            }}
            disabled={saving}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors
              ${allExercisesCompleted ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}
            `}
            type="button"
          >
            <span>Terminer</span>
            <Check className="w-5 h-5" />
          </button>
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


  const renderForceFinishModal = () => {
    if (!showForceFinishModal) return null;

    const incompleteExercises = logs.filter(ex => {
      const allSetsDone = ex.sets.length > 0 && ex.sets.every(s => s.completed);
      const hasRpe = typeof ex.rpe === 'number';
      return !(allSetsDone && hasRpe);
    });

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Séance incomplète</h3>
              <p className="text-sm text-slate-400">
                Certains exercices ne sont pas entièrement validés.
              </p>
            </div>
          </div>

          {incompleteExercises.length > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">
                Exercices incomplets :
              </p>
              <ul className="text-sm text-slate-300 list-disc list-inside space-y-1">
                {incompleteExercises.map((ex, idx) => (
                  <li key={idx}>{ex.exerciseName}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowForceFinishModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              type="button"
            >
              Je modifie ma séance
            </button>
            <button
              onClick={() => {
                setShowForceFinishModal(false);
                void handleFinish();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
              type="button"
            >
              J&apos;ai fini ma séance
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // MODALS: HISTORY & CONSIGNES
  // ===========================================
  
  const renderHistoryModal = () => {
    if (showHistoryModal === null) return null;
    const exercise = logs[showHistoryModal];
    if (!exercise) return null;
    
    const lastHistory = getLastExerciseHistory(exercise.exerciseName, history);
    
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                Historique {exercise.exerciseName}
              </h3>
              {typeof lastHistory?.rpe === 'number' && (
                <RpeBadge rpe={lastHistory.rpe} size="sm" />
              )}
            </div>
            <button
              onClick={() => setShowHistoryModal(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {lastHistory ? (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                Dernière exécution {new Date(lastHistory.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <div className="space-y-2">
                {lastHistory.sets.map((set, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-3">
                    <span className="text-sm text-slate-400">Série {set.setNumber}</span>
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
    );
  };

  const renderConsignesModal = () => {
    if (showConsignesModal === null) return null;
    const exercise = logs[showConsignesModal];
    if (!exercise) return null;
    
    const exerciseData = sessionData.find(d => d.exercice === exercise.exerciseName);
    const notes = exercise.notes || exerciseData?.notes;
    
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              Consignes {exercise.exerciseName}
            </h3>
            <button
              onClick={() => setShowConsignesModal(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {notes ? (
            <div className="px-3 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-200">{notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              Aucune consigne pour cet exercice
            </p>
          )}
        </div>
      </div>
    );
  };

  // ===========================================
  // MAIN RENDER
  // ===========================================

  return (
    <>
      <style>{`
        @keyframes slideOut {
          0% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        @keyframes slideIn {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {phase === 'recap' ? renderRecapPhase() : renderFocusPhase()}
      
      {showCancelModal && renderCancelModal()}
      {showForceFinishModal && renderForceFinishModal()}
      {showHistoryModal !== null && renderHistoryModal()}
      {showConsignesModal !== null && renderConsignesModal()}
      
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
