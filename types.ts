// ===========================================
// F.Y.T - TYPES COMPLET (V3 avec Messages & Badges)
// types.ts
// ===========================================

// ===========================================
// TYPES UTILISATEURS
// ===========================================
export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'coach' | 'athlete';
  secondaryRoles?: UserRole[];
  coachId?: string;
  email?: string;
  weight?: number;
}

// Type pour le mode actif (stocké dans localStorage)
export type ActiveMode = 'athlete' | 'coach' | 'admin';

export type UserRole = 'admin' | 'coach' | 'athlete';

// Type brut depuis Supabase profiles (snake_case)
export interface ProfileRow {
  id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  secondary_roles: string[] | null;
  coach_id: string | null;
  weight: number | null;
  created_at: string;
}

// Mapping Profile DB -> User App
export function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username ?? row.email ?? 'unknown',
    email: row.email ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    role: (row.role as UserRole) ?? 'athlete',
    secondaryRoles: (row.secondary_roles as UserRole[]) ?? [],
    coachId: row.coach_id ?? undefined,
    weight: row.weight ?? undefined,
  };
}

// ===========================================
// HELPERS MULTI-RÔLES
// ===========================================

/**
 * Vérifie si un utilisateur peut accéder au mode coach/admin
 */
export function canAccessCoachMode(user: User): boolean {
  return (
    user.role === 'coach' ||
    user.role === 'admin' ||
    user.secondaryRoles?.includes('coach') ||
    user.secondaryRoles?.includes('admin') ||
    false
  );
}

/**
 * Vérifie si un utilisateur peut accéder au mode athlète
 */
export function canAccessAthleteMode(user: User): boolean {
  return (
    user.role === 'athlete' ||
    user.secondaryRoles?.includes('athlete') ||
    false
  );
}

/**
 * Retourne tous les modes disponibles pour un utilisateur
 */
export function getAvailableModes(user: User): ActiveMode[] {
  const modes: ActiveMode[] = [];
  
  // Mode principal toujours disponible
  modes.push(user.role);
  
  // Modes secondaires
  if (user.secondaryRoles) {
    user.secondaryRoles.forEach(role => {
      if (!modes.includes(role)) {
        modes.push(role);
      }
    });
  }
  
  return modes;
}

// ===========================================
// TYPES ENTRAINEMENT - Supabase training_plans
// ===========================================

// Type brut depuis Supabase (snake_case, nullable)
export interface TrainingPlanRow {
  id: number;
  year: number | null;
  week: number | null;
  seance_type: string | null;
  exercise_name: string | null;      // Conservé pour compatibilité
  exercise_id: string;               // FK vers exercises.id (NOT NULL)
  order_index: number | null;
  target_sets: string | null;
  target_reps: string | null;
  rest_time_sec: number | null;
  video_url: string | null;
  Month: string | null;
  Month_num: number | null;
  Tempo: string | null;
  "Notes/Consignes": string | null;
  week_start_date: string | null;
  week_end_date: string | null;
  coach_id: string | null;           // UUID du coach (NULL = global)
  athlete_target: string[] | null;   // Liste d'UUIDs athlètes ciblés (NULL = tous)
  // Champs mode d'exécution (superset, triset, etc.)
  execution_mode: string | null;     // 'straight' | 'superset' | 'triset' | etc.
  execution_group_id: string | null; // UUID partagé par les exercices d'un groupe
  execution_group_position: number | null; // Position dans le groupe (0, 1, 2...)
}

// Type utilisé dans l'application (camelCase, valeurs par défaut)
export interface WorkoutRow {
  id: number;
  annee: string;
  moisNom: string;
  moisNum: string;
  semaine: string;
  seance: string;
  ordre: number;
  exercice: string;            // Nom de l'exercice (conservé pour compatibilité)
  exerciseId?: string;         // UUID de l'exercice (undefined = fallback/legacy)
  series: string;
  repsDuree: string;
  repos: string;
  tempoRpe: string;
  notes: string;
  video: string;
  weekStartDate?: string;
  weekEndDate?: string;
  coachId?: string;           // UUID du coach (undefined = global)
  athleteTarget?: string[];   // Liste d'UUIDs athlètes ciblés (undefined = tous)
  // Champs mode d'exécution (superset, triset, etc.)
  executionMode?: ExecutionMode;       // Défaut: 'straight'
  executionGroupId?: string;           // UUID partagé par les exercices d'un groupe
  executionGroupPosition?: number;     // Position dans le groupe (0, 1, 2...)
}

// Alias pour compatibilité
export type WorkoutRowFull = WorkoutRow;

// Mapping Training Plan DB -> WorkoutRow App
export function mapTrainingPlanToWorkout(row: TrainingPlanRow): WorkoutRow {
  return {
    id: row.id,
    annee: row.year?.toString() ?? '',
    moisNom: row.Month ?? '',
    moisNum: row.Month_num?.toString() ?? '',
    semaine: row.week?.toString() ?? '',
    seance: row.seance_type ?? '',
    ordre: row.order_index ?? 0,
    exercice: row.exercise_name ?? '',
    exerciseId: row.exercise_id,
    series: row.target_sets ?? '',
    repsDuree: row.target_reps ?? '',
    repos: row.rest_time_sec?.toString() ?? '',
    tempoRpe: row.Tempo ?? '',
    notes: row["Notes/Consignes"] ?? '',
    video: row.video_url ?? '',
    weekStartDate: row.week_start_date ?? undefined,
    weekEndDate: row.week_end_date ?? undefined,
    coachId: row.coach_id ?? undefined,
    athleteTarget: row.athlete_target ?? undefined,
    // Champs mode d'exécution
    executionMode: (row.execution_mode as ExecutionMode) ?? 'straight',
    executionGroupId: row.execution_group_id ?? undefined,
    executionGroupPosition: row.execution_group_position ?? undefined,
  };
}

