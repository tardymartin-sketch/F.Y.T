import { supabase } from '../../supabaseClient';
import { SessionLog, ExerciseLog, SetLoad, MostUsedExercise, DefaultTemplate, mapSessionLogRowToSessionLog, mapSessionLogToRow } from '../../../types';
import { normalizeExerciseName, mergeFamilyAliases } from '../../utils/exerciseFamily';

function getLoadWeightKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  switch (load.type) {
    case 'single':
    case 'machine':
      return typeof load.weightKg === 'number' ? load.weightKg : null;
    case 'double':
      return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
    case 'barbell':
      return typeof load.barKg === 'number'
        ? load.barKg + (typeof load.addedKg === 'number' ? load.addedKg : 0)
        : null;
    case 'assisted':
      return typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    default:
      return null;
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/** ISO week number (1–53) for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Deduplicate exercise_usage rows by exercise_name (keep first = most recent).
 * Returns up to 8 unique entries.
 */
function deduplicateMostUsed(
  rows: Array<{ exercise_id: string | null; exercise_name: string; weight_kg: number | null; used_at: string }>
): MostUsedExercise[] {
  const seen = new Set<string>();
  const result: MostUsedExercise[] = [];
  for (const row of rows) {
    const key = row.exercise_name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        lastWeightKg: row.weight_kg,
        lastUsedAt: row.used_at,
      });
      if (result.length >= 8) break;
    }
  }
  return result;
}

/**
 * Given a list of exercises, look up the most recent weight_kg for each
 * from exercise_usage and return the exercises with prefilled set weights.
 * Only updates exercises that have a matching usage record.
 */
