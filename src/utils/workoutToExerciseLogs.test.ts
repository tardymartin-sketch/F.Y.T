import { describe, it, expect } from 'vitest';
import { workoutRowsToExerciseLogs } from './workoutToExerciseLogs';
import { WorkoutRow } from '../../types';

function makeRow(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: 1,
    annee: '2026',
    moisNom: 'janvier',
    moisNum: '1',
    semaine: '1',
    seance: 'Push A',
    ordre: 1,
    exercice: 'Bench Press',
    exerciseId: 'uuid-bench',
    series: '3',
    repsDuree: '8',
    repos: '90',
    tempoRpe: '',
    notes: '',
    video: '',
    executionMode: 'straight',
    ...overrides,
  };
}

describe('workoutRowsToExerciseLogs', () => {
  it('returns [] for empty input', () => {
    expect(workoutRowsToExerciseLogs([])).toEqual([]);
  });

  it('maps all fields correctly for nominal case', () => {
    const logs = workoutRowsToExerciseLogs([makeRow()]);
    expect(logs).toHaveLength(1);
    const log = logs[0];
    expect(log.exerciseName).toBe('Bench Press');
    expect(log.exerciseId).toBe('uuid-bench');
    expect(log.sets).toHaveLength(3);
    expect(log.sets[0]).toEqual({ setNumber: 1, reps: '8', weight: '', completed: false });
    expect(log.sets[2].setNumber).toBe(3);
    expect(log.executionMode).toBe('straight');
  });

  it('falls back to 1 set when series is not a valid integer', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ series: 'abc' })]);
    expect(logs[0].sets).toHaveLength(1);
  });

  it('falls back to 1 set when series is empty string', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ series: '' })]);
    expect(logs[0].sets).toHaveLength(1);
  });

  it('maps null/empty repsDuree to empty string (no crash)', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ repsDuree: '' })]);
    expect(logs[0].sets[0].reps).toBe('');
  });

  it('maps undefined executionMode to straight', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ executionMode: undefined })]);
    expect(logs[0].executionMode).toBe('straight');
  });

  it('filters out text block rows', () => {
    const rows = [
      makeRow({ isTextBlock: true }),
      makeRow({ exercice: 'Squat', isTextBlock: false }),
    ];
    const logs = workoutRowsToExerciseLogs(rows);
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseName).toBe('Squat');
  });

  it('maps notes when present', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ notes: 'Tempo 3-1-2' })]);
    expect(logs[0].notes).toBe('Tempo 3-1-2');
  });

  it('omits notes when empty', () => {
    const logs = workoutRowsToExerciseLogs([makeRow({ notes: '' })]);
    expect(logs[0].notes).toBeUndefined();
  });
});

// ─── Regression: program-launch → active-session metadata join ────────────────
// Bug: launching a séance from "Mon programme" showed "?" for reps and hid the
// vidéo + repos in the active session. Root cause: the WorkoutRow[] prescription
// was dropped at launch (setActiveSession([], ...)), so the active session's
// lookup `sessionData.find(d => d.exercice === ex.exerciseName)` never matched.
// The fix threads session.rows through as sessionData. These tests lock the join
// key: the converter's exerciseName MUST equal the source row's `exercice`, and
// the rows must still carry reps/repos/video for the lookup to recover them.
describe('program-launch metadata join (active session)', () => {
  // Mirror of the lookup ActiveSessionMobile performs against sessionData.
  const findMeta = (rows: WorkoutRow[], exerciseName: string) =>
    rows.find(d => d.exercice === exerciseName);

  it('every converted exercise resolves its source row by name', () => {
    const rows = [
      makeRow({ exercice: 'Bench Press', repsDuree: '8-12', repos: '90', video: 'https://youtu.be/abc' }),
      makeRow({ exercice: 'Squat', repsDuree: '5', repos: '120', video: '' }),
      makeRow({ exercice: 'Coach note', isTextBlock: true }),
    ];
    const logs = workoutRowsToExerciseLogs(rows);

    for (const log of logs) {
      expect(findMeta(rows, log.exerciseName)).toBeDefined();
    }
  });

  it('recovers reps / repos / video from the threaded rows', () => {
    const rows = [
      makeRow({ exercice: 'Bench Press', repsDuree: '8-12', repos: '90', video: 'https://youtu.be/abc' }),
    ];
    const log = workoutRowsToExerciseLogs(rows)[0];
    const meta = findMeta(rows, log.exerciseName);

    expect(meta?.repsDuree).toBe('8-12'); // was "?" when rows were dropped
    expect(meta?.repos).toBe('90');       // rest time, previously hidden
    expect(meta?.video).toBe('https://youtu.be/abc'); // camera icon source
  });
});
