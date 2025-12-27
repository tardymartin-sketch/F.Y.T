import { supabase } from '../supabaseClient';
import { 
  TrainingPlanRow, 
  WorkoutRow, 
  mapTrainingPlanToWorkout,
  ProfileRow,
  User,
  mapProfileToUser,
  SessionLogRow,
  SessionLog,
  mapSessionLogRowToSessionLog,
  mapSessionLogToRow,
  WeekOrganizerRow,
  WeekOrganizerLog,
  mapWeekOrganizerRowToLog,
  mapWeekOrganizerLogToRow,
  AthleteCommentRow,
  AthleteComment,
  mapAthleteCommentRowToComment,
  mapAthleteCommentToRow
} from '../../types';

// ===========================================
// TRAINING PLANS
// ===========================================

export async function fetchTrainingPlans(): Promise<WorkoutRow[]> {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .order('year', { ascending: true })
    .order('Month_num', { ascending: true })
    .order('week', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching training plans:', error);
    throw error;
  }

  return (data as TrainingPlanRow[]).map(mapTrainingPlanToWorkout);
}

// ===========================================
// PROFILES / USERS
// ===========================================

export async function fetchCurrentUserProfile(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return mapProfileToUser(data as ProfileRow);
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }

  return mapProfileToUser(data as ProfileRow);
}

export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }

  return (data as ProfileRow[]).map(mapProfileToUser);
}

export async function fetchTeamAthletes(coachId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('coach_id', coachId)
    .eq('role', 'athlete')
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching team athletes:', error);
    throw error;
  }

  return (data as ProfileRow[]).map(mapProfileToUser);
}

export async function updateUserCoach(userId: string, coachId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ coach_id: coachId })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user coach:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<ProfileRow>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// ===========================================
// SESSION LOGS
// ===========================================

export async function fetchSessionLogs(userId: string): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching session logs:', error);
    throw error;
  }

  return (data as SessionLogRow[]).map(mapSessionLogRowToSessionLog);
}

export async function saveSessionLog(log: SessionLog, userId: string): Promise<SessionLog> {
  const rowData = mapSessionLogToRow(log, userId);
  
  const { data, error } = await supabase
    .from('session_logs')
    .upsert(rowData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving session log:', error);
    throw error;
  }

  return mapSessionLogRowToSessionLog(data as SessionLogRow);
}

export async function deleteSessionLog(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('session_logs')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session log:', error);
    throw error;
  }
}

// ===========================================
// WEEK ORGANIZER
// ===========================================

export async function fetchWeekOrganizerLogs(coachId?: string): Promise<WeekOrganizerLog[]> {
  let query = supabase
    .from('week_organizer')
    .select('*')
    .order('created_at', { ascending: false });

  if (coachId) {
    query = query.eq('coach_id', coachId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching week organizer logs:', error);
    throw error;
  }

  return (data as WeekOrganizerRow[]).map(mapWeekOrganizerRowToLog);
}

export async function fetchActiveWeekOrganizer(coachId: string): Promise<WeekOrganizerLog | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('week_organizer')
    .select('*')
    .eq('coach_id', coachId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching active week organizer:', error);
    return null;
  }

  return mapWeekOrganizerRowToLog(data as WeekOrganizerRow);
}

export async function saveWeekOrganizerLog(log: WeekOrganizerLog): Promise<WeekOrganizerLog> {
  const rowData = mapWeekOrganizerLogToRow(log);

  const { data, error } = await supabase
    .from('week_organizer')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    console.error('Error saving week organizer log:', error);
    throw error;
  }

  return mapWeekOrganizerRowToLog(data as WeekOrganizerRow);
}

export async function deleteWeekOrganizerLog(logId: string): Promise<void> {
  const { error } = await supabase
    .from('week_organizer')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting week organizer log:', error);
    throw error;
  }
}

// ===========================================
// ATHLETE COMMENTS (Feedbacks)
// ===========================================

export async function fetchTeamComments(coachId: string, onlyUnread: boolean = true): Promise<AthleteComment[]> {
  // First, get all athletes for this coach
  const { data: athletes, error: athletesError } = await supabase
    .from('profiles')
    .select('id')
    .eq('coach_id', coachId);

  if (athletesError) {
    console.error('Error fetching team athletes:', athletesError);
    throw athletesError;
  }

  if (!athletes || athletes.length === 0) {
    return [];
  }

  const athleteIds = athletes.map(a => a.id);

  // Then fetch comments for those athletes
  let query = supabase
    .from('athlete_comments')
    .select(`
      *,
      profiles:user_id (username, first_name, last_name),
      session_logs:session_id (session_key_name)
    `)
    .in('user_id', athleteIds)
    .order('created_at', { ascending: false });

  if (onlyUnread) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching team comments:', error);
    throw error;
  }

  return (data as AthleteCommentRow[]).map(mapAthleteCommentRowToComment);
}

export async function saveAthleteComment(
  userId: string,
  sessionId: string,
  exerciseName: string,
  comment: string
): Promise<AthleteComment> {
  const { data, error } = await supabase
    .from('athlete_comments')
    .insert({
      user_id: userId,
      session_id: sessionId,
      exercise_name: exerciseName,
      comment: comment,
      is_read: false
    })
    .select(`
      *,
      profiles:user_id (username, first_name, last_name),
      session_logs:session_id (session_key_name)
    `)
    .single();

  if (error) {
    console.error('Error saving athlete comment:', error);
    throw error;
  }

  return mapAthleteCommentRowToComment(data as AthleteCommentRow);
}

export async function markCommentsAsRead(commentIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('athlete_comments')
    .update({ is_read: true })
    .in('id', commentIds);

  if (error) {
    console.error('Error marking comments as read:', error);
    throw error;
  }
}

export async function markAllCommentsAsRead(coachId: string): Promise<void> {
  // Get athlete IDs for this coach
  const { data: athletes } = await supabase
    .from('profiles')
    .select('id')
    .eq('coach_id', coachId);

  if (!athletes || athletes.length === 0) return;

  const athleteIds = athletes.map(a => a.id);

  const { error } = await supabase
    .from('athlete_comments')
    .update({ is_read: true })
    .in('user_id', athleteIds)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all comments as read:', error);
    throw error;
  }
}
// HELPER
// ===========================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