// ===========================================
// TYPES EXERCICES - Supabase exercises
// ===========================================

// Type brut depuis Supabase (snake_case, nullable)
export interface ExerciseRow {
  id: string;                      // UUID
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  coach_instructions: string | null;
  tempo: string | null;
  coach_id: string | null;
  limb_type: 'bilateral' | 'unilateral' | 'asymmetrical' | null;
  primary_muscle_group_id: string | null;
  movement_pattern_id: string | null;
  category_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Type utilisé dans l'application (camelCase)
export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  videoUrl?: string;
  coachInstructions?: string;
  tempo?: string;
  coachId?: string;
  limbType?: 'bilateral' | 'unilateral' | 'asymmetrical';
  primaryMuscleGroupId?: string;
  movementPatternId?: string;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Mapping Exercise DB -> Exercise App
export function mapExerciseRowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group ?? undefined,
    videoUrl: row.video_url ?? undefined,
    coachInstructions: row.coach_instructions ?? undefined,
    tempo: row.tempo ?? undefined,
    coachId: row.coach_id ?? undefined,
    limbType: row.limb_type ?? undefined,
    primaryMuscleGroupId: row.primary_muscle_group_id ?? undefined,
    movementPatternId: row.movement_pattern_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

// Mapping Exercise App -> Exercise DB (pour insert/update)
export function mapExerciseToRow(exercise: Partial<Exercise>): Partial<ExerciseRow> {
  return {
    ...(exercise.id && { id: exercise.id }),
    ...(exercise.name && { name: exercise.name }),
    ...(exercise.muscleGroup !== undefined && { muscle_group: exercise.muscleGroup || null }),
    ...(exercise.videoUrl !== undefined && { video_url: exercise.videoUrl || null }),
    ...(exercise.coachInstructions !== undefined && { coach_instructions: exercise.coachInstructions || null }),
    ...(exercise.tempo !== undefined && { tempo: exercise.tempo || null }),
    ...(exercise.coachId !== undefined && { coach_id: exercise.coachId || null }),
    ...(exercise.limbType !== undefined && { limb_type: exercise.limbType || null }),
    ...(exercise.primaryMuscleGroupId !== undefined && { primary_muscle_group_id: exercise.primaryMuscleGroupId || null }),
    ...(exercise.movementPatternId !== undefined && { movement_pattern_id: exercise.movementPatternId || null }),
    ...(exercise.categoryId !== undefined && { category_id: exercise.categoryId || null }),
  };
}

// ===========================================
// TYPES MODE D'EXÉCUTION (Superset, Triset, etc.)
// ===========================================

/**
 * Mode d'exécution d'un exercice ou groupe d'exercices
 * - 'straight': Mode classique, exercice individuel avec repos entre les séries
 * - 'superset': 2 exercices enchaînés sans repos entre eux
 * - 'triset': 3 exercices enchaînés sans repos (futur)
 * - 'giant_set': 4+ exercices enchaînés sans repos (futur)
 * - 'pre_fatigue': Variante superset - isolation avant composé (futur)
 * - 'post_fatigue': Variante superset - composé avant isolation (futur)
 */
export type ExecutionMode =
  | 'straight'
  | 'superset'
  | 'triset'
  | 'giant_set'
  | 'pre_fatigue'
  | 'post_fatigue';

/**
 * Métadonnées des modes d'exécution
 */
export const EXECUTION_MODES: Record<ExecutionMode, {
  label: string;
  labelShort: string;
  description: string;
  exerciseCount: number | null; // null = illimité (giant set)
  icon: string; // Nom de l'icône lucide-react
}> = {
  straight: {
    label: 'Séries classiques',
    labelShort: 'Classique',
    description: 'Exercice individuel avec repos entre les séries',
    exerciseCount: 1,
    icon: 'Dumbbell'
  },
  superset: {
    label: 'Superset',
    labelShort: 'Superset',
    description: '2 exercices enchaînés sans repos entre eux, repos uniquement après les 2',
    exerciseCount: 2,
    icon: 'Link2'
  },
  triset: {
    label: 'Triset',
    labelShort: 'Triset',
    description: '3 exercices enchaînés sans repos entre eux',
    exerciseCount: 3,
    icon: 'Link2'
  },
  giant_set: {
    label: 'Giant Set',
    labelShort: 'Giant',
    description: '4+ exercices enchaînés sans repos entre eux',
    exerciseCount: null,
    icon: 'Layers'
  },
  pre_fatigue: {
    label: 'Pré-fatigue',
    labelShort: 'Pré-fat',
    description: 'Exercice d\'isolation suivi d\'un exercice composé du même muscle',
    exerciseCount: 2,
    icon: 'ArrowDownCircle'
  },
  post_fatigue: {
    label: 'Post-fatigue',
    labelShort: 'Post-fat',
    description: 'Exercice composé suivi d\'un exercice d\'isolation pour finition',
    exerciseCount: 2,
    icon: 'ArrowUpCircle'
  }
};

/**
 * Vérifie si un mode d'exécution est un "compound set" (plusieurs exercices liés)
 */
export function isCompoundSetMode(mode: ExecutionMode | undefined): boolean {
  return mode !== undefined && mode !== 'straight';
}

/**
 * Retourne le nombre d'exercices attendus pour un mode d'exécution
 */
export function getExpectedExerciseCount(mode: ExecutionMode): number | null {
  return EXECUTION_MODES[mode].exerciseCount;
}

/**
 * Groupe d'exercices pour affichage (superset/triset)
 * Utilisé uniquement côté affichage, pas stocké en DB
 */
export interface ExerciseLogGroup {
  /** ID du groupe (= executionGroupId des exercices) */
  groupId: string;

  /** Mode d'exécution */
  executionMode: ExecutionMode;

  /** Exercices du groupe, ordonnés par executionGroupPosition */
  exercises: ExerciseLog[];

