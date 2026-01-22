import { supabase } from '../supabaseClient';
import {
  TrainingPlanRow,
  WorkoutRowFull,
  mapTrainingPlanToWorkout,
  ProfileRow,
  User,
  mapProfileToUser,
  SessionLog,
  mapSessionLogToRow
} from '../../types';
import { saveExerciseLogs as saveExerciseLogsFromSession } from './supabaseService';

// ===========================================
// TRAINING PLANS
// ===========================================

/**
 * Récupère les programmes d'entraînement visibles par l'utilisateur connecté.
 * Fait une jointure avec la table exercises pour récupérer les détails.
 * La visibilité est gérée automatiquement par les RLS Supabase (coach_id + athlete_target).
 */
export async function fetchTrainingPlans(): Promise<WorkoutRowFull[]> {
  const { data, error } = await supabase
    .from('training_plans')
    .select(`
      *,
      exercises (
        id,
        name,
        video_url,
        tempo,
        coach_instructions
      )
    `)
    .order('year', { ascending: true })
    .order('Month_num', { ascending: true })
    .order('week', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching training plans:', error);
    throw error;
  }

  // Mapper en enrichissant avec les données de exercises
  return (data as any[]).map(row => {
    const workout = mapTrainingPlanToWorkout(row as TrainingPlanRow);

    // Enrichir avec les données de la table exercises si disponible
    if (row.exercises) {
      workout.exercice = row.exercises.name || workout.exercice;
      workout.video = row.exercises.video_url || workout.video;
      workout.tempoRpe = row.exercises.tempo || workout.tempoRpe;
      workout.notes = row.exercises.coach_instructions || workout.notes;
    }

    return workout;
  });
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

  const savedLog = mapSessionLogRowToSessionLog(data as SessionLogRow);

  // Sauvegarder aussi dans exercise_logs pour analytics
  // Utiliser le log original (avec exerciseId) pas savedLog
  const logWithId = { ...log, id: savedLog.id };
  try {
    await saveExerciseLogsFromSession(savedLog.id, userId, logWithId);
  } catch (exerciseLogsError) {
    console.error('Error saving exercise logs (non-blocking):', exerciseLogsError);
  }

  return savedLog;
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
