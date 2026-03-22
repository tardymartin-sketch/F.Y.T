// ============================================================
// F.Y.T - ACTIVE SESSION ATHLETE (Mobile-First Mode Focus)
// src/components/athlete/ActiveSessionAthlete.tsx
// Séance en deux phases: Récapitulatif → Mode Focus
// ============================================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  WorkoutRow,
  SessionLog,
  ExerciseLog,
  SetLog,
  SessionKey,
  SetLoad,
  RPE_SCALE,
  SetDetailLog,
  ExecutionMode,
  EXECUTION_MODES,
  groupExerciseLogs,
  isExerciseLogGroup,
  ExerciseLogGroup,
} from "../../../types";
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
  Edit2,
  Trash2,
  Link2,
  FileText,
} from "lucide-react";
import { RichTextDisplay } from "../common/RichTextDisplay";
import { RpeSelector, SessionRpeModal, RpeBadge } from "../common/RpeSelector";
import { Card, CardContent } from "../shared/Card";
import {
  setLocalStorageWithEvent,
  removeLocalStorageWithEvent,
} from "../../utils/localStorageEvents";
import {
  fetchGhostSession,
  GhostSession,
} from "../../services/supabaseService";
import { Popover } from "../common/Popover";
import { VideoModal } from "../common/VideoModal";
import { SupersetInfoModal } from "../common/SupersetInfoModal";
import { SupersetExerciseBlock } from "../common/SupersetExerciseBlock";
import { useDemoTour } from "../../contexts/DemoTourContext";

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
  onSaveComment?: (
    exerciseName: string,
    comment: string,
    sessionId: string,
  ) => Promise<void>;
  // Desktop adaptation - default preserves mobile behavior
  layout?: "mobile" | "desktop";
}

function parseKgLikeToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getLoadTotalKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  if (load.type === "single" || load.type === "machine") {
    return typeof load.weightKg === "number" ? load.weightKg : null;
  }
  if (load.type === "double") {
    return typeof load.weightKg === "number" ? load.weightKg * 2 : null;
  }
  if (load.type === "barbell") {
    const added = typeof load.addedKg === "number" ? load.addedKg : null;
    if (typeof load.barKg !== "number") return null;
    if (added === null) return null;
    return load.barKg + added;
  }
  if (load.type === "assisted") {
    // Pour assisted, on retourne la valeur négative (assistance)
    return typeof load.assistanceKg === "number" ? -load.assistanceKg : null;
  }
  if (load.type === "distance") {
    // Distance n'a pas de poids
    return null;
  }
  return null;
}

function getLoadLabel(load: SetLoad | undefined): string {
  if (!load) return "Charge";
  if (load.type === "single") return "Haltère / KB";
  if (load.type === "double") return "2x Haltères / KB";
  if (load.type === "barbell") return "Barre + poids";
  if (load.type === "machine") return "Machine";
  if (load.type === "assisted") return "Assisté";
  if (load.type === "distance") return "Distance";
  return "Charge";
}

function createDefaultLoad(
  type: SetLoad["type"] = "single",
  fromTotalKg: number | null = null,
): SetLoad {
  if (type === "barbell") {
    const barKg = 20;
    const addedKg =
      typeof fromTotalKg === "number" ? Math.max(fromTotalKg - barKg, 0) : null;
    return { type: "barbell", unit: "kg", barKg, addedKg };
  }
  if (type === "double") {
    const weightKg = typeof fromTotalKg === "number" ? fromTotalKg / 2 : null;
    return { type: "double", unit: "kg", weightKg };
  }
  if (type === "machine") {
    const weightKg = typeof fromTotalKg === "number" ? fromTotalKg : null;
    return { type: "machine", unit: "kg", weightKg };
  }
  if (type === "assisted") {
    // Assisted: valeur positive = assistance
    const assistanceKg =
      typeof fromTotalKg === "number" ? Math.abs(fromTotalKg) : null;
    return { type: "assisted", unit: "kg", assistanceKg };
  }
  if (type === "distance") {
    return { type: "distance", unit: "cm", distanceValue: null };
  }
  const weightKg = typeof fromTotalKg === "number" ? fromTotalKg : null;
  return { type: "single", unit: "kg", weightKg };
}

function normalizeExerciseLogs(exercises: ExerciseLog[]): ExerciseLog[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: (Array.isArray(ex.sets) ? ex.sets : []).map((s) => {
      const anySet = s as any;
      const weightStr = typeof anySet.weight === "string" ? anySet.weight : "";
      const existingLoad = anySet.load as SetLoad | undefined;
      if (existingLoad) return s;
      const inferredKg = weightStr ? parseKgLikeToNumber(weightStr) : null;
      return {
        ...s,
        load: createDefaultLoad("single", inferredKg),
      };
    }),
  }));
}

type SessionPhase = "recap" | "focus";

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/** Extrait le nom principal d'un exercice (sans la variante ":: xxx") */
function getExerciseDisplayName(fullName: string): string {
  const idx = fullName.indexOf(" :: ");
  return idx >= 0 ? fullName.substring(0, idx) : fullName;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;
}

function estimateSessionDuration(exercises: WorkoutRow[]): number {
  let totalMinutes = 0;
  exercises.forEach((exercise) => {
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
  return `~${hours}h${mins.toString().padStart(2, "0")}`;
}

function getSuggestedWeight(
  exerciseName: string,
  history: SessionLog[],
): string | null {
  for (const session of history) {
    const exercise = session.exercises.find(
      (ex) => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (exercise && exercise.sets.length > 0) {
      const completedSets = exercise.sets.filter(
        (s) => s.completed && s.weight,
      );
      if (completedSets.length > 0) {
        return completedSets[completedSets.length - 1].weight;
      }
    }
  }
  return null;
}

function getLastPerformance(
  exerciseName: string,
  history: SessionLog[],
): { reps: string; weight: string; rpe?: number } | null {
  for (const session of history) {
    const exercise = session.exercises.find(
      (ex) => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (exercise && exercise.sets.length > 0) {
      const completedSets = exercise.sets.filter((s) => s.completed);
      if (completedSets.length > 0) {
        const lastSet = completedSets[completedSets.length - 1];
        return {
          reps: lastSet.reps,
          weight: lastSet.weight,
          rpe: exercise.rpe,
        };
      }
    }
  }
  return null;
}

function formatSetWeight(set: SetLog): React.ReactNode {
  // Si pas de données JSONB (load), afficher simplement le poids
  if (!set.load) {
    const weight = set.weight || "-";
    return weight === "-" ? "-" : `${weight} kg.`;
  }

  const load = set.load;
  const smallTextClass =
    "text-xs text-theme-muted font-normal block mt-0.5 leading-tight";

  if (load.type === "single") {
    const weight = typeof load.weightKg === "number" ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || "-";
      return weightText === "-" ? "-" : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{weight} kg.</span>
        <span className={smallTextClass}>(Haltères/Kettlebell)</span>
      </div>
    );
  }

  if (load.type === "double") {
    const weight = typeof load.weightKg === "number" ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || "-";
      return weightText === "-" ? "-" : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>2 X {weight} kg.</span>
        <span className={smallTextClass}>(2 X Haltères/Kettlebell)</span>
      </div>
    );
  }

  if (load.type === "barbell") {
    const barKg = typeof load.barKg === "number" ? load.barKg : 20;
    const addedKg = typeof load.addedKg === "number" ? load.addedKg : null;
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
        <span className={smallTextClass}>
          (Barre: {barKg} + Poids: {addedKg})
        </span>
      </div>
    );
  }

  if (load.type === "machine") {
    const weight = typeof load.weightKg === "number" ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || "-";
      return weightText === "-" ? "-" : `${weightText} kg.`;
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>{weight} kg.</span>
        <span className={smallTextClass}>(Sur machine)</span>
      </div>
    );
  }

  if (load.type === "assisted") {
    const assistance =
      typeof load.assistanceKg === "number" ? load.assistanceKg : null;
    if (assistance === null) {
      return "-";
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>-{assistance} kg.</span>
        <span className={smallTextClass}>(Assisté)</span>
      </div>
    );
  }

  if (load.type === "distance") {
    const distance =
      typeof load.distanceValue === "number" ? load.distanceValue : null;
    if (distance === null) {
      return "-";
    }
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span>
          {distance} {load.unit}
        </span>
        <span className={smallTextClass}>(Distance)</span>
      </div>
    );
  }

  const weightText = set.weight || "-";
  return weightText === "-" ? "-" : `${weightText} kg.`;
}

