// ============================================================
// F.Y.T - ADD SESSION (Ajout manuel de séance)
// src/components/athlete/AddSession.tsx
// Permet d'ajouter manuellement une séance à l'historique
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SessionLog, ExerciseLog, SetLog, SessionKey, SetLoad, RPE_SCALE } from '../../../types';
import {
  X,
  Calendar,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { RpeSelector, SessionRpeModal } from '../RpeSelector';
import { Card, CardContent } from '../shared/Card';
import { setLocalStorageWithEvent, removeLocalStorageWithEvent } from '../../utils/localStorageEvents';

const ADD_SESSION_STORAGE_KEY = 'F.Y.T_add_session';
export const MANUAL_ENTRY_MARKER = 'MANUAL_ENTRY'; // Marqueur pour identifier les séances manuelles

// ===========================================
// TYPES
// ===========================================

interface Props {
  onSave: (log: SessionLog) => Promise<void>;
  onCancel: () => void;
  initialLog?: SessionLog | null; // Pour le mode édition
  userId?: string;
}

interface ValidationWarning {
  type: 'warning' | 'blocking';
  message: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getLoadTotalKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  if (load.type === 'single' || load.type === 'machine') {
    return typeof load.weightKg === 'number' ? load.weightKg : null;
  }
  if (load.type === 'double') {
    return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
  }
  const added = typeof load.addedKg === 'number' ? load.addedKg : null;
  if (typeof load.barKg !== 'number') return null;
  if (added === null) return null;
  return load.barKg + added;
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
  const weightKg = typeof fromTotalKg === 'number' ? fromTotalKg : null;
  return { type: 'single', unit: 'kg', weightKg };
}

function parseKgLikeToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

const DEFAULT_SESSION_NAME = 'NOM DE SEANCE';
const DEFAULT_EXERCISE_PREFIX = 'Exercice ';

// ===========================================
// COMPONENT
// ===========================================

export const AddSession: React.FC<Props> = ({
  onSave,
  onCancel,
  initialLog,
  userId
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [sessionName, setSessionName] = useState(DEFAULT_SESSION_NAME);
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState(DEFAULT_SESSION_NAME);

  const [sessionDate, setSessionDate] = useState<string>('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');

  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Record<number, boolean>>({});
  const [currentSetIndexes, setCurrentSetIndexes] = useState<Record<number, number>>({});
  const [editingExerciseNames, setEditingExerciseNames] = useState<Record<number, boolean>>({});
  const [exerciseNameInputs, setExerciseNameInputs] = useState<Record<number, string>>({});
  const [editingRecovery, setEditingRecovery] = useState<Record<number, boolean>>({});
  const [recoveryInputs, setRecoveryInputs] = useState<Record<number, string>>({});

  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState<number | null>(null);
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const focusCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const focusRpeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isEditMode = !!initialLog;

  // ===========================================
  // INITIALIZATION & PERSISTENCE
  // ===========================================

  // Sauvegarder en localStorage à chaque changement
  const saveToLocalStorage = useCallback(() => {
    const data = {
      sessionName,
      sessionDate,
      logs,
      expandedExercises,
      currentSetIndexes,
      exerciseNameInputs,
      recoveryInputs,
      scrollPosition: window.scrollY || 0,
      isEditMode,
      editingSessionId: isEditMode && initialLog ? initialLog.id : null
    };
    setLocalStorageWithEvent(ADD_SESSION_STORAGE_KEY, JSON.stringify(data));
  }, [sessionName, sessionDate, logs, expandedExercises, currentSetIndexes, exerciseNameInputs, recoveryInputs, isEditMode, initialLog]);

  const clearLocalStorage = useCallback(() => {
    removeLocalStorageWithEvent(ADD_SESSION_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (initialLog) {
      // Mode édition: charger les données existantes
      setSessionName(initialLog.sessionKey.seance || DEFAULT_SESSION_NAME);
      setSessionNameInput(initialLog.sessionKey.seance || DEFAULT_SESSION_NAME);

      const dateObj = new Date(initialLog.date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      setSessionDate(formattedDate);
      setDateInput(formattedDate);

      setLogs(initialLog.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, completed: true }))
      })));

      // Initialiser les inputs pour les noms d'exercices
      const nameInputs: Record<number, string> = {};
      const recoveryInp: Record<number, string> = {};
      initialLog.exercises.forEach((ex, idx) => {
        nameInputs[idx] = ex.exerciseName;
        recoveryInp[idx] = ex.notes || '';
      });
      setExerciseNameInputs(nameInputs);
      setRecoveryInputs(recoveryInp);

      // Mode édition: scroll en haut
      window.scrollTo(0, 0);
    } else {
      // Mode création: essayer de restaurer depuis localStorage
      try {
        const saved = localStorage.getItem(ADD_SESSION_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.sessionName) setSessionName(data.sessionName);
          if (data.sessionDate) setSessionDate(data.sessionDate);
          if (data.logs) setLogs(data.logs);
          if (data.expandedExercises) setExpandedExercises(data.expandedExercises);
          if (data.currentSetIndexes) setCurrentSetIndexes(data.currentSetIndexes);
          if (data.exerciseNameInputs) setExerciseNameInputs(data.exerciseNameInputs);
          if (data.recoveryInputs) setRecoveryInputs(data.recoveryInputs);

          // Restaurer la position du scroll (avec un délai pour laisser le DOM se construire)
          if (typeof data.scrollPosition === 'number') {
            setTimeout(() => {
              window.scrollTo(0, data.scrollPosition);
            }, 100);
          }
        } else {
          // Première ouverture: scroll en haut
          window.scrollTo(0, 0);
        }
      } catch (e) {
        console.error('Erreur restauration AddSession:', e);
        window.scrollTo(0, 0);
      }
    }
  }, [initialLog]);

  // Sauvegarder à chaque modification (y compris en mode édition)
  useEffect(() => {
    saveToLocalStorage();
  }, [sessionName, sessionDate, logs, expandedExercises, currentSetIndexes, exerciseNameInputs, recoveryInputs, saveToLocalStorage]);

  // Sauvegarder la position du scroll périodiquement (throttled)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveToLocalStorage();
      }, 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [saveToLocalStorage]);

  // ===========================================
  // HANDLERS - SESSION NAME
  // ===========================================

  const handleStartEditSessionName = useCallback(() => {
    setSessionNameInput(sessionName);
    setIsEditingSessionName(true);
  }, [sessionName]);

  const handleValidateSessionName = useCallback(() => {
    if (sessionNameInput.trim()) {
      setSessionName(sessionNameInput.trim());
    }
    setIsEditingSessionName(false);
  }, [sessionNameInput]);

  // ===========================================
  // HANDLERS - DATE
  // ===========================================

  const handleStartEditDate = useCallback(() => {
    setDateInput(sessionDate);
    setIsEditingDate(true);
  }, [sessionDate]);

  const handleValidateDate = useCallback(() => {
    if (dateInput) {
      setSessionDate(dateInput);
    }
    setIsEditingDate(false);
  }, [dateInput]);

  // ===========================================
  // HANDLERS - EXERCISES
  // ===========================================

  const addExercise = useCallback(() => {
    const newIndex = logs.length;
    const newExercise: ExerciseLog = {
      exerciseName: `${DEFAULT_EXERCISE_PREFIX}${newIndex + 1}`,
      originalSession: sessionName,
      sets: [{
        setNumber: 1,
        reps: '',
        weight: '',
        load: createDefaultLoad('single', null),
        completed: false
      }],
      notes: ''
    };
    setLogs(prev => [...prev, newExercise]);
    setExerciseNameInputs(prev => ({ ...prev, [newIndex]: newExercise.exerciseName }));
    setRecoveryInputs(prev => ({ ...prev, [newIndex]: '' }));
    setExpandedExercises(prev => ({ ...prev, [newIndex]: true }));
  }, [logs.length, sessionName]);

  const deleteExercise = useCallback((index: number) => {
    setLogs(prev => prev.filter((_, i) => i !== index));
    setShowDeleteExerciseModal(null);
    // Reindex les inputs
    setExerciseNameInputs(prev => {
      const newInputs: Record<number, string> = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < index) newInputs[k] = prev[k];
        else if (k > index) newInputs[k - 1] = prev[k];
      });
      return newInputs;
    });
    setRecoveryInputs(prev => {
      const newInputs: Record<number, string> = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < index) newInputs[k] = prev[k];
        else if (k > index) newInputs[k - 1] = prev[k];
      });
      return newInputs;
    });
  }, []);

  const toggleExerciseExpanded = useCallback((index: number) => {
    setExpandedExercises(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleStartEditExerciseName = useCallback((index: number) => {
    setExerciseNameInputs(prev => ({ ...prev, [index]: logs[index]?.exerciseName || '' }));
    setEditingExerciseNames(prev => ({ ...prev, [index]: true }));
  }, [logs]);

  const handleValidateExerciseName = useCallback((index: number) => {
    const name = exerciseNameInputs[index]?.trim();
    if (name) {
      setLogs(prev => prev.map((ex, i) => i === index ? { ...ex, exerciseName: name } : ex));
    }
    setEditingExerciseNames(prev => ({ ...prev, [index]: false }));
  }, [exerciseNameInputs]);

  const handleStartEditRecovery = useCallback((index: number) => {
    setRecoveryInputs(prev => ({ ...prev, [index]: logs[index]?.notes || '' }));
    setEditingRecovery(prev => ({ ...prev, [index]: true }));
  }, [logs]);

  const handleValidateRecovery = useCallback((index: number) => {
    const recovery = recoveryInputs[index]?.trim() || '';
    setLogs(prev => prev.map((ex, i) => i === index ? { ...ex, notes: recovery } : ex));
    setEditingRecovery(prev => ({ ...prev, [index]: false }));
  }, [recoveryInputs]);

  // ===========================================
  // HANDLERS - SETS
  // ===========================================

  const getSetIndexForExercise = useCallback((exerciseIndex: number): number => {
    return typeof currentSetIndexes[exerciseIndex] === 'number' ? currentSetIndexes[exerciseIndex] : 0;
  }, [currentSetIndexes]);

  const setSetIndexForExercise = useCallback((exerciseIndex: number, nextIndex: number) => {
    setCurrentSetIndexes(prev => ({ ...prev, [exerciseIndex]: nextIndex }));
  }, []);

  const addSetForExercise = useCallback((exerciseIndex: number) => {
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: SetLog = {
        setNumber: ex.sets.length + 1,
        reps: lastSet?.reps || '',
        weight: lastSet?.weight || '',
        load: lastSet?.load ? { ...lastSet.load } : createDefaultLoad('single', null),
        completed: false
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    }));
  }, []);

  const removeSetForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex || ex.sets.length <= 1) return ex;
      const newSets = ex.sets.filter((_, si) => si !== setIndex);
      newSets.forEach((s, idx) => s.setNumber = idx + 1);
      return { ...ex, sets: newSets };
    }));
    // Adjust current set index if needed
    setCurrentSetIndexes(prev => {
      const current = prev[exerciseIndex] || 0;
      const maxIndex = logs[exerciseIndex].sets.length - 2;
      return { ...prev, [exerciseIndex]: Math.min(current, Math.max(0, maxIndex)) };
    });
  }, [getSetIndexForExercise, logs]);

  const updateSetForExercise = useCallback((exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const newSets = ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s);
      return { ...ex, sets: newSets };
    }));
  }, []);

  const updateSetLoadForExercise = useCallback((exerciseIndex: number, setIndex: number, load: SetLoad) => {
    const totalKg = getLoadTotalKg(load);
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const newSets = ex.sets.map((s, si) => {
        if (si !== setIndex) return s;
        return {
          ...s,
          load,
          weight: typeof totalKg === 'number' ? String(Math.round(totalKg * 100) / 100) : ''
        };
      });
      return { ...ex, sets: newSets };
    }));
  }, []);

  const cycleSetLoadTypeForExercise = useCallback((exerciseIndex: number, setIndex: number) => {
    const set = logs[exerciseIndex]?.sets?.[setIndex];
    if (!set) return;
    const currentLoad = set.load;
    const totalKg = getLoadTotalKg(currentLoad) ?? (set.weight ? parseKgLikeToNumber(set.weight) : null);
    const typeOrder: SetLoad['type'][] = ['single', 'double', 'barbell', 'machine'];
    const currentType = currentLoad?.type ?? 'single';
    const idx = typeOrder.indexOf(currentType);
    const nextType = typeOrder[(idx + 1) % typeOrder.length];
    updateSetLoadForExercise(exerciseIndex, setIndex, createDefaultLoad(nextType, totalKg));
  }, [logs, updateSetLoadForExercise]);

  const validateSetForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const newSets = ex.sets.map((s, si) => si === setIndex ? { ...s, completed: true } : s);
      return { ...ex, sets: newSets };
    }));

    // Move to next set or stay
    const exercise = logs[exerciseIndex];
    if (setIndex < exercise.sets.length - 1) {
      setSetIndexForExercise(exerciseIndex, setIndex + 1);
    }
  }, [getSetIndexForExercise, logs, setSetIndexForExercise]);

  const toggleSetValidationForExercise = useCallback((exerciseIndex: number) => {
    const setIndex = getSetIndexForExercise(exerciseIndex);
    setLogs(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const newSets = ex.sets.map((s, si) => si === setIndex ? { ...s, completed: !s.completed } : s);
      return { ...ex, sets: newSets };
    }));
  }, [getSetIndexForExercise]);

  const updateExerciseRpeForExercise = useCallback((exerciseIndex: number, rpe: number | undefined) => {
    setLogs(prev => prev.map((ex, i) => i === exerciseIndex ? { ...ex, rpe } : ex));
  }, []);

  // ===========================================
  // VALIDATION & SAVE
  // ===========================================

  const validateSession = useCallback((): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    // Check date (blocking)
    if (!sessionDate) {
      warnings.push({ type: 'blocking', message: 'La date de la séance est obligatoire' });
    }

    // Check session name (warning)
    if (sessionName === DEFAULT_SESSION_NAME) {
      warnings.push({ type: 'warning', message: 'Le nom de la séance est celui par défaut' });
    }

    // Check exercise names (warning for each)
    logs.forEach((ex, index) => {
      if (ex.exerciseName.startsWith(DEFAULT_EXERCISE_PREFIX)) {
        warnings.push({ type: 'warning', message: `"${ex.exerciseName}" utilise le nom par défaut` });
      }
    });

    return warnings;
  }, [sessionDate, sessionName, logs]);

  const handleFinish = useCallback(() => {
    const warnings = validateSession();
    setValidationWarnings(warnings);
    setShowValidationModal(true);
  }, [validateSession]);

  const handleConfirmSave = useCallback(() => {
    const hasBlockingError = validationWarnings.some(w => w.type === 'blocking');
    if (hasBlockingError) return;

    setShowValidationModal(false);

    // Create session key for manual entry
    const now = new Date(sessionDate || Date.now());
    const sessionKey: SessionKey = {
      annee: String(now.getFullYear()),
      moisNum: String(now.getMonth() + 1).padStart(2, '0'),
      semaine: String(Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)),
      seance: sessionName
    };

    const finalDate = sessionDate
      ? new Date(sessionDate + 'T12:00:00').toISOString()
      : new Date().toISOString();

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: finalDate,
      sessionKey,
      exercises: logs.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          ...s,
          completed: true,
          reps: s.reps || '-',
          weight: s.weight || '-'
        }))
      })),
      durationMinutes: isEditMode && initialLog?.durationMinutes ? initialLog.durationMinutes : 0,
      // Conserver le RPE existant en mode édition
      sessionRpe: isEditMode && initialLog?.sessionRpe ? initialLog.sessionRpe : undefined,
      // Mark as manual entry (utiliser la constante MANUAL_ENTRY_MARKER)
      comments: isEditMode ? initialLog?.comments : MANUAL_ENTRY_MARKER
    };

    setPendingSessionLog(finalLog);
    setShowSessionRpeModal(true);
  }, [validationWarnings, sessionDate, sessionName, logs, isEditMode, initialLog]);

  const handleSessionRpeSubmit = useCallback(async (sessionRpe: number) => {
    if (!pendingSessionLog) return;

    setSaving(true);
    const finalLog = { ...pendingSessionLog, sessionRpe };

    try {
      await onSave(finalLog);
      clearLocalStorage(); // Nettoyer après sauvegarde réussie
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
      clearLocalStorage(); // Nettoyer après sauvegarde réussie
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setSaving(false);
      setShowSessionRpeModal(false);
    }
  }, [pendingSessionLog, onSave, clearLocalStorage]);

  const handleCancel = useCallback(() => {
    clearLocalStorage(); // Nettoyer quand on abandonne
    onCancel();
  }, [onCancel, clearLocalStorage]);

  // ===========================================
  // RENDER
  // ===========================================

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 pt-4 pb-3">
        <div className="px-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Session Name */}
            <div className="flex items-center gap-2">
              {isEditingSessionName ? (
                <>
                  <input
                    type="text"
                    value={sessionNameInput}
                    onChange={(e) => setSessionNameInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleValidateSessionName}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    type="button"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold text-white truncate">{sessionName}</h1>
                  <button
                    onClick={handleStartEditSessionName}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    type="button"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Date */}
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {isEditingDate ? (
                <>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleValidateDate}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    type="button"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-400">
                    {sessionDate
                      ? new Date(sessionDate).toLocaleDateString('fr-FR')
                      : 'Aucune date sélectionnée'
                    }
                  </span>
                  <button
                    onClick={handleStartEditDate}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    type="button"
                  >
                    {sessionDate ? <Edit2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
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
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">Aucun exercice ajouté</p>
              <button
                onClick={addExercise}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
                type="button"
              >
                <Plus className="w-5 h-5" />
                Ajouter un exercice
              </button>
            </div>
          ) : (
            <>
              {logs.map((exercise, exerciseIndex) => {
                const setIndex = getSetIndexForExercise(exerciseIndex);
                const set = exercise.sets[setIndex];
                const isExpanded = !!expandedExercises[exerciseIndex];
                const allSetsCompleted = exercise.sets.every(s => s.completed);
                const isExerciseDone = allSetsCompleted && typeof exercise.rpe === 'number';

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
                        {/* Collapsed Header - Cliquable pour réduire/déplier */}
                        <button
                          onClick={() => toggleExerciseExpanded(exerciseIndex)}
                          className="w-full text-left"
                          type="button"
                        >
                          <div className={`${isExpanded ? 'bg-gradient-to-r from-blue-600/20 to-emerald-600/20' : ''} px-4 py-3 border-b border-slate-700/50`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {/* Chevron indicator */}
                                <div className="flex items-center gap-2 mb-1">
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                  <span className="text-xs text-slate-500">
                                    {isExpanded ? 'Cliquer pour réduire' : 'Cliquer pour déplier'}
                                  </span>
                                </div>
                                {/* Exercise Name */}
                                <div className="flex items-center gap-2 max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                  {editingExerciseNames[exerciseIndex] ? (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <input
                                        type="text"
                                        value={exerciseNameInputs[exerciseIndex] || ''}
                                        onChange={(e) => setExerciseNameInputs(prev => ({ ...prev, [exerciseIndex]: e.target.value }))}
                                        className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleValidateExerciseName(exerciseIndex)}
                                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                                        type="button"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <h2 className="text-base font-bold text-white line-clamp-2 min-w-0 flex-1">{exercise.exerciseName}</h2>
                                      <button
                                        onClick={() => handleStartEditExerciseName(exerciseIndex)}
                                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0"
                                        type="button"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>

                                {/* Recovery (collapsed view) */}
                                {!isExpanded && (
                                  <div className="mt-2 flex items-center gap-2 max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                    {editingRecovery[exerciseIndex] ? (
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <input
                                          type="text"
                                          placeholder="Ex: 90s"
                                          value={recoveryInputs[exerciseIndex] || ''}
                                          onChange={(e) => setRecoveryInputs(prev => ({ ...prev, [exerciseIndex]: e.target.value }))}
                                          className="flex-1 min-w-0 max-w-[120px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleValidateRecovery(exerciseIndex)}
                                          className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                                          type="button"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="px-2 py-1 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold truncate">
                                          Récup: {exercise.notes || '-'}
                                        </span>
                                        <button
                                          onClick={() => handleStartEditRecovery(exerciseIndex)}
                                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0"
                                          type="button"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && set && (
                          <>
                            <div className="px-4 py-3 border-b border-slate-700/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-slate-300">
                                    Série {setIndex + 1}/{exercise.sets.length}
                                  </div>
                                  {set.completed && (
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                                      <Check className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => removeSetForExercise(exerciseIndex)}
                                    disabled={exercise.sets.length <= 1}
                                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                              {/* Recovery Input */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-slate-400 flex-shrink-0">Récupération:</span>
                                {editingRecovery[exerciseIndex] ? (
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      placeholder="Ex: 90s"
                                      value={recoveryInputs[exerciseIndex] || ''}
                                      onChange={(e) => setRecoveryInputs(prev => ({ ...prev, [exerciseIndex]: e.target.value }))}
                                      className="flex-1 min-w-0 max-w-[120px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleValidateRecovery(exerciseIndex)}
                                      className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                                      type="button"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="px-2 py-1 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold">
                                      {exercise.notes || '-'}
                                    </span>
                                    <button
                                      onClick={() => handleStartEditRecovery(exerciseIndex)}
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0"
                                      type="button"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>

                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">Série {setIndex + 1}</div>
                              </div>

                              <div className="space-y-3">
                                {/* Reps Input */}
                                <div>
                                  <label className="block text-sm text-slate-400 mb-2">Répétitions</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="8"
                                    value={set.reps}
                                    onChange={(e) => updateSetForExercise(exerciseIndex, setIndex, 'reps', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>

                                {/* Weight Input */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm text-slate-400">Charge</label>
                                    <button
                                      onClick={() => cycleSetLoadTypeForExercise(exerciseIndex, setIndex)}
                                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                                      type="button"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {set.load?.type === 'barbell' ? (
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
                                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-4 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-4 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="text-sm text-slate-500 text-center mt-1">Poids ajoutés</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={typeof set.load?.weightKg === 'number' ? String(set.load.weightKg) : ''}
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
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-8 text-white text-center text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <div className="text-sm text-slate-500 text-center mt-1">
                                        {set.load?.type === 'double' ? '2x Haltères / Kettlebell' : set.load?.type === 'machine' ? 'Machine' : 'Haltère / Kettlebell'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Validate Set Button */}
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
                                <span>{set.completed ? 'Série validée' : 'Valider la série'}</span>
                              </button>

                              {/* Set Navigation */}
                              <div className="flex items-center justify-center gap-6">
                                <button
                                  onClick={() => setSetIndexForExercise(exerciseIndex, Math.max(setIndex - 1, 0))}
                                  disabled={setIndex === 0}
                                  className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl transition-colors"
                                  type="button"
                                >
                                  <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                  onClick={() => setSetIndexForExercise(exerciseIndex, Math.min(setIndex + 1, exercise.sets.length - 1))}
                                  disabled={setIndex === exercise.sets.length - 1}
                                  className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl transition-colors"
                                  type="button"
                                >
                                  <ChevronRight className="w-6 h-6" />
                                </button>
                              </div>

                              {/* RPE Selector */}
                              <div className="pt-2">
                                <div ref={(el) => { focusRpeRefs.current[exerciseIndex] = el; }} />
                                <RpeSelector
                                  value={exercise.rpe}
                                  onChange={(rpe) => updateExerciseRpeForExercise(exerciseIndex, rpe)}
                                  size="sm"
                                />
                              </div>

                              {/* Delete Exercise Button */}
                              <button
                                onClick={() => setShowDeleteExerciseModal(exerciseIndex)}
                                className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer l'exercice
                              </button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}

              {/* Add Exercise Button (below exercises) */}
              <button
                onClick={addExercise}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl font-semibold transition-colors"
                type="button"
              >
                <Plus className="w-5 h-5" />
                Ajouter un exercice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer - Finish Button (toujours visible) */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-3">
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-emerald-600 text-white transition-colors"
          type="button"
        >
          <span>Terminer</span>
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Abandonner ?</h3>
                <p className="text-sm text-slate-400">Les données saisies seront perdues</p>
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
      )}

      {/* Delete Exercise Modal */}
      {showDeleteExerciseModal !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Supprimer l'exercice ?</h3>
                <p className="text-sm text-slate-400">{logs[showDeleteExerciseModal]?.exerciseName}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteExerciseModal(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteExercise(showDeleteExerciseModal)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Vérification</h3>
              </div>
            </div>

            {validationWarnings.length > 0 ? (
              <div className="mb-4 max-h-60 overflow-y-auto space-y-2">
                {validationWarnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      warning.type === 'blocking'
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                        : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {warning.type === 'blocking' && <span className="font-semibold">⚠️ </span>}
                    {warning.message}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 mb-4">Tout est prêt pour enregistrer votre séance.</p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                type="button"
              >
                Continuer de modifier ma séance
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={validationWarnings.some(w => w.type === 'blocking')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                type="button"
              >
                Valider ma séance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session RPE Modal */}
      {showSessionRpeModal && pendingSessionLog && (
        <SessionRpeModal
          onSubmit={handleSessionRpeSubmit}
          onSkip={handleSkipSessionRpe}
          sessionName={sessionName}
          durationMinutes={0}
          exerciseCount={logs.length}
        />
      )}
    </div>
  );
};

export default AddSession;
