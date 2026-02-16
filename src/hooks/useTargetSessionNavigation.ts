// ============================================================
// F.Y.T - HOOK useTargetSessionNavigation
// src/hooks/useTargetSessionNavigation.ts
// Navigation et auto-expand vers une session cible depuis Stats/Heatmap
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { SessionLog } from '../../types';

// ===========================================
// TYPES
// ===========================================

export interface TargetSessionNavigationProps {
  /** Liste des sessions de l'historique */
  history: SessionLog[];
  /** ID de la session ciblée (depuis PersonalRecordsList) */
  targetSessionLogId?: string | null;
  /** Nom de l'exercice à cibler dans la session */
  targetExerciseName?: string | null;
  /** Date ciblée (depuis HeatmapCalendar) - format YYYY-MM-DD */
  targetDate?: string | null;
  /** Callback pour nettoyer le target après navigation */
  onClearTarget?: () => void;
  /** Callback pour définir l'ID de session expandée */
  setExpandedSession: (id: string | null) => void;
  /** Callback pour ajouter un exercice expandé */
  setExpandedExercise?: (sessionId: string, exerciseIndex: number) => void;
}

export interface TargetSessionNavigationReturn {
  /** ID de la session actuellement highlightée (feedback visuel) */
  highlightedSessionId: string | null;
  /** Ref callback pour attacher à l'élément de session target */
  targetSessionRef: React.RefObject<HTMLDivElement>;
  /** Ref map pour attacher à plusieurs éléments de session (mode desktop) */
  sessionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  /** Fonction pour enregistrer une ref de session par ID */
  registerSessionRef: (id: string) => (el: HTMLDivElement | null) => void;
}

// ===========================================
// CONSTANTS
// ===========================================

const SCROLL_DELAY_MS = 100;
const CLEAR_TARGET_DELAY_MS = 500;
const HIGHLIGHT_DURATION_MS = 3000;

// ===========================================
// HOOK
// ===========================================

/**
 * Hook pour gérer la navigation vers une session cible depuis Stats/Heatmap
 *
 * Fonctionnalités:
 * - Navigation par sessionLogId (depuis PersonalRecordsList)
 * - Navigation par date (depuis HeatmapCalendar)
 * - Auto-expand de la session ciblée
 * - Auto-expand de l'exercice ciblé (optionnel)
 * - Scroll automatique vers la session
 * - Highlight temporaire pour feedback visuel
 *
 * @example
 * // Dans HistoryDesktop ou HistoryMobile
 * const {
 *   highlightedSessionId,
 *   registerSessionRef
 * } = useTargetSessionNavigation({
 *   history,
 *   targetSessionLogId,
 *   targetDate,
 *   onClearTarget,
 *   setExpandedSession
 * });
 *
 * // Dans le rendu
 * <div ref={registerSessionRef(session.id)}>...</div>
 */
export function useTargetSessionNavigation({
  history,
  targetSessionLogId,
  targetExerciseName,
  targetDate,
  onClearTarget,
  setExpandedSession,
  setExpandedExercise
}: TargetSessionNavigationProps): TargetSessionNavigationReturn {
  // State pour le highlight visuel
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);

  // Refs pour les éléments DOM
  const targetSessionRef = useRef<HTMLDivElement>(null);
  const sessionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ===========================================
  // HELPER: Scroll et highlight
  // ===========================================

  const scrollToSession = useCallback((sessionId: string) => {
    setTimeout(() => {
      // Essayer d'abord la ref map (desktop), puis la ref unique (mobile)
      const element = sessionRefs.current[sessionId] || targetSessionRef.current;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, SCROLL_DELAY_MS);
  }, []);

  const highlightSession = useCallback((sessionId: string) => {
    setHighlightedSessionId(sessionId);
    setTimeout(() => {
      setHighlightedSessionId(null);
    }, HIGHLIGHT_DURATION_MS);
  }, []);

  const clearTargetAfterDelay = useCallback(() => {
    if (onClearTarget) {
      setTimeout(() => onClearTarget(), CLEAR_TARGET_DELAY_MS);
    }
  }, [onClearTarget]);

  // ===========================================
  // EFFECT: Navigation par sessionLogId
  // ===========================================

  useEffect(() => {
    if (!targetSessionLogId || history.length === 0) return;

    // Vérifier que la session existe
    const targetSession = history.find(s => s.id === targetSessionLogId);
    if (!targetSession) {
      onClearTarget?.();
      return;
    }

    // Expand la session
    setExpandedSession(targetSessionLogId);

    // Expand l'exercice si spécifié
    if (targetExerciseName && setExpandedExercise) {
      const exerciseIndex = targetSession.exercises.findIndex(
        ex => ex.exerciseName.toLowerCase() === targetExerciseName.toLowerCase()
      );
      if (exerciseIndex !== -1) {
        setExpandedExercise(targetSessionLogId, exerciseIndex);
      }
    }

    // Highlight et scroll
    highlightSession(targetSessionLogId);
    scrollToSession(targetSessionLogId);

    // Clear target
    clearTargetAfterDelay();
  }, [
    targetSessionLogId,
    targetExerciseName,
    history,
    onClearTarget,
    setExpandedSession,
    setExpandedExercise,
    highlightSession,
    scrollToSession,
    clearTargetAfterDelay
  ]);

  // ===========================================
  // EFFECT: Navigation par date
  // ===========================================

  useEffect(() => {
    if (!targetDate || history.length === 0) return;

    // Trouver les sessions de cette date
    // Le format peut être YYYY-MM-DD ou une date ISO complète
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    const sessionsOfDay = history.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= targetDateStart && sessionDate <= targetDateEnd;
    });

    if (sessionsOfDay.length === 0) {
      onClearTarget?.();
      return;
    }

    // Prendre la première session du jour
    const firstSession = sessionsOfDay[0];

    // Expand la session
    setExpandedSession(firstSession.id);

    // Highlight et scroll
    highlightSession(firstSession.id);
    scrollToSession(firstSession.id);

    // Clear target
    clearTargetAfterDelay();
  }, [
    targetDate,
    history,
    onClearTarget,
    setExpandedSession,
    highlightSession,
    scrollToSession,
    clearTargetAfterDelay
  ]);

  // ===========================================
  // REF CALLBACK
  // ===========================================

  /**
   * Callback pour enregistrer une ref de session
   * À utiliser avec: ref={registerSessionRef(session.id)}
   */
  const registerSessionRef = useCallback((id: string) => {
    return (el: HTMLDivElement | null) => {
      sessionRefs.current[id] = el;
    };
  }, []);

  return {
    highlightedSessionId,
    targetSessionRef,
    sessionRefs,
    registerSessionRef
  };
}

export default useTargetSessionNavigation;
