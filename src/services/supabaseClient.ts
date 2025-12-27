import { supabase } from '../supabaseClient';
import { 
  TrainingPlanRow, 
  WorkoutRowFull, 
  mapTrainingPlanToWorkout,
  ProfileRow,
  User,
  mapProfileToUser,
  SessionLogRow,
  SessionLog,
  mapSessionLogRowToSessionLog,
  mapSessionLogToRow
} from '../../types';

// ===========================================
// TRAINING PLANS
// ===========================================

export async function fetchTrainingPlans(): Promise<WorkoutRowFull[]> {
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
// HELPER
// ===========================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
