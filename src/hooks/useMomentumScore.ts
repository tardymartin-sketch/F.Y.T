// ============================================================
// F.Y.T - USE MOMENTUM SCORE HOOK
// src/hooks/useMomentumScore.ts
// Reactive hook: computes momentum from live session state.
// ============================================================

import { useMemo, useEffect, useCallback, useRef } from 'react';
import { computeMomentumScore, MomentumBreakdown, MomentumInput } from '../utils/momentum';
import { useActiveSessionStore } from '../stores/useActiveSessionStore';
import type { SessionLog } from '../../types';

interface UseMomentumScoreOptions {
  /** Previous session for the same workout (for PR detection) */
  previousSession?: SessionLog | null;
}

interface UseMomentumScoreReturn {
  /** Current momentum breakdown */
  breakdown: MomentumBreakdown;
  /** Record a rest duration for a specific exercise/set */
  recordRest: (exerciseIndex: number, setIndex: number, durationSeconds: number) => void;
  /** Set prescribed rest for an exercise */
  setPrescribedRest: (exerciseIndex: number, seconds: number) => void;
}

/**
 * Hook that computes momentum score reactively from the active session.
 * Call this inside the active session screen.
 */
export function useMomentumScore(
  options: UseMomentumScoreOptions = {}
): UseMomentumScoreReturn {
  const { previousSession = null } = options;

  const editingSession = useActiveSessionStore((s) => s.editingSession);
  const setMomentumScore = useActiveSessionStore((s) => s.setMomentumScore);

  // Rest data stored in refs to avoid re-renders on every rest recording
  const restDurationsRef = useRef<Record<string, number>>({});
  const prescribedRestRef = useRef<Record<number, number>>({});

  const recordRest = useCallback(
    (exerciseIndex: number, setIndex: number, durationSeconds: number) => {
      restDurationsRef.current[`${exerciseIndex}-${setIndex}`] = durationSeconds;
    },
    []
  );

  const setPrescribedRest = useCallback(
    (exerciseIndex: number, seconds: number) => {
      prescribedRestRef.current[exerciseIndex] = seconds;
    },
    []
  );

  const breakdown = useMemo(() => {
    if (!editingSession || editingSession.exercises.length === 0) {
      return { total: 0, completion: 0, prBonus: 0, restDiscipline: 0, consistency: 0 };
    }

    const input: MomentumInput = {
      session: editingSession,
      restDurations: { ...restDurationsRef.current },
      prescribedRest: { ...prescribedRestRef.current },
      previousSession,
    };

    return computeMomentumScore(input);
  }, [editingSession, previousSession]);

  // Sync to store outside useMemo to avoid side-effect in render
  useEffect(() => {
    setMomentumScore(breakdown.total);
  }, [breakdown.total, setMomentumScore]);

  return { breakdown, recordRest, setPrescribedRest };
}
