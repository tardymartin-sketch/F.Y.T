// ============================================================
// F.Y.T - SUPABASE SERVICE (Version avec tous les Week Organizers)
// src/services/supabaseService.ts
// Retourne TOUS les messages week organizer visibles
// ============================================================

import { supabase } from '../supabaseClient';
import {
  User,
  ProfileRow,
  mapProfileToUser,
  WorkoutRow,
  TrainingPlanRow,
  mapTrainingPlanToWorkout,
  SessionLog,
  SessionLogRow,
  mapSessionLogRowToSessionLog,
  mapSessionLogToRow,
  WeekOrganizerLog,
  WeekOrganizerRow,
  mapWeekOrganizerRowToLog,
  AthleteComment,
  AthleteCommentRow,
  mapAthleteCommentRowToComment,
  AthleteGroup,
  AthleteGroupRow,
  AthleteGroupWithCount,
  mapAthleteGroupRowToGroup,
} from '../../types';

// ===========================================
// AUTH & PROFILE
// ===========================================

export async function fetchCurrentUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return mapProfileToUser(data as ProfileRow);
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
// TRAINING PLANS
// ===========================================

export async function fetchTrainingPlans(userId: string): Promise<WorkoutRow[]> {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .order('year', { ascending: false })
    .order('week', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching training plans:', error);
    throw error;
  }

  return (data as TrainingPlanRow[]).map(mapTrainingPlanToWorkout);
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
// TEAM & USERS
// ===========================================

export async function fetchTeamAthletes(coachId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('coach_id', coachId)
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching team athletes:', error);
    throw error;
  }

  return (data as ProfileRow[]).map(mapProfileToUser);
}

export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching all users:', error);
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
      return null;
    }
    console.error('Error fetching active week organizer:', error);
    return null;
  }

  return mapWeekOrganizerRowToLog(data as WeekOrganizerRow);
}

// NOUVEAU: Récupérer TOUS les week organizers actifs pour un athlète
export async function fetchActiveWeekOrganizersForAthlete(
  coachId: string,
  athleteId: string
): Promise<WeekOrganizerLog[]> {
  const today = new Date().toISOString().split('T')[0];
  
  // Récupérer les groupes de l'athlète
  const athleteGroupIds = await fetchAthleteGroupsForAthlete(athleteId);

  const { data, error } = await supabase
    .from('week_organizer')
    .select('*')
    .eq('coach_id', coachId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active week organizers:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Filtrer par visibilité - RETOURNER TOUS les messages visibles
  const visibleMessages = data.filter(log => {
    if (!log.visibility_type || log.visibility_type === 'all') return true;
    
    if (log.visibility_type === 'groups') {
      return athleteGroupIds.some(gid => log.visible_to_group_ids?.includes(gid));
    }
    
    if (log.visibility_type === 'athletes') {
      return log.visible_to_athlete_ids?.includes(athleteId);
    }
    
    return false;
  });

  return visibleMessages.map(row => mapWeekOrganizerRowToLog(row as WeekOrganizerRow));
}

// Ancienne fonction conservée pour compatibilité
export async function fetchActiveWeekOrganizerForAthlete(
  coachId: string,
  athleteId: string
): Promise<WeekOrganizerLog | null> {
  const messages = await fetchActiveWeekOrganizersForAthlete(coachId, athleteId);
  return messages.length > 0 ? messages[0] : null;
}

export async function saveWeekOrganizerLog(log: WeekOrganizerLog): Promise<WeekOrganizerLog> {
  const rowData = {
    id: log.id,
    coach_id: log.coachId,
    title: log.title,
    start_date: log.startDate,
    end_date: log.endDate,
    message: log.message,
    visibility_type: log.visibilityType || 'all',
    visible_to_group_ids: log.visibleToGroupIds || null,
    visible_to_athlete_ids: log.visibleToAthleteIds || null,
  };

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

// Récupérer les commentaires pour un coach (ses athlètes)
export async function fetchTeamComments(coachId: string, onlyUnread: boolean = true): Promise<AthleteComment[]> {
  console.log('[fetchTeamComments] Récupération pour coachId:', coachId, 'onlyUnread:', onlyUnread);

  // Étape 1: Récupérer les athlètes du coach
  const { data: athletes, error: athletesError } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name')
    .eq('coach_id', coachId);

  if (athletesError) {
    console.error('[fetchTeamComments] Erreur récupération athlètes:', athletesError);
    return [];
  }

  console.log('[fetchTeamComments] Athlètes trouvés:', athletes);

  if (!athletes || athletes.length === 0) {
    console.log('[fetchTeamComments] Aucun athlète trouvé pour ce coach');
    return [];
  }

  const athleteIds = athletes.map(a => a.id);
  const athleteMap = new Map(athletes.map(a => [a.id, a]));
  console.log('[fetchTeamComments] IDs des athlètes:', athleteIds);

  // Étape 2: Récupérer les commentaires (requête simple sans jointures)
  let query = supabase
    .from('athlete_comments')
    .select('*')
    .in('user_id', athleteIds)
    .order('created_at', { ascending: false });

  if (onlyUnread) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchTeamComments] Erreur récupération commentaires:', error);
    return [];
  }

  console.log('[fetchTeamComments] Données brutes:', data);
  console.log('[fetchTeamComments] Nombre de commentaires:', data?.length || 0);

  if (!data || data.length === 0) {
    return [];
  }

  // Mapper les données en ajoutant les infos de l'athlète depuis notre map
  const mapped: AthleteComment[] = data.map((row: any) => {
    const athlete = athleteMap.get(row.user_id);
    return {
      id: row.id,
      oderId: row.user_id,
      sessionId: row.session_id ?? undefined,
      exerciseName: row.exercise_name,
      comment: row.comment,
      isRead: row.is_read,
      createdAt: row.created_at,
      username: athlete?.username ?? undefined,
      firstName: athlete?.first_name ?? undefined,
      lastName: athlete?.last_name ?? undefined,
      sessionName: undefined,
    };
  });

  console.log('[fetchTeamComments] Commentaires mappés:', mapped);

  return mapped;
}