  /** RPE moyen du groupe (calculé) */
  avgRpe?: number;
}

/**
 * Helper: Regroupe les ExerciseLog par executionGroupId
 * Les exercices sans groupe ou en mode 'straight' restent individuels
 */
export function groupExerciseLogs(exercises: ExerciseLog[]): (ExerciseLog | ExerciseLogGroup)[] {
  const result: (ExerciseLog | ExerciseLogGroup)[] = [];
  const grouped = new Map<string, ExerciseLog[]>();
  const processedGroupIds = new Set<string>();

  // Grouper les exercices par executionGroupId
  exercises.forEach(ex => {
    const mode = ex.executionMode ?? 'straight';
    if (ex.executionGroupId && mode !== 'straight') {
      if (!grouped.has(ex.executionGroupId)) {
        grouped.set(ex.executionGroupId, []);
      }
      grouped.get(ex.executionGroupId)!.push(ex);
    }
  });

  // Reconstruire l'ordre original
  exercises.forEach(ex => {
    const mode = ex.executionMode ?? 'straight';

    if (ex.executionGroupId && mode !== 'straight') {
      // Premier exercice du groupe rencontré: ajouter le groupe entier
      if (!processedGroupIds.has(ex.executionGroupId)) {
        const groupExercises = grouped.get(ex.executionGroupId)!;
        groupExercises.sort((a, b) => (a.executionGroupPosition ?? 0) - (b.executionGroupPosition ?? 0));

        const rpes = groupExercises.map(e => e.rpe).filter((r): r is number => typeof r === 'number');
        const avgRpe = rpes.length > 0 ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : undefined;

        result.push({
          groupId: ex.executionGroupId,
          executionMode: mode,
          exercises: groupExercises,
          avgRpe
        });

        processedGroupIds.add(ex.executionGroupId);
      }
    } else {
      // Exercice individuel (straight ou sans groupe)
      result.push(ex);
    }
  });

  return result;
}

/**
 * Type guard: est-ce un groupe d'exercices?
 */
export function isExerciseLogGroup(item: ExerciseLog | ExerciseLogGroup): item is ExerciseLogGroup {
  return 'groupId' in item && 'exercises' in item && Array.isArray((item as ExerciseLogGroup).exercises);
}

/**
 * Groupe d'exercices pour templates de séances (superset/triset)
 */
export interface SessionExerciseGroup {
  /** ID du groupe (= executionGroupId des exercices) */
  groupId: string;

  /** Mode d'exécution */
  executionMode: ExecutionMode;

  /** Exercices du groupe, ordonnés par executionGroupPosition */
  exercises: SessionExercise[];
}

/**
 * Helper: Regroupe les SessionExercise par executionGroupId
 */
export function groupSessionExercises(exercises: SessionExercise[]): (SessionExercise | SessionExerciseGroup)[] {
  const result: (SessionExercise | SessionExerciseGroup)[] = [];
  const grouped = new Map<string, SessionExercise[]>();
  const processedGroupIds = new Set<string>();

  // Grouper les exercices par executionGroupId
  exercises.forEach(ex => {
    const mode = ex.executionMode ?? 'straight';
    if (ex.executionGroupId && mode !== 'straight') {
      if (!grouped.has(ex.executionGroupId)) {
        grouped.set(ex.executionGroupId, []);
      }
      grouped.get(ex.executionGroupId)!.push(ex);
    }
  });

  // Reconstruire l'ordre original (basé sur position du premier exercice du groupe)
  exercises.forEach(ex => {
    const mode = ex.executionMode ?? 'straight';

    if (ex.executionGroupId && mode !== 'straight') {
      if (!processedGroupIds.has(ex.executionGroupId)) {
        const groupExercises = grouped.get(ex.executionGroupId)!;
        groupExercises.sort((a, b) => (a.executionGroupPosition ?? 0) - (b.executionGroupPosition ?? 0));

        result.push({
          groupId: ex.executionGroupId,
          executionMode: mode,
          exercises: groupExercises
        });

        processedGroupIds.add(ex.executionGroupId);
      }
    } else {
      result.push(ex);
    }
  });

  return result;
}

/**
 * Type guard: est-ce un groupe de SessionExercise?
 */
export function isSessionExerciseGroup(item: SessionExercise | SessionExerciseGroup): item is SessionExerciseGroup {
  return 'groupId' in item && 'exercises' in item && Array.isArray((item as SessionExerciseGroup).exercises);
}

// ===========================================
// TYPES FILTRES (SessionSelector)
// ===========================================
export interface FilterState {
  selectedAnnee: string | null;
  selectedMois: string | null;
  selectedSemaine: string | null;
  selectedSeances: string[];
}

// ===========================================
// TYPES HISTORIQUE & LOGS (avec RPE)
// ===========================================

export type LoadUnit = 'kg' | 'cm' | 'm';

export type SetLoad =
  | {
      type: 'single';
      unit: 'kg';
      weightKg: number | null;
    }
  | {
      type: 'double';
      unit: 'kg';
      weightKg: number | null;
    }
  | {
      type: 'barbell';
      unit: 'kg';
      barKg: number;
      addedKg: number | null;
    }
  | {
      type: 'machine';
      unit: 'kg';
      weightKg: number | null;
    }
  | {
      type: 'assisted';
      unit: 'kg';
      assistanceKg: number | null;  // Poids d'assistance (valeur positive)
    }
  | {
      type: 'distance';
      unit: 'cm' | 'm';
      distanceValue: number | null;  // Distance en cm ou m
    };

export interface SetLog {
  setNumber: number;
  reps: string;
  weight: string;
  load?: SetLoad;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId?: string;        // ID de l'exercice dans la table exercises
  exerciseName: string;
  originalSession?: string;
  sets: SetLog[];
  notes?: string;
  rpe?: number;
  // Mode d'exécution (superset, triset, etc.)
  executionMode?: ExecutionMode;        // Défaut: 'straight'
  executionGroupId?: string;            // UUID partagé par les exos d'un superset
  executionGroupPosition?: number;      // 0 = premier, 1 = second, etc.
}

export interface SessionKey {
  annee: string;
  moisNum: string;
  semaine: string;
  seance: string;
}

// Type utilisé dans l'application
export interface SessionLog {
  id: string;
  userId?: string;
  athleteName?: string;
  date: string;
  durationMinutes?: number;
  sessionKey: SessionKey;
  exercises: ExerciseLog[];
  comments?: string;
  sessionRpe?: number;
}

// Type brut depuis Supabase session_logs
export interface SessionLogRow {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number | null;
  session_key_year: number | null;
  session_key_week: number | null;
  session_key_name: string | null;
  exercises: ExerciseLog[] | null;
  comments: string | null;
  created_at: string;
  session_rpe: number | null;
  seance_type?: string | null;
}

// Mapping SessionLog DB -> App
export function mapSessionLogRowToSessionLog(row: SessionLogRow): SessionLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    durationMinutes: row.duration_minutes ?? undefined,
    sessionKey: {
      annee: row.session_key_year?.toString() ?? '',
      moisNum: '',
      semaine: row.session_key_week?.toString() ?? '',
      seance: row.session_key_name ?? '',
    },
    exercises: row.exercises ?? [],
    comments: row.comments ?? undefined,
    sessionRpe: row.session_rpe ?? undefined,
  };
}

