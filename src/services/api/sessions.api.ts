import { supabase } from '../../supabaseClient';
import { SessionLog } from '../../../types';

/**
 * Service pour la gestion des logs de sessions et d'exercices
 */
export const sessionsApi = {
  /**
   * Récupère l'historique des sessions d'un utilisateur
   */
  async getSessionHistory(userId: string): Promise<SessionLog[]> {
    // 1. Récupérer les exercise_logs
    const { data: exerciseLogs, error: logsError } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('session_log_id', { ascending: false })
      .order('exercise_order', { ascending: true });

    if (logsError) throw logsError;
    if (!exerciseLogs || exerciseLogs.length === 0) return [];

    // 2. Métadonnées des sessions
    const sessionLogIds = [...new Set(exerciseLogs.map(el => el.session_log_id))].filter(Boolean);
    const sessionsMap = new Map<string, any>();
    
    if (sessionLogIds.length > 0) {
      const { data: sessionsData } = await supabase
        .from('session_logs')
        .select('id, duration_minutes, comments, session_rpe')
        .in('id', sessionLogIds);

      (sessionsData || []).forEach((s: any) => {
        sessionsMap.set(s.id, s);
      });
    }

    // 3. Regroupement
    const sessionGroups = new Map<string, any[]>();
    exerciseLogs.forEach((el: any) => {
      const key = el.session_log_id || `manual-${el.date}`;
      if (!sessionGroups.has(key)) sessionGroups.set(key, []);
      sessionGroups.get(key)!.push(el);
    });

    const result: SessionLog[] = [];
    sessionGroups.forEach((logs, sessionId) => {
      const firstLog = logs[0];
      const sessionMeta = sessionsMap.get(sessionId) || {};

      result.push({
        id: sessionId,
        userId: firstLog.user_id,
        date: firstLog.date,
        durationMinutes: sessionMeta.duration_minutes,
        sessionKey: {
          annee: firstLog.year ? firstLog.year.toString() : '',
          moisNum: firstLog.month_num ? firstLog.month_num.toString() : '',
          semaine: firstLog.week ? firstLog.week.toString() : '',
          seance: firstLog.session_name || '',
        },
        exercises: logs.map(el => ({
          exerciseId: el.exercise_id || undefined,
          exerciseName: el.exercise_name,
          sets: (el.sets_detail || []).map((sd: any) => ({
            setNumber: sd.setNumber,
            reps: sd.reps,
            weight: sd.weight,
            completed: sd.completed,
            load: sd.load
          })),
          notes: el.notes || undefined,
          rpe: el.rpe || undefined,
        })),
        comments: sessionMeta.comments,
        sessionRpe: sessionMeta.session_rpe,
      });
    });

    return result;
  },

  async saveSession(log: SessionLog, userId: string): Promise<void> {
    // On garde l'upsert pour exercise_logs
    const exerciseLogs = log.exercises.map((ex, idx) => ({
      user_id: userId,
      session_log_id: log.id,
      exercise_name: ex.exerciseName,
      sets_detail: ex.sets,
      notes: ex.notes,
      date: log.date,
      year: parseInt(log.sessionKey.annee) || new Date(log.date).getFullYear(),
      month_num: parseInt(log.sessionKey.moisNum) || new Date(log.date).getMonth() + 1,
      week: parseInt(log.sessionKey.semaine) || 1,
      session_name: log.sessionKey.seance,
      exercise_order: idx
    }));

    const { error } = await supabase
      .from('exercise_logs')
      .upsert(exerciseLogs);

    if (error) throw error;
  },

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await supabase.from('exercise_logs').delete().eq('session_log_id', sessionId).eq('user_id', userId);
  }
};