// Récupérer les commentaires d'un athlète (ses propres commentaires)
export async function fetchAthleteOwnComments(athleteId: string): Promise<AthleteComment[]> {
  console.log('[fetchAthleteOwnComments] Récupération pour athleteId:', athleteId);

  // D'abord, essayer une requête simple sans jointures
  const { data, error } = await supabase
    .from('athlete_comments')
    .select('*')
    .eq('user_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[fetchAthleteOwnComments] Erreur Supabase:', error);
    // Ne pas throw, retourner un tableau vide pour ne pas bloquer l'app
    return [];
  }

  console.log('[fetchAthleteOwnComments] Données brutes:', data);
  console.log('[fetchAthleteOwnComments] Nombre de commentaires:', data?.length || 0);

  if (!data || data.length === 0) {
    return [];
  }

  // Mapper les données sans les jointures
  const mapped: AthleteComment[] = data.map((row: any) => ({
    id: row.id,
    oderId: row.user_id,
    sessionId: row.session_id ?? undefined,
    exerciseName: row.exercise_name,
    comment: row.comment,
    isRead: row.is_read,
    createdAt: row.created_at,
    username: undefined,
    firstName: undefined,
    lastName: undefined,
    sessionName: undefined,
  }));

  console.log('[fetchAthleteOwnComments] Commentaires mappés:', mapped);

  return mapped;
}

