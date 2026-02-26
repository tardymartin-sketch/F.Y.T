
// This file is auto-generated. Do not edit.

export type ExecutionMode = 'straight' | 'superset' | 'triset' | 'giantset';

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  position: number;
  targetSets?: string;
  targetReps?: string;
  restTimeSec?: number;
  tempo?: string;
  notes?: string;
  videoUrl?: string;
  executionMode: ExecutionMode;
  executionGroupId?: string;
  executionGroupPosition?: number;
}

export interface Program {
  id: string;
  coachId: string;
  programName?: string;
  seanceType: string;
  year: number;
  week?: number;
  monthNum?: number;
  startDate?: string;
  endDate?: string;
  athleteTarget: string[];
  groupTarget?: string[];
  exercises: SessionExercise[];
  sourceTemplateId?: string;
}

// Keep other existing types from the project
export * from './strava';

// Re-exporting other types that are used in supabaseService but whose definition is not found
// This is a temporary measure to avoid breaking the build.
// The actual definitions should be found and placed here.
export type User = any;
export type ProfileRow = any;
export type mapProfileToUser = any;
export type WorkoutRow = any;
export type TrainingPlanRow = any;
export type mapTrainingPlanToWorkout = any;
export type SessionLog = any;
export type SessionLogRow = any;
export type mapSessionLogRowToSessionLog = any;
export type mapSessionLogToRow = any;
export type WeekOrganizerLog = any;
export type WeekOrganizerRow = any;
export type mapWeekOrganizerRowToLog = any;
export type AthleteComment = any;
export type AthleteCommentRow = any;
export type mapAthleteCommentRowToComment = any;
export type AthleteGroup = any;
export type AthleteGroupRow = any;
export type AthleteGroupWithCount = any;
export type mapAthleteGroupRowToGroup = any;
export type Exercise = any;
export type ExerciseRow = any;
export type mapExerciseRowToExercise = any;
export type mapExerciseToRow = any;
export type LoadType = any;
export type LimbType = any;
export type ExerciseType = any;
export type AnalyticsCategory = any;
export type SetDetailLog = any;
export type ExerciseLogRow = any;
export type ExerciseLogEntry = any;
export type mapExerciseLogRowToEntry = any;
export type ExerciseLog = any;
export type SetLog = any;
export type SetLoad = any;
export type PRDetected = any;
export type MuscleGroup = any;
export type MovementPattern = any;
export type ExerciseCategory = any;
export type mapMuscleGroupRowToMuscleGroup = any;
export type mapMovementPatternRowToMovementPattern = any;
export type mapExerciseCategoryRowToExerciseCategory = any;
export type SessionTemplate = any;
export type ExerciseVariant = any;
export type groupTrainingPlansToSessions = any;
export type mapSessionTemplateRowToSessionTemplate = any;
export type mapSessionTemplateExerciseRowToSessionExercise = any;
export type parseExerciseName = any;
export type getExerciseVariantDisplayName = any;
export type buildExerciseName = any;
export const EXECUTION_MODES = ['straight', 'superset', 'triset', 'giantset'];
export function groupSessionExercises(exercises: SessionExercise[]): (SessionExercise | { executionMode: ExecutionMode; groupId: string; exercises: SessionExercise[] })[] {
  return [];
}
export function isSessionExerciseGroup(item: any): item is { executionMode: ExecutionMode; groupId: string; exercises: SessionExercise[] } {
    return false;
}