// Mapping SessionLog App -> DB (pour insert/update)
// Note: completed_at n'existe pas dans la table Supabase, on ne l'inclut pas
export function mapSessionLogToRow(log: SessionLog, userId: string): Omit<SessionLogRow, 'created_at' | 'seance_type'> {
  // Valider les valeurs numériques pour éviter NaN
  const keyYear = log.sessionKey.annee ? parseInt(log.sessionKey.annee) : null;
  const keyWeek = log.sessionKey.semaine ? parseInt(log.sessionKey.semaine) : null;

  return {
    id: log.id,
    user_id: userId,
    date: log.date,
    duration_minutes: log.durationMinutes ?? null,
    session_key_year: isNaN(keyYear as number) ? null : keyYear,
    session_key_week: isNaN(keyWeek as number) ? null : keyWeek,
    session_key_name: log.sessionKey.seance || null,
    exercises: log.exercises,
    comments: log.comments ?? null,
    session_rpe: log.sessionRpe ?? null,
  };
}

// ===========================================
// EXERCISE LOGS (Analytics)
// ===========================================

// Type de charge pour filtrage analytics
export type LoadType = 'numeric' | 'additive' | 'bodyweight' | 'assisted';

// Type de mouvement (latéralité)
export type LimbType = 'bilateral' | 'unilateral' | 'asymmetrical';

// Catégories analytics pour Radar Chart
export type AnalyticsCategory = 'push' | 'pull' | 'legs_squat' | 'legs_hinge' | 'core' | 'arms' | 'other';

// Type d'exercice (reps vs temps)
export type ExerciseType = 'reps' | 'time' | 'distance';

// Détail d'une série enrichi avec loadType et exerciseType
// Inclut les données brutes saisies par l'athlète (load) pour reconstruction exacte
export interface SetDetailLog {
  setNumber: number;
  reps: string;
  weight: string;
  loadType: LoadType;
  exerciseType?: ExerciseType;
  completed: boolean;
  // Données brutes du type d'équipement (Haltère, Barre, Machine, etc.)
  load?: SetLoad;
}

// Type brut depuis Supabase exercise_logs
export interface ExerciseLogRow {
  id: string;
  session_log_id: string;
  user_id: string;
  exercise_id: string | null;
  exercise_name: string;
  date: string;
  year: number;
  week: number;
  session_name: string | null;
  exercise_order: number;  // Ordre de l'exercice dans la séance (1-based)
  exercise_type: ExerciseType;  // 'reps' ou 'time'
  load_type: LoadType;  // Type majoritaire
  limb_type: LimbType;
  muscle_group_id: string | null;
  muscle_group_name: string | null;
  movement_pattern_id: string | null;
  movement_pattern_name: string | null;
  analytics_category: string | null;  // 'push', 'pull', etc.
  sets_count: number;
  total_reps: number;  // Reps ou secondes selon exercise_type
  max_weight: number | null;
  avg_weight: number | null;
  total_volume: number | null;
  estimated_1rm: number | null;  // 1RM estimé via formule Epley
  rpe: number | null;
  sets_detail: SetDetailLog[] | null;  // Enrichi avec loadType et exerciseType par set
  notes: string | null;
  created_at: string;
  // Champs superset
  execution_mode: string | null;
  execution_group_id: string | null;
  execution_group_position: number | null;
}

// Type utilisé dans l'application
export interface ExerciseLogEntry {
  id: string;
  sessionLogId: string;
  userId: string;
  exerciseId?: string;
  exerciseName: string;
  date: string;
  year: number;
  week: number;
  sessionName?: string;
  exerciseOrder: number;  // Ordre de l'exercice dans la séance (1-based)
  exerciseType: ExerciseType;  // 'reps' ou 'time'
  loadType: LoadType;  // Type majoritaire
  limbType: LimbType;
  muscleGroupId?: string;
  muscleGroupName?: string;
  movementPatternId?: string;
  movementPatternName?: string;
  analyticsCategory?: AnalyticsCategory;
  setsCount: number;
  totalReps: number;  // Reps ou secondes selon exerciseType
  maxWeight?: number;
  avgWeight?: number;
  totalVolume?: number;
  rpe?: number;
  setsDetail?: SetDetailLog[];  // Enrichi avec loadType et exerciseType par set
  notes?: string;
  // Champs superset
  executionMode?: ExecutionMode;
  executionGroupId?: string;
  executionGroupPosition?: number;
}

