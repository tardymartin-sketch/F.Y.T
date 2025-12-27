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
  mapAthleteCommentToRow,
  AthleteGroupRow,
  AthleteGroup,
  AthleteGroupWithCount,
  mapAthleteGroupRowToGroup,
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
    .in('role', ['athlete', 'admin'])
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
      return null;
    }
    console.error('Error fetching active week organizer:', error);
    return null;
  }

  return {
    id: data.id,
    coachId: data.coach_id,
    title: data.title,
    startDate: data.start_date,
    endDate: data.end_date,
    message: data.message,
    createdAt: data.created_at,
    visibilityType: data.visibility_type,
    visibleToGroupIds: data.visible_to_group_ids,
    visibleToAthleteIds: data.visible_to_athlete_ids,
  };
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

  return {
    id: data.id,
    coachId: data.coach_id,
    title: data.title,
    startDate: data.start_date,
    endDate: data.end_date,
    message: data.message,
    createdAt: data.created_at,
    visibilityType: data.visibility_type,
    visibleToGroupIds: data.visible_to_group_ids,
    visibleToAthleteIds: data.visible_to_athlete_ids,
  };
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

// ===========================================
// ATHLETE GROUPS
// ===========================================

export async function fetchAthleteGroups(coachId: string): Promise<AthleteGroupWithCount[]> {
  const { data, error } = await supabase
    .from('athlete_groups')
    .select(`
      *,
      athlete_group_members(count)
    `)
    .eq('coach_id', coachId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching athlete groups:', error);
    throw error;
  }

  return (data || []).map(row => ({
    ...mapAthleteGroupRowToGroup(row),
    memberCount: row.athlete_group_members?.[0]?.count || 0,
  }));
}

export async function fetchAthleteGroupWithMembers(groupId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('athlete_group_members')
    .select(`
      athlete_id,
      profiles:athlete_id (*)
    `)
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }

  return (data || [])
    .map(row => row.profiles)
    .filter(Boolean)
    .map(mapProfileToUser);
}

export async function createAthleteGroup(
  coachId: string,
  name: string,
  description: string,
  color: string
): Promise<AthleteGroup> {
  const groupData = {
    id: crypto.randomUUID(),
    coach_id: coachId,
    name,
    description,
    color,
  };

  const { data, error } = await supabase
    .from('athlete_groups')
    .insert(groupData)
    .select()
    .single();

  if (error) {
    console.error('Error creating athlete group:', error);
    throw error;
  }

  return mapAthleteGroupRowToGroup(data);
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
  // Supprimer les anciens membres
  await supabase
    .from('athlete_group_members')
    .delete()
    .eq('group_id', groupId);

  // Ajouter les nouveaux membres
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

export async function fetchActiveWeekOrganizerForAthlete(
  coachId: string,
  athleteId: string
): Promise<WeekOrganizerLog | null> {
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
    console.error('Error fetching active week organizer:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Filtrer par visibilité
  const visible = data.find(log => {
    if (!log.visibility_type || log.visibility_type === 'all') return true;
    
    if (log.visibility_type === 'groups') {
      return athleteGroupIds.some(gid => log.visible_to_group_ids?.includes(gid));
    }
    
    if (log.visibility_type === 'athletes') {
      return log.visible_to_athlete_ids?.includes(athleteId);
    }
    
    return false;
  });

  if (!visible) return null;

  return {
    id: visible.id,
    coachId: visible.coach_id,
    title: visible.title,
    startDate: visible.start_date,
    endDate: visible.end_date,
    message: visible.message,
    createdAt: visible.created_at,
    visibilityType: visible.visibility_type,
    visibleToGroupIds: visible.visible_to_group_ids,
    visibleToAthleteIds: visible.visible_to_athlete_ids,
  };
}

// ===========================================
// HELPER
// ===========================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