export async function saveAthleteComment(comment: Omit<AthleteComment, 'id' | 'createdAt' | 'username' | 'firstName' | 'lastName' | 'sessionName'>): Promise<AthleteComment | null> {
  console.log('[saveAthleteComment] Début sauvegarde:', {
    oderId: comment.oderId,
    exerciseName: comment.exerciseName,
    comment: comment.comment.substring(0, 50),
    sessionId: comment.sessionId
  });

  // Valider que sessionId est un UUID valide ou null
  // Si c'est 'active' ou autre valeur non-UUID, on met null
  let validSessionId: string | null = null;
  if (comment.sessionId && comment.sessionId !== 'active') {
    // Vérifier si c'est un UUID valide (format basique)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(comment.sessionId)) {
      validSessionId = comment.sessionId;
    }
  }

  console.log('[saveAthleteComment] sessionId validé:', validSessionId);

  const insertData = {
    user_id: comment.oderId,
    session_id: validSessionId,
    exercise_name: comment.exerciseName,
    comment: comment.comment,
    is_read: comment.isRead,
  };

  console.log('[saveAthleteComment] Données à insérer:', insertData);

  // Insert sans select pour éviter les problèmes de RLS
  const { data, error } = await supabase
    .from('athlete_comments')
    .insert(insertData)
    .select('*');

  if (error) {
    console.error('[saveAthleteComment] Erreur Supabase:', error);
    console.error('[saveAthleteComment] Code erreur:', error.code);
    console.error('[saveAthleteComment] Message:', error.message);
    console.error('[saveAthleteComment] Details:', error.details);
    throw error;
  }

  console.log('[saveAthleteComment] Réponse Supabase:', data);

  if (!data || data.length === 0) {
    console.log('[saveAthleteComment] Aucune donnée retournée mais pas d\'erreur');
    // Créer un objet de retour minimal
    return {
      id: 'temp-' + Date.now(),
      oderId: comment.oderId,
      sessionId: validSessionId ?? undefined,
      exerciseName: comment.exerciseName,
      comment: comment.comment,
      isRead: comment.isRead,
      createdAt: new Date().toISOString(),
    };
  }

  const row = data[0];
  console.log('[saveAthleteComment] Commentaire sauvegardé avec succès:', row);

  return {
    id: row.id,
    oderId: row.user_id,
    sessionId: row.session_id ?? undefined,
    exerciseName: row.exercise_name,
    comment: row.comment,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
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

// ===========================================
// ATHLETE GROUPS
// ===========================================

export async function fetchAthleteGroups(coachId: string): Promise<AthleteGroupWithCount[]> {
  const { data, error } = await supabase
    .from('athlete_groups')
    .select(`
      *,
      athlete_group_members (count)
    `)
    .eq('coach_id', coachId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching athlete groups:', error);
    throw error;
  }

  return (data || []).map(row => ({
    ...mapAthleteGroupRowToGroup(row as AthleteGroupRow),
    memberCount: (row as any).athlete_group_members?.[0]?.count || 0,
  }));
}

export async function createAthleteGroup(
  coachId: string,
  name: string,
  description: string,
  color: string
): Promise<void> {
  const { error } = await supabase
    .from('athlete_groups')
    .insert({
      coach_id: coachId,
      name,
      description,
      color,
    });

  if (error) {
    console.error('Error creating athlete group:', error);
    throw error;
  }
}

export async function updateAthleteGroup(
  groupId: string,
  name: string,
  description: string,
  color: string
): Promise<void> {
  const { error } = await supabase
    .from('athlete_groups')
    .update({ name, description, color })
    .eq('id', groupId);

  if (error) {
    console.error('Error updating athlete group:', error);
    throw error;
  }
}

export async function deleteAthleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('athlete_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting athlete group:', error);
    throw error;
  }
}

export async function updateGroupMembers(
  groupId: string,
  athleteIds: string[]
): Promise<void> {
  await supabase
    .from('athlete_group_members')
    .delete()
    .eq('group_id', groupId);

  if (athleteIds.length > 0) {
    const members = athleteIds.map(athleteId => ({
      group_id: groupId,
      athlete_id: athleteId,
    }));

    const { error } = await supabase
      .from('athlete_group_members')
      .insert(members);

    if (error) {
      console.error('Error updating group members:', error);
      throw error;
    }
  }
}

export async function fetchAthleteGroupWithMembers(groupId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('athlete_group_members')
    .select(`
      profiles:athlete_id (*)
    `)
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }

  return (data || [])
    .map(row => (row as any).profiles)
    .filter(Boolean)
    .map((profile: ProfileRow) => mapProfileToUser(profile));
}

export async function fetchAthleteGroupsForAthlete(athleteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('athlete_group_members')
    .select('group_id')
    .eq('athlete_id', athleteId);

  if (error) {
    console.error('Error fetching athlete groups:', error);
    return [];
  }

  return (data || []).map(row => row.group_id);
}

// ===========================================
// HELPER
// ===========================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
