import { describe, it, expect } from 'vitest';
import { computeMomentumScore, getLoadWeightKg, MomentumInput } from './momentum';
import type { SessionLog, ExerciseLog } from '../../types';

// ===========================================
// HELPERS: build test data
// ===========================================

function makeSet(reps: string, weight: string, completed: boolean) {
  return { setNumber: 1, reps, weight, completed };
}

function makeSetWithLoad(
  reps: string,
  load: { type: 'single'; unit: 'kg'; weightKg: number },
  completed: boolean
) {
  return { setNumber: 1, reps, weight: '', load, completed };
}

function makeExercise(name: string, sets: ReturnType<typeof makeSet>[]): ExerciseLog {
  return { exerciseName: name, sets };
}

function makeSession(exercises: ExerciseLog[]): SessionLog {
  return {
    id: 'test-session',
    date: '2026-03-31',
    sessionKey: { annee: '2026', moisNum: '3', semaine: '14', seance: 'Test' },
    exercises,
  };
}

function makeInput(overrides: Partial<MomentumInput> = {}): MomentumInput {
  return {
    session: makeSession([]),
    restDurations: {},
    prescribedRest: {},
    previousSession: null,
    ...overrides,
  };
}

// ===========================================
// TESTS
// ===========================================

describe('computeMomentumScore', () => {
  it('returns 0 for empty session', () => {
    const result = computeMomentumScore(makeInput());
    expect(result.total).toBe(0);
    expect(result.completion).toBe(0);
    expect(result.prBonus).toBe(0);
    expect(result.consistency).toBe(0);
  });

  it('returns full completion for all sets completed', () => {
    const session = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '80', true),
        makeSet('10', '80', true),
        makeSet('10', '80', true),
      ]),
    ]);
    const result = computeMomentumScore(makeInput({ session }));
    expect(result.completion).toBe(100);
  });

  it('returns partial completion', () => {
    const session = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '80', true),
        makeSet('10', '80', false),
        makeSet('10', '80', true),
        makeSet('10', '80', false),
      ]),
    ]);
    const result = computeMomentumScore(makeInput({ session }));
    expect(result.completion).toBe(50);
  });

  it('detects PRs when current volume exceeds previous', () => {
    const previousSession = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '80', true), // volume = 800
      ]),
    ]);
    const session = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '85', true), // volume = 850 > 800 = PR!
      ]),
    ]);
    const result = computeMomentumScore(
      makeInput({ session, previousSession })
    );
    expect(result.prBonus).toBe(25); // 1 PR = 25 points
  });

  it('caps PR bonus at 100 (4+ PRs)', () => {
    const previousSession = makeSession([
      makeExercise('A', [makeSet('10', '50', true)]),
      makeExercise('B', [makeSet('10', '50', true)]),
      makeExercise('C', [makeSet('10', '50', true)]),
      makeExercise('D', [makeSet('10', '50', true)]),
      makeExercise('E', [makeSet('10', '50', true)]),
    ]);
    const session = makeSession([
      makeExercise('A', [makeSet('10', '60', true)]),
      makeExercise('B', [makeSet('10', '60', true)]),
      makeExercise('C', [makeSet('10', '60', true)]),
      makeExercise('D', [makeSet('10', '60', true)]),
      makeExercise('E', [makeSet('10', '60', true)]),
    ]);
    const result = computeMomentumScore(
      makeInput({ session, previousSession })
    );
    expect(result.prBonus).toBe(100);
  });

  it('returns 0 PR bonus when no previous session', () => {
    const session = makeSession([
      makeExercise('Bench Press', [makeSet('10', '100', true)]),
    ]);
    const result = computeMomentumScore(makeInput({ session }));
    expect(result.prBonus).toBe(0);
  });

  it('computes rest discipline from rest durations', () => {
    const session = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '80', true),
        makeSet('10', '80', true),
      ]),
    ]);
    // Prescribed: 90s. Actual: 85s (within ±10) and 150s (60s over = 0)
    const result = computeMomentumScore(
      makeInput({
        session,
        restDurations: { '0-0': 85, '0-1': 150 },
        prescribedRest: { 0: 90 },
      })
    );
    // First rest: 85 vs 90 = diff 5 → 100
    // Second rest: 150 vs 90 = diff 60 → 0
    // Average = 50
    expect(result.restDiscipline).toBe(50);
  });

  it('defaults to 100 rest discipline when no rest data', () => {
    const session = makeSession([
      makeExercise('Bench Press', [makeSet('10', '80', true)]),
    ]);
    const result = computeMomentumScore(makeInput({ session }));
    expect(result.restDiscipline).toBe(100);
  });

  it('computes consistency based on reps vs target', () => {
    const session = makeSession([
      makeExercise('Bench Press', [
        makeSet('10', '80', true), // target = 10
        makeSet('10', '80', true), // diff 0 → 100
        makeSet('8', '80', true),  // diff 2 → 70
      ]),
    ]);
    const result = computeMomentumScore(makeInput({ session }));
    // Average: (100 + 100 + 70) / 3 = 90
    expect(result.consistency).toBe(90);
  });

  it('matches design doc example', () => {
    // 4 exercises, 4 sets each (16 total). 12 completed, 1 PR, rest ~80, consistency ~90
    const exercises: ExerciseLog[] = [];
    for (let i = 0; i < 4; i++) {
      const sets = [];
      for (let j = 0; j < 4; j++) {
        // First 3 exercises: all 4 sets completed. 4th exercise: 0 completed.
        // That gives us 12/16 = 75% completion
        const completed = i < 3;
        sets.push(makeSet('10', '80', completed));
      }
      exercises.push(makeExercise(`Ex${i}`, sets));
    }
    const session = makeSession(exercises);

    // Previous session for PR detection (1 PR on Ex0)
    const prevExercises = [
      makeExercise('Ex0', [makeSet('10', '75', true)]), // 750 < 800 = PR
      makeExercise('Ex1', [makeSet('10', '80', true)]), // same = no PR
      makeExercise('Ex2', [makeSet('10', '80', true)]),
      makeExercise('Ex3', [makeSet('10', '80', true)]),
    ];
    const previousSession = makeSession(prevExercises);

    const result = computeMomentumScore(
      makeInput({ session, previousSession, restDurations: {}, prescribedRest: {} })
    );

    expect(result.completion).toBe(75);
    expect(result.prBonus).toBe(25);
    // Rest discipline = 100 (no data), consistency = 100 (all reps match target)
    // total = (0.5*75) + (0.2*25) + (0.15*100) + (0.15*100) = 37.5+5+15+15 = 72.5 → rounds to 73
    expect(result.total).toBe(73);
  });
});

describe('getLoadWeightKg', () => {
  it('returns null for undefined load', () => {
    expect(getLoadWeightKg(undefined)).toBeNull();
  });

  it('handles single load', () => {
    expect(getLoadWeightKg({ type: 'single', unit: 'kg', weightKg: 20 })).toBe(20);
  });

  it('handles double load (doubles the weight)', () => {
    expect(getLoadWeightKg({ type: 'double', unit: 'kg', weightKg: 12 })).toBe(24);
  });

  it('handles barbell load (bar + added)', () => {
    expect(getLoadWeightKg({ type: 'barbell', unit: 'kg', barKg: 20, addedKg: 60 })).toBe(80);
  });

  it('handles machine load', () => {
    expect(getLoadWeightKg({ type: 'machine', unit: 'kg', weightKg: 50 })).toBe(50);
  });

  it('handles assisted load (negative)', () => {
    expect(getLoadWeightKg({ type: 'assisted', unit: 'kg', assistanceKg: 30 })).toBe(-30);
  });

  it('returns null for distance load', () => {
    expect(getLoadWeightKg({ type: 'distance', unit: 'cm', distanceValue: 100 })).toBeNull();
  });
});