// Mapping DB -> App
export function mapExerciseLogRowToEntry(row: ExerciseLogRow): ExerciseLogEntry {
  return {
    id: row.id,
    sessionLogId: row.session_log_id,
    userId: row.user_id,
    exerciseId: row.exercise_id ?? undefined,
    exerciseName: row.exercise_name,
    date: row.date,
    year: row.year,
    week: row.week,
    sessionName: row.session_name ?? undefined,
    exerciseOrder: row.exercise_order,
    exerciseType: row.exercise_type,
    loadType: row.load_type,
    limbType: row.limb_type,
    muscleGroupId: row.muscle_group_id ?? undefined,
    muscleGroupName: row.muscle_group_name ?? undefined,
    movementPatternId: row.movement_pattern_id ?? undefined,
    movementPatternName: row.movement_pattern_name ?? undefined,
    analyticsCategory: row.analytics_category as AnalyticsCategory ?? undefined,
    setsCount: row.sets_count,
    totalReps: row.total_reps,
    maxWeight: row.max_weight ?? undefined,
    avgWeight: row.avg_weight ?? undefined,
    totalVolume: row.total_volume ?? undefined,
    rpe: row.rpe ?? undefined,
    setsDetail: row.sets_detail ?? undefined,
    notes: row.notes ?? undefined,
    // Champs superset
    executionMode: (row.execution_mode as ExecutionMode) ?? undefined,
    executionGroupId: row.execution_group_id ?? undefined,
    executionGroupPosition: row.execution_group_position ?? undefined,
  };
}

// ===========================================
// TYPES WEEK ORGANIZER (Coach)
// ===========================================
export interface WeekOrganizerLog {
  id: string;
  coachId: string;
  title: string;
  startDate: string;
  endDate: string;
  message: string;
  createdAt: string;
  visibilityType?: 'all' | 'groups' | 'athletes';
  visibleToGroupIds?: string[];
  visibleToAthleteIds?: string[];
}

// Type brut depuis Supabase week_organizer
export interface WeekOrganizerRow {
  id: string;
  coach_id: string;
  title: string;
  start_date: string;
  end_date: string;
  message: string;
  created_at: string;
  visibility_type?: string;
  visible_to_group_ids?: string[];
  visible_to_athlete_ids?: string[];
}

// Mapping WeekOrganizer DB -> App
export function mapWeekOrganizerRowToLog(row: WeekOrganizerRow): WeekOrganizerLog {
  return {
    id: row.id,
    coachId: row.coach_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    message: row.message,
    createdAt: row.created_at,
    visibilityType: row.visibility_type as 'all' | 'groups' | 'athletes' | undefined,
    visibleToGroupIds: row.visible_to_group_ids,
    visibleToAthleteIds: row.visible_to_athlete_ids,
  };
}

// Mapping WeekOrganizer App -> DB
export function mapWeekOrganizerLogToRow(log: WeekOrganizerLog): Omit<WeekOrganizerRow, 'created_at'> {
  return {
    id: log.id,
    coach_id: log.coachId,
    title: log.title,
    start_date: log.startDate,
    end_date: log.endDate,
    message: log.message,
    visibility_type: log.visibilityType,
    visible_to_group_ids: log.visibleToGroupIds,
    visible_to_athlete_ids: log.visibleToAthleteIds,
  };
}

// ===========================================
// TYPES COMMENTAIRES (Feedback Athlète → Coach)
// ===========================================
export interface AthleteComment {
  id: string;
  userId: string;
  sessionId?: string;
  exerciseName: string;
  comment: string;
  isRead: boolean;
  createdAt: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  sessionName?: string;
}

// Type brut depuis Supabase athlete_comments
export interface AthleteCommentRow {
  id: string;
  user_id: string;
  session_id: string | null;
  exercise_name: string;
  comment: string;
  is_read: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  session_logs?: {
    session_key_name: string | null;
  };
}

// Mapping AthleteComment DB -> App
export function mapAthleteCommentRowToComment(row: AthleteCommentRow): AthleteComment {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id ?? undefined,
    exerciseName: row.exercise_name,
    comment: row.comment,
    isRead: row.is_read,
    createdAt: row.created_at,
    username: row.profiles?.username ?? undefined,
    firstName: row.profiles?.first_name ?? undefined,
    lastName: row.profiles?.last_name ?? undefined,
    sessionName: row.session_logs?.session_key_name ?? undefined,
  };
}

// Mapping AthleteComment App -> DB (pour insert)
export function mapAthleteCommentToRow(
  comment: Omit<AthleteComment, 'id' | 'createdAt' | 'username' | 'firstName' | 'lastName' | 'sessionName'>
): Omit<AthleteCommentRow, 'id' | 'created_at' | 'profiles' | 'session_logs'> {
  return {
    user_id: comment.userId,
    session_id: comment.sessionId ?? null,
    exercise_name: comment.exerciseName,
    comment: comment.comment,
    is_read: comment.isRead,
  };
}

// ===========================================
// TYPES GROUPES D'ATHLÈTES & VISIBILITÉ
// ===========================================