function getLastExerciseHistory(
  exerciseName: string,
  history: SessionLog[],
): { date: string; sets: SetLog[]; rpe?: number } | null {
  // Chercher la dernière exécution complétée (toutes les séries complétées)
  for (const session of history) {
    const exercise = session.exercises.find(
      (ex) => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (exercise && exercise.sets.length > 0) {
      // Vérifier si toutes les séries sont complétées
      const allCompleted = exercise.sets.every((s) => s.completed);
      if (allCompleted) {
        return {
          date: session.date,
          sets: exercise.sets,
          rpe: exercise.rpe,
        };
      }
    }
  }

  // Si aucune exécution complétée, prendre la dernière (même incomplète)
  for (const session of history) {
    const exercise = session.exercises.find(
      (ex) => ex.exerciseName.toLowerCase() === exerciseName.toLowerCase(),
    );
    if (exercise && exercise.sets.length > 0) {
      return {
        date: session.date,
        sets: exercise.sets,
        rpe: exercise.rpe,
      };
    }
  }

  return null;
}

/**
 * Calcule le message Ghost Mode basé sur le tonnage
 *
 * Logique:
 * - Si X séries validées et X < NBséries - 1 : affiche le record (nb séries, moy reps, moy charge)
 * - Si X séries validées et X = NBséries - 1 : calcule le tonnage théorique et compare
 *   - Si tonnage théorique > ghost : "Complète cette série et tu battras ton record!"
 *   - Si +10% charge permet de battre : "Augmente et complète ta dernière série de Y kg pour battre ton record"
 *   - Sinon : affiche le record
 */
interface GhostModeResult {
  type: "record" | "beating" | "increase" | "none";
  message: string;
  tonnageRecord?: number; // Tonnage max en kg
  increaseAmount?: number; // kg à ajouter
  ghostSession?: GhostSession; // Données complètes pour le modal
}

function getGhostModeData(
  ghost: GhostSession | undefined,
  sets: SetLog[],
  totalSets: number,
): GhostModeResult {
  if (!ghost || ghost.totalVolume <= 0) {
    return { type: "none", message: "" };
  }

  // Compter les séries validées et calculer le tonnage actuel
  const validatedSets = sets.filter((s) => s.completed);
  const validatedCount = validatedSets.length;

  // Calculer le tonnage des séries validées
  let validatedTonnage = 0;
  for (const set of validatedSets) {
    const weight =
      getLoadTotalKg(set.load) || parseKgLikeToNumber(set.weight || "0") || 0;
    const reps = parseInt(String(set.reps || "0").replace(/[^0-9]/g, "")) || 0;
    validatedTonnage += weight * reps;
  }

  // Tonnage record (arrondi pour l'affichage)
  const tonnageRecord = Math.round(ghost.totalVolume);

  // Cas 1: Moins de séries validées que totalSets - 1
  if (validatedCount < totalSets - 1) {
    return {
      type: "record",
      message: "",
      tonnageRecord,
      ghostSession: ghost,
    };
  }

  // Cas 2: Dernière série (X = totalSets - 1)
  if (validatedCount === totalSets - 1) {
    // Récupérer les valeurs de la dernière série (non validée)
    const lastSetIndex = sets.findIndex((s) => !s.completed);
    if (lastSetIndex === -1) {
      // Toutes les séries sont validées, ne devrait pas arriver dans ce cas
      return {
        type: "record",
        message: "",
        tonnageRecord,
        ghostSession: ghost,
      };
    }

    const lastSet = sets[lastSetIndex];
    const lastWeight =
      getLoadTotalKg(lastSet.load) ||
      parseKgLikeToNumber(lastSet.weight || "0") ||
      0;
    const lastReps =
      parseInt(String(lastSet.reps || "0").replace(/[^0-9]/g, "")) || 0;
    const lastSetTonnage = lastWeight * lastReps;

    // Tonnage théorique = tonnage validé + tonnage de la dernière série
    const theoreticalTonnage = validatedTonnage + lastSetTonnage;
    const ghostTonnage = ghost.totalVolume;

    // Vérifier si on bat le record
    if (theoreticalTonnage > ghostTonnage) {
      return {
        type: "beating",
        message: "Complète cette série et tu battras ton record!",
        tonnageRecord,
        ghostSession: ghost,
      };
    }

    // Vérifier si une augmentation de ~10% de la charge permettrait de battre
    // Tonnage nécessaire pour battre = ghostTonnage + 1 (pour être strictement supérieur)
    const neededTonnage = ghostTonnage + 1;
    const neededLastSetTonnage = neededTonnage - validatedTonnage;

    if (lastReps > 0) {
      const neededWeight = neededLastSetTonnage / lastReps;
      const weightIncrease = neededWeight - lastWeight;

      // Vérifier si l'augmentation est <= 10% de la charge actuelle
      const maxAllowedIncrease = lastWeight * 0.1;

      if (weightIncrease > 0 && weightIncrease <= maxAllowedIncrease) {
        // Arrondir par tranche de 2.5 kg au supérieur
        const roundedIncrease = Math.ceil(weightIncrease / 2.5) * 2.5;

        return {
          type: "increase",
          message: `Augmente de ${roundedIncrease} kg pour battre ton record`,
          tonnageRecord,
          increaseAmount: roundedIncrease,
          ghostSession: ghost,
        };
      }
    }

    // Si aucune des conditions n'est remplie, afficher le record
    return {
      type: "record",
      message: "",
      tonnageRecord,
      ghostSession: ghost,
    };
  }

  // Cas par défaut (toutes les séries validées ou autre)
  return {
    type: "record",
    message: "",
    tonnageRecord,
    ghostSession: ghost,
  };
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
  onSaveComment,
  layout = "mobile", // Desktop adaptation - default preserves mobile behavior
}) => {
  // Layout helpers
  const isDesktop = layout === "desktop";
  // ===========================================
  // STATE
  // ===========================================
  const [phase, setPhase] = useState<SessionPhase>("focus");
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saving, setSaving] = useState(false);

  // Mode focus state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentSetIndexes, setCurrentSetIndexes] = useState<
    Record<number, number>
  >({});
  const [expandedExercises, setExpandedExercises] = useState<
    Record<number, boolean>
  >({});

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionRpeModal, setShowSessionRpeModal] = useState(false);
  const [pendingSessionLog, setPendingSessionLog] = useState<SessionLog | null>(
    null,
  );

  // Comments
  const [exerciseComments, setExerciseComments] = useState<
    Record<string, string>
  >({});
  const [commentSending, setCommentSending] = useState<string | null>(null);
  const [sentComments, setSentComments] = useState<Set<string>>(new Set());
  const [messageSentConfirm, setMessageSentConfirm] = useState<Set<string>>(
    new Set(),
  );

  // Ghost Mode
  const [ghostSessions, setGhostSessions] = useState<
    Record<string, GhostSession>
  >({});
  const [recapOpenConsignes, setRecapOpenConsignes] = useState<
    Record<number, boolean>
  >({});
  const [recapOpenHistory, setRecapOpenHistory] = useState<
    Record<number, boolean>
  >({});
  const [focusOpenConsignes, setFocusOpenConsignes] = useState<
    Record<number, boolean>
  >({});
  const [focusOpenHistory, setFocusOpenHistory] = useState<
    Record<number, boolean>
  >({});
  const [showForceFinishModal, setShowForceFinishModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<{
    index: number;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const [showConsignesModal, setShowConsignesModal] = useState<{
    index: number;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<{
    url: string;
    exerciseName: string;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const [showGhostRecordModal, setShowGhostRecordModal] = useState<{
    exerciseName: string;
    ghost: GhostSession;
  } | null>(null);
  const [showSupersetInfoModal, setShowSupersetInfoModal] = useState<{
    executionMode: ExecutionMode;
    anchorEl: HTMLElement | null;
  } | null>(null);

  // Refs for Popover anchors (used on desktop)
  const historyAnchorRef = useRef<HTMLElement | null>(null);
  const consignesAnchorRef = useRef<HTMLElement | null>(null);
  const videoAnchorRef = useRef<HTMLElement | null>(null);

  const isEditMode = !!initialLog;
  const [editingDateEnabled, setEditingDateEnabled] = useState(false);
  const [editDateInput, setEditDateInput] = useState("");
  const [validatedEditDate, setValidatedEditDate] = useState<string | null>(
    null,
  );

  // Animation changement de série
  const [setAnimating, setSetAnimating] = useState<Record<number, boolean>>({});
  const [prevSetIndex, setPrevSetIndex] = useState<Record<number, number>>({});
  // Animation surlignage RPE après "Finir l'exercice"
  const [highlightedRpeIndex, setHighlightedRpeIndex] = useState<number | null>(
    null,
  );

  // ========== SUPERSET GROUP STATES ==========
  // Index de série partagé par groupe superset (tous les exercices du groupe avancent ensemble)
  const [supersetSetIndex, setSupersetSetIndex] = useState<
    Record<string, number>
  >({});
  // État expand/collapse par groupe superset (un seul état pour tout le groupe)
  const [expandedSupersets, setExpandedSupersets] = useState<
    Record<string, boolean>
  >({});
  const toInputDateValue = (iso: string): string => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  useEffect(() => {
    if (initialLog) {
      setEditDateInput(toInputDateValue(initialLog.date));
      setValidatedEditDate(toInputDateValue(initialLog.date));
    }
  }, [initialLog]);
  const handleStartEditDate = useCallback(() => {
    setEditDateInput(
      validatedEditDate ??
        (initialLog ? toInputDateValue(initialLog.date) : ""),
    );
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
    const savedSession = localStorage.getItem("F.Y.T_active_session");
    if (savedSession && !initialLog) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.logs && parsed.sessionData) {
          const savedSessionIds = parsed.sessionData
            .map((s: any) => `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`)
            .sort()
            .join(",");
          const currentSessionIds = sessionData
            .map((s) => `${s.seance}-${s.annee}-${s.moisNum}-${s.semaine}`)
            .sort()
            .join(",");

          if (savedSessionIds === currentSessionIds) {
            setLogs(normalizeExerciseLogs(parsed.logs));
            setPhase("focus"); // Toujours démarrer directement en mode saisie
            setStartTime(parsed.startTime || null);
            setCurrentExerciseIndex(parsed.currentExerciseIndex || 0);
            setCurrentSetIndex(parsed.currentSetIndex || 0);
            setCurrentSetIndexes(parsed.currentSetIndexes || {});
            setExpandedExercises(parsed.expandedExercises || {});
            return;
          }
        }
      } catch (e) {
        console.error("Erreur parsing session sauvegardée:", e);
      }
    }

    // Initialiser les logs depuis sessionData
    if (initialLog) {
      setLogs(normalizeExerciseLogs(initialLog.exercises));
      setPhase("focus");
      setStartTime(Date.now());
    } else {
      // Créer les logs depuis sessionData, en préservant l'ordre original
      // pour les supersets (ne pas grouper par nom d'exercice)
      // Filtrer les blocs texte : ils ne génèrent pas de logs d'exercice
      const initialLogs: ExerciseLog[] = sessionData
        .filter((row) => !row.isTextBlock)
        .map((row) => {
          const numSets = parseInt(row.series) || 3;
          const suggestedWeight = getSuggestedWeight(row.exercice, history);
          const suggestedKg = suggestedWeight
            ? parseKgLikeToNumber(suggestedWeight)
            : null;
          const defaultReps = row.repsDuree
            ? row.repsDuree.replace(/[^0-9]/g, "")
            : "";

          return {
            exerciseId: row.exerciseId, // Transférer l'ID de l'exercice
            exerciseName: row.exercice,
            originalSession: row.seance,
            sets: Array.from({ length: numSets }, (_, i) => ({
              setNumber: i + 1,
              reps: defaultReps,
              weight: suggestedWeight || "",
              load: createDefaultLoad("single", suggestedKg),
              completed: false,
            })),
            notes: row.notes || "",
            // Champs mode d'exécution (superset, triset, etc.)
            executionMode: row.executionMode ?? "straight",
            executionGroupId: row.executionGroupId,
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
          console.error(
            `Error loading ghost for ${exercise.exerciseName}:`,
            error,
          );
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
    const allCompleted = ex.sets.every((s) => s.completed);
    if (!allCompleted) return;
    scrollToRpeOnNextCompletedRef.current = false;
    rpeSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [logs, currentExerciseIndex]);

  // ===========================================
  // TIMER
  // ===========================================

  useEffect(() => {
    if (phase !== "focus" || !startTime) return;

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
      sessionData: sessionData.map((s) => ({
        seance: s.seance,
        annee: s.annee,
        moisNum: s.moisNum,
        semaine: s.semaine,
      })),
      phase,
      startTime,
      currentExerciseIndex,
      currentSetIndex,
      currentSetIndexes,
      expandedExercises,
      isEditMode,
      editingSessionId: isEditMode && initialLog ? initialLog.id : null,
    });
    setLocalStorageWithEvent("F.Y.T_active_session", value);
  }, [
    logs,
    sessionData,
    phase,
    startTime,
    currentExerciseIndex,
    currentSetIndex,
    currentSetIndexes,
    expandedExercises,
    isEditMode,
    initialLog,
  ]);

  useEffect(() => {
    if (logs.length > 0) {
      saveToLocalStorage();
    }
  }, [
    logs,
    phase,
    currentExerciseIndex,
    currentSetIndex,
    currentSetIndexes,
    expandedExercises,
    saveToLocalStorage,
  ]);

  useEffect(() => {
    const idx = pendingScrollToRpeExerciseIndexRef.current;
    if (idx === null) return;
    const el = focusRpeRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollToRpeExerciseIndexRef.current = null;
    }
  }, [logs]);

  const clearLocalStorage = useCallback(() => {
    removeLocalStorageWithEvent("F.Y.T_active_session");
  }, []);

  const getSetIndexForExercise = useCallback(
    (exerciseIndex: number): number => {
      return typeof currentSetIndexes[exerciseIndex] === "number"
        ? currentSetIndexes[exerciseIndex]
        : 0;
    },
    [currentSetIndexes],
  );

  const setSetIndexForExercise = useCallback(
    (exerciseIndex: number, nextIndex: number) => {
      setCurrentSetIndexes((prev) => ({
        ...prev,
        [exerciseIndex]: nextIndex,
      }));
    },
    [],
  );

  const toggleExerciseExpanded = useCallback((exerciseIndex: number) => {
    setExpandedExercises((prev) => ({
      ...prev,
      [exerciseIndex]: !prev[exerciseIndex],
    }));
  }, []);

  // ===========================================
  // SUPERSET GROUP HELPERS
  // ===========================================

  // Récupérer l'index de série actuel pour un groupe superset
  const getSupersetSetIndex = useCallback(
    (groupId: string): number => {
      return supersetSetIndex[groupId] ?? 0;
    },
    [supersetSetIndex],
  );

  // Définir l'index de série pour un groupe superset (synchronise tous les exercices)
  const setSupersetSetIndexForGroup = useCallback(
    (groupId: string, idx: number) => {
      setSupersetSetIndex((prev) => ({ ...prev, [groupId]: idx }));
    },
    [],
  );

  // Toggle expand/collapse pour un groupe superset entier
  const toggleSupersetExpanded = useCallback((groupId: string) => {
    setExpandedSupersets((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  // Vérifier si un groupe superset est expanded
  const isSupersetExpanded = useCallback(
    (groupId: string): boolean => {
      return !!expandedSupersets[groupId];
    },
    [expandedSupersets],
  );

  // Valider la série actuelle pour tous les exercices d'un groupe superset
  const validateSupersetSet = useCallback(
    (groupId: string, exerciseIndices: number[]) => {
      const setIdx = getSupersetSetIndex(groupId);
      const newLogs = [...logs];
      let allValid = true;

      // Valider la série pour chaque exercice du groupe
      exerciseIndices.forEach((exIdx) => {
        const ex = newLogs[exIdx];
        const set = ex?.sets?.[setIdx];
        if (!ex || !set) {
          allValid = false;
          return;
        }
        set.completed = true;

        // Pré-remplir la prochaine série avec les valeurs actuelles
        const hasNextSet = setIdx < ex.sets.length - 1;
        if (hasNextSet) {
          const nextSet = ex.sets[setIdx + 1];
          nextSet.reps = set.reps;
          (nextSet as any).weight = (set as any).weight;
          if ((set as any).load) {
            (nextSet as any).load = { ...(set as any).load };
          }
        }
      });

      if (!allValid) return;

      setLogs(newLogs);

      // Vérifier si c'était la dernière série (basé sur le premier exercice du groupe)
      const firstExIdx = exerciseIndices[0];
      const firstEx = newLogs[firstExIdx];
      const isLastSet = setIdx === firstEx.sets.length - 1;

      if (!isLastSet) {
        // Passer à la série suivante pour le groupe
        setSupersetSetIndexForGroup(groupId, setIdx + 1);
      } else {
        // Dernière série: vérifier si RPE déjà rempli -> auto-collapse
        const hasRpe = typeof firstEx.rpe === "number";
        const allSetsComplete = exerciseIndices.every((exIdx) =>
          newLogs[exIdx]?.sets.every((s) => s.completed),
        );
        if (hasRpe && allSetsComplete) {
          setExpandedSupersets((prev) => ({ ...prev, [groupId]: false }));
        }
      }
    },
    [logs, getSupersetSetIndex, setSupersetSetIndexForGroup],
  );

  // Toggle validation d'une série pour un groupe superset
  const toggleSupersetSetValidation = useCallback(
    (groupId: string, exerciseIndices: number[]) => {
      const setIdx = getSupersetSetIndex(groupId);
      const newLogs = [...logs];

      // Toggle pour tous les exercices du groupe
      exerciseIndices.forEach((exIdx) => {
        const ex = newLogs[exIdx];
        const set = ex?.sets?.[setIdx];
        if (ex && set) {
          set.completed = !set.completed;
        }
      });

      setLogs(newLogs);
    },
    [logs, getSupersetSetIndex],
  );

  // Mettre à jour le RPE pour tous les exercices d'un groupe superset
  const updateSupersetRpe = useCallback(
    (groupId: string, exerciseIndices: number[], rpe: number | undefined) => {
      const newLogs = [...logs];

      // Appliquer le RPE à tous les exercices du groupe
      exerciseIndices.forEach((exIdx) => {
        if (newLogs[exIdx]) {
          newLogs[exIdx].rpe = rpe;
        }
      });

      setLogs(newLogs);

      // Si RPE saisi et toutes séries complétées, collapse le groupe
      if (typeof rpe === "number") {
        const allSetsComplete = exerciseIndices.every((exIdx) =>
          newLogs[exIdx]?.sets.every((s) => s.completed),
        );
        if (allSetsComplete) {
          setExpandedSupersets((prev) => ({ ...prev, [groupId]: false }));
        }
      }
    },
    [logs],
  );

  // Ajouter une série à tous les exercices d'un groupe superset
  const addSetForSuperset = useCallback(
    (exerciseIndices: number[]) => {
      const newLogs = [...logs];

      exerciseIndices.forEach((exIdx) => {
        const sets = newLogs[exIdx]?.sets;
        if (!sets) return;
        const prev = sets[sets.length - 1];
        const prevTotalKg = prev?.load
          ? getLoadTotalKg(prev.load)
          : prev?.weight
            ? parseKgLikeToNumber(prev.weight)
            : null;
        const nextLoad = prev?.load
          ? ({ ...prev.load } as SetLoad)
          : createDefaultLoad("single", prevTotalKg);
        sets.push({
          setNumber: sets.length + 1,
          reps: "",
          weight: prev?.weight || "",
          load: nextLoad,
          completed: false,
        });
      });

      setLogs(newLogs);
    },
    [logs],
  );

  // Supprimer une série de tous les exercices d'un groupe superset
  const removeSetForSuperset = useCallback(
    (groupId: string, exerciseIndices: number[]) => {
      const setIdx = getSupersetSetIndex(groupId);
      const firstEx = logs[exerciseIndices[0]];
      if (!firstEx || firstEx.sets.length <= 1) return;

      const newLogs = [...logs];

      exerciseIndices.forEach((exIdx) => {
        const ex = newLogs[exIdx];
        if (ex && ex.sets.length > 1) {
          ex.sets.splice(setIdx, 1);
          ex.sets.forEach((s, i) => (s.setNumber = i + 1));
        }
      });

      setLogs(newLogs);

      // Ajuster l'index de série si nécessaire
      const newMaxIndex = newLogs[exerciseIndices[0]]?.sets.length - 1 || 0;
      if (setIdx > newMaxIndex) {
        setSupersetSetIndexForGroup(groupId, newMaxIndex);
      }
    },
    [logs, getSupersetSetIndex, setSupersetSetIndexForGroup],
  );

  // ===========================================
  // DEMO TOUR: Expand first exercise when requested
  // ===========================================
  const {
    shouldFlipCard,
    setShouldFlipCard,
    currentStep,
    currentStepIndex,
    isActive: isTourActive,
    nextStep: demoNextStep,
  } = useDemoTour();

  useEffect(() => {
    if (shouldFlipCard && logs.length > 0) {
      // Expand la première tuile exercice pour le demo tour
      setExpandedExercises((prev) => ({
        ...prev,
        [0]: true,
      }));
      // Reset le flag
      setShouldFlipCard(false);
    }
  }, [shouldFlipCard, setShouldFlipCard, logs.length]);

  // Écouter l'événement pour replier le bloc exercice (tour démo étape 14)
  useEffect(() => {
    const handleDemoCollapse = () => {
      // Replier le premier exercice
      setExpandedExercises((prev) => ({
        ...prev,
        [0]: false,
      }));
    };

    window.addEventListener("demo-collapse-exercise", handleDemoCollapse);
    return () => {
      window.removeEventListener("demo-collapse-exercise", handleDemoCollapse);
    };
  }, []);

  const scrollToExerciseCard = useCallback((exerciseIndex: number) => {
    const el = focusCardRefs.current[exerciseIndex];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================

  const progress = useMemo(() => {
    const totalSets = logs.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = logs.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0,
    );
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  }, [logs]);

  const currentExercise = logs[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];

  const originalExerciseData = useMemo(() => {
    if (!currentExercise) return null;
    return sessionData.find((d) => d.exercice === currentExercise.exerciseName);
  }, [currentExercise, sessionData]);

  const lastPerformance = useMemo(() => {
    if (!currentExercise) return null;
    return getLastPerformance(currentExercise.exerciseName, history);
  }, [currentExercise, history]);

  const sessionTitle = useMemo(() => {
    const seances = [...new Set(sessionData.map((d) => d.seance))];
    return seances.join(" + ");
  }, [sessionData]);

  const allExercisesCompleted = useMemo(() => {
    if (logs.length === 0) return false;
    return logs.every((ex) => {
      const allSetsDone =
        ex.sets.length > 0 && ex.sets.every((s) => s.completed);
      const hasRpe = typeof ex.rpe === "number";
      return allSetsDone && hasRpe;
    });
  }, [logs]);

  // Groupement des exercices pour affichage (supersets groupés)
  const groupedLogs = useMemo(() => {
    return groupExerciseLogs(logs);
  }, [logs]);

  // Map pour retrouver l'index original d'un exercice depuis le groupement
  const getOriginalExerciseIndex = useCallback(
    (exerciseName: string, executionGroupId?: string): number => {
      return logs.findIndex(
        (ex) =>
          ex.exerciseName === exerciseName &&
          ex.executionGroupId === executionGroupId,
      );
    },
    [logs],
  );

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleStartSession = useCallback(() => {
    setPhase("focus");
    setStartTime(Date.now());
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  }, []);

  const updateSet = useCallback(
    (field: keyof SetLog, value: any) => {
      const newLogs = [...logs];
      (newLogs[currentExerciseIndex].sets[currentSetIndex] as any)[field] =
        value;
      setLogs(newLogs);
    },
    [logs, currentExerciseIndex, currentSetIndex],
  );

  const updateCurrentSetLoad = useCallback(
    (load: SetLoad) => {
      const totalKg = getLoadTotalKg(load);
      const newLogs = [...logs];
      const set = newLogs[currentExerciseIndex].sets[currentSetIndex];
      (set as any).load = load;
      (set as any).weight =
        typeof totalKg === "number"
          ? String(Math.round(totalKg * 100) / 100)
          : "";
      setLogs(newLogs);
    },
    [logs, currentExerciseIndex, currentSetIndex],
  );

  const updateSetForExercise = useCallback(
    (
      exerciseIndex: number,
      setIndex: number,
      field: keyof SetLog,
      value: any,
    ) => {
      const newLogs = [...logs];
      const set = newLogs[exerciseIndex]?.sets?.[setIndex];
      if (!set) return;
      (set as any)[field] = value;
      // Invalider la série quand les inputs changent
      (set as any).completed = false;
      setLogs(newLogs);
    },
    [logs],
  );

  const updateSetLoadForExercise = useCallback(
    (exerciseIndex: number, setIndex: number, load: SetLoad) => {
      const totalKg = getLoadTotalKg(load);
      const newLogs = [...logs];
      const set = newLogs[exerciseIndex]?.sets?.[setIndex];
      if (!set) return;
      (set as any).load = load;
      (set as any).weight =
        typeof totalKg === "number"
          ? String(Math.round(totalKg * 100) / 100)
          : "";
      // Invalider la série quand les inputs changent
      (set as any).completed = false;
      setLogs(newLogs);
    },
    [logs],
  );

  const cycleSetLoadTypeForExercise = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const set = logs[exerciseIndex]?.sets?.[setIndex];
      if (!set) return;
      const currentLoad = set.load;
      const totalKg =
        getLoadTotalKg(currentLoad) ??
        (set.weight ? parseKgLikeToNumber(set.weight) : null);
      const typeOrder: SetLoad["type"][] = [
        "single",
        "double",
        "barbell",
        "machine",
        "assisted",
        "distance",
      ];
      const currentType = currentLoad?.type ?? "single";
      const idx = typeOrder.indexOf(currentType);
      const nextType = typeOrder[(idx + 1) % typeOrder.length];
      updateSetLoadForExercise(
        exerciseIndex,
        setIndex,
        createDefaultLoad(nextType, totalKg),
      );
    },
    [logs, updateSetLoadForExercise],
  );

  const cycleCurrentSetLoadType = useCallback(() => {
    const set = logs[currentExerciseIndex]?.sets[currentSetIndex];
    if (!set) return;
    const currentLoad = set.load;
    const totalKg =
      getLoadTotalKg(currentLoad) ??
      (set.weight ? parseKgLikeToNumber(set.weight) : null);
    const typeOrder: SetLoad["type"][] = [
      "single",
      "double",
      "barbell",
      "machine",
      "assisted",
      "distance",
    ];
    const currentType = currentLoad?.type ?? "single";
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

    console.log(
      "[saveCurrentExerciseCommentIfNeeded] Sauvegarde auto du commentaire pour:",
      currentExerciseName,
    );

    try {
      const sessionId = pendingSessionLog?.id || "active";
      await onSaveComment(currentExerciseName, comment, sessionId);
      setSentComments((prev) => new Set([...prev, currentExerciseName]));
      // On ne vide pas le champ pour que l'utilisateur puisse voir ce qu'il a écrit
      console.log(
        "[saveCurrentExerciseCommentIfNeeded] Commentaire sauvegardé avec succès",
      );
    } catch (error) {
      console.error("[saveCurrentExerciseCommentIfNeeded] Erreur:", error);
    }
  }, [
    onSaveComment,
    logs,
    currentExerciseIndex,
    exerciseComments,
    sentComments,
    pendingSessionLog,
  ]);

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
  }, [
    logs,
    currentExerciseIndex,
    currentSetIndex,
    currentExercise,
    saveCurrentExerciseCommentIfNeeded,
  ]);

  const validateSetForExercise = useCallback(
    (exerciseIndex: number) => {
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
        setPrevSetIndex((prev) => ({ ...prev, [exerciseIndex]: setIndex }));

        // Déclencher l'animation de changement de série
        setSetAnimating((prev) => ({ ...prev, [exerciseIndex]: true }));

        // Changer l'index immédiatement
        setSetIndexForExercise(exerciseIndex, setIndex + 1);

        // Arrêter l'animation après sa durée
        setTimeout(() => {
          setSetAnimating((prev) => ({ ...prev, [exerciseIndex]: false }));
        }, 300); // Durée de l'animation (0.3s)

        return;
      }

      // Dernière série: scroll vers le RPE et animation de surlignage
      // Dernière série: scroll vers le RPE et surlignage (reste actif jusqu'à saisie du RPE)
      setTimeout(() => {
        const rpeRef = focusRpeRefs.current[exerciseIndex];
        if (rpeRef) {
          rpeRef.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setHighlightedRpeIndex(exerciseIndex);
      }, 100);

      if (typeof newLogs[exerciseIndex].rpe !== "number") {
        pendingScrollToRpeExerciseIndexRef.current = exerciseIndex;
        return;
      }

      setExpandedExercises((prev) => ({ ...prev, [exerciseIndex]: false }));
      const nextExerciseIndex = Math.min(exerciseIndex + 1, newLogs.length - 1);
      if (nextExerciseIndex !== exerciseIndex) {
        setExpandedExercises((prev) => ({
          ...prev,
          [nextExerciseIndex]: false,
        }));
        setTimeout(() => scrollToExerciseCard(nextExerciseIndex), 50);
      }
    },
    [
      logs,
      getSetIndexForExercise,
      setSetIndexForExercise,
      scrollToExerciseCard,
    ],
  );

  const toggleSetValidationForExercise = useCallback(
    (exerciseIndex: number) => {
      const setIndex = getSetIndexForExercise(exerciseIndex);
      const ex = logs[exerciseIndex];
      const set = ex?.sets?.[setIndex];
      if (!ex || !set) return;

      const newLogs = [...logs];
      newLogs[exerciseIndex].sets[setIndex].completed =
        !newLogs[exerciseIndex].sets[setIndex].completed;
      setLogs(newLogs);
    },
    [logs, getSetIndexForExercise],
  );

  const toggleSetValidation = useCallback(() => {
    const newLogs = [...logs];
    const isCurrentlyCompleted =
      newLogs[currentExerciseIndex].sets[currentSetIndex].completed;
    newLogs[currentExerciseIndex].sets[currentSetIndex].completed =
      !isCurrentlyCompleted;
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
    const prevTotalKg = prev?.load
      ? getLoadTotalKg(prev.load)
      : prev?.weight
        ? parseKgLikeToNumber(prev.weight)
        : null;
    const nextLoad = prev?.load
      ? ({ ...prev.load } as SetLoad)
      : createDefaultLoad("single", prevTotalKg);
    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: "",
      weight: prev?.weight || "",
      load: nextLoad,
      completed: false,
    });
    setLogs(newLogs);
  }, [logs, currentExerciseIndex]);

  const addSetForExercise = useCallback(
    (exerciseIndex: number) => {
      const newLogs = [...logs];
      const sets = newLogs[exerciseIndex]?.sets;
      if (!sets) return;
      const prev = sets[sets.length - 1];
      const prevTotalKg = prev?.load
        ? getLoadTotalKg(prev.load)
        : prev?.weight
          ? parseKgLikeToNumber(prev.weight)
          : null;
      const nextLoad = prev?.load
        ? ({ ...prev.load } as SetLoad)
        : createDefaultLoad("single", prevTotalKg);
      sets.push({
        setNumber: sets.length + 1,
        reps: "",
        weight: prev?.weight || "",
        load: nextLoad,
        completed: false,
      });
      setLogs(newLogs);
    },
    [logs],
  );

  const removeCurrentSet = useCallback(() => {
    if (currentExercise.sets.length <= 1) return;

    const newLogs = [...logs];
    newLogs[currentExerciseIndex].sets.splice(currentSetIndex, 1);
    newLogs[currentExerciseIndex].sets.forEach((s, i) => (s.setNumber = i + 1));
    setLogs(newLogs);

    if (currentSetIndex >= newLogs[currentExerciseIndex].sets.length) {
      setCurrentSetIndex(newLogs[currentExerciseIndex].sets.length - 1);
    }
  }, [logs, currentExerciseIndex, currentSetIndex, currentExercise]);

  const removeSetForExercise = useCallback(
    (exerciseIndex: number) => {
      const setIndex = getSetIndexForExercise(exerciseIndex);
      const ex = logs[exerciseIndex];
      if (!ex || ex.sets.length <= 1) return;

      const newLogs = [...logs];
      newLogs[exerciseIndex].sets.splice(setIndex, 1);
      newLogs[exerciseIndex].sets.forEach((s, i) => (s.setNumber = i + 1));
      setLogs(newLogs);

      const nextSetIndex = Math.min(
        setIndex,
        newLogs[exerciseIndex].sets.length - 1,
      );
      setSetIndexForExercise(exerciseIndex, nextSetIndex);
    },
    [logs, getSetIndexForExercise, setSetIndexForExercise],
  );

  const updateExerciseRpe = useCallback(
    (rpe: number | undefined) => {
      const newLogs = [...logs];
      newLogs[currentExerciseIndex].rpe = rpe;
      setLogs(newLogs);
    },
    [logs, currentExerciseIndex],
  );

  const updateExerciseRpeForExercise = useCallback(
    (exerciseIndex: number, rpe: number | undefined) => {
      const newLogs = [...logs];
      if (!newLogs[exerciseIndex]) return;
      newLogs[exerciseIndex].rpe = rpe;
      setLogs(newLogs);

      // Retirer le surlignage RPE quand le RPE est saisi
      if (typeof rpe === "number" && highlightedRpeIndex === exerciseIndex) {
        setHighlightedRpeIndex(null);
      }

      // Demo tour: Si on est à l'étape 13 (RPE) et exercice 0, passer à l'étape suivante
      if (
        isTourActive &&
        currentStepIndex === 13 &&
        exerciseIndex === 0 &&
        typeof rpe === "number"
      ) {
        setTimeout(() => {
          demoNextStep();
        }, 300);
      }

      if (
        typeof rpe === "number" &&
        newLogs[exerciseIndex].sets.every((s) => s.completed)
      ) {
        setExpandedExercises((prev) => ({ ...prev, [exerciseIndex]: false }));
        const nextExerciseIndex = Math.min(
          exerciseIndex + 1,
          newLogs.length - 1,
        );
        if (nextExerciseIndex !== exerciseIndex) {
          setExpandedExercises((prev) => ({
            ...prev,
            [nextExerciseIndex]: false,
          }));
          setTimeout(() => scrollToExerciseCard(nextExerciseIndex), 50);
        }
      }
    },
    [
      logs,
      scrollToExerciseCard,
      highlightedRpeIndex,
      isTourActive,
      currentStepIndex,
      demoNextStep,
    ],
  );

  const handleFinish = useCallback(async () => {
    // Sauvegarder le commentaire du dernier exercice avant de terminer
    await saveCurrentExerciseCommentIfNeeded();

    const sessionKey: SessionKey = {
      annee: sessionData[0]?.annee || "",
      moisNum: sessionData[0]?.moisNum || "",
      semaine: sessionData[0]?.semaine || "",
      seance: Array.from(new Set(sessionData.map((d) => d.seance))).join("+"),
    };

    let finalDate = new Date().toISOString();
    if (isEditMode && initialLog) {
      if (validatedEditDate) {
        const [yy, mm, dd] = validatedEditDate
          .split("-")
          .map((v) => parseInt(v, 10));
        finalDate = new Date(yy, mm - 1, dd, 12, 0, 0).toISOString();
      } else {
        finalDate = initialLog.date;
      }
    }

    const finalLog: SessionLog = {
      id: isEditMode && initialLog ? initialLog.id : crypto.randomUUID(),
      date: finalDate,
      sessionKey,
      exercises: logs.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.completed) return s;
          return {
            ...s,
            reps: "-",
            weight: "-",
            load: undefined,
          };
        }),
      })),
      durationMinutes: Math.round(elapsedTime / 60),
      sessionRpe: undefined,
    };

    setPendingSessionLog(finalLog);
    setShowSessionRpeModal(true);
  }, [
    sessionData,
    logs,
    elapsedTime,
    isEditMode,
    initialLog,
    saveCurrentExerciseCommentIfNeeded,
  ]);

  const handleSessionRpeSubmit = useCallback(
    async (sessionRpe: number) => {
      if (!pendingSessionLog) return;

      setSaving(true);
      const finalLog = { ...pendingSessionLog, sessionRpe };

      try {
        await onSave(finalLog);
        clearLocalStorage();
      } catch (error) {
        console.error("Erreur sauvegarde:", error);
      } finally {
        setSaving(false);
        setShowSessionRpeModal(false);
      }
    },
    [pendingSessionLog, onSave, clearLocalStorage],
  );

  const handleSkipSessionRpe = useCallback(async () => {
    if (!pendingSessionLog) return;

    setSaving(true);
    try {
      // Conserver le RPE existant si présent (mode édition)
      const finalLog =
        initialLog?.sessionRpe !== undefined
          ? { ...pendingSessionLog, sessionRpe: initialLog.sessionRpe }
          : pendingSessionLog;
      await onSave(finalLog);
      clearLocalStorage();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
    } finally {
      setSaving(false);
      setShowSessionRpeModal(false);
    }
  }, [pendingSessionLog, initialLog, onSave, clearLocalStorage]);

  const handleCancel = useCallback(() => {
    clearLocalStorage();
    onCancel();
  }, [clearLocalStorage, onCancel]);

  const handleSendComment = useCallback(
    async (exerciseName: string) => {
      if (!onSaveComment || !exerciseComments[exerciseName]?.trim()) return;

      setCommentSending(exerciseName);
      try {
        const sessionId = pendingSessionLog?.id || "active";
        await onSaveComment(
          exerciseName,
          exerciseComments[exerciseName],
          sessionId,
        );
        setSentComments((prev) => new Set([...prev, exerciseName]));
        setMessageSentConfirm((prev) => new Set([...prev, exerciseName]));
        setExerciseComments((prev) => ({ ...prev, [exerciseName]: "" }));
      } catch (error) {
        console.error("Erreur envoi commentaire:", error);
      } finally {
        setCommentSending(null);
      }
    },
    [exerciseComments, onSaveComment, pendingSessionLog],
  );

  // ===========================================
  // RENDER: RECAP PHASE
  // ===========================================

  const renderRecapPhase = () => (
    <div className="min-h-screen bg-theme pb-32">
      {/* Header */}
      <div
        className={`sticky top-0 z-10 bg-theme/95 backdrop-blur-sm border-b border-theme px-4 py-3 ${isDesktop ? "pl-16" : ""}`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-2 text-theme-muted hover:text-theme transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Annuler</span>
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-theme">{sessionTitle}</h1>
            {isEditMode && (
              <div className="mt-1 flex items-center gap-2 justify-center">
                <Calendar className="w-4 h-4 text-theme-muted" />
                {editingDateEnabled ? (
                  <input
                    type="date"
                    value={editDateInput}
                    onChange={(e) => setEditDateInput(e.target.value)}
                    className="bg-theme-tertiary border border-theme rounded-lg px-2 py-1 text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                ) : (
                  <span className="text-sm text-theme-muted">
                    {validatedEditDate
                      ? new Date(validatedEditDate).toLocaleDateString("fr-FR")
                      : initialLog
                        ? new Date(initialLog.date).toLocaleDateString("fr-FR")
                        : ""}
                  </span>
                )}
                {editingDateEnabled ? (
                  <button
                    onClick={handleValidateEditDate}
                    className="p-1.5 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-theme"
                    type="button"
                    title="Valider la date"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartEditDate}
                    className="p-1.5 rounded-lg bg-theme-tertiary hover:bg-theme-tertiary text-theme-secondary"
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
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-theme-muted flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Programme de la séance
          </h2>

          {/* Desktop: grille 4 colonnes avec tuiles carrées */}
          <div
            className={
              isDesktop
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                : "space-y-2"
            }
          >
            {groupedLogs.map((item, groupIndex) => {
              // Cas Superset
              if (isExerciseLogGroup(item)) {
                const group = item;
                const modeInfo = EXECUTION_MODES[group.executionMode];
                const firstExerciseData = sessionData.find(
                  (d) => d.exercice === group.exercises[0]?.exerciseName,
                );

                if (isDesktop) {
                  // Desktop: Bloc superset — col-span dynamique selon le nombre d'exercices
                  // Mapping statique pour garantir la détection par le scanner Tailwind
                  const exCount = group.exercises.length;
                  // col-span-1 col-span-2 col-span-3 col-span-4 lg:col-span-2 lg:col-span-3 xl:col-span-3 xl:col-span-4
                  const COL_SPAN_MAP: Record<number, string> = {
                    1: "col-span-1",
                    2: "col-span-2",
                    3: "col-span-2 lg:col-span-3",
                    4: "col-span-2 lg:col-span-3 xl:col-span-4",
                  };
                  const colSpanClass =
                    COL_SPAN_MAP[Math.min(exCount, 4)] || COL_SPAN_MAP[4];

                  return (
                    <div
                      key={`group-${group.groupId}`}
                      className={`${colSpanClass} bg-theme-tertiary border-2 border-[var(--color-primary)] rounded-xl overflow-hidden`}
                    >
                      {/* Header Superset */}
                      <div className="bg-[var(--color-primary)]/10 px-4 py-2 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="text-sm font-medium text-[var(--color-primary)]">
                          {modeInfo.label}
                        </span>
                        <span className="text-xs text-theme-muted ml-auto">
                          {group.exercises[0]?.sets.length || "?"} séries
                        </span>
                      </div>

                      {/* Exercices du superset */}
                      <div className="p-4 space-y-3">
                        {group.exercises.map((exercise, exIdx) => {
                          const originalIndex = getOriginalExerciseIndex(
                            exercise.exerciseName,
                            exercise.executionGroupId,
                          );
                          const exerciseData = sessionData.find(
                            (d) => d.exercice === exercise.exerciseName,
                          );

                          return (
                            <div
                              key={`${group.groupId}-${exIdx}`}
                              className="flex items-start gap-3"
                            >
                              <span className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                                {String.fromCharCode(65 + exIdx)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-theme text-base leading-tight">
                                  {getExerciseDisplayName(
                                    exercise.exerciseName,
                                  )}
                                </h3>
                                <div className="mt-1 flex items-center gap-2 text-sm text-theme-muted">
                                  <span>
                                    {exerciseData?.repsDuree || "?"} reps
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions groupées */}
                      <div className="px-4 pb-4 flex items-center gap-2">
                        <button
                          onClick={(e) =>
                            setShowHistoryModal({
                              index: getOriginalExerciseIndex(
                                group.exercises[0]?.exerciseName,
                                group.exercises[0]?.executionGroupId,
                              ),
                              anchorEl: e.currentTarget,
                            })
                          }
                          className="px-2.5 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors"
                          type="button"
                        >
                          Historique
                        </button>
                        <button
                          onClick={(e) =>
                            setShowConsignesModal({
                              index: getOriginalExerciseIndex(
                                group.exercises[0]?.exerciseName,
                                group.exercises[0]?.executionGroupId,
                              ),
                              anchorEl: e.currentTarget,
                            })
                          }
                          className="px-2.5 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors"
                          type="button"
                        >
                          Consignes
                        </button>
                      </div>
                    </div>
                  );
                }

                // Mobile: Bloc superset
                return (
                  <div
                    key={`group-${group.groupId}`}
                    className="bg-theme-tertiary border-2 border-[var(--color-primary)] rounded-xl overflow-hidden"
                  >
                    {/* Header Superset */}
                    <div className="bg-[var(--color-primary)]/10 px-3 py-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="text-sm font-medium text-[var(--color-primary)]">
                        {modeInfo.label}
                      </span>
                      <span className="text-xs text-theme-muted ml-auto">
                        {group.exercises[0]?.sets.length || "?"} séries
                      </span>
                    </div>

                    {/* Exercices */}
                    <div className="p-3 space-y-2">
                      {group.exercises.map((exercise, exIdx) => {
                        const exerciseData = sessionData.find(
                          (d) => d.exercice === exercise.exerciseName,
                        );

                        return (
                          <div
                            key={`${group.groupId}-${exIdx}`}
                            className="flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {String.fromCharCode(65 + exIdx)}
                            </span>
                            <span className="text-theme font-medium flex-1 truncate">
                              {getExerciseDisplayName(exercise.exerciseName)}
                            </span>
                            <span className="text-theme-muted text-sm">
                              {exerciseData?.repsDuree || "?"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex items-center gap-2 justify-center">
                      <button
                        onClick={(e) =>
                          setShowHistoryModal({
                            index: getOriginalExerciseIndex(
                              group.exercises[0]?.exerciseName,
                              group.exercises[0]?.executionGroupId,
                            ),
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-3 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Historique
                      </button>
                      <button
                        onClick={(e) =>
                          setShowConsignesModal({
                            index: getOriginalExerciseIndex(
                              group.exercises[0]?.exerciseName,
                              group.exercises[0]?.executionGroupId,
                            ),
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-3 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Consignes
                      </button>
                    </div>
                  </div>
                );
              }

              // Cas exercice individuel
              const exercise = item as ExerciseLog;
              const index = logs.findIndex(
                (ex) =>
                  ex.exerciseName === exercise.exerciseName &&
                  ex.executionGroupId === exercise.executionGroupId,
              );
              const exerciseData = sessionData.find(
                (d) => d.exercice === exercise.exerciseName,
              );

              if (isDesktop) {
                return (
                  <div
                    key={`single-${index}`}
                    className="aspect-square bg-theme-tertiary border border-theme rounded-xl p-4 flex flex-col"
                  >
                    {/* Nom exercice - gros pour remplir */}
                    <h3 className="font-bold text-theme text-lg leading-tight line-clamp-3 flex-1">
                      {getExerciseDisplayName(exercise.exerciseName)}
                    </h3>

                    {/* Badge séries x reps */}
                    <div className="mt-3">
                      <span className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-sm font-semibold">
                        {exerciseData?.series || exercise.sets.length} ×{" "}
                        {exerciseData?.repsDuree || "?"}
                      </span>
                    </div>

                    {/* Boutons action */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={(e) =>
                          setShowHistoryModal({
                            index,
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-2.5 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Historique
                      </button>
                      <button
                        onClick={(e) =>
                          setShowConsignesModal({
                            index,
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-2.5 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Consignes
                      </button>
                      {exerciseData?.video && (
                        <button
                          onClick={(e) =>
                            setShowVideoModal({
                              url: exerciseData.video!,
                              exerciseName: exercise.exerciseName,
                              anchorEl: e.currentTarget,
                            })
                          }
                          className="p-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-lg text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                          type="button"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <Card key={`single-${index}`} variant="default" className="p-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-theme line-clamp-3">
                      {getExerciseDisplayName(exercise.exerciseName)}
                    </h3>
                    <div className="mt-3 text-center">
                      <div className="text-xl font-semibold text-theme">
                        {exerciseData?.series || exercise.sets.length} ×{" "}
                        {exerciseData?.repsDuree || "?"}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 justify-center">
                      <button
                        onClick={(e) =>
                          setShowHistoryModal({
                            index,
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-3 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Historique
                      </button>
                      <button
                        onClick={(e) =>
                          setShowConsignesModal({
                            index,
                            anchorEl: e.currentTarget,
                          })
                        }
                        className="px-3 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors"
                        type="button"
                      >
                        Consignes
                      </button>
                      {exerciseData?.video && (
                        <button
                          onClick={(e) =>
                            setShowVideoModal({
                              url: exerciseData.video!,
                              exerciseName: exercise.exerciseName,
                              anchorEl: e.currentTarget,
                            })
                          }
                          className="p-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-full text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                          type="button"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div
        className="fixed right-4 z-20"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom) + 64px)" }}
      >
        <button
          onClick={handleStartSession}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:opacity-90 text-theme font-bold shadow-xl shadow-[var(--shadow-color)] transition-all active:scale-[0.98]"
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
      return <div className="p-4 text-theme">Chargement...</div>;
    }

    return (
      <div className="min-h-screen bg-theme flex flex-col">
        {/* Header */}
        <div
          className={`sticky top-0 z-10 bg-theme/95 backdrop-blur-sm border-b border-theme pt-4 pb-3 ${isDesktop ? "pl-16" : ""}`}
        >
          {/* Progress Bar - Mobile only (desktop shows at bottom) */}
          {!isDesktop && (
            <div className="px-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-theme-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-theme-muted w-12 text-right">
                  {progress}%
                </span>
              </div>
            </div>
          )}

          <div className="px-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-theme truncate">
                {sessionTitle}
              </h1>
              {isEditMode && (
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-theme-muted" />
                  {editingDateEnabled ? (
                    <input
                      type="date"
                      value={editDateInput}
                      onChange={(e) => setEditDateInput(e.target.value)}
                      className="bg-theme-tertiary border border-theme rounded-lg px-2 py-1 text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  ) : (
                    <span className="text-sm text-theme-muted">
                      {validatedEditDate
                        ? new Date(validatedEditDate).toLocaleDateString(
                            "fr-FR",
                          )
                        : initialLog
                          ? new Date(initialLog.date).toLocaleDateString(
                              "fr-FR",
                            )
                          : ""}
                    </span>
                  )}
                  {editingDateEnabled ? (
                    <button
                      onClick={handleValidateEditDate}
                      className="p-1.5 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-theme"
                      type="button"
                      title="Valider la date"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleStartEditDate}
                      className="p-1.5 rounded-lg bg-theme-tertiary hover:bg-theme-tertiary text-theme-secondary"
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
              className="p-2 -mr-2 text-theme-muted hover:text-theme transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto" ref={scrollContainerRef}>
          {/* Desktop: grille de tuiles carrées (max 4 colonnes) / Mobile: liste verticale */}
          <div
            className={
              isDesktop
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                : "space-y-3"
            }
          >
            {(() => {
              // Utiliser groupedLogs pour regrouper les supersets
              const groupedItems = groupedLogs;
              const renderedElements: React.ReactNode[] = [];

              // Helper: rendre le bloc exercice desktop (utilisé pour superset et individuel)
              const renderDesktopExerciseBlock = (
                exercise: ExerciseLog,
                exerciseIndex: number,
                supersetInfo?: { label: string; groupId: string },
              ) => {
                const exerciseData = sessionData.find(
                  (d) => d.exercice === exercise.exerciseName,
                );
                const setIndex = getSetIndexForExercise(exerciseIndex);
                const set = exercise.sets[setIndex];
                const isExpanded = !!expandedExercises[exerciseIndex];
                const allSetsCompletedForExercise = exercise.sets.every(
                  (s) => s.completed,
                );
                const isExerciseDone =
                  allSetsCompletedForExercise &&
                  typeof exercise.rpe === "number";

                if (!set) return null;

                return (
                  <div
                    key={
                      supersetInfo
                        ? `${supersetInfo.groupId}-${exerciseIndex}`
                        : exerciseIndex
                    }
                    className="relative"
                    ref={(el) => {
                      focusCardRefs.current[exerciseIndex] = el;
                    }}
                  >
                    {/* Badge Superset en haut à gauche */}
                    {supersetInfo && (
                      <div className="absolute top-2 left-2 z-20 pointer-events-none">
                        <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center shadow-lg">
                          {supersetInfo.label}
                        </span>
                      </div>
                    )}
                    {/* Indicateurs done/RPE */}
                    {isExerciseDone && (
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-none">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme shadow-lg">
                          <Check className="w-4 h-4" />
                        </div>
                        {typeof exercise.rpe === "number" && (
                          <div
                            className={`w-6 h-6 flex items-center justify-center rounded-lg text-theme font-bold shadow-lg text-xs ${RPE_SCALE.find((r) => r.value === exercise.rpe)?.color || "bg-theme-tertiary"}`}
                          >
                            {exercise.rpe}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`
                        w-full aspect-square bg-theme-tertiary border rounded-xl overflow-hidden flex flex-col transition-all
                        ${isExerciseDone ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/10" : "border-theme"}
                        ${isExpanded ? "ring-2 ring-[var(--color-primary)]" : "hover:bg-theme-tertiary/70"}
                      `}
                    >
                      {!isExpanded ? (
                        /* RECTO: Format minimisé avec éléments très gros */
                        <button
                          onClick={() => toggleExerciseExpanded(exerciseIndex)}
                          className="w-full h-full p-4 flex flex-col text-left"
                          type="button"
                        >
                          {/* Nom exercice - très gros pour remplir la tuile */}
                          <h3 className="font-bold text-theme text-2xl leading-tight line-clamp-3 flex-1">
                            {getExerciseDisplayName(exercise.exerciseName)}
                          </h3>

                          {/* Badges très agrandis */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <span className="px-4 py-2 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-xl text-base font-bold">
                              {exerciseData?.series || exercise.sets.length}×
                              {exerciseData?.repsDuree?.replace(
                                /[^0-9-]/g,
                                "",
                              ) || "?"}
                            </span>
                            {exerciseData?.repos && (
                              <span className="px-4 py-2 border border-theme text-theme-muted rounded-xl text-base font-medium">
                                {exerciseData.repos}s
                              </span>
                            )}
                          </div>

                          {/* Boutons action très agrandis */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHistoryModal({
                                  index: exerciseIndex,
                                  anchorEl: e.currentTarget,
                                });
                              }}
                              className="px-3 py-2 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-xl text-base font-semibold transition-colors whitespace-nowrap"
                              type="button"
                            >
                              Historique
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowConsignesModal({
                                  index: exerciseIndex,
                                  anchorEl: e.currentTarget,
                                });
                              }}
                              className="px-3 py-2 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-xl text-base font-semibold transition-colors whitespace-nowrap"
                              type="button"
                            >
                              Consignes
                            </button>
                            {exerciseData?.video && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowVideoModal({
                                    url: exerciseData.video!,
                                    exerciseName: exercise.exerciseName,
                                    anchorEl: e.currentTarget,
                                  });
                                }}
                                className="p-2.5 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-xl text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                                type="button"
                              >
                                <Video className="w-5 h-5" />
                              </button>
                            )}
                          </div>

                          {/* Progression séries agrandie */}
                          <div className="mt-4">
                            <div className="flex items-center gap-1.5">
                              {exercise.sets.map((s, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 h-3 rounded-full ${s.completed ? "bg-[var(--color-success)]" : "bg-theme-tertiary"}`}
                                />
                              ))}
                            </div>
                            <div className="text-base text-theme-muted mt-2 text-center font-semibold">
                              {exercise.sets.filter((s) => s.completed).length}/
                              {exercise.sets.length} séries
                            </div>
                          </div>
                        </button>
                      ) : (
                        /* VERSO: Inputs compacts - clic n'importe où retourne la tuile */
                        <div
                          className="w-full h-full p-3 flex flex-col cursor-pointer"
                          onClick={() => toggleExerciseExpanded(exerciseIndex)}
                        >
                          {/* Header: nom + check */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-theme text-sm leading-tight line-clamp-2 flex-1">
                              {getExerciseDisplayName(exercise.exerciseName)}
                            </h3>
                            {set.completed && (
                              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme flex-shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          {/* Badges infos exercice + boutons action */}
                          <div
                            className="flex flex-wrap gap-1 mb-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="px-1.5 py-0.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded text-[10px] font-semibold">
                              {exerciseData?.series || exercise.sets.length}×
                              {exerciseData?.repsDuree?.replace(
                                /[^0-9-]/g,
                                "",
                              ) || "?"}
                            </span>
                            {exerciseData?.repos && (
                              <span className="px-1.5 py-0.5 border border-theme text-theme-muted rounded text-[10px]">
                                {exerciseData.repos}s
                              </span>
                            )}
                            {/* Boutons Historique, Consignes, Vidéo */}
                            <button
                              onClick={(e) =>
                                setShowHistoryModal({
                                  index: exerciseIndex,
                                  anchorEl: e.currentTarget,
                                })
                              }
                              className="px-1.5 py-0.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded text-[10px] transition-colors whitespace-nowrap"
                              type="button"
                            >
                              Historique
                            </button>
                            <button
                              onClick={(e) =>
                                setShowConsignesModal({
                                  index: exerciseIndex,
                                  anchorEl: e.currentTarget,
                                })
                              }
                              className="px-1.5 py-0.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded text-[10px] transition-colors whitespace-nowrap"
                              type="button"
                            >
                              Consignes
                            </button>
                            {exerciseData?.video && (
                              <button
                                onClick={(e) =>
                                  setShowVideoModal({
                                    url: exerciseData.video!,
                                    exerciseName: exercise.exerciseName,
                                    anchorEl: e.currentTarget,
                                  })
                                }
                                className="px-1.5 py-0.5 border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:text-theme hover:border-[var(--color-primary)] rounded text-[10px] transition-colors whitespace-nowrap"
                                type="button"
                              >
                                Vidéo
                              </button>
                            )}
                          </div>

                          {/* Zone inputs - empêche le clic de retourner la tuile */}
                          <div
                            className="flex-1 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Navigation séries compacte */}
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <button
                                onClick={() =>
                                  setSetIndexForExercise(
                                    exerciseIndex,
                                    Math.max(setIndex - 1, 0),
                                  )
                                }
                                disabled={setIndex === 0}
                                className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                type="button"
                              >
                                <ChevronLeft className="w-3 h-3 text-theme-secondary" />
                              </button>
                              <span className="text-xs text-theme-secondary min-w-[2.5rem] text-center font-medium">
                                {setIndex + 1}/{exercise.sets.length}
                              </span>
                              <button
                                onClick={() =>
                                  setSetIndexForExercise(
                                    exerciseIndex,
                                    Math.min(
                                      setIndex + 1,
                                      exercise.sets.length - 1,
                                    ),
                                  )
                                }
                                disabled={setIndex === exercise.sets.length - 1}
                                className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                type="button"
                              >
                                <ChevronRight className="w-3 h-3 text-theme-secondary" />
                              </button>
                            </div>

                            {/* Inputs Reps + Charge côte à côte */}
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <div className="flex flex-col">
                                <label className="text-[9px] text-theme-muted mb-0.5 block">
                                  Reps
                                </label>
                                <div className="flex-1 flex flex-col">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder={
                                      exerciseData?.repsDuree?.replace(
                                        /[^0-9]/g,
                                        "",
                                      ) || "8"
                                    }
                                    value={set.reps}
                                    onChange={(e) =>
                                      updateSetForExercise(
                                        exerciseIndex,
                                        setIndex,
                                        "reps",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                  />
                                  <span className="text-[10px] text-transparent mt-0.5 block text-center">
                                    &nbsp;
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[9px] text-theme-muted">
                                    Charge
                                  </label>
                                  <button
                                    onClick={() =>
                                      cycleSetLoadTypeForExercise(
                                        exerciseIndex,
                                        setIndex,
                                      )
                                    }
                                    className="p-0.5 text-theme-muted hover:text-theme-secondary transition-colors"
                                    type="button"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <div className="flex-1 flex flex-col">
                                  {set.load?.type === "barbell" ? (
                                    <div className="flex gap-1.5 flex-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="20"
                                        value={
                                          Number.isFinite(set.load.barKg)
                                            ? String(set.load.barKg)
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const n =
                                            raw === ""
                                              ? 20
                                              : Number(raw.replace(",", "."));
                                          const prev = set.load as Extract<
                                            SetLoad,
                                            { type: "barbell" }
                                          >;
                                          updateSetLoadForExercise(
                                            exerciseIndex,
                                            setIndex,
                                            {
                                              type: "barbell",
                                              unit: "kg",
                                              barKg: Number.isFinite(n)
                                                ? n
                                                : 20,
                                              addedKg:
                                                typeof prev.addedKg === "number"
                                                  ? prev.addedKg
                                                  : null,
                                            },
                                          );
                                        }}
                                        className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="+0"
                                        value={
                                          typeof set.load.addedKg === "number"
                                            ? String(set.load.addedKg)
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const n =
                                            v === ""
                                              ? null
                                              : Number(v.replace(",", "."));
                                          const prev = set.load as Extract<
                                            SetLoad,
                                            { type: "barbell" }
                                          >;
                                          updateSetLoadForExercise(
                                            exerciseIndex,
                                            setIndex,
                                            {
                                              type: "barbell",
                                              unit: "kg",
                                              barKg: prev.barKg,
                                              addedKg:
                                                v === ""
                                                  ? null
                                                  : Number.isFinite(n as number)
                                                    ? (n as number)
                                                    : null,
                                            },
                                          );
                                        }}
                                        className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                    </div>
                                  ) : set.load?.type === "assisted" ? (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={
                                        typeof set.load.assistanceKg ===
                                        "number"
                                          ? String(set.load.assistanceKg)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const n =
                                          v === ""
                                            ? null
                                            : Number(v.replace(",", "."));
                                        updateSetLoadForExercise(
                                          exerciseIndex,
                                          setIndex,
                                          {
                                            type: "assisted",
                                            unit: "kg",
                                            assistanceKg:
                                              v === ""
                                                ? null
                                                : Number.isFinite(n as number)
                                                  ? (n as number)
                                                  : null,
                                          },
                                        );
                                      }}
                                      className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                  ) : set.load?.type === "distance" ? (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={
                                        typeof set.load.distanceValue ===
                                        "number"
                                          ? String(set.load.distanceValue)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const n =
                                          v === ""
                                            ? null
                                            : Number(v.replace(",", "."));
                                        const prev = set.load as Extract<
                                          SetLoad,
                                          { type: "distance" }
                                        >;
                                        updateSetLoadForExercise(
                                          exerciseIndex,
                                          setIndex,
                                          {
                                            type: "distance",
                                            unit: prev.unit,
                                            distanceValue:
                                              v === ""
                                                ? null
                                                : Number.isFinite(n as number)
                                                  ? (n as number)
                                                  : null,
                                          },
                                        );
                                      }}
                                      className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0"
                                      value={(() => {
                                        const load = set.load;
                                        if (!load) return "";
                                        if (
                                          load.type === "single" ||
                                          load.type === "double" ||
                                          load.type === "machine"
                                        ) {
                                          return typeof load.weightKg ===
                                            "number"
                                            ? String(load.weightKg)
                                            : "";
                                        }
                                        return "";
                                      })()}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const n =
                                          v === ""
                                            ? null
                                            : Number(v.replace(",", "."));
                                        const t:
                                          | "single"
                                          | "double"
                                          | "machine" =
                                          set.load?.type === "double"
                                            ? "double"
                                            : set.load?.type === "machine"
                                              ? "machine"
                                              : "single";
                                        const next: SetLoad =
                                          t === "double"
                                            ? {
                                                type: "double",
                                                unit: "kg",
                                                weightKg:
                                                  v === ""
                                                    ? null
                                                    : Number.isFinite(
                                                          n as number,
                                                        )
                                                      ? (n as number)
                                                      : null,
                                              }
                                            : t === "machine"
                                              ? {
                                                  type: "machine",
                                                  unit: "kg",
                                                  weightKg:
                                                    v === ""
                                                      ? null
                                                      : Number.isFinite(
                                                            n as number,
                                                          )
                                                        ? (n as number)
                                                        : null,
                                                }
                                              : {
                                                  type: "single",
                                                  unit: "kg",
                                                  weightKg:
                                                    v === ""
                                                      ? null
                                                      : Number.isFinite(
                                                            n as number,
                                                          )
                                                        ? (n as number)
                                                        : null,
                                                };
                                        updateSetLoadForExercise(
                                          exerciseIndex,
                                          setIndex,
                                          next,
                                        );
                                      }}
                                      className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                  )}
                                  <span className="text-[10px] text-theme-muted mt-0.5 block text-center">
                                    {set.load?.type === "barbell"
                                      ? "Barre"
                                      : set.load?.type === "assisted"
                                        ? "Assisté"
                                        : set.load?.type === "distance"
                                          ? "Distance"
                                          : set.load?.type === "double"
                                            ? "Haltères/KB x2"
                                            : set.load?.type === "machine"
                                              ? "Machine"
                                              : "Haltère/KB"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Bandeau bas: [RPE + Message] | Valider */}
                            <div className="grid grid-cols-[1fr_auto] gap-2 mt-auto pt-2 border-t border-theme/50">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-theme-muted">
                                    RPE
                                  </span>
                                  <div className="flex gap-px flex-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (rpe) => (
                                        <button
                                          key={rpe}
                                          onClick={() =>
                                            updateExerciseRpeForExercise(
                                              exerciseIndex,
                                              exercise.rpe === rpe
                                                ? undefined
                                                : rpe,
                                            )
                                          }
                                          className={`
                                          flex-1 h-5 text-[9px] font-bold rounded transition-colors flex items-center justify-center
                                          ${
                                            exercise.rpe === rpe
                                              ? RPE_SCALE.find(
                                                  (r) => r.value === rpe,
                                                )?.color + " text-theme"
                                              : "bg-theme-tertiary text-theme-muted hover:bg-theme-secondary"
                                          }
                                        `}
                                          type="button"
                                        >
                                          {rpe}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {onSaveComment && (
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      placeholder="Message..."
                                      value={
                                        exerciseComments[
                                          exercise.exerciseName
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        setExerciseComments((prev) => ({
                                          ...prev,
                                          [exercise.exerciseName]:
                                            e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" &&
                                          exerciseComments[
                                            exercise.exerciseName
                                          ]?.trim()
                                        ) {
                                          handleSendComment(
                                            exercise.exerciseName,
                                          );
                                        }
                                      }}
                                      onFocus={() =>
                                        setMessageSentConfirm((prev) => {
                                          const next = new Set(prev);
                                          next.delete(exercise.exerciseName);
                                          return next;
                                        })
                                      }
                                      className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-2 py-1.5 text-theme text-[10px] placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                    <button
                                      onClick={() =>
                                        handleSendComment(exercise.exerciseName)
                                      }
                                      disabled={
                                        !exerciseComments[
                                          exercise.exerciseName
                                        ]?.trim() &&
                                        !messageSentConfirm.has(
                                          exercise.exerciseName,
                                        )
                                      }
                                      className={`px-2 ${messageSentConfirm.has(exercise.exerciseName) ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)] hover:opacity-90"} disabled:bg-theme-tertiary disabled:text-theme-muted text-theme rounded transition-colors`}
                                      type="button"
                                    >
                                      {messageSentConfirm.has(
                                        exercise.exerciseName,
                                      ) ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() =>
                                  set.completed
                                    ? toggleSetValidationForExercise(
                                        exerciseIndex,
                                      )
                                    : validateSetForExercise(exerciseIndex)
                                }
                                className={`
                                  self-stretch px-4 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center
                                  ${set.completed ? "bg-[var(--color-success)] text-theme" : "bg-[var(--color-primary)] hover:opacity-90 text-theme"}
                                `}
                                type="button"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              groupedItems.forEach((item, groupIndex) => {
                if (isExerciseLogGroup(item)) {
                  // === SUPERSET GROUP ===
                  const group = item;
                  const modeInfo = EXECUTION_MODES[group.executionMode];

                  // Récupérer les indices originaux des exercices du groupe
                  const exerciseIndices = group.exercises.map((ex) =>
                    logs.findIndex(
                      (l) =>
                        l.exerciseName === ex.exerciseName &&
                        l.executionGroupId === ex.executionGroupId,
                    ),
                  );

                  // Vérifier si tous les exercices du groupe sont terminés
                  const allGroupDone = group.exercises.every((ex) => {
                    const allSetsDone = ex.sets.every((s) => s.completed);
                    return allSetsDone && typeof ex.rpe === "number";
                  });

                  if (isDesktop) {
                    // Desktop: Conteneur superset transparent, col-span dynamique selon le nombre d'exercices.
                    // Le col-span s'adapte pour que le layer superset entoure uniquement les blocs exercices.
                    // Mapping statique de classes Tailwind (évite les template literals dynamiques non détectés par le scanner).
                    // Borné aux limites responsive de la grille parente : base=2 / lg=3 / xl=4.
                    const exCount = group.exercises.length;
                    // col-span-1 col-span-2 col-span-3 col-span-4 lg:col-span-2 lg:col-span-3 xl:col-span-3 xl:col-span-4
                    const COL_SPAN_MAP: Record<number, string> = {
                      1: "col-span-1",
                      2: "col-span-2",
                      3: "col-span-2 lg:col-span-3",
                      4: "col-span-2 lg:col-span-3 xl:col-span-4",
                    };
                    // grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 lg:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 xl:grid-cols-4
                    const GRID_COLS_MAP: Record<number, string> = {
                      1: "grid-cols-1",
                      2: "grid-cols-2",
                      3: "grid-cols-2 lg:grid-cols-3",
                      4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                    };
                    const colSpanClass =
                      COL_SPAN_MAP[Math.min(exCount, 4)] || COL_SPAN_MAP[4];
                    const gridColsClass =
                      GRID_COLS_MAP[Math.min(exCount, 4)] || GRID_COLS_MAP[4];

                    renderedElements.push(
                      <div
                        key={`superset-${group.groupId}`}
                        className={`${colSpanClass} relative`}
                      >
                        {/* Bordure superset */}
                        <div className="absolute inset-0 border-2 border-[var(--color-primary)] rounded-xl pointer-events-none z-10" />

                        {/* Badge Superset en haut */}
                        <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-primary)] rounded-full">
                          <Link2 className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-semibold text-white">
                            {modeInfo.label}
                          </span>
                          {allGroupDone && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>

                        {/* Blocs exercices côte à côte - grille adaptée au nombre d'exercices */}
                        <div className={`grid ${gridColsClass} gap-3 p-1.5`}>
                          {group.exercises.map((exercise, exIdx) => {
                            const exerciseIndex = exerciseIndices[exIdx];
                            const supersetLabel = String.fromCharCode(
                              65 + exIdx,
                            );
                            return renderDesktopExerciseBlock(
                              exercise,
                              exerciseIndex,
                              { label: supersetLabel, groupId: group.groupId },
                            );
                          })}
                        </div>
                      </div>,
                    );
                  } else {
                    // =====================================================
                    // MOBILE SUPERSET - DESIGN AVEC HEADER PERSISTANT
                    // =====================================================
                    const groupId = group.groupId;
                    const isGroupExpanded = isSupersetExpanded(groupId);
                    const supersetSetIdx = getSupersetSetIndex(groupId);
                    const firstExercise = group.exercises[0];
                    const firstExerciseData = sessionData.find(
                      (d) => d.exercice === firstExercise?.exerciseName,
                    );
                    const totalSets = firstExercise?.sets.length || 0;

                    // Vérifier si la série actuelle est complétée pour tous les exercices
                    const isCurrentSetCompleted = group.exercises.every(
                      (ex) => ex.sets[supersetSetIdx]?.completed,
                    );

                    // RPE du groupe (prendre le premier exercice comme référence)
                    const groupRpe = firstExercise?.rpe;

                    renderedElements.push(
                      <div
                        key={`superset-${groupId}`}
                        className="relative"
                        ref={(el) => {
                          focusCardRefs.current[exerciseIndices[0]] = el;
                        }}
                      >
                        {/* Bordure superset */}
                        <div className="absolute inset-0 border-2 border-[var(--color-primary)] rounded-xl pointer-events-none z-10" />

                        {/* Badge Superset en haut */}
                        <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-[var(--color-primary)] rounded-full">
                          <Link2 className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-semibold text-white">
                            {modeInfo.label}
                          </span>
                          {allGroupDone && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>

                        {/* Indicateurs done/RPE en haut à droite */}
                        {allGroupDone && (
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-none">
                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme shadow-lg">
                              <Check className="w-4 h-4" />
                            </div>
                            {typeof groupRpe === "number" && (
                              <div
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-theme font-bold shadow-lg text-xs ${RPE_SCALE.find((r) => r.value === groupRpe)?.color || "bg-theme-tertiary"}`}
                              >
                                {groupRpe}
                              </div>
                            )}
                          </div>
                        )}

                        <Card
                          variant={isGroupExpanded ? "gradient" : "default"}
                          className={`overflow-hidden relative ${allGroupDone ? "border-2 border-[var(--color-success)]/50 bg-[var(--color-success)]/10" : ""}`}
                        >
                          <CardContent className="p-0">
                            {/* ========== HEADER CLIQUABLE (TOUJOURS VISIBLE) ========== */}
                            <button
                              onClick={() => toggleSupersetExpanded(groupId)}
                              className="w-full text-left"
                              type="button"
                            >
                              <div
                                className={`${isGroupExpanded ? "bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20" : ""} px-4 py-3 border-b border-theme/50`}
                              >
                                {/* Noms des exercices en entier + badges en dessous */}
                                <div className="space-y-2">
                                  {group.exercises.map((exercise, exIdx) => {
                                    const exerciseIndex =
                                      exerciseIndices[exIdx];
                                    const exerciseData = sessionData.find(
                                      (d) =>
                                        d.exercice === exercise.exerciseName,
                                    );

                                    return (
                                      <div key={exIdx}>
                                        {/* Ligne nom exercice avec bullet CSS dans la marge (texte aligné avec les autres blocs) */}
                                        <h3 className="font-bold text-theme text-base leading-tight relative before:content-[''] before:absolute before:-left-3 before:top-[0.45em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-primary)]">
                                          {getExerciseDisplayName(
                                            exercise.exerciseName,
                                          )}
                                        </h3>
                                        {/* Badges individuels en dessous (masqués si expanded) */}
                                        {!isGroupExpanded && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowHistoryModal({
                                                  index: exerciseIndex,
                                                  anchorEl: e.currentTarget,
                                                });
                                              }}
                                              className="px-2 py-1 border border-[var(--color-danger)]/40 text-[var(--color-danger)] rounded text-xs font-medium"
                                              type="button"
                                            >
                                              Historique
                                            </button>
                                            {exerciseData?.notes && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowConsignesModal({
                                                    index: exerciseIndex,
                                                    anchorEl: e.currentTarget,
                                                  });
                                                }}
                                                className="px-2 py-1 border border-[var(--color-warning)]/40 text-[var(--color-warning)] rounded text-xs font-medium"
                                                type="button"
                                              >
                                                Consignes
                                              </button>
                                            )}
                                            {exerciseData?.video && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setShowVideoModal({
                                                    url: exerciseData.video!,
                                                    exerciseName:
                                                      exercise.exerciseName,
                                                    anchorEl: e.currentTarget,
                                                  });
                                                }}
                                                className="p-1 border border-[var(--color-primary)]/40 text-[var(--color-primary)] rounded"
                                                type="button"
                                              >
                                                <Video className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Badges communs (séries, repos, tempo) - visibles quand expanded */}
                                {isGroupExpanded && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-1 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold">
                                      {firstExerciseData?.series || totalSets} ×{" "}
                                      {firstExerciseData?.repsDuree || "?"}
                                    </span>
                                    {firstExerciseData?.repos && (
                                      <span className="px-2 py-1 border border-theme text-theme-muted rounded-lg text-xs">
                                        {firstExerciseData.repos}s repos
                                      </span>
                                    )}
                                    {firstExerciseData?.tempoRpe && (
                                      <span className="px-2 py-1 border border-theme text-theme-muted rounded-lg text-xs">
                                        {firstExerciseData.tempoRpe}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Footer collapsed: séries + repos + progression */}
                                {!isGroupExpanded && (
                                  <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-theme/30">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold">
                                        {firstExerciseData?.series || totalSets}{" "}
                                        × {firstExerciseData?.repsDuree || "?"}
                                      </span>
                                      {firstExerciseData?.repos && (
                                        <span className="px-2 py-1 border border-theme text-theme-muted rounded-lg text-xs">
                                          {firstExerciseData.repos}s repos
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {firstExercise?.sets.map((s, i) => (
                                        <div
                                          key={i}
                                          className={`w-2.5 h-2.5 rounded-full ${
                                            group.exercises.every(
                                              (ex) => ex.sets[i]?.completed,
                                            )
                                              ? "bg-[var(--color-success)]"
                                              : i === supersetSetIdx
                                                ? "bg-[var(--color-primary)]"
                                                : "bg-theme-tertiary"
                                          }`}
                                        />
                                      ))}
                                      <span className="text-xs text-theme-muted ml-1">
                                        {supersetSetIdx + 1}/{totalSets}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </button>

                            {/* ========== ZONE EXPANDED ========== */}
                            {isGroupExpanded && (
                              <div
                                className="p-4 space-y-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Navigation PARTAGÉE avec +/- boutons */}
                                <div>
                                  <div className="flex items-center gap-2">
                                    {firstExercise?.sets.map((s, i) => (
                                      <button
                                        key={i}
                                        onClick={() =>
                                          setSupersetSetIndexForGroup(
                                            groupId,
                                            i,
                                          )
                                        }
                                        className={`flex-1 h-3 rounded-full transition-all ${
                                          group.exercises.every(
                                            (ex) => ex.sets[i]?.completed,
                                          )
                                            ? "bg-[var(--color-success)]"
                                            : i === supersetSetIdx
                                              ? "bg-[var(--color-primary)]"
                                              : "bg-theme-tertiary"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-center gap-3 mt-2">
                                    <button
                                      onClick={() =>
                                        removeSetForSuperset(
                                          groupId,
                                          exerciseIndices,
                                        )
                                      }
                                      disabled={totalSets <= 1}
                                      className="p-1 text-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      type="button"
                                      aria-label="Supprimer série"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm text-theme-muted">
                                      Série {supersetSetIdx + 1} / {totalSets}
                                    </span>
                                    <button
                                      onClick={() =>
                                        addSetForSuperset(exerciseIndices)
                                      }
                                      className="p-1 text-theme-muted hover:text-theme transition-colors"
                                      type="button"
                                      aria-label="Ajouter série"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Inputs INDIVIDUELS par exercice */}
                                {group.exercises.map((exercise, exIdx) => {
                                  const exerciseIndex = exerciseIndices[exIdx];
                                  const exerciseData = sessionData.find(
                                    (d) => d.exercice === exercise.exerciseName,
                                  );
                                  const set = exercise.sets[supersetSetIdx];
                                  if (!set) return null;

                                  return (
                                    <div
                                      key={exIdx}
                                      className="space-y-3 p-3 bg-theme-tertiary/50 rounded-lg"
                                    >
                                      {/* Titre exercice avec bullet CSS dans la marge + badges en dessous */}
                                      <div>
                                        <h3 className="font-medium text-theme text-sm leading-tight relative before:content-[''] before:absolute before:-left-2 before:top-[0.4em] before:w-1 before:h-1 before:rounded-full before:bg-[var(--color-primary)]">
                                          {getExerciseDisplayName(
                                            exercise.exerciseName,
                                          )}
                                        </h3>
                                        {/* Badges sous le nom */}
                                        <div className="flex items-center gap-1 mt-1.5">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowHistoryModal({
                                                index: exerciseIndex,
                                                anchorEl: e.currentTarget,
                                              });
                                            }}
                                            className="px-2 py-1 border border-[var(--color-danger)]/40 text-[var(--color-danger)] rounded text-[10px] font-medium"
                                            type="button"
                                          >
                                            Hist
                                          </button>
                                          {exerciseData?.notes && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowConsignesModal({
                                                  index: exerciseIndex,
                                                  anchorEl: e.currentTarget,
                                                });
                                              }}
                                              className="px-2 py-1 border border-[var(--color-warning)]/40 text-[var(--color-warning)] rounded text-[10px] font-medium"
                                              type="button"
                                            >
                                              Cons
                                            </button>
                                          )}
                                          {exerciseData?.video && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowVideoModal({
                                                  url: exerciseData.video!,
                                                  exerciseName:
                                                    exercise.exerciseName,
                                                  anchorEl: e.currentTarget,
                                                });
                                              }}
                                              className="p-1 border border-[var(--color-primary)]/40 text-[var(--color-primary)] rounded"
                                              type="button"
                                            >
                                              <Video className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Inputs reps/charge - Structure identique au bloc exercice individuel */}
                                      <div className="space-y-3">
                                        {/* Input Reps */}
                                        <div>
                                          <label className="block text-sm text-theme-muted mb-2">
                                            Répétitions
                                          </label>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder={
                                              exerciseData?.repsDuree?.replace(
                                                /[^0-9]/g,
                                                "",
                                              ) || "8"
                                            }
                                            value={set.reps}
                                            onChange={(e) =>
                                              updateSetForExercise(
                                                exerciseIndex,
                                                supersetSetIdx,
                                                "reps",
                                                e.target.value,
                                              )
                                            }
                                            className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-3 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                          />
                                        </div>
                                        {/* Input Charge */}
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm text-theme-muted">
                                              Charge
                                            </label>
                                            <button
                                              onClick={() =>
                                                cycleSetLoadTypeForExercise(
                                                  exerciseIndex,
                                                  supersetSetIdx,
                                                )
                                              }
                                              className="p-2 bg-theme-tertiary hover:bg-theme-tertiary text-theme rounded-lg transition-colors"
                                              type="button"
                                              aria-label="Changer type de charge"
                                            >
                                              <RotateCcw className="w-4 h-4" />
                                            </button>
                                          </div>

                                          {/* Barbell: 2 inputs avec labels en dessous */}
                                          {set.load?.type === "barbell" && (
                                            <div className="grid grid-cols-2 gap-3">
                                              <div>
                                                <input
                                                  type="text"
                                                  inputMode="decimal"
                                                  placeholder="20"
                                                  value={
                                                    Number.isFinite(
                                                      set.load.barKg,
                                                    )
                                                      ? String(set.load.barKg)
                                                      : ""
                                                  }
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const n =
                                                      raw === ""
                                                        ? 20
                                                        : Number(
                                                            raw.replace(
                                                              ",",
                                                              ".",
                                                            ),
                                                          );
                                                    const prev =
                                                      set.load as Extract<
                                                        SetLoad,
                                                        { type: "barbell" }
                                                      >;
                                                    updateSetLoadForExercise(
                                                      exerciseIndex,
                                                      supersetSetIdx,
                                                      {
                                                        type: "barbell",
                                                        unit: "kg",
                                                        barKg: Number.isFinite(
                                                          n,
                                                        )
                                                          ? n
                                                          : 20,
                                                        addedKg:
                                                          typeof prev.addedKg ===
                                                          "number"
                                                            ? prev.addedKg
                                                            : null,
                                                      },
                                                    );
                                                  }}
                                                  className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                                />
                                                <div className="text-sm text-theme-muted text-center mt-1">
                                                  Barre
                                                </div>
                                              </div>
                                              <div>
                                                <input
                                                  type="text"
                                                  inputMode="decimal"
                                                  placeholder="0"
                                                  value={
                                                    typeof set.load.addedKg ===
                                                    "number"
                                                      ? String(set.load.addedKg)
                                                      : ""
                                                  }
                                                  onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const n =
                                                      raw === ""
                                                        ? null
                                                        : Number(
                                                            raw.replace(
                                                              ",",
                                                              ".",
                                                            ),
                                                          );
                                                    const prev =
                                                      set.load as Extract<
                                                        SetLoad,
                                                        { type: "barbell" }
                                                      >;
                                                    updateSetLoadForExercise(
                                                      exerciseIndex,
                                                      supersetSetIdx,
                                                      {
                                                        type: "barbell",
                                                        unit: "kg",
                                                        barKg: prev.barKg ?? 20,
                                                        addedKg:
                                                          n !== null &&
                                                          Number.isFinite(n)
                                                            ? n
                                                            : null,
                                                      },
                                                    );
                                                  }}
                                                  className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                                />
                                                <div className="text-sm text-theme-muted text-center mt-1">
                                                  Poids ajoutés
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Assisted */}
                                          {set.load?.type === "assisted" && (
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={
                                                  typeof set.load
                                                    .assistanceKg === "number"
                                                    ? String(
                                                        set.load.assistanceKg,
                                                      )
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  const n =
                                                    v === ""
                                                      ? null
                                                      : Number(
                                                          v.replace(",", "."),
                                                        );
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    supersetSetIdx,
                                                    {
                                                      type: "assisted",
                                                      unit: "kg",
                                                      assistanceKg:
                                                        n !== null &&
                                                        Number.isFinite(n)
                                                          ? n
                                                          : null,
                                                    },
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-sm text-theme-muted text-center mt-1">
                                                Assistance (kg)
                                              </div>
                                            </div>
                                          )}

                                          {/* Distance */}
                                          {set.load?.type === "distance" && (
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={
                                                  typeof set.load
                                                    .distanceValue === "number"
                                                    ? String(
                                                        set.load.distanceValue,
                                                      )
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  const n =
                                                    v === ""
                                                      ? null
                                                      : Number(
                                                          v.replace(",", "."),
                                                        );
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    supersetSetIdx,
                                                    {
                                                      type: "distance",
                                                      unit: "cm",
                                                      distanceValue:
                                                        n !== null &&
                                                        Number.isFinite(n)
                                                          ? n
                                                          : null,
                                                    },
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="flex items-center justify-center gap-2 mt-1">
                                                <span className="text-sm text-theme-muted">
                                                  Distance en
                                                </span>
                                                <select
                                                  value={set.load.unit}
                                                  onChange={(e) => {
                                                    const prev =
                                                      set.load as Extract<
                                                        SetLoad,
                                                        { type: "distance" }
                                                      >;
                                                    updateSetLoadForExercise(
                                                      exerciseIndex,
                                                      supersetSetIdx,
                                                      {
                                                        type: "distance",
                                                        unit: e.target.value as
                                                          | "cm"
                                                          | "m",
                                                        distanceValue:
                                                          prev.distanceValue,
                                                      },
                                                    );
                                                  }}
                                                  className="bg-theme-tertiary border border-theme rounded-lg px-2 py-1 text-theme text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                                >
                                                  <option value="cm">cm</option>
                                                  <option value="m">m</option>
                                                </select>
                                              </div>
                                            </div>
                                          )}

                                          {/* Single, Double, Machine */}
                                          {(set.load?.type === "single" ||
                                            set.load?.type === "double" ||
                                            set.load?.type === "machine" ||
                                            !set.load?.type) && (
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={(() => {
                                                  const load = set.load;
                                                  if (!load) return "";
                                                  if (
                                                    load.type === "single" ||
                                                    load.type === "double" ||
                                                    load.type === "machine"
                                                  ) {
                                                    return typeof load.weightKg ===
                                                      "number"
                                                      ? String(load.weightKg)
                                                      : "";
                                                  }
                                                  return "";
                                                })()}
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  const n =
                                                    v === ""
                                                      ? null
                                                      : Number(
                                                          v.replace(",", "."),
                                                        );
                                                  const t:
                                                    | "single"
                                                    | "double"
                                                    | "machine" =
                                                    set.load?.type === "double"
                                                      ? "double"
                                                      : set.load?.type ===
                                                          "machine"
                                                        ? "machine"
                                                        : "single";
                                                  const next: SetLoad =
                                                    t === "double"
                                                      ? {
                                                          type: "double",
                                                          unit: "kg",
                                                          weightKg:
                                                            v === ""
                                                              ? null
                                                              : Number.isFinite(
                                                                    n as number,
                                                                  )
                                                                ? (n as number)
                                                                : null,
                                                        }
                                                      : t === "machine"
                                                        ? {
                                                            type: "machine",
                                                            unit: "kg",
                                                            weightKg:
                                                              v === ""
                                                                ? null
                                                                : Number.isFinite(
                                                                      n as number,
                                                                    )
                                                                  ? (n as number)
                                                                  : null,
                                                          }
                                                        : {
                                                            type: "single",
                                                            unit: "kg",
                                                            weightKg:
                                                              v === ""
                                                                ? null
                                                                : Number.isFinite(
                                                                      n as number,
                                                                    )
                                                                  ? (n as number)
                                                                  : null,
                                                          };
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    supersetSetIdx,
                                                    next,
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-sm text-theme-muted text-center mt-1">
                                                {set.load?.type === "double"
                                                  ? "2x Haltères / Kettlebell"
                                                  : set.load?.type === "machine"
                                                    ? "Machine"
                                                    : "Haltère / Kettlebell"}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Bouton validation PARTAGÉ (au-dessus du RPE) */}
                                <button
                                  onClick={() =>
                                    isCurrentSetCompleted
                                      ? toggleSupersetSetValidation(
                                          groupId,
                                          exerciseIndices,
                                        )
                                      : validateSupersetSet(
                                          groupId,
                                          exerciseIndices,
                                        )
                                  }
                                  className={`
                                    w-full py-3 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                    ${isCurrentSetCompleted ? "bg-[var(--color-success)] text-theme" : "bg-[var(--color-primary)] text-theme"}
                                  `}
                                  type="button"
                                >
                                  <Check className="w-5 h-5" />
                                  {isCurrentSetCompleted
                                    ? "Série validée"
                                    : "Valider la série"}
                                </button>

                                {/* Zone message PARTAGÉE */}
                                {onSaveComment && (
                                  <div className="pt-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-theme-muted" />
                                        <span className="text-sm text-theme-muted">
                                          Message au coach
                                        </span>
                                      </div>
                                      {group.exercises.some((ex) =>
                                        sentComments.has(ex.exerciseName),
                                      ) && (
                                        <span className="text-xs text-[var(--color-success)] flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          Envoyé
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder={`Message pour ${group.exercises.map((e) => getExerciseDisplayName(e.exerciseName).split(" ")[0]).join(" + ")}...`}
                                        value={
                                          exerciseComments[
                                            group.exercises[0]?.exerciseName
                                          ] || ""
                                        }
                                        onChange={(e) => {
                                          // Appliquer le même commentaire à tous les exercices du groupe
                                          const newComments: Record<
                                            string,
                                            string
                                          > = {};
                                          group.exercises.forEach((ex) => {
                                            newComments[ex.exerciseName] =
                                              e.target.value;
                                          });
                                          setExerciseComments((prev) => ({
                                            ...prev,
                                            ...newComments,
                                          }));
                                        }}
                                        disabled={group.exercises.some((ex) =>
                                          sentComments.has(ex.exerciseName),
                                        )}
                                        className="flex-1 bg-theme-tertiary border border-theme rounded-lg px-3 py-2 text-theme text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                                      />
                                      <button
                                        onClick={() => {
                                          // Envoyer le message pour le premier exercice du groupe
                                          handleSendComment(
                                            group.exercises[0]?.exerciseName,
                                          );
                                        }}
                                        disabled={
                                          !exerciseComments[
                                            group.exercises[0]?.exerciseName
                                          ]?.trim() ||
                                          commentSending ===
                                            group.exercises[0]?.exerciseName ||
                                          group.exercises.some((ex) =>
                                            sentComments.has(ex.exerciseName),
                                          )
                                        }
                                        className="p-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-theme rounded-lg transition-colors"
                                        title="Envoyer"
                                        type="button"
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* RPE PARTAGÉ (en bas) */}
                                <div>
                                  <label className="text-xs text-theme-muted mb-1 block">
                                    RPE (difficulté ressentie)
                                  </label>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (rpe) => (
                                        <button
                                          key={rpe}
                                          onClick={() =>
                                            updateSupersetRpe(
                                              groupId,
                                              exerciseIndices,
                                              groupRpe === rpe
                                                ? undefined
                                                : rpe,
                                            )
                                          }
                                          className={`
                                          flex-1 py-2 text-sm font-bold rounded-lg transition-colors
                                          ${
                                            groupRpe === rpe
                                              ? RPE_SCALE.find(
                                                  (r) => r.value === rpe,
                                                )?.color + " text-theme"
                                              : "bg-theme-tertiary text-theme-muted"
                                          }
                                        `}
                                          type="button"
                                        >
                                          {rpe}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>,
                    );
                  }
                  return;
                }

                // === EXERCICE INDIVIDUEL ===
                const exercise = item as ExerciseLog;
                const exerciseIndex = logs.findIndex(
                  (l) =>
                    l.exerciseName === exercise.exerciseName &&
                    !l.executionGroupId,
                );
                const exerciseData = sessionData.find(
                  (d) => d.exercice === exercise.exerciseName,
                );
                const setIndex = getSetIndexForExercise(exerciseIndex);
                const set = exercise.sets[setIndex];
                const isExpanded = !!expandedExercises[exerciseIndex];
                const allSetsCompletedForExercise = exercise.sets.every(
                  (s) => s.completed,
                );
                const isLastSetIndex = setIndex === exercise.sets.length - 1;
                const isExerciseDone =
                  allSetsCompletedForExercise &&
                  typeof exercise.rpe === "number";
                const lastPerf = getLastPerformance(
                  exercise.exerciseName,
                  history,
                );
                const isConsignesOpen = !!focusOpenConsignes[exerciseIndex];
                const isHistoryOpen = !!focusOpenHistory[exerciseIndex];

                if (!set) return;

                // Desktop: tuile carrée avec format flip card (recto/verso)
                if (isDesktop) {
                  renderedElements.push(
                    <div
                      key={exerciseIndex}
                      className="relative"
                      ref={(el) => {
                        focusCardRefs.current[exerciseIndex] = el;
                      }}
                    >
                      {/* Indicateurs done/RPE */}
                      {isExerciseDone && (
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-none">
                          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                          {typeof exercise.rpe === "number" && (
                            <div
                              className={`w-6 h-6 flex items-center justify-center rounded-lg text-theme font-bold shadow-lg text-xs ${RPE_SCALE.find((r) => r.value === exercise.rpe)?.color || "bg-theme-tertiary"}`}
                            >
                              {exercise.rpe}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`
                        w-full aspect-square bg-theme-tertiary border rounded-xl overflow-hidden flex flex-col transition-all
                        ${isExerciseDone ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/10" : "border-theme"}
                        ${isExpanded ? "ring-2 ring-[var(--color-primary)]" : "hover:bg-theme-tertiary/70"}
                      `}
                      >
                        {!isExpanded ? (
                          /* RECTO: Format minimisé avec éléments très gros */
                          <button
                            onClick={() =>
                              toggleExerciseExpanded(exerciseIndex)
                            }
                            className="w-full h-full p-4 flex flex-col text-left"
                            type="button"
                          >
                            {/* Nom exercice - très gros pour remplir la tuile */}
                            <h3 className="font-bold text-theme text-2xl leading-tight line-clamp-3 flex-1">
                              {getExerciseDisplayName(exercise.exerciseName)}
                            </h3>

                            {/* Badges très agrandis */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              <span className="px-4 py-2 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-xl text-base font-bold">
                                {exerciseData?.series || exercise.sets.length}×
                                {exerciseData?.repsDuree?.replace(
                                  /[^0-9-]/g,
                                  "",
                                ) || "?"}
                              </span>
                              {exerciseData?.repos && (
                                <span className="px-4 py-2 border border-theme text-theme-muted rounded-xl text-base font-medium">
                                  {exerciseData.repos}s
                                </span>
                              )}
                            </div>

                            {/* Boutons action très agrandis */}
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowHistoryModal({
                                    index: exerciseIndex,
                                    anchorEl: e.currentTarget,
                                  });
                                }}
                                className="px-3 py-2 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-xl text-base font-semibold transition-colors whitespace-nowrap"
                                type="button"
                              >
                                Historique
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowConsignesModal({
                                    index: exerciseIndex,
                                    anchorEl: e.currentTarget,
                                  });
                                }}
                                className="px-3 py-2 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-xl text-base font-semibold transition-colors whitespace-nowrap"
                                type="button"
                              >
                                Consignes
                              </button>
                              {exerciseData?.video && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowVideoModal({
                                      url: exerciseData.video!,
                                      exerciseName: exercise.exerciseName,
                                      anchorEl: e.currentTarget,
                                    });
                                  }}
                                  className="p-2.5 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-xl text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                                  type="button"
                                >
                                  <Video className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            {/* Progression séries agrandie */}
                            <div className="mt-4">
                              <div className="flex items-center gap-1.5">
                                {exercise.sets.map((s, i) => (
                                  <div
                                    key={i}
                                    className={`flex-1 h-3 rounded-full ${s.completed ? "bg-[var(--color-success)]" : "bg-theme-tertiary"}`}
                                  />
                                ))}
                              </div>
                              <div className="text-base text-theme-muted mt-2 text-center font-semibold">
                                {
                                  exercise.sets.filter((s) => s.completed)
                                    .length
                                }
                                /{exercise.sets.length} séries
                              </div>
                            </div>
                          </button>
                        ) : (
                          /* VERSO: Inputs compacts - clic n'importe où retourne la tuile */
                          <div
                            className="w-full h-full p-3 flex flex-col cursor-pointer"
                            onClick={() =>
                              toggleExerciseExpanded(exerciseIndex)
                            }
                          >
                            {/* Header: nom + check */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-theme text-sm leading-tight line-clamp-2 flex-1">
                                {getExerciseDisplayName(exercise.exerciseName)}
                              </h3>
                              {set.completed && (
                                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme flex-shrink-0">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>

                            {/* Badges infos exercice + boutons action */}
                            <div
                              className="flex flex-wrap gap-1 mb-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="px-1.5 py-0.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded text-[10px] font-semibold">
                                {exerciseData?.series || exercise.sets.length}×
                                {exerciseData?.repsDuree?.replace(
                                  /[^0-9-]/g,
                                  "",
                                ) || "?"}
                              </span>
                              {exerciseData?.repos && (
                                <span className="px-1.5 py-0.5 border border-theme text-theme-muted rounded text-[10px]">
                                  {exerciseData.repos}s
                                </span>
                              )}
                              {/* Boutons Historique, Consignes, Vidéo */}
                              <button
                                onClick={(e) =>
                                  setShowHistoryModal({
                                    index: exerciseIndex,
                                    anchorEl: e.currentTarget,
                                  })
                                }
                                className="px-1.5 py-0.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded text-[10px] transition-colors whitespace-nowrap"
                                type="button"
                              >
                                Historique
                              </button>
                              <button
                                onClick={(e) =>
                                  setShowConsignesModal({
                                    index: exerciseIndex,
                                    anchorEl: e.currentTarget,
                                  })
                                }
                                className="px-1.5 py-0.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded text-[10px] transition-colors whitespace-nowrap"
                                type="button"
                              >
                                Consignes
                              </button>
                              {exerciseData?.video && (
                                <button
                                  onClick={(e) =>
                                    setShowVideoModal({
                                      url: exerciseData.video!,
                                      exerciseName: exercise.exerciseName,
                                      anchorEl: e.currentTarget,
                                    })
                                  }
                                  className="px-1.5 py-0.5 border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:text-theme hover:border-[var(--color-primary)] rounded text-[10px] transition-colors whitespace-nowrap"
                                  type="button"
                                >
                                  Vidéo
                                </button>
                              )}
                            </div>

                            {/* Zone inputs - empêche le clic de retourner la tuile */}
                            <div
                              className="flex-1 flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Navigation séries compacte */}
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <button
                                  onClick={() =>
                                    setSetIndexForExercise(
                                      exerciseIndex,
                                      Math.max(setIndex - 1, 0),
                                    )
                                  }
                                  disabled={setIndex === 0}
                                  className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                  type="button"
                                >
                                  <ChevronLeft className="w-3 h-3 text-theme-secondary" />
                                </button>
                                <span className="text-xs text-theme-secondary min-w-[2.5rem] text-center font-medium">
                                  {setIndex + 1}/{exercise.sets.length}
                                </span>
                                <button
                                  onClick={() =>
                                    setSetIndexForExercise(
                                      exerciseIndex,
                                      Math.min(
                                        setIndex + 1,
                                        exercise.sets.length - 1,
                                      ),
                                    )
                                  }
                                  disabled={
                                    setIndex === exercise.sets.length - 1
                                  }
                                  className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                  type="button"
                                >
                                  <ChevronRight className="w-3 h-3 text-theme-secondary" />
                                </button>
                              </div>

                              {/* Inputs Reps + Charge côte à côte - flex-1 pour combler l'espace */}
                              <div className="grid grid-cols-2 gap-2 flex-1">
                                {/* Input Reps - même structure que Charge pour alignement */}
                                <div className="flex flex-col">
                                  <label className="text-[9px] text-theme-muted mb-0.5 block">
                                    Reps
                                  </label>
                                  <div className="flex-1 flex flex-col">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder={
                                        exerciseData?.repsDuree?.replace(
                                          /[^0-9]/g,
                                          "",
                                        ) || "8"
                                      }
                                      value={set.reps}
                                      onChange={(e) =>
                                        updateSetForExercise(
                                          exerciseIndex,
                                          setIndex,
                                          "reps",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    />
                                    {/* Espace équivalent au sous-texte de Charge pour alignement */}
                                    <span className="text-[10px] text-transparent mt-0.5 block text-center">
                                      &nbsp;
                                    </span>
                                  </div>
                                </div>

                                {/* Input Charge */}
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[9px] text-theme-muted">
                                      Charge
                                    </label>
                                    <button
                                      onClick={() =>
                                        cycleSetLoadTypeForExercise(
                                          exerciseIndex,
                                          setIndex,
                                        )
                                      }
                                      className="p-0.5 text-theme-muted hover:text-theme-secondary transition-colors"
                                      type="button"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  {/* Container avec hauteur fixe pour tous les types */}
                                  <div className="flex-1 flex flex-col">
                                    {set.load?.type === "barbell" ? (
                                      <div className="flex gap-1.5 flex-1">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="20"
                                          value={
                                            Number.isFinite(set.load.barKg)
                                              ? String(set.load.barKg)
                                              : ""
                                          }
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            const n =
                                              raw === ""
                                                ? 20
                                                : Number(raw.replace(",", "."));
                                            const prev = set.load as Extract<
                                              SetLoad,
                                              { type: "barbell" }
                                            >;
                                            updateSetLoadForExercise(
                                              exerciseIndex,
                                              setIndex,
                                              {
                                                type: "barbell",
                                                unit: "kg",
                                                barKg: Number.isFinite(n)
                                                  ? n
                                                  : 20,
                                                addedKg:
                                                  typeof prev.addedKg ===
                                                  "number"
                                                    ? prev.addedKg
                                                    : null,
                                              },
                                            );
                                          }}
                                          className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                        />
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="+0"
                                          value={
                                            typeof set.load.addedKg === "number"
                                              ? String(set.load.addedKg)
                                              : ""
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            const n =
                                              v === ""
                                                ? null
                                                : Number(v.replace(",", "."));
                                            const prev = set.load as Extract<
                                              SetLoad,
                                              { type: "barbell" }
                                            >;
                                            updateSetLoadForExercise(
                                              exerciseIndex,
                                              setIndex,
                                              {
                                                type: "barbell",
                                                unit: "kg",
                                                barKg: prev.barKg,
                                                addedKg:
                                                  v === ""
                                                    ? null
                                                    : Number.isFinite(
                                                          n as number,
                                                        )
                                                      ? (n as number)
                                                      : null,
                                              },
                                            );
                                          }}
                                          className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                        />
                                      </div>
                                    ) : set.load?.type === "assisted" ? (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={
                                          typeof set.load.assistanceKg ===
                                          "number"
                                            ? String(set.load.assistanceKg)
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const n =
                                            v === ""
                                              ? null
                                              : Number(v.replace(",", "."));
                                          updateSetLoadForExercise(
                                            exerciseIndex,
                                            setIndex,
                                            {
                                              type: "assisted",
                                              unit: "kg",
                                              assistanceKg:
                                                v === ""
                                                  ? null
                                                  : Number.isFinite(n as number)
                                                    ? (n as number)
                                                    : null,
                                            },
                                          );
                                        }}
                                        className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                    ) : set.load?.type === "distance" ? (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={
                                          typeof set.load.distanceValue ===
                                          "number"
                                            ? String(set.load.distanceValue)
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const n =
                                            v === ""
                                              ? null
                                              : Number(v.replace(",", "."));
                                          const prev = set.load as Extract<
                                            SetLoad,
                                            { type: "distance" }
                                          >;
                                          updateSetLoadForExercise(
                                            exerciseIndex,
                                            setIndex,
                                            {
                                              type: "distance",
                                              unit: prev.unit,
                                              distanceValue:
                                                v === ""
                                                  ? null
                                                  : Number.isFinite(n as number)
                                                    ? (n as number)
                                                    : null,
                                            },
                                          );
                                        }}
                                        className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={(() => {
                                          const load = set.load;
                                          if (!load) return "";
                                          if (
                                            load.type === "single" ||
                                            load.type === "double" ||
                                            load.type === "machine"
                                          ) {
                                            return typeof load.weightKg ===
                                              "number"
                                              ? String(load.weightKg)
                                              : "";
                                          }
                                          return "";
                                        })()}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          const n =
                                            v === ""
                                              ? null
                                              : Number(v.replace(",", "."));
                                          const t:
                                            | "single"
                                            | "double"
                                            | "machine" =
                                            set.load?.type === "double"
                                              ? "double"
                                              : set.load?.type === "machine"
                                                ? "machine"
                                                : "single";
                                          const next: SetLoad =
                                            t === "double"
                                              ? {
                                                  type: "double",
                                                  unit: "kg",
                                                  weightKg:
                                                    v === ""
                                                      ? null
                                                      : Number.isFinite(
                                                            n as number,
                                                          )
                                                        ? (n as number)
                                                        : null,
                                                }
                                              : t === "machine"
                                                ? {
                                                    type: "machine",
                                                    unit: "kg",
                                                    weightKg:
                                                      v === ""
                                                        ? null
                                                        : Number.isFinite(
                                                              n as number,
                                                            )
                                                          ? (n as number)
                                                          : null,
                                                  }
                                                : {
                                                    type: "single",
                                                    unit: "kg",
                                                    weightKg:
                                                      v === ""
                                                        ? null
                                                        : Number.isFinite(
                                                              n as number,
                                                            )
                                                          ? (n as number)
                                                          : null,
                                                  };
                                          updateSetLoadForExercise(
                                            exerciseIndex,
                                            setIndex,
                                            next,
                                          );
                                        }}
                                        className="w-full flex-1 bg-theme-tertiary border border-theme rounded px-2 text-theme text-center text-lg font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                    )}
                                    {/* Sous-texte type de charge */}
                                    <span className="text-[10px] text-theme-muted mt-0.5 block text-center">
                                      {set.load?.type === "barbell"
                                        ? "Barre"
                                        : set.load?.type === "assisted"
                                          ? "Assisté"
                                          : set.load?.type === "distance"
                                            ? "Distance"
                                            : set.load?.type === "double"
                                              ? "Haltères/KB x2"
                                              : set.load?.type === "machine"
                                                ? "Machine"
                                                : "Haltère/KB"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Bandeau bas: [RPE + Message] | Valider (row-span-2) */}
                              <div className="grid grid-cols-[1fr_auto] gap-2 mt-auto pt-2 border-t border-theme/50">
                                {/* Colonne gauche: RPE (ligne 1) + Message (ligne 2) */}
                                <div className="flex flex-col gap-1">
                                  {/* RPE complet (1-10) sur une ligne */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-theme-muted">
                                      RPE
                                    </span>
                                    <div className="flex gap-px flex-1">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                        (rpe) => (
                                          <button
                                            key={rpe}
                                            onClick={() =>
                                              updateExerciseRpeForExercise(
                                                exerciseIndex,
                                                exercise.rpe === rpe
                                                  ? undefined
                                                  : rpe,
                                              )
                                            }
                                            className={`
                                          flex-1 h-5 text-[9px] font-bold rounded transition-colors flex items-center justify-center
                                          ${
                                            exercise.rpe === rpe
                                              ? RPE_SCALE.find(
                                                  (r) => r.value === rpe,
                                                )?.color + " text-theme"
                                              : "bg-theme-tertiary text-theme-muted hover:bg-theme-secondary"
                                          }
                                        `}
                                            type="button"
                                          >
                                            {rpe}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  </div>

                                  {/* Message + bouton envoyer */}
                                  {onSaveComment && (
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        placeholder="Message..."
                                        value={
                                          exerciseComments[
                                            exercise.exerciseName
                                          ] || ""
                                        }
                                        onChange={(e) =>
                                          setExerciseComments((prev) => ({
                                            ...prev,
                                            [exercise.exerciseName]:
                                              e.target.value,
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            exerciseComments[
                                              exercise.exerciseName
                                            ]?.trim()
                                          ) {
                                            handleSendComment(
                                              exercise.exerciseName,
                                            );
                                          }
                                        }}
                                        onFocus={() =>
                                          setMessageSentConfirm((prev) => {
                                            const next = new Set(prev);
                                            next.delete(exercise.exerciseName);
                                            return next;
                                          })
                                        }
                                        className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-2 py-1.5 text-theme text-[10px] placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                      />
                                      <button
                                        onClick={() =>
                                          handleSendComment(
                                            exercise.exerciseName,
                                          )
                                        }
                                        disabled={
                                          !exerciseComments[
                                            exercise.exerciseName
                                          ]?.trim() &&
                                          !messageSentConfirm.has(
                                            exercise.exerciseName,
                                          )
                                        }
                                        className={`px-2 ${messageSentConfirm.has(exercise.exerciseName) ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)] hover:opacity-90"} disabled:bg-theme-tertiary disabled:text-theme-muted text-theme rounded transition-colors`}
                                        type="button"
                                      >
                                        {messageSentConfirm.has(
                                          exercise.exerciseName,
                                        ) ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Colonne droite: Bouton valider (s'étire sur toute la hauteur) */}
                                <button
                                  onClick={() =>
                                    set.completed
                                      ? toggleSetValidationForExercise(
                                          exerciseIndex,
                                        )
                                      : validateSetForExercise(exerciseIndex)
                                  }
                                  className={`
                                  self-stretch px-4 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center
                                  ${set.completed ? "bg-[var(--color-success)] text-theme" : "bg-[var(--color-primary)] hover:opacity-90 text-theme"}
                                `}
                                  type="button"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>,
                  );
                } else {
                  // Mobile: layout complet (desktop géré par flip card ci-dessus)
                  renderedElements.push(
                    <div
                      key={exerciseIndex}
                      className="relative"
                      ref={(el) => {
                        focusCardRefs.current[exerciseIndex] = el;
                      }}
                      data-tour-id={
                        exerciseIndex === 0
                          ? "tour-exercise-tile"
                          : exerciseIndex === 1
                            ? "tour-exercise-tile-2"
                            : undefined
                      }
                    >
                      {isExerciseDone && (
                        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-2 pointer-events-none">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-success)] text-theme shadow-lg">
                            <Check className="w-5 h-5" />
                          </div>
                          {typeof exercise.rpe === "number" && (
                            <div
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-theme font-bold shadow-lg text-sm ${RPE_SCALE.find((r) => r.value === exercise.rpe)?.color || "bg-theme-tertiary"}`}
                            >
                              {exercise.rpe}
                            </div>
                          )}
                        </div>
                      )}
                      <Card
                        variant={isExpanded ? "gradient" : "default"}
                        className={`overflow-hidden relative ${isExerciseDone ? "border-2 border-[var(--color-success)]/50 bg-[var(--color-success)]/10" : ""}`}
                      >
                        <CardContent className="p-0">
                          <button
                            onClick={() =>
                              toggleExerciseExpanded(exerciseIndex)
                            }
                            className="w-full text-left"
                            type="button"
                          >
                            <div
                              className={`${isExpanded ? "bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20" : ""} px-4 py-3 border-b border-theme/50`}
                            >
                              <div
                                className={`flex items-center justify-between gap-3 ${isDesktop ? "flex-row" : ""}`}
                              >
                                <div
                                  className={`${isDesktop ? "flex items-center gap-4 flex-1" : "min-w-0"}`}
                                >
                                  <h2
                                    className={`font-bold text-theme ${isDesktop ? "text-base whitespace-nowrap" : "text-lg line-clamp-3"}`}
                                  >
                                    {getExerciseDisplayName(
                                      exercise.exerciseName,
                                    )}
                                  </h2>
                                  {/* Desktop: tous les badges et boutons sur une ligne */}
                                  {isDesktop ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold whitespace-nowrap">
                                        {exerciseData?.series ||
                                          exercise.sets.length}{" "}
                                        × {exerciseData?.repsDuree || "?"}
                                      </div>
                                      {exerciseData?.repos && (
                                        <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold whitespace-nowrap">
                                          {exerciseData.repos}s
                                        </div>
                                      )}
                                      {exerciseData?.tempoRpe && (
                                        <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold whitespace-nowrap">
                                          {exerciseData.tempoRpe}
                                        </div>
                                      )}
                                      <div className="flex-1" />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowHistoryModal({
                                            index: exerciseIndex,
                                            anchorEl: e.currentTarget,
                                          });
                                        }}
                                        className="px-3 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                                        type="button"
                                      >
                                        Historique
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowConsignesModal({
                                            index: exerciseIndex,
                                            anchorEl: e.currentTarget,
                                          });
                                        }}
                                        className="px-3 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                                        type="button"
                                      >
                                        Consignes
                                      </button>
                                      {exerciseData?.video && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowVideoModal({
                                              url: exerciseData.video!,
                                              exerciseName:
                                                exercise.exerciseName,
                                              anchorEl: e.currentTarget,
                                            });
                                          }}
                                          className="p-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-full text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                                          type="button"
                                        >
                                          <Video className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold">
                                          {exerciseData?.series ||
                                            exercise.sets.length}{" "}
                                          × {exerciseData?.repsDuree || "?"}
                                        </div>
                                        {exerciseData?.repos && (
                                          <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold">
                                            {exerciseData.repos}s
                                          </div>
                                        )}
                                        {exerciseData?.tempoRpe && (
                                          <div className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-xs font-semibold">
                                            {exerciseData.tempoRpe}
                                          </div>
                                        )}
                                      </div>
                                      <div
                                        className="mt-2 flex items-center gap-2"
                                        data-tour-id={
                                          exerciseIndex === 0
                                            ? "tour-exercise-badges"
                                            : undefined
                                        }
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowHistoryModal({
                                              index: exerciseIndex,
                                              anchorEl: e.currentTarget,
                                            });
                                          }}
                                          className="px-3 py-1.5 border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:text-theme hover:border-[var(--color-danger)] rounded-lg text-xs font-semibold transition-colors"
                                          type="button"
                                        >
                                          Historique
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowConsignesModal({
                                              index: exerciseIndex,
                                              anchorEl: e.currentTarget,
                                            });
                                          }}
                                          className="px-3 py-1.5 border border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:text-theme hover:border-[var(--color-warning)] rounded-lg text-xs font-semibold transition-colors"
                                          type="button"
                                        >
                                          Consignes
                                        </button>
                                        {exerciseData?.video && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setShowVideoModal({
                                                url: exerciseData.video!,
                                                exerciseName:
                                                  exercise.exerciseName,
                                                anchorEl: e.currentTarget,
                                              });
                                            }}
                                            className="p-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-full text-[var(--color-primary)] hover:text-theme hover:opacity-90/30 transition-colors"
                                            type="button"
                                          >
                                            <Video className="w-5 h-5" />
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div
                              data-tour-id={
                                exerciseIndex === 0
                                  ? "tour-exercise-tile-back"
                                  : undefined
                              }
                            >
                              {/* Header avec nom exercice et série - desktop seulement (mobile utilise la barre de progression) */}
                              {isDesktop && (
                                <div
                                  data-tour-id={
                                    exerciseIndex === 0
                                      ? "tour-set-header"
                                      : undefined
                                  }
                                >
                                  <div className="px-4 py-3 border-b border-theme/50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm text-theme-secondary">
                                          Série {setIndex + 1}/
                                          {exercise.sets.length}
                                        </div>
                                        {set.completed && (
                                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                                            <Check className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            removeSetForExercise(exerciseIndex)
                                          }
                                          disabled={exercise.sets.length <= 1}
                                          className="p-1 text-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                          type="button"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            addSetForExercise(exerciseIndex)
                                          }
                                          className="p-1 text-theme-muted hover:text-theme transition-colors"
                                          type="button"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div
                                className={`p-4 ${isDesktop ? "" : "space-y-4"}`}
                              >
                                {/* Desktop: Layout 2 colonnes */}
                                {isDesktop ? (
                                  <div className="space-y-4">
                                    {/* Ligne principale: Séries+Reps à gauche, Charges à droite - alignés */}
                                    <div className="grid grid-cols-2 gap-6">
                                      {/* Colonne gauche: Navigation séries + Répétitions */}
                                      <div className="flex flex-col">
                                        {/* Header avec label + navigation (même hauteur que header charge) */}
                                        <div className="flex items-center justify-between mb-2 h-9">
                                          <label className="text-sm text-theme-muted">
                                            Répétitions
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() =>
                                                setSetIndexForExercise(
                                                  exerciseIndex,
                                                  Math.max(setIndex - 1, 0),
                                                )
                                              }
                                              disabled={setIndex === 0}
                                              className="p-1.5 bg-theme-tertiary hover:bg-theme-tertiary disabled:opacity-30 disabled:cursor-not-allowed text-theme-secondary hover:text-theme rounded-lg transition-colors"
                                              aria-label="Série précédente"
                                              type="button"
                                            >
                                              <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm text-theme-muted min-w-[3rem] text-center">
                                              {setIndex + 1}/
                                              {exercise.sets.length}
                                            </span>
                                            <button
                                              onClick={() =>
                                                setSetIndexForExercise(
                                                  exerciseIndex,
                                                  Math.min(
                                                    setIndex + 1,
                                                    exercise.sets.length - 1,
                                                  ),
                                                )
                                              }
                                              disabled={
                                                setIndex ===
                                                exercise.sets.length - 1
                                              }
                                              className="p-1.5 bg-theme-tertiary hover:bg-theme-tertiary disabled:opacity-30 disabled:cursor-not-allowed text-theme-secondary hover:text-theme rounded-lg transition-colors"
                                              aria-label="Série suivante"
                                              type="button"
                                            >
                                              <ChevronRight className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Input Répétitions - aligné avec input charge */}
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder={
                                            exerciseData?.repsDuree?.replace(
                                              /[^0-9]/g,
                                              "",
                                            ) || "8"
                                          }
                                          value={set.reps}
                                          onChange={(e) =>
                                            updateSetForExercise(
                                              exerciseIndex,
                                              setIndex,
                                              "reps",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        />

                                        {/* Ghost Mode (desktop) */}
                                        {(() => {
                                          const ghost =
                                            ghostSessions[
                                              exercise.exerciseName
                                            ];
                                          const ghostData = getGhostModeData(
                                            ghost,
                                            exercise.sets,
                                            exercise.sets.length,
                                          );
                                          if (ghostData.type === "none")
                                            return null;
                                          const isBeatingSoon =
                                            ghostData.type === "beating" ||
                                            ghostData.type === "increase";
                                          const formatTonnage = (kg: number) =>
                                            kg >= 1000
                                              ? `${(kg / 1000).toFixed(2)} T`
                                              : `${kg} kg`;
                                          return (
                                            <div
                                              className={`mt-3 p-3 rounded-xl border ${isBeatingSoon ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30" : "bg-theme-tertiary border-theme/50"}`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-theme-muted">
                                                  👻 Record:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-semibold text-theme-secondary">
                                                    {ghostData.tonnageRecord !==
                                                    undefined
                                                      ? formatTonnage(
                                                          ghostData.tonnageRecord,
                                                        )
                                                      : "-"}
                                                  </span>
                                                  {ghostData.ghostSession && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowGhostRecordModal(
                                                          {
                                                            exerciseName:
                                                              exercise.exerciseName,
                                                            ghost:
                                                              ghostData.ghostSession!,
                                                          },
                                                        );
                                                      }}
                                                      className="p-1 bg-theme-tertiary hover:bg-theme-secondary rounded-lg transition-colors"
                                                      type="button"
                                                    >
                                                      <Info className="w-3.5 h-3.5 text-theme-muted" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                              {ghostData.message && (
                                                <div
                                                  className={`mt-2 text-xs font-medium ${isBeatingSoon ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
                                                >
                                                  {ghostData.type ===
                                                    "beating" && "🔥 "}
                                                  {ghostData.type ===
                                                    "increase" && "💪 "}
                                                  {ghostData.message}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Colonne droite: Charge */}
                                      <div className="flex flex-col">
                                        {/* Header avec label + bouton cycle (même hauteur) */}
                                        <div className="flex items-center justify-between mb-2 h-9">
                                          <label className="text-sm text-theme-muted">
                                            Charge
                                          </label>
                                          <button
                                            onClick={() =>
                                              cycleSetLoadTypeForExercise(
                                                exerciseIndex,
                                                setIndex,
                                              )
                                            }
                                            className="p-1.5 bg-theme-tertiary hover:bg-theme-tertiary text-theme rounded-lg transition-colors"
                                            type="button"
                                            aria-label="Changer type de charge"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        </div>

                                        {/* Barbell desktop */}
                                        {set.load?.type === "barbell" && (
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="20"
                                                value={
                                                  Number.isFinite(
                                                    set.load.barKg,
                                                  )
                                                    ? String(set.load.barKg)
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const raw = e.target.value;
                                                  const n =
                                                    raw === ""
                                                      ? 20
                                                      : Number(
                                                          raw.replace(",", "."),
                                                        );
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "barbell" }
                                                    >;
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    {
                                                      type: "barbell",
                                                      unit: "kg",
                                                      barKg: Number.isFinite(n)
                                                        ? n
                                                        : 20,
                                                      addedKg:
                                                        typeof prev.addedKg ===
                                                        "number"
                                                          ? prev.addedKg
                                                          : null,
                                                    },
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-xs text-theme-muted text-center mt-1">
                                                Barre
                                              </div>
                                            </div>
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={
                                                  typeof set.load.addedKg ===
                                                  "number"
                                                    ? String(set.load.addedKg)
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  const n =
                                                    v === ""
                                                      ? null
                                                      : Number(
                                                          v.replace(",", "."),
                                                        );
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "barbell" }
                                                    >;
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    {
                                                      type: "barbell",
                                                      unit: "kg",
                                                      barKg: prev.barKg,
                                                      addedKg:
                                                        v === ""
                                                          ? null
                                                          : Number.isFinite(
                                                                n as number,
                                                              )
                                                            ? (n as number)
                                                            : null,
                                                    },
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-xs text-theme-muted text-center mt-1">
                                                +Poids
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Assisted desktop */}
                                        {set.load?.type === "assisted" && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={
                                                typeof set.load.assistanceKg ===
                                                "number"
                                                  ? String(
                                                      set.load.assistanceKg,
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  {
                                                    type: "assisted",
                                                    unit: "kg",
                                                    assistanceKg:
                                                      v === ""
                                                        ? null
                                                        : Number.isFinite(
                                                              n as number,
                                                            )
                                                          ? (n as number)
                                                          : null,
                                                  },
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="text-xs text-theme-muted text-center mt-1">
                                              Assistance (kg)
                                            </div>
                                          </div>
                                        )}

                                        {/* Distance desktop */}
                                        {set.load?.type === "distance" && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={
                                                typeof set.load
                                                  .distanceValue === "number"
                                                  ? String(
                                                      set.load.distanceValue,
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                const prev =
                                                  set.load as Extract<
                                                    SetLoad,
                                                    { type: "distance" }
                                                  >;
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  {
                                                    type: "distance",
                                                    unit: prev.unit,
                                                    distanceValue:
                                                      v === ""
                                                        ? null
                                                        : Number.isFinite(
                                                              n as number,
                                                            )
                                                          ? (n as number)
                                                          : null,
                                                  },
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                              <span className="text-xs text-theme-muted">
                                                en
                                              </span>
                                              <select
                                                value={set.load.unit}
                                                onChange={(e) => {
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "distance" }
                                                    >;
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    {
                                                      type: "distance",
                                                      unit: e.target.value as
                                                        | "cm"
                                                        | "m",
                                                      distanceValue:
                                                        prev.distanceValue,
                                                    },
                                                  );
                                                }}
                                                className="bg-theme-tertiary border border-theme rounded px-2 py-0.5 text-theme text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                              >
                                                <option value="cm">cm</option>
                                                <option value="m">m</option>
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        {/* Single, Double, Machine desktop */}
                                        {(set.load?.type === "single" ||
                                          set.load?.type === "double" ||
                                          set.load?.type === "machine" ||
                                          !set.load?.type) && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={(() => {
                                                const load = set.load;
                                                if (!load) return "";
                                                if (
                                                  load.type === "single" ||
                                                  load.type === "double" ||
                                                  load.type === "machine"
                                                ) {
                                                  return typeof load.weightKg ===
                                                    "number"
                                                    ? String(load.weightKg)
                                                    : "";
                                                }
                                                return "";
                                              })()}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                const t:
                                                  | "single"
                                                  | "double"
                                                  | "machine" =
                                                  set.load?.type === "double"
                                                    ? "double"
                                                    : set.load?.type ===
                                                        "machine"
                                                      ? "machine"
                                                      : "single";
                                                const next: SetLoad =
                                                  t === "double"
                                                    ? {
                                                        type: "double",
                                                        unit: "kg",
                                                        weightKg:
                                                          v === ""
                                                            ? null
                                                            : Number.isFinite(
                                                                  n as number,
                                                                )
                                                              ? (n as number)
                                                              : null,
                                                      }
                                                    : t === "machine"
                                                      ? {
                                                          type: "machine",
                                                          unit: "kg",
                                                          weightKg:
                                                            v === ""
                                                              ? null
                                                              : Number.isFinite(
                                                                    n as number,
                                                                  )
                                                                ? (n as number)
                                                                : null,
                                                        }
                                                      : {
                                                          type: "single",
                                                          unit: "kg",
                                                          weightKg:
                                                            v === ""
                                                              ? null
                                                              : Number.isFinite(
                                                                    n as number,
                                                                  )
                                                                ? (n as number)
                                                                : null,
                                                        };
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  next,
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-4 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="text-xs text-theme-muted text-center mt-1">
                                              {set.load?.type === "double"
                                                ? "2x Haltères/KB"
                                                : set.load?.type === "machine"
                                                  ? "Machine"
                                                  : "Haltère/KB"}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ligne bas: Message/RPE à gauche (flex-1), Bouton valider carré à droite */}
                                    <div className="flex gap-4 pt-4 border-t border-theme/50">
                                      {/* Gauche: Message + RPE - occupe l'espace restant */}
                                      <div className="flex-1 flex flex-col justify-between gap-2">
                                        {onSaveComment && (
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3 text-theme-muted" />
                                                <span className="text-xs text-theme-muted">
                                                  Message coach
                                                </span>
                                              </div>
                                              {sentComments.has(
                                                exercise.exerciseName,
                                              ) && (
                                                <span className="text-[10px] text-[var(--color-success)] flex items-center gap-1">
                                                  <Check className="w-2.5 h-2.5" />{" "}
                                                  Envoyé
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex gap-2">
                                              <input
                                                type="text"
                                                placeholder="Douleur, sensation..."
                                                value={
                                                  exerciseComments[
                                                    exercise.exerciseName
                                                  ] || ""
                                                }
                                                onChange={(e) =>
                                                  setExerciseComments(
                                                    (prev) => ({
                                                      ...prev,
                                                      [exercise.exerciseName]:
                                                        e.target.value,
                                                    }),
                                                  )
                                                }
                                                disabled={sentComments.has(
                                                  exercise.exerciseName,
                                                )}
                                                className="flex-1 bg-theme-tertiary border border-theme rounded-lg px-2 py-1.5 text-theme text-xs placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                                              />
                                              <button
                                                onClick={() =>
                                                  handleSendComment(
                                                    exercise.exerciseName,
                                                  )
                                                }
                                                disabled={
                                                  !exerciseComments[
                                                    exercise.exerciseName
                                                  ]?.trim() ||
                                                  commentSending ===
                                                    exercise.exerciseName ||
                                                  sentComments.has(
                                                    exercise.exerciseName,
                                                  )
                                                }
                                                className="p-1.5 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-theme rounded-lg transition-colors"
                                                type="button"
                                              >
                                                <Send className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex-1 flex items-end">
                                          <div
                                            className="w-full"
                                            ref={(el) => {
                                              focusRpeRefs.current[
                                                exerciseIndex
                                              ] = el;
                                            }}
                                          >
                                            <RpeSelector
                                              value={exercise.rpe}
                                              onChange={(rpe) =>
                                                updateExerciseRpeForExercise(
                                                  exerciseIndex,
                                                  rpe,
                                                )
                                              }
                                              size="sm"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Droite: Bouton valider carré (aspect-square) */}
                                      <div className="flex flex-col justify-center">
                                        <button
                                          onClick={() =>
                                            set.completed
                                              ? toggleSetValidationForExercise(
                                                  exerciseIndex,
                                                )
                                              : validateSetForExercise(
                                                  exerciseIndex,
                                                )
                                          }
                                          className={`
                                      aspect-square h-full min-h-[80px] flex flex-col items-center justify-center gap-1 px-6 rounded-xl font-semibold transition-all active:scale-[0.98]
                                      ${
                                        set.completed
                                          ? "bg-[var(--color-success)] text-theme"
                                          : "bg-[var(--color-primary)] hover:opacity-90 text-theme shadow-lg shadow-[var(--shadow-color)]"
                                      }
                                    `}
                                          type="button"
                                        >
                                          <Check className="w-6 h-6" />
                                          <span className="text-xs">
                                            {set.completed
                                              ? "Validé"
                                              : "Valider"}
                                          </span>
                                        </button>
                                      </div>
                                    </div>

                                    {allSetsCompletedForExercise && (
                                      <div className="text-center text-xs text-[var(--color-success)]">
                                        Toutes les séries sont validées
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* Mobile: Layout vertical original */
                                  <div className="space-y-4">
                                    {/* Navigation séries - barre de progression cliquable + Trash2/Plus */}
                                    <div
                                      data-tour-id={
                                        exerciseIndex === 0
                                          ? "tour-set-header"
                                          : undefined
                                      }
                                    >
                                      <div className="flex items-center gap-2">
                                        {exercise.sets.map((s, i) => (
                                          <button
                                            key={i}
                                            onClick={() =>
                                              setSetIndexForExercise(
                                                exerciseIndex,
                                                i,
                                              )
                                            }
                                            className={`flex-1 h-3 rounded-full transition-all ${
                                              s.completed
                                                ? "bg-[var(--color-success)]"
                                                : i === setIndex
                                                  ? "bg-[var(--color-primary)]"
                                                  : "bg-theme-tertiary"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <div className="flex items-center justify-center gap-3 mt-2">
                                        <button
                                          onClick={() =>
                                            removeSetForExercise(exerciseIndex)
                                          }
                                          disabled={exercise.sets.length <= 1}
                                          className="p-1 text-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                          type="button"
                                          aria-label="Supprimer série"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-theme-muted">
                                          Série {setIndex + 1} /{" "}
                                          {exercise.sets.length}
                                        </span>
                                        <button
                                          onClick={() =>
                                            addSetForExercise(exerciseIndex)
                                          }
                                          className="p-1 text-theme-muted hover:text-theme transition-colors"
                                          type="button"
                                          aria-label="Ajouter série"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div
                                        data-tour-id={
                                          exerciseIndex === 0
                                            ? "tour-reps-input"
                                            : undefined
                                        }
                                      >
                                        <label className="block text-sm text-theme-muted mb-2">
                                          Répétitions
                                        </label>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder={
                                            exerciseData?.repsDuree?.replace(
                                              /[^0-9]/g,
                                              "",
                                            ) || "8"
                                          }
                                          value={set.reps}
                                          onChange={(e) =>
                                            updateSetForExercise(
                                              exerciseIndex,
                                              setIndex,
                                              "reps",
                                              e.target.value,
                                            )
                                          }
                                          className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-3 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        />
                                      </div>

                                      <div
                                        data-tour-id={
                                          exerciseIndex === 0
                                            ? "tour-weight-input"
                                            : undefined
                                        }
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <label className="block text-sm text-theme-muted">
                                            Charge
                                          </label>
                                          <button
                                            onClick={() =>
                                              cycleSetLoadTypeForExercise(
                                                exerciseIndex,
                                                setIndex,
                                              )
                                            }
                                            className="p-2 bg-theme-tertiary hover:bg-theme-tertiary text-theme rounded-lg transition-colors"
                                            type="button"
                                            aria-label="Changer type de charge"
                                            data-tour-id={
                                              exerciseIndex === 0
                                                ? "tour-load-type-button"
                                                : undefined
                                            }
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        </div>

                                        {/* Barbell: 2 inputs (barre + poids ajoutés) */}
                                        {set.load?.type === "barbell" && (
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="20"
                                                value={
                                                  Number.isFinite(
                                                    set.load.barKg,
                                                  )
                                                    ? String(set.load.barKg)
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const raw = e.target.value;
                                                  const n =
                                                    raw === ""
                                                      ? 20
                                                      : Number(
                                                          raw.replace(",", "."),
                                                        );
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "barbell" }
                                                    >;
                                                  const next: SetLoad = {
                                                    type: "barbell",
                                                    unit: "kg",
                                                    barKg: Number.isFinite(n)
                                                      ? n
                                                      : 20,
                                                    addedKg:
                                                      typeof prev.addedKg ===
                                                      "number"
                                                        ? prev.addedKg
                                                        : null,
                                                  };
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    next,
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-sm text-theme-muted text-center mt-1">
                                                Barre
                                              </div>
                                            </div>
                                            <div>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={
                                                  typeof set.load.addedKg ===
                                                  "number"
                                                    ? String(set.load.addedKg)
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const v = e.target.value;
                                                  const n =
                                                    v === ""
                                                      ? null
                                                      : Number(
                                                          v.replace(",", "."),
                                                        );
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "barbell" }
                                                    >;
                                                  const next: SetLoad = {
                                                    type: "barbell",
                                                    unit: "kg",
                                                    barKg: prev.barKg,
                                                    addedKg:
                                                      v === ""
                                                        ? null
                                                        : Number.isFinite(
                                                              n as number,
                                                            )
                                                          ? (n as number)
                                                          : null,
                                                  };
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    next,
                                                  );
                                                }}
                                                className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                              />
                                              <div className="text-sm text-theme-muted text-center mt-1">
                                                Poids ajoutés
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Assisted: 1 input (assistance en kg) */}
                                        {set.load?.type === "assisted" && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={
                                                typeof set.load.assistanceKg ===
                                                "number"
                                                  ? String(
                                                      set.load.assistanceKg,
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                const next: SetLoad = {
                                                  type: "assisted",
                                                  unit: "kg",
                                                  assistanceKg:
                                                    v === ""
                                                      ? null
                                                      : Number.isFinite(
                                                            n as number,
                                                          )
                                                        ? (n as number)
                                                        : null,
                                                };
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  next,
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="text-sm text-theme-muted text-center mt-1">
                                              Assistance (kg)
                                            </div>
                                          </div>
                                        )}

                                        {/* Distance: 1 input + sélecteur unité */}
                                        {set.load?.type === "distance" && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={
                                                typeof set.load
                                                  .distanceValue === "number"
                                                  ? String(
                                                      set.load.distanceValue,
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                const prev =
                                                  set.load as Extract<
                                                    SetLoad,
                                                    { type: "distance" }
                                                  >;
                                                const next: SetLoad = {
                                                  type: "distance",
                                                  unit: prev.unit,
                                                  distanceValue:
                                                    v === ""
                                                      ? null
                                                      : Number.isFinite(
                                                            n as number,
                                                          )
                                                        ? (n as number)
                                                        : null,
                                                };
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  next,
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                              <span className="text-sm text-theme-muted">
                                                Distance en
                                              </span>
                                              <select
                                                value={set.load.unit}
                                                onChange={(e) => {
                                                  const prev =
                                                    set.load as Extract<
                                                      SetLoad,
                                                      { type: "distance" }
                                                    >;
                                                  const next: SetLoad = {
                                                    type: "distance",
                                                    unit: e.target.value as
                                                      | "cm"
                                                      | "m",
                                                    distanceValue:
                                                      prev.distanceValue,
                                                  };
                                                  updateSetLoadForExercise(
                                                    exerciseIndex,
                                                    setIndex,
                                                    next,
                                                  );
                                                }}
                                                className="bg-theme-tertiary border border-theme rounded-lg px-2 py-1 text-theme text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                              >
                                                <option value="cm">cm</option>
                                                <option value="m">m</option>
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        {/* Single, Double, Machine: 1 input (poids en kg) */}
                                        {(set.load?.type === "single" ||
                                          set.load?.type === "double" ||
                                          set.load?.type === "machine" ||
                                          !set.load?.type) && (
                                          <div>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={(() => {
                                                const load = set.load;
                                                if (!load) return "";
                                                if (
                                                  load.type === "single" ||
                                                  load.type === "double" ||
                                                  load.type === "machine"
                                                ) {
                                                  return typeof load.weightKg ===
                                                    "number"
                                                    ? String(load.weightKg)
                                                    : "";
                                                }
                                                return "";
                                              })()}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                const n =
                                                  v === ""
                                                    ? null
                                                    : Number(
                                                        v.replace(",", "."),
                                                      );
                                                const t:
                                                  | "single"
                                                  | "double"
                                                  | "machine" =
                                                  set.load?.type === "double"
                                                    ? "double"
                                                    : set.load?.type ===
                                                        "machine"
                                                      ? "machine"
                                                      : "single";
                                                const next: SetLoad =
                                                  t === "double"
                                                    ? {
                                                        type: "double",
                                                        unit: "kg",
                                                        weightKg:
                                                          v === ""
                                                            ? null
                                                            : Number.isFinite(
                                                                  n as number,
                                                                )
                                                              ? (n as number)
                                                              : null,
                                                      }
                                                    : t === "machine"
                                                      ? {
                                                          type: "machine",
                                                          unit: "kg",
                                                          weightKg:
                                                            v === ""
                                                              ? null
                                                              : Number.isFinite(
                                                                    n as number,
                                                                  )
                                                                ? (n as number)
                                                                : null,
                                                        }
                                                      : {
                                                          type: "single",
                                                          unit: "kg",
                                                          weightKg:
                                                            v === ""
                                                              ? null
                                                              : Number.isFinite(
                                                                    n as number,
                                                                  )
                                                                ? (n as number)
                                                                : null,
                                                        };
                                                updateSetLoadForExercise(
                                                  exerciseIndex,
                                                  setIndex,
                                                  next,
                                                );
                                              }}
                                              className="w-full bg-theme-tertiary border border-theme rounded-xl px-3 py-8 text-theme text-center text-xl font-bold placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            />
                                            <div className="text-sm text-theme-muted text-center mt-1">
                                              {set.load?.type === "double"
                                                ? "2x Haltères / Kettlebell"
                                                : set.load?.type === "machine"
                                                  ? "Machine"
                                                  : "Haltère / Kettlebell"}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Ghost Mode - Basé sur le tonnage total */}
                                      {(() => {
                                        const ghost =
                                          ghostSessions[exercise.exerciseName];
                                        const ghostData = getGhostModeData(
                                          ghost,
                                          exercise.sets,
                                          exercise.sets.length,
                                        );

                                        if (ghostData.type === "none")
                                          return null;

                                        // Déterminer le style selon le type
                                        const isBeatingSoon =
                                          ghostData.type === "beating" ||
                                          ghostData.type === "increase";

                                        // Formater le tonnage (en tonnes si >= 1000 kg)
                                        const formatTonnage = (kg: number) => {
                                          if (kg >= 1000) {
                                            return `${(kg / 1000).toFixed(2)} T`;
                                          }
                                          return `${kg} kg`;
                                        };

                                        return (
                                          <div
                                            className={`mt-3 p-3 rounded-xl border ${isBeatingSoon ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30" : "bg-theme-tertiary border-theme/50"}`}
                                          >
                                            {/* Ligne 1: Record tonnage + bouton info */}
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-medium text-theme-muted">
                                                👻 Record:
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-theme-secondary">
                                                  {ghostData.tonnageRecord !==
                                                  undefined
                                                    ? formatTonnage(
                                                        ghostData.tonnageRecord,
                                                      )
                                                    : "-"}
                                                </span>
                                                {ghostData.ghostSession && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setShowGhostRecordModal({
                                                        exerciseName:
                                                          exercise.exerciseName,
                                                        ghost:
                                                          ghostData.ghostSession!,
                                                      });
                                                    }}
                                                    className="p-1 bg-theme-tertiary hover:bg-theme-secondary rounded-lg transition-colors"
                                                    title="Voir les détails du record"
                                                    type="button"
                                                  >
                                                    <Info className="w-3.5 h-3.5 text-theme-muted" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Ligne 2: Message dynamique si applicable */}
                                            {ghostData.message && (
                                              <div
                                                className={`mt-2 text-xs font-medium ${isBeatingSoon ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
                                              >
                                                {ghostData.type === "beating" &&
                                                  "🔥 "}
                                                {ghostData.type ===
                                                  "increase" && "💪 "}
                                                {ghostData.message}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Validate Set Button */}
                                    {(() => {
                                      const isLastSet =
                                        setIndex === exercise.sets.length - 1;
                                      const allSetsValidated =
                                        exercise.sets.every((s) => s.completed);

                                      // Determine button text
                                      let buttonText: string;
                                      const hasRpe =
                                        typeof exercise.rpe === "number";

                                      // Determine button text
                                      if (set.completed) {
                                        if (isLastSet && allSetsValidated) {
                                          buttonText = hasRpe
                                            ? "Séance terminée"
                                            : "Remplissez le RPE";
                                        } else {
                                          buttonText = "Série validée";
                                        }
                                      } else {
                                        buttonText = isLastSet
                                          ? "Finir l'exercice"
                                          : "Valider la série";
                                      }

                                      return (
                                        <button
                                          onClick={() =>
                                            set.completed
                                              ? toggleSetValidationForExercise(
                                                  exerciseIndex,
                                                )
                                              : validateSetForExercise(
                                                  exerciseIndex,
                                                )
                                          }
                                          className={`
                                  w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold transition-all active:scale-[0.98]
                                  ${
                                    set.completed
                                      ? "bg-gray-400 text-white cursor-default"
                                      : "bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--shadow-color)]"
                                  }
                                `}
                                          type="button"
                                          data-tour-id={
                                            exerciseIndex === 0
                                              ? "tour-validate-set-button"
                                              : undefined
                                          }
                                        >
                                          <Check className="w-5 h-5" />
                                          <span>{buttonText}</span>
                                        </button>
                                      );
                                    })()}

                                    {onSaveComment && (
                                      <div
                                        className="pt-2"
                                        data-tour-id={
                                          exerciseIndex === 0
                                            ? "tour-message-section"
                                            : undefined
                                        }
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-theme-muted" />
                                            <span className="text-sm text-theme-muted">
                                              Message au coach
                                            </span>
                                          </div>
                                          {sentComments.has(
                                            exercise.exerciseName,
                                          ) ? (
                                            <span className="text-xs text-[var(--color-success)] flex items-center gap-1">
                                              <Check className="w-3 h-3" />
                                              Envoyé
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            placeholder="Douleur, sensation, question..."
                                            value={
                                              exerciseComments[
                                                exercise.exerciseName
                                              ] || ""
                                            }
                                            onChange={(e) =>
                                              setExerciseComments((prev) => ({
                                                ...prev,
                                                [exercise.exerciseName]:
                                                  e.target.value,
                                              }))
                                            }
                                            disabled={sentComments.has(
                                              exercise.exerciseName,
                                            )}
                                            className="flex-1 bg-theme-tertiary border border-theme rounded-lg px-3 py-2 text-theme text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                                          />
                                          <button
                                            onClick={() =>
                                              handleSendComment(
                                                exercise.exerciseName,
                                              )
                                            }
                                            disabled={
                                              !exerciseComments[
                                                exercise.exerciseName
                                              ]?.trim() ||
                                              commentSending ===
                                                exercise.exerciseName ||
                                              sentComments.has(
                                                exercise.exerciseName,
                                              )
                                            }
                                            className="p-2 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-theme rounded-lg transition-colors"
                                            title="Envoyer maintenant"
                                            type="button"
                                          >
                                            <Send className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    <div
                                      className={`p-3 rounded-xl transition-all duration-300 ${
                                        highlightedRpeIndex === exerciseIndex
                                          ? "ring-2 ring-[var(--color-primary)] ring-offset-4 ring-offset-theme bg-[var(--color-primary)]/10"
                                          : ""
                                      }`}
                                      data-tour-id={
                                        exerciseIndex === 0
                                          ? "tour-exercise-rpe"
                                          : undefined
                                      }
                                    >
                                      <div
                                        ref={(el) => {
                                          focusRpeRefs.current[exerciseIndex] =
                                            el;
                                        }}
                                      />
                                      <RpeSelector
                                        value={exercise.rpe}
                                        onChange={(rpe) =>
                                          updateExerciseRpeForExercise(
                                            exerciseIndex,
                                            rpe,
                                          )
                                        }
                                        size="sm"
                                      />
                                    </div>

                                    {allSetsCompletedForExercise && (
                                      <div className="text-center text-xs text-[var(--color-success)]">
                                        Toutes les séries sont validées
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>,
                  );
                }
              });

              // Retourner premier exercice + reste wrappé dans un conteneur pour le tour
              if (renderedElements.length <= 1) return renderedElements;

              return (
                <>
                  {renderedElements[0]}
                  <div
                    data-tour-id="tour-remaining-exercises"
                    className="contents"
                  >
                    {renderedElements.slice(1)}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div
          className="bg-theme/95 backdrop-blur-sm border-t border-theme px-4 py-3 sticky bottom-0"
          data-tour-id="tour-finish-session-button"
          style={{
            // Pendant le tour, le footer doit rester au-dessus du backdrop (9998)
            // uniquement quand il est la cible (étape 15) ou à la fin (étape 16)
            zIndex: isTourActive && currentStepIndex >= 15 ? 9999 : undefined,
          }}
        >
          {/* Progress Bar - Desktop only (mobile shows at top) */}
          {isDesktop && (
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-theme-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-theme-muted w-12 text-right">
                  {progress}%
                </span>
              </div>
            </div>
          )}
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
              ${allExercisesCompleted ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-theme" : "bg-theme-tertiary text-theme-secondary"}
            `}
            type="button"
          >
            <span>Terminer</span>
            <Check className="w-5 h-5" />
          </button>
        </div>

        {/* Spacer pour le tour démo : pousse le footer au-dessus du tooltip */}
        {/* Actif pour les étapes 4-16 (indices 4-16) du tour */}
        {isTourActive && currentStepIndex >= 4 && currentStepIndex <= 16 && (
          <div
            className="flex-shrink-0"
            style={{ height: "200px" }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  };

  // ===========================================
  // MODALS
  // ===========================================

  const renderCancelModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme-secondary border border-theme rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[var(--color-danger)]/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme">Abandonner ?</h3>
            <p className="text-sm text-theme-muted">
              Ta progression sera perdue
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCancelModal(false)}
            className="flex-1 py-3 bg-theme-tertiary hover:bg-theme-tertiary text-theme rounded-xl font-medium transition-colors"
          >
            Continuer
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-3 bg-[var(--color-danger)] hover:opacity-90 text-theme rounded-xl font-medium transition-colors"
          >
            Abandonner
          </button>
        </div>
      </div>
    </div>
  );

  const renderForceFinishModal = () => {
    if (!showForceFinishModal) return null;

    const incompleteExercises = logs.filter((ex) => {
      const allSetsDone =
        ex.sets.length > 0 && ex.sets.every((s) => s.completed);
      const hasRpe = typeof ex.rpe === "number";
      return !(allSetsDone && hasRpe);
    });

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-theme-secondary border border-theme rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-theme">
                Séance incomplète
              </h3>
              <p className="text-sm text-theme-muted">
                Certains exercices ne sont pas entièrement validés.
              </p>
            </div>
          </div>

          {incompleteExercises.length > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-theme-muted mb-1">
                Exercices incomplets :
              </p>
              <ul className="text-sm text-theme-secondary list-disc list-inside space-y-1">
                {incompleteExercises.map((ex, idx) => (
                  <li key={idx}>{getExerciseDisplayName(ex.exerciseName)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowForceFinishModal(false)}
              className="w-full py-2.5 bg-theme-tertiary hover:bg-theme-tertiary text-theme rounded-xl font-medium transition-colors"
              type="button"
            >
              Je modifie ma séance
            </button>
            <button
              onClick={() => {
                setShowForceFinishModal(false);
                void handleFinish();
              }}
              className="w-full py-2.5 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-theme rounded-xl font-medium transition-colors"
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
  // MODALS: HISTORY & CONSIGNES & VIDEO
  // ===========================================

  const renderHistoryModal = () => {
    if (!showHistoryModal) return null;
    const exercise = logs[showHistoryModal.index];
    if (!exercise) return null;

    const lastHistory = getLastExerciseHistory(exercise.exerciseName, history);
    const isDesktop = layout === "desktop";
    const anchorEl = showHistoryModal.anchorEl;

    // Update ref for Popover
    historyAnchorRef.current = anchorEl;

    // Contenu partagé
    const content = (
      <>
        <div className="flex items-center justify-between mb-4 px-5 pt-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-theme">
              Historique {getExerciseDisplayName(exercise.exerciseName)}
            </h3>
            {typeof lastHistory?.rpe === "number" && (
              <RpeBadge rpe={lastHistory.rpe} size="sm" />
            )}
          </div>
          {!(isDesktop && anchorEl) && (
            <button
              onClick={() => setShowHistoryModal(null)}
              className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          {lastHistory ? (
            <div>
              <p className="text-sm text-theme-muted mb-4">
                Dernière exécution{" "}
                {new Date(lastHistory.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="space-y-2">
                {lastHistory.sets.map((set, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 bg-theme-tertiary rounded-lg p-3"
                  >
                    <span className="text-sm text-theme-muted">
                      Série {set.setNumber}
                    </span>
                    <span className="text-theme font-medium">
                      {set.reps || "-"}
                    </span>
                    <span className="text-theme-muted">×</span>
                    <span className="text-[var(--color-success)] font-medium">
                      {formatSetWeight(set)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-theme-muted text-center py-8">
              Aucun historique pour cet exercice
            </p>
          )}
        </div>
      </>
    );

    // Mode Popover (desktop avec anchorEl)
    if (isDesktop && anchorEl) {
      return (
        <Popover
          anchorRef={historyAnchorRef as React.RefObject<HTMLElement>}
          isOpen={true}
          onClose={() => setShowHistoryModal(null)}
          position="bottom-left"
          maxWidth={400}
          showCloseButton={true}
        >
          {content}
        </Popover>
      );
    }

    // Mode Modal classique (mobile)
    // Pendant le tour, z-index doit être supérieur au tooltip (10002)
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: isTourActive ? 10003 : 50 }}
      >
        <div className="bg-theme-secondary border border-theme rounded-2xl max-w-md w-full shadow-2xl">
          {content}
        </div>
      </div>
    );
  };

  const renderConsignesModal = () => {
    if (!showConsignesModal) return null;
    const exercise = logs[showConsignesModal.index];
    if (!exercise) return null;

    const exerciseData = sessionData.find(
      (d) => d.exercice === exercise.exerciseName,
    );
    const notes = exercise.notes || exerciseData?.notes;
    const isDesktop = layout === "desktop";
    const anchorEl = showConsignesModal.anchorEl;

    // Update ref for Popover
    consignesAnchorRef.current = anchorEl;

    // Contenu partagé
    const content = (
      <>
        <div className="flex items-center justify-between mb-4 px-5 pt-5">
          <h3 className="text-lg font-bold text-theme">
            Consignes {getExerciseDisplayName(exercise.exerciseName)}
          </h3>
          {!(isDesktop && anchorEl) && (
            <button
              onClick={() => setShowConsignesModal(null)}
              className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          {notes ? (
            <div className="px-3 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--color-warning)]">{notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-theme-muted text-center py-8">
              Aucune consigne pour cet exercice
            </p>
          )}
        </div>
      </>
    );

    // Mode Popover (desktop avec anchorEl)
    if (isDesktop && anchorEl) {
      return (
        <Popover
          anchorRef={consignesAnchorRef as React.RefObject<HTMLElement>}
          isOpen={true}
          onClose={() => setShowConsignesModal(null)}
          position="bottom-left"
          maxWidth={380}
          showCloseButton={true}
        >
          {content}
        </Popover>
      );
    }

    // Mode Modal classique (mobile)
    // Pendant le tour, z-index doit être supérieur au tooltip (10002)
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: isTourActive ? 10003 : 50 }}
      >
        <div className="bg-theme-secondary border border-theme rounded-2xl max-w-md w-full shadow-2xl">
          {content}
        </div>
      </div>
    );
  };

  const renderVideoModal = () => {
    if (!showVideoModal) return null;

    const isDesktop = layout === "desktop";
    const anchorEl = showVideoModal.anchorEl;

    // Update ref for Popover
    videoAnchorRef.current = anchorEl;

    return (
      <VideoModal
        url={showVideoModal.url}
        exerciseName={showVideoModal.exerciseName}
        onClose={() => setShowVideoModal(null)}
        anchorRef={
          isDesktop && anchorEl
            ? (videoAnchorRef as React.RefObject<HTMLElement>)
            : undefined
        }
        zIndex={isTourActive ? 10003 : 50}
      />
    );
  };

  const renderGhostRecordModal = () => {
    if (!showGhostRecordModal) return null;

    const { exerciseName, ghost } = showGhostRecordModal;

    // Fonction pour formater le poids depuis SetDetailLog
    const formatGhostSetWeight = (set: SetDetailLog): string => {
      if (!set.load) {
        return set.weight ? `${set.weight} kg` : "-";
      }

      const load = set.load;
      if (load.type === "single") {
        return load.weightKg !== null ? `${load.weightKg} kg` : "-";
      }
      if (load.type === "double") {
        return load.weightKg !== null ? `${load.weightKg} kg/côté` : "-";
      }
      if (load.type === "barbell") {
        const bar = load.barKg || 0;
        const added = load.addedKg || 0;
        const total = bar + added;
        return `${total} kg`;
      }
      if (load.type === "machine") {
        return load.weightKg !== null ? `${load.weightKg} kg` : "-";
      }
      if (load.type === "assisted") {
        return load.assistanceKg !== null ? `-${load.assistanceKg} kg` : "-";
      }
      if (load.type === "distance") {
        if (load.distanceValue === null) return "-";
        return load.unit === "m"
          ? `${load.distanceValue} m`
          : `${load.distanceValue} cm`;
      }
      return "-";
    };

    // Formater le tonnage total
    const formatTonnage = (kg: number) => {
      if (kg >= 1000) {
        return `${(kg / 1000).toFixed(2)} T`;
      }
      return `${kg} kg`;
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-theme-secondary border border-theme rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">👻</span>
              <h3 className="text-lg font-bold text-theme">
                Record {getExerciseDisplayName(exerciseName)}
              </h3>
            </div>
            <button
              onClick={() => setShowGhostRecordModal(null)}
              className="p-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            {/* Date et tonnage total */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-theme-muted">
                {new Date(ghost.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1">
                <span className="text-purple-400 font-semibold">
                  {formatTonnage(Math.round(ghost.totalVolume))}
                </span>
              </div>
            </div>

            {/* Détail des séries */}
            <div className="space-y-2">
              {ghost.sets.map((set, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 bg-theme-tertiary rounded-lg p-3"
                >
                  <span className="text-sm text-theme-muted">
                    Série {set.setNumber}
                  </span>
                  <span className="text-theme font-medium">
                    {set.reps || "-"}
                  </span>
                  <span className="text-theme-muted">×</span>
                  <span className="text-[var(--color-success)] font-medium">
                    {formatGhostSetWeight(set)}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
      {phase === "recap" ? renderRecapPhase() : renderFocusPhase()}

      {showCancelModal && renderCancelModal()}
      {showForceFinishModal && renderForceFinishModal()}
      {showHistoryModal && renderHistoryModal()}
      {showConsignesModal && renderConsignesModal()}
      {showVideoModal && renderVideoModal()}
      {showGhostRecordModal !== null && renderGhostRecordModal()}

      {/* Modal d'info superset */}
      {showSupersetInfoModal && (
        <SupersetInfoModal
          executionMode={showSupersetInfoModal.executionMode}
          onClose={() => setShowSupersetInfoModal(null)}
          anchorEl={showSupersetInfoModal.anchorEl}
          layout={layout}
        />
      )}

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

// Alias pour nouveau nom + compatibilité
export const ActiveSessionMobile = ActiveSessionAthlete;
export default ActiveSessionMobile;
