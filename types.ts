// ===========================================
// F.Y.T - TYPES COMPLET (avec RPE)
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
  exercise_name: string | null;
  order_index: number | null;
  target_sets: string | null;
  target_reps: string | null;
  rest_time_sec: number | null;
  video_url: string | null;
  Month: string | null;
  Month_num: number | null;
  Tempo: string | null;
  "Notes/Consignes": string | null;
  week_start_date: string | null;  // Format: YYYY-MM-DD
  week_end_date: string | null;    // Format: YYYY-MM-DD
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
  exercice: string;
  series: string;
  repsDuree: string;
  repos: string;
  tempoRpe: string;
  notes: string;
  video: string;
  weekStartDate?: string;  // Format: YYYY-MM-DD
  weekEndDate?: string;    // Format: YYYY-MM-DD
}

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
    series: row.target_sets ?? '',
    repsDuree: row.target_reps ?? '',
    repos: row.rest_time_sec?.toString() ?? '',
    tempoRpe: row.Tempo ?? '',
    notes: row["Notes/Consignes"] ?? '',
    video: row.video_url ?? '',
    weekStartDate: row.week_start_date ?? undefined,
    weekEndDate: row.week_end_date ?? undefined,
  };
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
export interface SetLog {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseName: string;
  originalSession?: string;
  sets: SetLog[];
  notes?: string;
  rpe?: number;
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
  oderId?: string;
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
}

// Mapping SessionLog DB -> App
export function mapSessionLogRowToSessionLog(row: SessionLogRow): SessionLog {
  return {
    id: row.id,
    oderId: row.user_id,
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
export function mapSessionLogToRow(log: SessionLog, oderId: string): Omit<SessionLogRow, 'created_at'> {
  return {
    id: log.id,
    user_id: oderId,
    date: log.date,
    duration_minutes: log.durationMinutes ?? null,
    session_key_year: log.sessionKey.annee ? parseInt(log.sessionKey.annee) : null,
    session_key_week: log.sessionKey.semaine ? parseInt(log.sessionKey.semaine) : null,
    session_key_name: log.sessionKey.seance || null,
    exercises: log.exercises,
    comments: log.comments ?? null,
    session_rpe: log.sessionRpe ?? null,
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
  oderId: string;
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
    oderId: row.user_id,
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
    user_id: comment.oderId,
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