export interface AthleteGroup {
  id: string;
  coachId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface AthleteGroupMember {
  groupId: string;
  athleteId: string;
  joinedAt: string;
}

export interface AthleteGroupWithCount extends AthleteGroup {
  memberCount: number;
}

export type VisibilityType = 'all' | 'groups' | 'athletes';

// Types DB pour groupes
export interface AthleteGroupRow {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface AthleteGroupMemberRow {
  group_id: string;
  athlete_id: string;
  joined_at: string;
}

// Mapping fonctions pour groupes
export function mapAthleteGroupRowToGroup(row: AthleteGroupRow): AthleteGroup {
  return {
    id: row.id,
    coachId: row.coach_id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function mapAthleteGroupToRow(group: AthleteGroup): Omit<AthleteGroupRow, 'created_at'> {
  return {
    id: group.id,
    coach_id: group.coachId,
    name: group.name,
    description: group.description,
    color: group.color,
  };
}

// Couleurs prédéfinies pour les groupes
export const GROUP_COLORS = [
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emeraude', value: '#059669' },
];

// Helper functions pour la visibilité
export function canAthleteViewMessage(
  log: WeekOrganizerLog,
  athleteId: string,
  athleteGroupIds: string[]
): boolean {
  if (!log.visibilityType || log.visibilityType === 'all') return true;
  
  if (log.visibilityType === 'groups') {
    return athleteGroupIds.some(gid => log.visibleToGroupIds?.includes(gid));
  }
  
  if (log.visibilityType === 'athletes') {
    return log.visibleToAthleteIds?.includes(athleteId) || false;
  }
  
  return false;
}

export function filterVisibleMessages(
  logs: WeekOrganizerLog[],
  athleteId: string,
  athleteGroupIds: string[]
): WeekOrganizerLog[] {
  return logs.filter(log => canAthleteViewMessage(log, athleteId, athleteGroupIds));
}

// ===========================================
// UTILITAIRES RPE
// ===========================================
export const RPE_SCALE = [
  { value: 1, label: 'Très facile', color: 'bg-green-500', description: 'Effort minimal, récupération active' },
  { value: 2, label: 'Facile', color: 'bg-green-400', description: 'Effort léger, conversation facile' },
  { value: 3, label: 'Léger', color: 'bg-lime-400', description: 'Échauffement, respiration contrôlée' },
  { value: 4, label: 'Modéré', color: 'bg-yellow-400', description: 'Effort soutenu, conversation possible' },
  { value: 5, label: 'Moyen', color: 'bg-yellow-500', description: 'Travail modéré, quelques phrases possibles' },
  { value: 6, label: 'Difficile', color: 'bg-orange-400', description: 'Effort notable, respiration accélérée' },
  { value: 7, label: 'Très difficile', color: 'bg-orange-500', description: 'Effort intense, peu de mots possibles' },
  { value: 8, label: 'Intense', color: 'bg-red-400', description: 'Très dur, quelques reps en réserve' },
  { value: 9, label: 'Très intense', color: 'bg-red-500', description: 'Quasi-max, 1 rep en réserve' },
  { value: 10, label: 'Maximum', color: 'bg-red-600', description: 'Effort maximal, rien en réserve' },
];

export function getRpeColor(rpe: number): string {
  if (rpe <= 2) return 'text-green-400';
  if (rpe <= 4) return 'text-lime-400';
  if (rpe <= 6) return 'text-yellow-400';
  if (rpe <= 8) return 'text-orange-400';
  return 'text-red-400';
}

export function getRpeBgColor(rpe: number): string {
  if (rpe <= 2) return 'bg-green-500/20';
  if (rpe <= 4) return 'bg-lime-500/20';
  if (rpe <= 6) return 'bg-yellow-500/20';
  if (rpe <= 8) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}

export function getRpeInfo(rpe: number) {
  return RPE_SCALE.find(r => r.value === rpe) || RPE_SCALE[4];
}

// ===========================================
// V3 — TYPES BADGES
// ===========================================

export type BadgeCategory = 
  | 'regularity' 
  | 'endurance' 
  | 'perseverance' 
  | 'community' 
  | 'exploration';

export type BadgeConditionType =
  | 'cumulative_sessions'
  | 'streak_tolerant'
  | 'cumulative_hours'
  | 'count_rpe_gte'
  | 'comeback'
  | 'consistency'
  | 'message_count'
  | 'responsive'
  | 'unique_exercises'
  | 'session_types'
  | 'strava_connected'
  | 'strava_imports';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconSvg: string;
  conditionType: BadgeConditionType;
  conditionValue: number;
  orderIndex: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt?: string;
  progressValue: number;
}

export interface BadgeWithProgress extends Badge {
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

// Types DB pour badges
export interface BadgeRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon_svg: string;
  condition_type: string;
  condition_value: number;
  order_index: number;
}

export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string | null;
  progress_value: number;
}

// Mapping Badge DB -> App
export function mapBadgeRowToBadge(row: BadgeRow): Badge {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category as BadgeCategory,
    iconSvg: row.icon_svg,
    conditionType: row.condition_type as BadgeConditionType,
    conditionValue: row.condition_value,
    orderIndex: row.order_index,
  };
}

export function mapUserBadgeRowToUserBadge(row: UserBadgeRow): UserBadge {
  return {
    id: row.id,
    userId: row.user_id,
    badgeId: row.badge_id,
    unlockedAt: row.unlocked_at ?? undefined,
    progressValue: row.progress_value,
  };
}

// Métadonnées des catégories de badges
export const BADGE_CATEGORIES: Record<BadgeCategory, {
  name: string;
  icon: string;
  color: string;
  description: string;
}> = {
  regularity: {
    name: 'Régularité',
    icon: '🔥',
    color: '#f97316',
    description: 'Récompense la constance dans l\'entraînement',
  },
  endurance: {
    name: 'Endurance',
    icon: '⏱️',
    color: '#3b82f6',
    description: 'Récompense le temps total investi',
  },
  perseverance: {
    name: 'Persévérance',
    icon: '💪',
    color: '#dc2626',
    description: 'Récompense l\'effort et la détermination',
  },
  community: {
    name: 'Communauté',
    icon: '🤝',
    color: '#8b5cf6',
    description: 'Récompense la communication avec le coach',
  },
  exploration: {
    name: 'Exploration',
    icon: '🗺️',
    color: '#10b981',
    description: 'Récompense la diversité des entraînements',
  },
};

// ===========================================
// V3 — TYPES CONVERSATIONS & MESSAGES
// ===========================================

export interface Conversation {
  id: string;
  athleteId: string;
  coachId: string;
  sessionId?: string;
  exerciseName?: string;
  lastMessageAt: string;
  createdAt: string;
  unreadCount?: number;
  lastMessage?: string;
  // Données jointes
  athleteName?: string;
  coachName?: string;
  sessionName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  // Données jointes
  senderName?: string;
}

// Types DB pour conversations et messages
export interface ConversationRow {
  id: string;
  athlete_id: string;
  coach_id: string;
  session_id: string | null;
  exercise_name: string | null;
  last_message_at: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// Mapping Conversation DB -> App
export function mapConversationRowToConversation(
  row: ConversationRow & { 
    unread_count?: number; 
    last_message?: string;
    athlete_name?: string;
    coach_name?: string;
    session_name?: string;
  }
): Conversation {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    coachId: row.coach_id,
    sessionId: row.session_id ?? undefined,
    exerciseName: row.exercise_name ?? undefined,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    unreadCount: row.unread_count,
    lastMessage: row.last_message,
    athleteName: row.athlete_name,
    coachName: row.coach_name,
    sessionName: row.session_name,
  };
}

// Mapping Message DB -> App
export function mapMessageRowToMessage(
  row: MessageRow & { sender_name?: string }
): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
    senderName: row.sender_name,
  };
}

