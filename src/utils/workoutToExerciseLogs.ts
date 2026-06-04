import { WorkoutRow, ExerciseLog, SetLog } from '../../types';

/** Convertit des rows training_plans (WorkoutRow[]) en ExerciseLog[] prêts pour onStartNewSession.
 *  Champs diffés contre supabaseService.ts:3783 (createProgram) pour exhaustivité. */
export function workoutRowsToExerciseLogs(rows: WorkoutRow[]): ExerciseLog[] {
  return rows
    .filter(row => !row.isTextBlock)
    .map(row => {
      const numSets = parseInt(row.series, 10);
      const setCount = Number.isFinite(numSets) && numSets > 0 ? numSets : 1;

      const sets: SetLog[] = Array.from({ length: setCount }, (_, i) => ({
        setNumber: i + 1,
        reps: row.repsDuree || '',
        weight: '',
        completed: false,
      }));

      const log: ExerciseLog = {
        exerciseId: row.exerciseId,
        exerciseName: row.exercice,
        sets,
        executionMode: row.executionMode ?? 'straight',
        executionGroupId: row.executionGroupId,
        executionGroupPosition: row.executionGroupPosition,
        notes: row.notes || undefined,
      };

      return log;
    });
}
