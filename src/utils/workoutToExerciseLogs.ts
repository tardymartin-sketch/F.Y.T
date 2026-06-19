import { WorkoutRow, ExerciseLog, SetLog, SessionKey } from '../../types';

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

/** Inverse de workoutRowsToExerciseLogs : reconstruit une prescription minimale
 *  (WorkoutRow[]) à partir d'ExerciseLog[].
 *
 *  Utilisé pour relancer une séance passée ou un template par défaut : ces séances
 *  n'ont PAS de source training_plans (elles sont reconstruites depuis les logs),
 *  donc on synthétise les rows que l'active session lit pour afficher reps/séries.
 *  La clé de jointure reste `exercice === exerciseName` (cf. workoutToExerciseLogs.test).
 *
 *  Limites assumées : `repos` et `video` n'existent pas sur un ExerciseLog → ''. */
export function exerciseLogsToWorkoutRows(
  exercises: ExerciseLog[],
  sessionKey?: Partial<SessionKey>,
): WorkoutRow[] {
  return exercises.map((ex, idx) => ({
    id: idx,
    annee: sessionKey?.annee ?? '',
    moisNom: '',
    moisNum: sessionKey?.moisNum ?? '',
    semaine: sessionKey?.semaine ?? '',
    seance: sessionKey?.seance ?? '',
    ordre: idx + 1,
    exercice: ex.exerciseName,
    exerciseId: ex.exerciseId,
    series: ex.sets.length > 0 ? String(ex.sets.length) : '',
    repsDuree: ex.sets[0]?.reps ?? '',
    repos: '',          // indisponible depuis un ExerciseLog
    tempoRpe: '',
    notes: ex.notes ?? '',
    video: '',          // indisponible depuis un ExerciseLog
    executionMode: ex.executionMode ?? 'straight',
    executionGroupId: ex.executionGroupId,
    executionGroupPosition: ex.executionGroupPosition,
  }));
}