// ===========================================
// TYPES PR (Personal Records)
// ===========================================

export type PRType = 'weight' | 'volume' | '1rm';

export interface PRDetected {
  exerciseName: string;
  prType: PRType;
  previousRecord: number;
  newRecord: number;
  improvement: number;  // Différence absolue
  improvementPercent: number;  // % d'amélioration
}

export interface GhostSet {
  setNumber: number;
  weight: number;
  reps: number;
  volume: number;
}

// ===========================================
// TYPES BIBLIOTHÈQUE COACH (Exercices, Séances, Programmes)
// ===========================================

// Référentiels
export interface MuscleGroup {
  id: string;
  nameFr: string;
  nameEn?: string;
  code: string;
}

export interface MovementPattern {
  id: string;
  nameFr: string;
  nameEn?: string;
  code: string;
}

// Types DB pour référentiels
export interface MuscleGroupRow {
  id: string;
  name_fr: string;
  name_en: string | null;
  code: string;
}

export interface MovementPatternRow {
  id: string;
  name_fr: string;
  name_en: string | null;
  code: string;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
}

export interface ExerciseCategoryRow {
  id: string;
  name: string;
  code: string;
  display_order: number;
}

export function mapExerciseCategoryRowToExerciseCategory(row: ExerciseCategoryRow): ExerciseCategory {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    displayOrder: row.display_order,
  };
}

// Mapping référentiels
export function mapMuscleGroupRowToMuscleGroup(row: MuscleGroupRow): MuscleGroup {
  return {
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en ?? undefined,
    code: row.code,
  };
}

export function mapMovementPatternRowToMovementPattern(row: MovementPatternRow): MovementPattern {
  return {
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en ?? undefined,
    code: row.code,
  };
}

