// ============================================================
// F.Y.T - MOMENTUM SCORE ENGINE
// src/utils/momentum.ts
// High-level: computes momentum from SessionLog data structures.
// Low-level formula lives in momentumCalculus.ts (reused here).
// ============================================================

import type { SessionLog, ExerciseLog, SetLog, SetLoad } from '../../types';
import {
  calculateMomentum,
  calculateRestDiscipline,
  calculateConsistency,
} from './momentumCalculus';

// ===========================================
// TYPES
// ===========================================

export interface MomentumBreakdown {
  /** Overall momentum score (0-100) */
  total: number;
  /** Completion sub-score: sets completed / total planned (0-100) */
  completion: number;
  /** PR bonus sub-score: personal records hit this session (0-100) */
  prBonus: number;
  /** Rest discipline sub-score: staying within prescribed rest windows (0-100) */
  restDiscipline: number;
  /** Consistency sub-score: hitting target reps across sets (0-100) */
  consistency: number;
}

export interface MomentumInput {
  /** Current session being executed */
  session: SessionLog;
  /** Rest durations recorded per set (in seconds). Key: "exerciseIndex-setIndex" */
  restDurations: Record<string, number>;
  /** Prescribed rest per exercise (seconds). Key: exerciseIndex */
  prescribedRest: Record<number, number>;
  /** Previous session for the same workout (for PR detection) */
  previousSession?: SessionLog | null;
}

// ===========================================
// HELPERS
// ===========================================

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Extract a comparable weight (kg) from a SetLoad.
 * Returns null for distance-type or missing data.
 */
export function getLoadWeightKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  switch (load.type) {
    case 'single':
    case 'machine':
      return load.weightKg;
    case 'double':
      return load.weightKg != null ? load.weightKg * 2 : null;
    case 'barbell':
      return load.barKg != null && load.addedKg != null
        ? load.barKg + load.addedKg
        : null;
    case 'assisted':
      return load.assistanceKg != null ? -load.assistanceKg : null;
    case 'distance':
      return null;
    default:
      return null;
  }
}

function parseReps(reps: string | undefined): number {
  if (!reps) return 0;
  return parseInt(reps, 10) || 0;
}

function getSetWeight(set: SetLog): number {
  const fromLoad = getLoadWeightKg(set.load);
  if (fromLoad != null) return fromLoad;
  if (set.weight) return parseFloat(set.weight.replace(/[^0-9.]/g, '')) || 0;
  return 0;
}

// ===========================================
// SUB-SCORE EXTRACTORS (from SessionLog)
// ===========================================

function extractCompletion(exercises: ExerciseLog[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      total++;
      if (set.completed) completed++;
    }
  }
  return { completed, total };
}

function extractPrCount(
  currentExercises: ExerciseLog[],
  previousExercises: ExerciseLog[] | undefined
): number {
  if (!previousExercises || previousExercises.length === 0) return 0;

  const previousBest = new Map<string, number>();
  for (const ex of previousExercises) {
    for (const set of ex.sets) {
      if (!set.completed) continue;
      const volume = getSetWeight(set) * parseReps(set.reps);
      const current = previousBest.get(ex.exerciseName) ?? 0;
      if (volume > current) previousBest.set(ex.exerciseName, volume);
    }
  }

  let prCount = 0;
  for (const ex of currentExercises) {
    const prevBest = previousBest.get(ex.exerciseName) ?? 0;
    if (prevBest === 0) continue;

    for (const set of ex.sets) {
      if (!set.completed) continue;
      const volume = getSetWeight(set) * parseReps(set.reps);
      if (volume > prevBest) {
        prCount++;
        break;
      }
    }
  }

  return prCount;
}

function extractAvgRestDiscipline(
  restDurations: Record<string, number>,
  prescribedRest: Record<number, number>
): number {
  const entries = Object.entries(restDurations);
  if (entries.length === 0) return 100;

  let totalScore = 0;
  for (const [key, actual] of entries) {
    const exerciseIndex = parseInt(key.split('-')[0], 10);
    const prescribed = prescribedRest[exerciseIndex] ?? 90;
    totalScore += calculateRestDiscipline(actual, prescribed);
  }

  return clamp(totalScore / entries.length, 0, 100);
}

function extractAvgConsistency(exercises: ExerciseLog[]): number {
  let totalScore = 0;
  let count = 0;

  for (const ex of exercises) {
    if (ex.sets.length === 0) continue;
    const targetReps = parseReps(ex.sets[0].reps);
    if (targetReps === 0) continue;

    for (const set of ex.sets) {
      if (!set.completed) continue;
      const reps = parseReps(set.reps);
      totalScore += calculateConsistency(reps, targetReps);
      count++;
    }
  }

  if (count === 0) return 0;
  return clamp(totalScore / count, 0, 100);
}

// ===========================================
// MAIN COMPUTATION
// ===========================================

/**
 * Compute the session momentum score from SessionLog data.
 * Delegates to momentumCalculus.ts for the core formula.
 */
export function computeMomentumScore(input: MomentumInput): MomentumBreakdown {
  const { session, restDurations, prescribedRest, previousSession } = input;

  const { completed, total: totalSets } = extractCompletion(session.exercises);
  const completion = totalSets === 0 ? 0 : clamp((completed / totalSets) * 100, 0, 100);
  const prCount = extractPrCount(session.exercises, previousSession?.exercises);
  const prBonus = clamp(prCount * 25, 0, 100);
  const restDiscipline = extractAvgRestDiscipline(restDurations, prescribedRest);
  const consistency = extractAvgConsistency(session.exercises);

  const total = calculateMomentum(completed, totalSets, prCount, restDiscipline, consistency);

  return {
    total,
    completion: Math.round(completion * 10) / 10,
    prBonus: Math.round(prBonus * 10) / 10,
    restDiscipline: Math.round(restDiscipline * 10) / 10,
    consistency: Math.round(consistency * 10) / 10,
  };
}