async function prefillWeightsFromUsage(
  userId: string,
  exercises: ExerciseLog[],
): Promise<ExerciseLog[]> {
  if (exercises.length === 0) return exercises;

  const names = exercises.map(ex => ex.exerciseName);
  const { data, error } = await supabase
    .from('exercise_usage')
    .select('exercise_name, weight_kg')
    .eq('user_id', userId)
    .in('exercise_name', names)
    .order('used_at', { ascending: false });

  if (error || !data || data.length === 0) return exercises;

  // Build map: name → most recent weight (first occurrence per name after sort)
  const weightMap = new Map<string, number | null>();
  for (const row of data) {
    const key = row.exercise_name.toLowerCase();
    if (!weightMap.has(key)) weightMap.set(key, row.weight_kg);
  }

  return exercises.map(ex => {
    const lastWeight = weightMap.get(ex.exerciseName.toLowerCase());
    if (lastWeight == null || !ex.sets || ex.sets.length === 0) return ex;
    return {
      ...ex,
      sets: ex.sets.map(s => ({ ...s, weight: String(lastWeight) })),
    };
  });
}

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
        .select('id, comments, session_rpe, momentum_score')
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
        momentumScore: sessionMeta.momentum_score ?? undefined,
      });
    });

    return result;
  },

  async saveSession(log: SessionLog, userId: string): Promise<void> {
    // 1. Upsert session_logs first (required by FK on exercise_logs.session_log_id)
    const sessionRow = mapSessionLogToRow(log, userId);
    const { error: sessionError } = await supabase
      .from('session_logs')
      .upsert(sessionRow, { onConflict: 'id' });

    if (sessionError) throw sessionError;

    // 2. Upsert exercise_logs rows
    if (log.exercises.length === 0) return;

    const now = new Date(log.date);
    const exerciseLogs = log.exercises.map((ex, idx) => ({
      user_id: userId,
      session_log_id: log.id,
      exercise_name: ex.exerciseName,
      sets_detail: ex.sets,
      notes: ex.notes,
      rpe: ex.rpe ?? null,
      date: log.date,
      year: parseInt(log.sessionKey.annee) || now.getFullYear(),
      week: parseInt(log.sessionKey.semaine) || getISOWeek(now),
      session_name: log.sessionKey.seance,
      exercise_order: idx,
    }));

    const { error } = await supabase
      .from('exercise_logs')
      .upsert(exerciseLogs);

    if (error) throw error;
  },

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await supabase.from('exercise_logs').delete().eq('session_log_id', sessionId).eq('user_id', userId);
  },

  // ─── Phase 1: Template API ───────────────────────────────────────────────

  /**
   * Fetch the user's templates (session_logs where is_template = true).
   * Returns pinned first, then sorted by date desc.
   */
  async getTemplates(userId: string): Promise<SessionLog[]> {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_template', true)
      .order('pinned', { ascending: false })
      .order('date', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapSessionLogRowToSessionLog);
  },

  /**
   * Mark a completed session as a template.
   * Converts session in-place (no duplicate row).
   */
  async setAsTemplate(
    sessionId: string,
    userId: string,
    templateName: string,
    pinned = false,
  ): Promise<void> {
    const { error } = await supabase
      .from('session_logs')
      .update({ is_template: true, template_name: templateName, pinned })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Clone a template session into a new draft session.
   * Returns the new session's ID.
   * On failure, cleans up the created row (rollback via delete).
   *
   * Optimistic pattern: caller should update Zustand immediately after calling
   * this and receiving the new ID, before awaiting the full completion.
   */
  async cloneSession(
    templateId: string,
    userId: string,
    cloneRequestId: string,
  ): Promise<{ sessionId: string; exercises: ExerciseLog[] }> {
    // 1. Fetch the template
    const { data: template, error: fetchErr } = await supabase
      .from('session_logs')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !template) throw new Error('Template not found');

    const exercises: ExerciseLog[] = template.exercises ?? [];
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();

    // 2. Create the new draft session
    const { error: insertErr } = await supabase
      .from('session_logs')
      .insert({
        id: newId,
        user_id: userId,
        date: today,
        exercises,
        status: 'draft',
        is_template: false,
        created_from_template_id: templateId,
        session_key_name: template.template_name ?? template.session_key_name,
        session_key_year: new Date().getFullYear(),
        session_key_week: getISOWeek(new Date()),
      });

    if (insertErr) {
      // Rollback: nothing to clean up since insert failed
      throw insertErr;
    }

    // 3. Prefill weights from exercise_usage (best-effort — don't fail clone if this errors)
    try {
      const prefilled = await prefillWeightsFromUsage(userId, exercises);
      if (prefilled.length > 0) {
        await supabase
          .from('session_logs')
          .update({ exercises: prefilled })
          .eq('id', newId)
          .eq('user_id', userId);
        return { sessionId: newId, exercises: prefilled };
      }
    } catch {
      // Weight prefill failed — proceed with original weights, don't block the clone
    }

    return { sessionId: newId, exercises };
  },

  /**
   * Insert exercise_usage rows after a session is completed.
   * Called from the store's updateMostUsedCache action.
   * One row per exercise, capturing the last weight/reps logged.
   */
  async recordExerciseUsage(
    sessionId: string,
    userId: string,
    exercises: ExerciseLog[],
  ): Promise<void> {
    if (exercises.length === 0) return;

    const rows = exercises
      .filter(ex => ex.sets && ex.sets.length > 0)
      .map(ex => {
        // Find the last completed set for weight/reps
        const completedSets = ex.sets.filter(s => s.completed);
        const lastSet = completedSets[completedSets.length - 1] ?? ex.sets[ex.sets.length - 1];
        const weightKg = lastSet
          ? (getLoadWeightKg(lastSet.load) ?? (lastSet.weight ? parseFloat(String(lastSet.weight)) || null : null))
          : null;
        const reps = lastSet ? parseInt(String(lastSet.reps)) || null : null;

        return {
          user_id: userId,
          session_id: sessionId,
          exercise_id: ex.exerciseId ?? null,
          exercise_name: ex.exerciseName,
          weight_kg: weightKg,
          reps,
          set_count: ex.sets.length,
          used_at: new Date().toISOString(),
        };
      });

    if (rows.length === 0) return;

    const { error } = await supabase.from('exercise_usage').insert(rows);
    if (error) throw error;
  },

  /**
   * Fetch pre-built default templates from the default_templates table.
   * Readable by all authenticated users (RLS: read-only).
   * Returns templates sorted by sort_order (pinned ones come first by convention).
   */
  async getDefaultTemplates(): Promise<DefaultTemplate[]> {
    const { data, error } = await supabase
      .from('default_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      emoji: row.emoji ?? '🏋️',
      category: row.category ?? '',
      exercises: row.exercises ?? [],
      pinned: row.pinned ?? false,
      sort_order: row.sort_order ?? 0,
    }));
  },

  /**
   * Fetch the exercise_family map: normalized exerciseName → family slug.
   * Only returns exercises with a non-null exercise_family, then merges the
   * alias table (EN/short-form names not present verbatim in the library).
   * Keys are normalized via normalizeExerciseName so lookups tolerate accents,
   * casing, punctuation and the " :: variante" suffix.
   * Intended to be cached indefinitely (static reference data).
   */
  async getExerciseFamilyMap(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('exercises')
      .select('name, exercise_family')
      .not('exercise_family', 'is', null)
      .is('deleted_at', null);

    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of (data ?? [])) {
      if (row.exercise_family) {
        map[normalizeExerciseName(row.name as string)] = row.exercise_family as string;
      }
    }
    return mergeFamilyAliases(map);
  },

  /**
   * Fetch the user's most-used exercises.
   * Query: top 20 rows by recency, deduplicate by exercise_name in JS.
   * Returns up to 8 unique exercises.
   */
  async getMostUsedExercises(userId: string): Promise<MostUsedExercise[]> {
    const { data, error } = await supabase
      .from('exercise_usage')
      .select('exercise_id, exercise_name, weight_kg, used_at')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return deduplicateMostUsed(data ?? []);
  },
};