// Types DB pour session_templates (nouvelle architecture)
export interface SessionTemplateRow {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  category: string | null;
  validity_year: number | null;
  validity_month: number | null;
  validity_week: number | null;
  start_date: string | null;
  end_date: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Types DB pour session_template_exercises
export interface SessionTemplateExerciseRow {
  id: string;
  session_template_id: string;
  exercise_id: string;
  position: number;
  default_sets: number | null;
  default_reps: string | null;
  default_rest: string | null;
  default_tempo: string | null;
  notes: string | null;
  created_at: string;
  // Champs superset
  execution_mode: string | null;
  execution_group_id: string | null;
  execution_group_position: number | null;
}

// Exercice dans une séance (avec paramètres d'exécution)
export interface SessionExercise {
  id: string;                    // UUID de session_template_exercises
  exerciseId: string;            // FK vers exercises
  exerciseName: string;          // Dénormalisé pour affichage
  position: number;              // Renommé de orderIndex
  targetSets?: string;           // "3" ou "3-4"
  targetReps?: string;           // "8" ou "8-10" ou "30s"
  restTimeSec?: number;
  tempo?: string;
  notes?: string;                // Consignes spécifiques
  videoUrl?: string;             // Dénormalisé depuis exercise
  // Mode d'exécution (superset, triset, etc.)
  executionMode?: ExecutionMode;        // Défaut: 'straight'
  executionGroupId?: string;            // UUID partagé par les exos d'un superset
  executionGroupPosition?: number;      // 0 = premier, 1 = second
}

// Template de séance (nouvelle architecture avec table session_templates)
export interface SessionTemplate {
  id: string;                    // UUID de la table session_templates
  coachId: string;
  seanceType: string;            // = name dans la table session_templates
  description?: string;
  category?: string;             // 'force', 'cardio', 'mobilite', etc.
  exercises: SessionExercise[];
  // Période de validité
  validityYear?: number;
  validityMonth?: number;
  validityWeek?: number;
  startDate?: string;            // Format YYYY-MM-DD
  endDate?: string;              // Format YYYY-MM-DD
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Programme (séances assignées à des athlètes)
export interface Program {
  id: string;                    // Identifiant synthétique déterministe (clé composite : programName_seanceType_startDate_endDate_athleteTarget)
  coachId: string;
  programName?: string;          // Nom personnalisé du programme (optionnel)
  seanceType: string;
  year: number;
  week?: number;
  monthNum?: number;
  startDate?: string;            // Format YYYY-MM-DD
  endDate?: string;              // Format YYYY-MM-DD
  athleteTarget: string[];       // UUIDs des athlètes assignés
  groupTarget?: string[];        // UUIDs des groupes assignés (optionnel, pour affichage)
  exercises: SessionExercise[];
  sourceTemplateId?: string;     // Référence au template source (session_templates.id)
}

// Variante d'exercice (exercices avec même nom mais données primaires différentes)
export interface ExerciseVariant {
  exercise: Exercise;
  isDifferentVideo: boolean;
  isDifferentMuscleGroup: boolean;
  isDifferentMovementPattern: boolean;
  isDifferentLimbType: boolean;
}

// Helper: Vérifie si deux exercices sont des variantes (données primaires différentes)
export function areExerciseVariants(a: Exercise, b: Exercise): boolean {
  if (a.name !== b.name) return false;  // Pas même nom = pas variante
  if (a.id === b.id) return false;       // Même exercice = pas variante

  // Au moins une donnée primaire doit être différente
  return (
    a.videoUrl !== b.videoUrl ||
    a.primaryMuscleGroupId !== b.primaryMuscleGroupId ||
    a.movementPatternId !== b.movementPatternId ||
    a.limbType !== b.limbType
  );
}

// ===========================================
// EXERCISE VARIANT NAMING
// ===========================================

// Separator used to distinguish base name from variant name
export const VARIANT_NAME_SEPARATOR = ' :: ';
export const DEFAULT_VARIANT_NAME = 'Ma variante';

/**
 * Parse an exercise full name into base name and variant name
 * Example: "Squat :: Force" -> { baseName: "Squat", variantName: "Force" }
 * Example: "Squat" -> { baseName: "Squat", variantName: undefined }
 */
export function parseExerciseName(fullName: string): { baseName: string; variantName?: string } {
  const separatorIndex = fullName.indexOf(VARIANT_NAME_SEPARATOR);
  if (separatorIndex === -1) {
    return { baseName: fullName.trim() };
  }
  return {
    baseName: fullName.substring(0, separatorIndex).trim(),
    variantName: fullName.substring(separatorIndex + VARIANT_NAME_SEPARATOR.length).trim() || undefined
  };
}

/**
 * Build a full exercise name from base name and variant name
 * Example: buildExerciseName("Squat", "Force") -> "Squat :: Force"
 * Example: buildExerciseName("Squat") -> "Squat"
 */
export function buildExerciseName(baseName: string, variantName?: string): string {
  if (!variantName || variantName.trim() === '') {
    return baseName.trim();
  }
  return `${baseName.trim()}${VARIANT_NAME_SEPARATOR}${variantName.trim()}`;
}

/**
 * Get display name for an exercise variant tab
 * If has variant name, show just the variant name
 * If no variant name, show "Ma variante" for personal or date for common
 */
export function getExerciseVariantDisplayName(exercise: Exercise, isPersonal: boolean): string {
  const { variantName } = parseExerciseName(exercise.name);
  if (variantName) {
    return variantName;
  }
  // Default display based on ownership
  if (isPersonal) {
    return DEFAULT_VARIANT_NAME;
  }
  // For common exercises, use creation date
  if (exercise.createdAt) {
    return new Date(exercise.createdAt).toLocaleDateString('fr-FR');
  }
  return 'Originale';
}

// Helper: Regroupe les lignes training_plans par (coach_id, seance_type, dates)
export function groupTrainingPlansToSessions(rows: WorkoutRow[]): SessionTemplate[] {
  const grouped = new Map<string, SessionTemplate>();

  for (const row of rows) {
    // Clé unique: coach_id + seance_type + startDate + endDate (pour les variantes par date)
    const key = `${row.coachId || 'null'}_${row.seance}_${row.weekStartDate || ''}_${row.weekEndDate || ''}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: '',  // Sera rempli lors de la migration vers session_templates
        coachId: row.coachId || '',
        seanceType: row.seance,
        exercises: [],
        validityYear: row.annee ? parseInt(row.annee) : undefined,
        validityWeek: row.semaine ? parseInt(row.semaine) : undefined,
        validityMonth: row.moisNum ? parseInt(row.moisNum) : undefined,
        startDate: row.weekStartDate,
        endDate: row.weekEndDate,
      });
    }

    const session = grouped.get(key)!;
    session.exercises.push({
      id: row.id.toString(),
      exerciseId: row.exerciseId || '',
      exerciseName: row.exercice,
      position: row.ordre,
      targetSets: row.series || undefined,
      targetReps: row.repsDuree || undefined,
      restTimeSec: row.repos ? parseInt(row.repos) : undefined,
      tempo: row.tempoRpe || undefined,
      notes: row.notes || undefined,
      videoUrl: row.video || undefined,
    });
  }

  // Trier les exercices par position
  for (const session of grouped.values()) {
    session.exercises.sort((a, b) => a.position - b.position);
  }

  return Array.from(grouped.values());
}

// ===========================================
// MAPPING FONCTIONS - SESSION TEMPLATES
// ===========================================

// Mapping SessionTemplate DB -> App
export function mapSessionTemplateRowToSessionTemplate(
  row: SessionTemplateRow,
  exercises: SessionExercise[] = []
): SessionTemplate {
  return {
    id: row.id,
    coachId: row.coach_id,
    seanceType: row.name,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    exercises,
    validityYear: row.validity_year ?? undefined,
    validityMonth: row.validity_month ?? undefined,
    validityWeek: row.validity_week ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Mapping SessionTemplateExercise DB -> SessionExercise App
export function mapSessionTemplateExerciseRowToSessionExercise(
  row: SessionTemplateExerciseRow,
  exerciseName: string,
  videoUrl?: string
): SessionExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName,
    position: row.position,
    targetSets: row.default_sets?.toString() ?? undefined,
    targetReps: row.default_reps ?? undefined,
    restTimeSec: row.default_rest ? parseInt(row.default_rest) : undefined,
    tempo: row.default_tempo ?? undefined,
    notes: row.notes ?? undefined,
    videoUrl,
    // Champs superset
    executionMode: (row.execution_mode as ExecutionMode) ?? 'straight',
    executionGroupId: row.execution_group_id ?? undefined,
    executionGroupPosition: row.execution_group_position ?? undefined,
  };
}
