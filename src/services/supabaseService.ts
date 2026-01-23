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
  Exercise,
  ExerciseRow,
  mapExerciseRowToExercise,
  mapExerciseToRow,
  LoadType,
  LimbType,
  ExerciseType,
  AnalyticsCategory,
  SetDetailLog,
  ExerciseLogRow,
  ExerciseLogEntry,
  mapExerciseLogRowToEntry,
  ExerciseLog,
  SetLog,
  SetLoad,
  PRDetected,
} from '../../types';
import { syncUserBadgesProgress } from './badgeService';

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

/**
 * Récupère les programmes d'entraînement visibles par l'utilisateur connecté.
 * Fait une jointure avec la table exercises pour récupérer les détails.
 *
 * La visibilité est gérée automatiquement par les RLS Supabase :
 * - coach_id NULL → visible par tous
 * - coach_id = mon coach + athlete_target NULL → visible par tous les athlètes du coach
 * - coach_id = mon coach + athlete_target contient mon ID → visible
 *
 * @param _userId - Paramètre conservé pour compatibilité (non utilisé, RLS gère le filtrage)
 */
export async function fetchTrainingPlans(_userId?: string): Promise<WorkoutRow[]> {
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
    .order('year', { ascending: false })
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
// SESSION LOGS
// ===========================================

export async function saveSessionLog(log: SessionLog, userId: string): Promise<SessionLog> {
  console.log('[saveSessionLog] Début sauvegarde:', {
    logId: log.id,
    userId,
    sessionKey: log.sessionKey,
    exerciseCount: log.exercises?.length
  });

  const rowData = mapSessionLogToRow(log, userId);
  console.log('[saveSessionLog] Données mappées:', rowData);

  const { data, error } = await supabase
    .from('session_logs')
    .upsert(rowData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[saveSessionLog] Erreur Supabase:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log('[saveSessionLog] Sauvegarde réussie:', data);

  const savedLog = mapSessionLogRowToSessionLog(data as SessionLogRow);

  // Sauvegarder aussi dans exercise_logs pour analytics
  // IMPORTANT: Utiliser le log original (avec exerciseId) pas savedLog (qui vient de la DB sans exerciseId)
  const logWithId = { ...log, id: savedLog.id };
  try {
    console.log('[saveSessionLog] Appel saveExerciseLogs avec exerciseIds:',
      logWithId.exercises.map(ex => ({ name: ex.exerciseName, id: ex.exerciseId })));
    await saveExerciseLogs(savedLog.id, userId, logWithId);
  } catch (exerciseLogsError) {
    console.error('[saveSessionLog] Erreur exercise_logs (non bloquant):', exerciseLogsError);
  }

  try {
    await syncUserBadgesProgress(userId);
  } catch (badgeError) {
    console.error('[saveSessionLog] Erreur sync badges:', badgeError);
  }

  return savedLog;
}

export async function deleteSessionLog(sessionId: string): Promise<void> {
  // Récupérer l'utilisateur propriétaire avant suppression (utile pour resync badges)
  const { data: existing, error: fetchError } = await supabase
    .from('session_logs')
    .select('user_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching session log before delete:', fetchError);
  }

  const { error } = await supabase
    .from('session_logs')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session log:', error);
    throw error;
  }

  const userId = existing?.user_id;
  if (userId) {
    try {
      await syncUserBadgesProgress(userId);
    } catch (badgeError) {
      console.error('[deleteSessionLog] Erreur sync badges:', badgeError);
    }
  }
}

// ===========================================
// EXERCISE LOGS (Analytics)
// ===========================================

/**
 * Parse les reps : "2x8" → 16, "8" → 8
 */
function parseReps(repsStr: string): number {
  if (!repsStr) return 0;

  // Format "2x8" ou "2X8"
  const multiMatch = repsStr.match(/^(\d+)[xX](\d+)$/);
  if (multiMatch) {
    return parseInt(multiMatch[1]) * parseInt(multiMatch[2]);
  }

  // Format numérique simple
  const num = parseInt(repsStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse le poids : "20+10" → 30, "50" → 50, "Negative" → null
 */
function parseWeight(weightStr: string): number | null {
  if (!weightStr) return null;

  // Format texte (Negative, Négative, PDC, etc.) → null
  if (/^[a-zA-ZÀ-ÿ\s]+$/.test(weightStr)) {
    return null;
  }

  // Format avec addition "20+10" ou "5+5"
  if (weightStr.includes('+')) {
    const parts = weightStr.replace(',', '.').split('+');
    const total = parts.reduce((sum, part) => {
      const num = parseFloat(part.trim());
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    return total > 0 ? total : null;
  }

  // Format numérique simple (avec virgule européenne)
  const num = parseFloat(weightStr.replace(',', '.'));
  return isNaN(num) ? null : num;
}

/**
 * Détecte le type de charge pour une valeur de poids
 */
function detectLoadTypeForWeight(weight: string): LoadType {
  if (!weight || weight === '') return 'bodyweight';

  // Texte = assisted
  if (/^[a-zA-ZÀ-ÿ\s]+$/.test(weight)) {
    return 'assisted';
  }

  // Addition = additive
  if (weight.includes('+')) {
    return 'additive';
  }

  // Zéro = bodyweight
  if (/^0+([,.]0+)?$/.test(weight)) {
    return 'bodyweight';
  }

  return 'numeric';
}

/**
 * Détermine le type majoritaire parmi les sets (égalité → 1er utilisé)
 */
function getMajorityLoadType(sets: SetLog[]): LoadType {
  const completedSets = sets.filter(s => s.completed);
  if (completedSets.length === 0) return 'bodyweight';

  // Compter chaque type et noter le 1er index
  const typeCounts = new Map<LoadType, { count: number; firstIndex: number }>();

  completedSets.forEach((set, index) => {
    const loadType = detectLoadTypeForWeight(set.weight);
    const existing = typeCounts.get(loadType);
    if (existing) {
      existing.count++;
    } else {
      typeCounts.set(loadType, { count: 1, firstIndex: index });
    }
  });

  // Trouver le type majoritaire (égalité → 1er index gagne)
  let result: LoadType = 'bodyweight';
  let maxCount = 0;
  let minFirstIndex = Infinity;

  typeCounts.forEach((data, loadType) => {
    if (data.count > maxCount ||
        (data.count === maxCount && data.firstIndex < minFirstIndex)) {
      maxCount = data.count;
      result = loadType;
      minFirstIndex = data.firstIndex;
    }
  });

  return result;
}

/**
 * Détecte si une valeur de reps est un temps (30s, 1:30, etc.)
 */
function detectExerciseType(repsStr: string): ExerciseType {
  if (!repsStr || repsStr === '') return 'reps';

  // Format "30s", "45sec", "30 seconds"
  if (/^\d+\s*(s|sec|seconds?)$/i.test(repsStr)) return 'time';

  // Format "1:30" (min:sec)
  if (/^\d+:\d+$/.test(repsStr)) return 'time';

  // Format "1min", "2minutes"
  if (/^\d+\s*(min|minutes?)$/i.test(repsStr)) return 'time';

  // Format "1'30" (min'sec)
  if (/^\d+'\d+$/.test(repsStr)) return 'time';

  return 'reps';
}

/**
 * Parse le temps en secondes : "30s" → 30, "1:30" → 90
 */
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;

  // Format "30s" ou "30sec"
  if (/^\d+\s*(s|sec|seconds?)$/i.test(timeStr)) {
    return parseInt(timeStr.replace(/[^0-9]/g, ''));
  }

  // Format "1:30" (min:sec)
  const colonMatch = timeStr.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  // Format "1min" ou "2minutes"
  if (/^\d+\s*(min|minutes?)$/i.test(timeStr)) {
    return parseInt(timeStr.replace(/[^0-9]/g, '')) * 60;
  }

  // Format "1'30" (min'sec)
  const quoteMatch = timeStr.match(/^(\d+)'(\d+)$/);
  if (quoteMatch) {
    return parseInt(quoteMatch[1]) * 60 + parseInt(quoteMatch[2]);
  }

  return 0;
}

/**
 * Détermine le type majoritaire d'exercice (reps ou time)
 */
function getMajorityExerciseType(sets: SetLog[]): ExerciseType {
  const completedSets = sets.filter(s => s.completed);
  if (completedSets.length === 0) return 'reps';

  let timeCount = 0;
  let repsCount = 0;

  completedSets.forEach(s => {
    if (detectExerciseType(s.reps) === 'time') {
      timeCount++;
    } else {
      repsCount++;
    }
  });

  return timeCount > repsCount ? 'time' : 'reps';
}

/**
 * Enrichit les sets avec loadType, exerciseType calculés
 * et préserve les données brutes saisies par l'athlète (load)
 */
function enrichSetsWithLoadType(sets: SetLog[]): SetDetailLog[] {
  return sets.map((s, index) => ({
    setNumber: s.setNumber ?? index + 1,
    reps: s.reps,
    weight: s.weight,
    loadType: detectLoadTypeForWeight(s.weight),
    exerciseType: detectExerciseType(s.reps),
    completed: s.completed,
    // Préserver les données brutes du type d'équipement (Haltère, Barre, Machine, etc.)
    load: s.load,
  }));
}

/**
 * Détermine la catégorie analytics depuis le code du movement_pattern
 */
function getAnalyticsCategory(patternCode?: string): AnalyticsCategory {
  if (!patternCode) return 'other';

  const pushPatterns = ['horizontal_push', 'vertical_push', 'elbow_extension'];
  const pullPatterns = ['horizontal_pull', 'vertical_pull', 'scapular_retraction', 'scapular_protraction'];
  const squatPatterns = ['squat', 'lunge', 'step_up', 'leg_extension'];
  const hingePatterns = ['hinge', 'hip_thrust', 'leg_curl'];
  const corePatterns = ['anti_extension', 'anti_rotation', 'anti_lateral_flexion', 'flexion', 'extension', 'rotation'];

  if (pushPatterns.includes(patternCode)) return 'push';
  if (pullPatterns.includes(patternCode)) return 'pull';
  if (squatPatterns.includes(patternCode)) return 'legs_squat';
  if (hingePatterns.includes(patternCode)) return 'legs_hinge';
  if (corePatterns.includes(patternCode)) return 'core';
  if (patternCode === 'elbow_flexion') return 'arms';

  return 'other';
}

/**
 * Extrait le poids effectif depuis un SetLoad structuré
 * @returns poids en kg (positif pour poids, négatif pour assistance, null pour distance/bodyweight)
 */
function getWeightFromSetLoad(load: SetLoad | undefined): number | null {
  if (!load) return null;

  switch (load.type) {
    case 'single':
    case 'machine':
      return typeof load.weightKg === 'number' ? load.weightKg : null;
    case 'double':
      return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
    case 'barbell':
      if (typeof load.barKg !== 'number') return null;
      const added = typeof load.addedKg === 'number' ? load.addedKg : 0;
      return load.barKg + added;
    case 'assisted':
      // Retourne une valeur négative pour l'assistance
      return typeof load.assistanceKg === 'number' ? -load.assistanceKg : null;
    case 'distance':
      // Distance n'a pas de poids
      return null;
    default:
      return null;
  }
}

/**
 * Détermine si un set est de type assisted (depuis load structuré ou détection legacy)
 */
function isAssistedSet(set: SetLog): boolean {
  if (set.load?.type === 'assisted') return true;
  return detectLoadTypeForWeight(set.weight) === 'assisted';
}

/**
 * Détermine si un set est de type distance (depuis load structuré)
 */
function isDistanceSet(set: SetLog): boolean {
  return set.load?.type === 'distance';
}

/**
 * Calcule les métriques d'un exercice à partir de ses sets
 * @param sets - Les séries de l'exercice
 * @param limbType - Type de mouvement (bilateral/unilateral/asymmetrical)
 * @param userBodyweight - Poids de l'utilisateur (pour calcul volume bodyweight)
 */
function calculateExerciseMetrics(
  sets: SetLog[],
  limbType: LimbType = 'bilateral',
  userBodyweight: number | null = null
): {
  exerciseType: ExerciseType;
  loadType: LoadType;
  setsCount: number;
  totalReps: number;
  maxWeight: number | null;
  avgWeight: number | null;
  totalVolume: number | null;
  setsDetail: SetDetailLog[];
} {
  const completedSets = sets.filter(s => s.completed);
  const exerciseType = getMajorityExerciseType(sets);
  const loadType = getMajorityLoadType(sets);
  const setsDetail = enrichSetsWithLoadType(sets);

  // Multiplicateur pour exercices unilatéraux (8 reps/côté → 16 total)
  const repsMultiplier = limbType === 'unilateral' ? 2 : 1;

  // Parser les poids avec gestion des SetLoad structurés et legacy "20+10" → 30
  // Exclure les sets assisted et distance du calcul de poids max/avg
  const weights = completedSets
    .filter(s => !isAssistedSet(s) && !isDistanceSet(s))
    .map(s => {
      // Priorité au SetLoad structuré s'il existe
      const loadWeight = getWeightFromSetLoad(s.load);
      if (loadWeight !== null && loadWeight > 0) return loadWeight;
      // Fallback sur parsing legacy
      return parseWeight(s.weight);
    })
    .filter((w): w is number => w !== null && w > 0);

  // Pour les exercices chronométrés: total_reps = temps total en secondes
  // Pour les exercices reps: parsing normal avec gestion "2x8" et unilatéral
  let totalReps: number;
  if (exerciseType === 'time') {
    totalReps = completedSets.reduce((sum, s) => {
      return sum + parseTimeToSeconds(s.reps);
    }, 0);
  } else {
    totalReps = completedSets.reduce((sum, s) => {
      const parsedReps = parseReps(s.reps);
      const isOldFormat = /^\d+[xX]\d+$/.test(s.reps);
      return sum + (isOldFormat ? parsedReps : parsedReps * repsMultiplier);
    }, 0);
  }

  // Volume = NULL pour exercices chronométrés (pas de sens)
  let totalVolume: number | null = null;
  if (exerciseType !== 'time') {
    // Volume par set selon le type de charge
    // - assisted: volume = (bodyweight - assistance) × reps si bodyweight disponible
    // - distance: pas de volume (exclu)
    // - bodyweight: reps × userBodyweight
    // - numeric/additive: reps × weight
    totalVolume = completedSets.reduce((sum, s) => {
      const parsedReps = parseReps(s.reps);
      const isOldFormat = /^\d+[xX]\d+$/.test(s.reps);
      const reps = isOldFormat ? parsedReps : parsedReps * repsMultiplier;

      // Type distance : pas de volume
      if (isDistanceSet(s)) {
        return sum;
      }

      // Type assisted : volume = (bodyweight - assistance) × reps
      if (isAssistedSet(s)) {
        if (!userBodyweight) return sum; // Pas de bodyweight = pas de volume
        let assistance = 0;
        if (s.load?.type === 'assisted' && typeof s.load.assistanceKg === 'number') {
          assistance = s.load.assistanceKg;
        }
        const effectiveWeight = Math.max(0, userBodyweight - assistance);
        return sum + (reps * effectiveWeight);
      }

      // Priorité au SetLoad structuré
      const loadWeight = getWeightFromSetLoad(s.load);
      if (loadWeight !== null && loadWeight > 0) {
        return sum + (reps * loadWeight);
      }

      // Détection legacy
      const setLoadType = detectLoadTypeForWeight(s.weight);

      if (setLoadType === 'bodyweight') {
        // Utiliser poids du corps si disponible
        return sum + (userBodyweight ? reps * userBodyweight : 0);
      }

      // numeric ou additive: parser le poids
      const weight = parseWeight(s.weight) || 0;
      return sum + (reps * weight);
    }, 0);
  }

  return {
    exerciseType,
    loadType,
    setsCount: sets.length,
    totalReps,
    maxWeight: weights.length > 0 ? Math.max(...weights) : null,
    avgWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null,
    totalVolume: totalVolume && totalVolume > 0 ? totalVolume : null,
    setsDetail,
  };
}

/**
 * Sauvegarde les exercise_logs pour une session
 * Appelé automatiquement par saveSessionLog()
 */
export async function saveExerciseLogs(
  sessionLogId: string,
  userId: string,
  sessionLog: SessionLog
): Promise<void> {
  // Supprimer les anciens exercise_logs de cette session (pour update)
  await supabase
    .from('exercise_logs')
    .delete()
    .eq('session_log_id', sessionLogId);

  // Récupérer les exerciseIds pour obtenir limb_type + catégorisation
  const exerciseIds = sessionLog.exercises
    .map(ex => ex.exerciseId)
    .filter((id): id is string => !!id);

  // Fetch limb_type + muscle_group + movement_pattern pour chaque exercice
  let limbTypeMap: Record<string, LimbType> = {};
  let muscleGroupMap: Record<string, { id: string; name: string }> = {};
  let movementPatternMap: Record<string, { id: string; name: string; code: string }> = {};

  if (exerciseIds.length > 0) {
    // 1. Récupérer les exercices avec leurs FK
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, limb_type, primary_muscle_group_id, movement_pattern_id')
      .in('id', exerciseIds);

    if (exercisesError) {
      console.error('[saveExerciseLogs] Erreur fetch exercises:', exercisesError);
    }

    if (exercisesData && exercisesData.length > 0) {
      // Collecter les IDs de muscle_groups et movement_patterns
      const muscleGroupIds = exercisesData
        .map(e => e.primary_muscle_group_id)
        .filter((id): id is string => !!id);
      const movementPatternIds = exercisesData
        .map(e => e.movement_pattern_id)
        .filter((id): id is string => !!id);

      // 2. Récupérer les muscle_groups
      let muscleGroupsById: Record<string, string> = {};
      if (muscleGroupIds.length > 0) {
        const { data: mgData } = await supabase
          .from('muscle_groups')
          .select('id, name_fr')
          .in('id', muscleGroupIds);
        if (mgData) {
          mgData.forEach((mg: any) => {
            muscleGroupsById[mg.id] = mg.name_fr;
          });
        }
      }

      // 3. Récupérer les movement_patterns
      let movementPatternsById: Record<string, { name: string; code: string }> = {};
      if (movementPatternIds.length > 0) {
        const { data: mpData } = await supabase
          .from('movement_patterns')
          .select('id, name_fr, code')
          .in('id', movementPatternIds);
        if (mpData) {
          mpData.forEach((mp: any) => {
            movementPatternsById[mp.id] = { name: mp.name_fr, code: mp.code };
          });
        }
      }

      // 4. Construire les maps finales
      exercisesData.forEach((e: any) => {
        limbTypeMap[e.id] = (e.limb_type as LimbType) || 'bilateral';

        if (e.primary_muscle_group_id && muscleGroupsById[e.primary_muscle_group_id]) {
          muscleGroupMap[e.id] = {
            id: e.primary_muscle_group_id,
            name: muscleGroupsById[e.primary_muscle_group_id],
          };
        }

        if (e.movement_pattern_id && movementPatternsById[e.movement_pattern_id]) {
          movementPatternMap[e.id] = {
            id: e.movement_pattern_id,
            name: movementPatternsById[e.movement_pattern_id].name,
            code: movementPatternsById[e.movement_pattern_id].code,
          };
        }
      });

      console.log('[saveExerciseLogs] Maps construites:', {
        limbTypeMap,
        muscleGroupMap,
        movementPatternMap
      });
    }
  }

  // Fetch poids utilisateur pour calcul volume bodyweight
  let userBodyweight: number | null = null;
  const { data: profileData } = await supabase
    .from('profiles')
    .select('weight')
    .eq('id', userId)
    .single();
  if (profileData?.weight) {
    userBodyweight = profileData.weight;
  }

  // Préparer les nouvelles lignes (avec index pour exercise_order)
  let rows: any[] = [];

  // Créer une ligne pour chaque exercice (même si sets est vide)
  // Si la séance n'a aucun exercice (exercises.length === 0), on ne crée rien
  // car session_logs contient déjà les métadonnées de la séance
  rows = sessionLog.exercises.map((ex, index) => {
    const limbType = ex.exerciseId ? limbTypeMap[ex.exerciseId] || 'bilateral' : 'bilateral';
    const metrics = calculateExerciseMetrics(ex.sets, limbType, userBodyweight);

    // Récupérer les données de catégorisation pour cet exercice
    const muscleGroup = ex.exerciseId ? muscleGroupMap[ex.exerciseId] : undefined;
    const movementPattern = ex.exerciseId ? movementPatternMap[ex.exerciseId] : undefined;
    const analyticsCategory = movementPattern
      ? getAnalyticsCategory(movementPattern.code)
      : undefined;

    // Calculer le 1RM estimé
    const estimated1rm = getEstimated1RMFromSets(ex.sets);

    return {
      session_log_id: sessionLogId,
      user_id: userId,
      exercise_id: ex.exerciseId || null,
      exercise_name: ex.exerciseName,
      date: sessionLog.date,
      year: parseInt(sessionLog.sessionKey.annee) || new Date(sessionLog.date).getFullYear(),
      week: parseInt(sessionLog.sessionKey.semaine) || 1,
      session_name: sessionLog.sessionKey.seance || null,
      exercise_order: index + 1,  // 1-based order
      exercise_type: metrics.exerciseType,
      load_type: metrics.loadType,
      limb_type: limbType,
      muscle_group_id: muscleGroup?.id || null,
      muscle_group_name: muscleGroup?.name || null,
      movement_pattern_id: movementPattern?.id || null,
      movement_pattern_name: movementPattern?.name || null,
      analytics_category: analyticsCategory || null,
      sets_count: metrics.setsCount,
      total_reps: metrics.totalReps,
      max_weight: metrics.maxWeight,
      avg_weight: metrics.avgWeight,
      total_volume: metrics.totalVolume,
      estimated_1rm: estimated1rm > 0 ? estimated1rm : null,  // 1RM estimé via formule Epley
      rpe: ex.rpe || null,
      sets_detail: metrics.setsDetail,  // Enrichi avec loadType et exerciseType par set
      notes: ex.notes || null,
    };
  });

  // Si aucun exercice, ne rien insérer (la séance existe dans session_logs)
  if (rows.length === 0) {
    console.log('[saveExerciseLogs] Séance sans exercices, pas d\'insertion dans exercise_logs:', sessionLogId);
    return;
  }

  const { error } = await supabase
    .from('exercise_logs')
    .insert(rows);

  if (error) {
    console.error('Error saving exercise logs:', error);
    // Ne pas throw - c'est une table secondaire
  }
}

/**
 * Récupère l'historique d'un exercice pour un utilisateur
 */
export async function fetchExerciseHistory(
  userId: string,
  exerciseName: string,
  limit: number = 50
): Promise<ExerciseLogEntry[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching exercise history:', error);
    throw error;
  }

  return (data as ExerciseLogRow[]).map(mapExerciseLogRowToEntry);
}

/**
 * Récupère le PR (record personnel) pour chaque exercice
 */
export async function fetchPersonalRecords(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('exercise_name, max_weight')
    .eq('user_id', userId)
    .not('max_weight', 'is', null)
;

  if (error) {
    console.error('Error fetching PRs:', error);
    throw error;
  }

  // Grouper par exercice et prendre le max
  const prs: Record<string, number> = {};
  (data || []).forEach(row => {
    const current = prs[row.exercise_name] || 0;
    if (row.max_weight > current) {
      prs[row.exercise_name] = row.max_weight;
    }
  });

  return prs;
}

/**
 * Récupère le volume total par semaine (N dernières semaines)
 */
export async function fetchWeeklyVolume(
  userId: string,
  weeksBack: number = 12
): Promise<{ year: number; week: number; totalVolume: number; sessionCount: number }[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('year, week, total_volume, session_log_id')
    .eq('user_id', userId)
    .not('total_volume', 'is', null)
    .order('year', { ascending: false })
    .order('week', { ascending: false });

  if (error) {
    console.error('Error fetching weekly volume:', error);
    throw error;
  }

  // Agréger par semaine avec comptage de sessions
  const weeklyMap = new Map<string, { totalVolume: number; sessions: Set<string> }>();
  (data || []).forEach(row => {
    const key = `${row.year}-${row.week}`;
    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, { totalVolume: 0, sessions: new Set() });
    }
    const entry = weeklyMap.get(key)!;
    entry.totalVolume += row.total_volume || 0;
    entry.sessions.add(row.session_log_id);
  });

  const result = Array.from(weeklyMap.entries())
    .map(([key, data]) => {
      const [year, week] = key.split('-').map(Number);
      return { year, week, totalVolume: data.totalVolume, sessionCount: data.sessions.size };
    })
    .sort((a, b) => b.year * 100 + b.week - (a.year * 100 + a.week)) // Plus récent d'abord
    .slice(0, weeksBack);

  return result;
}

/**
 * Compare un exercice entre deux périodes
 */
export async function compareExercisePeriods(
  userId: string,
  exerciseName: string,
  period1: { startDate: string; endDate: string },
  period2: { startDate: string; endDate: string }
): Promise<{
  period1: { avgWeight: number; avgReps: number; avgVolume: number; count: number };
  period2: { avgWeight: number; avgReps: number; avgVolume: number; count: number };
  progression: { weight: number; reps: number; volume: number };
}> {
  const fetchPeriodStats = async (start: string, end: string) => {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('max_weight, total_reps, total_volume')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
        .gte('date', start)
      .lte('date', end);

    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) {
      return { avgWeight: 0, avgReps: 0, avgVolume: 0, count: 0 };
    }

    return {
      avgWeight: rows.reduce((s, r) => s + (r.max_weight || 0), 0) / rows.length,
      avgReps: rows.reduce((s, r) => s + (r.total_reps || 0), 0) / rows.length,
      avgVolume: rows.reduce((s, r) => s + (r.total_volume || 0), 0) / rows.length,
      count: rows.length,
    };
  };

  const [stats1, stats2] = await Promise.all([
    fetchPeriodStats(period1.startDate, period1.endDate),
    fetchPeriodStats(period2.startDate, period2.endDate),
  ]);

  const calcProgression = (v1: number, v2: number) =>
    v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;

  return {
    period1: stats1,
    period2: stats2,
    progression: {
      weight: calcProgression(stats1.avgWeight, stats2.avgWeight),
      reps: calcProgression(stats1.avgReps, stats2.avgReps),
      volume: calcProgression(stats1.avgVolume, stats2.avgVolume),
    },
  };
}

// ===========================================
// HISTORY FROM EXERCISE_LOGS (Nouvelle source)
// ===========================================

/**
 * Récupère l'historique des séances depuis exercise_logs (table dénormalisée)
 * Reconstruit la structure SessionLog attendue par les composants
 */
export async function fetchSessionLogsFromExerciseLogs(userId: string): Promise<SessionLog[]> {
  // 1. Récupérer tous les exercise_logs de l'utilisateur
  // Tri par date de séance effective (pas created_at), puis par session_id pour stabilité
  const { data: exerciseLogs, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('session_log_id', { ascending: false })
    .order('exercise_order', { ascending: true });

  if (error) {
    console.error('Error fetching exercise logs for history:', error);
    throw error;
  }

  if (!exerciseLogs || exerciseLogs.length === 0) {
    return [];
  }

  // 2. Récupérer les métadonnées des sessions depuis session_logs
  const sessionIds = [...new Set(exerciseLogs.map(el => el.session_log_id))];
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('session_logs')
    .select('id, duration_minutes, comments, session_rpe')
    .in('id', sessionIds);

  if (sessionsError) {
    console.error('Error fetching session metadata:', sessionsError);
  }

  const sessionsMap = new Map<string, { durationMinutes?: number; comments?: string; sessionRpe?: number }>();
  (sessionsData || []).forEach((s: any) => {
    sessionsMap.set(s.id, {
      durationMinutes: s.duration_minutes,
      comments: s.comments,
      sessionRpe: s.session_rpe,
    });
  });

  // 3. Grouper les exercise_logs par session_log_id
  const sessionGroups = new Map<string, ExerciseLogRow[]>();
  exerciseLogs.forEach((el: ExerciseLogRow) => {
    const key = el.session_log_id;
    if (!sessionGroups.has(key)) {
      sessionGroups.set(key, []);
    }
    sessionGroups.get(key)!.push(el);
  });

  // 4. Reconstruire SessionLog[] pour chaque session
  const sessionLogs: SessionLog[] = [];

  sessionGroups.forEach((logs, sessionId) => {
    // Trier par exercise_order
    logs.sort((a, b) => a.exercise_order - b.exercise_order);

    const firstLog = logs[0];
    const sessionMeta = sessionsMap.get(sessionId) || {};

    // Reconstruire les ExerciseLog depuis les exercise_logs
    // Inclut les données brutes (load) pour préserver le type d'équipement
    const exercises: ExerciseLog[] = logs.map(el => ({
      exerciseId: el.exercise_id || undefined,
      exerciseName: el.exercise_name,
      sets: (el.sets_detail || []).map((sd: any) => ({
        setNumber: sd.setNumber,
        reps: sd.reps,
        weight: sd.weight,
        completed: sd.completed,
        // Restaurer les données brutes du type d'équipement (Haltère, Barre, Machine, etc.)
        load: sd.load || undefined,
      })),
      notes: el.notes || undefined,
      rpe: el.rpe || undefined,
    }));

    const sessionLog: SessionLog = {
      id: sessionId,
      userId: firstLog.user_id,
      date: firstLog.date,
      durationMinutes: sessionMeta.durationMinutes,
      sessionKey: {
        annee: firstLog.year.toString(),
        moisNum: '',
        semaine: firstLog.week.toString(),
        seance: firstLog.session_name || '',
      },
      exercises,
      comments: sessionMeta.comments,
      sessionRpe: sessionMeta.sessionRpe,
    };

    sessionLogs.push(sessionLog);
  });

  // 5. Trier par date décroissante
  sessionLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return sessionLogs;
}

/**
 * Récupère l'historique d'un exercice spécifique avec les détails des séries
 * Retourne les données enrichies depuis exercise_logs
 */
export async function fetchExerciseHistoryDetailed(
  userId: string,
  exerciseName: string,
  limit: number = 20
): Promise<{
  date: string;
  sessionName: string;
  sets: { reps: string; weight: string; completed: boolean }[];
  rpe?: number;
  maxWeight?: number;
  totalVolume?: number;
  muscleGroupName?: string;
  analyticsCategory?: string;
}[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching detailed exercise history:', error);
    throw error;
  }

  return (data || []).map((el: ExerciseLogRow) => ({
    date: el.date,
    sessionName: el.session_name || '',
    sets: (el.sets_detail || []).map((sd: any) => ({
      reps: sd.reps,
      weight: sd.weight,
      completed: sd.completed,
    })),
    rpe: el.rpe || undefined,
    maxWeight: el.max_weight ? Number(el.max_weight) : undefined,
    totalVolume: el.total_volume ? Number(el.total_volume) : undefined,
    muscleGroupName: el.muscle_group_name || undefined,
    analyticsCategory: el.analytics_category || undefined,
  }));
}

/**
 * Récupère les stats mensuelles depuis exercise_logs
 */
export async function fetchMonthlyStatsFromExerciseLogs(
  userId: string,
  year: number,
  month: number
): Promise<{
  totalSessions: number;
  totalDuration: number;
  totalVolume: number;
  avgRpe: number;
  exerciseCount: number;
}> {
  // Calculer les dates de début et fin du mois
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Dernier jour du mois

  const { data, error } = await supabase
    .from('exercise_logs')
    .select('session_log_id, total_volume, rpe, exercise_name')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching monthly stats:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return { totalSessions: 0, totalDuration: 0, totalVolume: 0, avgRpe: 0, exerciseCount: 0 };
  }

  // Nombre de sessions uniques
  const uniqueSessions = new Set(data.map(d => d.session_log_id));

  // Volume total
  const totalVolume = data.reduce((sum, d) => sum + (Number(d.total_volume) || 0), 0);

  // RPE moyen (seulement si renseigné)
  const rpeValues = data.filter(d => d.rpe != null).map(d => d.rpe!);
  const avgRpe = rpeValues.length > 0
    ? rpeValues.reduce((sum, r) => sum + r, 0) / rpeValues.length
    : 0;

  // Récupérer la durée totale depuis session_logs
  let totalDuration = 0;
  if (uniqueSessions.size > 0) {
    const { data: sessionsData } = await supabase
      .from('session_logs')
      .select('duration_minutes')
      .in('id', Array.from(uniqueSessions));
    totalDuration = (sessionsData || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  }

  return {
    totalSessions: uniqueSessions.size,
    totalDuration,
    totalVolume,
    avgRpe: Math.round(avgRpe * 10) / 10,
    exerciseCount: data.length,
  };
}

/**
 * Récupère la liste des exercices uniques effectués par un utilisateur
 */
export async function fetchUniqueExercises(userId: string): Promise<{
  exerciseName: string;
  exerciseId?: string;
  lastPerformed: string;
  totalOccurrences: number;
  muscleGroupName?: string;
  analyticsCategory?: string;
}[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('exercise_id, exercise_name, date, muscle_group_name, analytics_category')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching unique exercises:', error);
    throw error;
  }

  // Grouper par exercice
  const exerciseMap = new Map<string, {
    exerciseId?: string;
    lastPerformed: string;
    count: number;
    muscleGroupName?: string;
    analyticsCategory?: string;
  }>();

  (data || []).forEach((el: any) => {
    const name = el.exercise_name;
    if (!exerciseMap.has(name)) {
      exerciseMap.set(name, {
        exerciseId: el.exercise_id || undefined,
        lastPerformed: el.date,
        count: 1,
        muscleGroupName: el.muscle_group_name || undefined,
        analyticsCategory: el.analytics_category || undefined,
      });
    } else {
      exerciseMap.get(name)!.count++;
    }
  });

  return Array.from(exerciseMap.entries()).map(([name, data]) => ({
    exerciseName: name,
    exerciseId: data.exerciseId,
    lastPerformed: data.lastPerformed,
    totalOccurrences: data.count,
    muscleGroupName: data.muscleGroupName,
    analyticsCategory: data.analyticsCategory,
  }));
}

// ===========================================
// DATA SCIENCE - 1RM & PR DETECTION
// ===========================================

/**
 * Calcule le 1RM estimé avec la formule Epley
 * @param weight - Poids utilisé (kg)
 * @param reps - Nombre de répétitions
 * @returns 1RM estimé ou 0 si données invalides
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  // Formule Epley : 1RM = weight × (1 + reps/30)
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

/**
 * Extrait le poids effectif depuis un SetLoad structuré (pour calcul 1RM)
 * @returns poids en kg (positif uniquement), null pour assisted/distance
 */
function getWeightFromSetLoadFor1RM(load: SetLoad | undefined): number | null {
  if (!load) return null;

  switch (load.type) {
    case 'single':
    case 'machine':
      return typeof load.weightKg === 'number' && load.weightKg > 0 ? load.weightKg : null;
    case 'double':
      return typeof load.weightKg === 'number' && load.weightKg > 0 ? load.weightKg * 2 : null;
    case 'barbell':
      if (typeof load.barKg !== 'number') return null;
      const added = typeof load.addedKg === 'number' ? load.addedKg : 0;
      const total = load.barKg + added;
      return total > 0 ? total : null;
    case 'assisted':
    case 'distance':
      // Pas de 1RM pour ces types
      return null;
    default:
      return null;
  }
}

/**
 * Calcule le meilleur 1RM estimé à partir des séries d'un exercice
 * Prend en compte les SetLoad structurés et le fallback sur weight texte
 * @param sets - Séries de l'exercice
 * @returns Meilleur 1RM estimé ou 0 si aucune donnée valide
 */
export function getEstimated1RMFromSets(sets: SetLog[]): number {
  const completedSets = sets.filter(s => s.completed);
  if (completedSets.length === 0) return 0;

  let best1RM = 0;

  for (const set of completedSets) {
    // Skip assisted et distance
    if (set.load?.type === 'assisted' || set.load?.type === 'distance') {
      continue;
    }

    // Extraire le poids
    let weight: number | null = null;

    // Priorité au SetLoad structuré
    if (set.load) {
      weight = getWeightFromSetLoadFor1RM(set.load);
    }

    // Fallback sur parsing du champ weight texte
    if (weight === null && set.weight) {
      const parsed = parseFloat(set.weight.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        weight = parsed;
      }
    }

    if (weight === null || weight <= 0) continue;

    // Extraire les reps (ignorer formats temps)
    const repsStr = set.reps;
    if (!repsStr || /[:\']/.test(repsStr) || /^\d+\s*(s|sec|min)/i.test(repsStr)) {
      continue; // Skip formats temps
    }

    let reps: number;
    // Format "2x8" ou "2X8"
    const multiMatch = repsStr.match(/^(\d+)[xX](\d+)$/);
    if (multiMatch) {
      reps = parseInt(multiMatch[1]) * parseInt(multiMatch[2]);
    } else {
      reps = parseInt(repsStr);
    }

    if (isNaN(reps) || reps <= 0) continue;

    // Calculer 1RM
    const estimated1RM = calculateEstimated1RM(weight, reps);
    if (estimated1RM > best1RM) {
      best1RM = estimated1RM;
    }
  }

  return best1RM;
}

// Types pour les nouvelles fonctions analytics
export interface CategoryDistribution {
  category: AnalyticsCategory;
  totalVolume: number;
  sessionCount: number;
  percentage: number;
}

export interface DailyVolume {
  date: string;
  totalVolume: number;
  sessionCount: number;
  avgRpe: number | null;
}

export interface GhostSession {
  date: string;
  sessionLogId: string;
  sets: SetDetailLog[];
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
  // Nouvelles propriétés pour le Ghost Mode basé sur le tonnage
  setCount: number;       // Nombre de séries du record
  avgReps: number;        // Moyenne des reps du record
  avgWeight: number;      // Moyenne de la charge du record
}

export interface PRCheckResult {
  isNewPR: boolean;
  prType: 'weight' | 'volume' | '1rm' | null;
  exerciseName: string;
  previousRecord: number;
  newRecord: number;
  improvement: number; // en %
}

export interface WeeklyRPETrend {
  year: number;
  week: number;
  avgRpe: number;
  sessionCount: number;
}

/**
 * Récupère la distribution du volume par catégorie analytics (Push/Pull/Legs)
 */
export async function fetchCategoryDistribution(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CategoryDistribution[]> {
  let query = supabase
    .from('exercise_logs')
    .select('analytics_category, total_volume, session_log_id')
    .eq('user_id', userId)
    .not('analytics_category', 'is', null)
    .not('total_volume', 'is', null)
;

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching category distribution:', error);
    throw error;
  }

  // Agréger par catégorie
  const categoryMap = new Map<string, { totalVolume: number; sessions: Set<string> }>();
  let grandTotal = 0;

  (data || []).forEach((row: any) => {
    const cat = row.analytics_category;
    const volume = Number(row.total_volume) || 0;
    grandTotal += volume;

    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { totalVolume: 0, sessions: new Set() });
    }
    const entry = categoryMap.get(cat)!;
    entry.totalVolume += volume;
    entry.sessions.add(row.session_log_id);
  });

  const result: CategoryDistribution[] = [];
  categoryMap.forEach((data, category) => {
    result.push({
      category: category as AnalyticsCategory,
      totalVolume: Math.round(data.totalVolume),
      sessionCount: data.sessions.size,
      percentage: grandTotal > 0 ? Math.round((data.totalVolume / grandTotal) * 100) : 0,
    });
  });

  // Trier par volume décroissant
  result.sort((a, b) => b.totalVolume - a.totalVolume);

  return result;
}

/**
 * Récupère le volume quotidien pour une année (pour Heatmap)
 */
export async function fetchDailyVolume(
  userId: string,
  year: number
): Promise<DailyVolume[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date, total_volume, session_log_id, rpe')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching daily volume:', error);
    throw error;
  }

  // Agréger par date
  const dateMap = new Map<string, { totalVolume: number; sessions: Set<string>; rpeValues: number[] }>();

  (data || []).forEach((row: any) => {
    const date = row.date;
    const volume = Number(row.total_volume) || 0;
    const rpe = row.rpe ? Number(row.rpe) : null;

    if (!dateMap.has(date)) {
      dateMap.set(date, { totalVolume: 0, sessions: new Set(), rpeValues: [] });
    }
    const entry = dateMap.get(date)!;
    entry.totalVolume += volume;
    entry.sessions.add(row.session_log_id);
    if (rpe !== null && rpe > 0) {
      entry.rpeValues.push(rpe);
    }
  });

  const result: DailyVolume[] = [];
  dateMap.forEach((data, date) => {
    const avgRpe = data.rpeValues.length > 0
      ? Math.round((data.rpeValues.reduce((sum, r) => sum + r, 0) / data.rpeValues.length) * 10) / 10
      : null;

    result.push({
      date,
      totalVolume: Math.round(data.totalVolume),
      sessionCount: data.sessions.size,
      avgRpe,
    });
  });

  // Trier par date
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Récupère la meilleure performance passée pour un exercice (Ghost Session)
 * Basé sur le meilleur tonnage total (total_volume)
 */
export async function fetchGhostSession(
  userId: string,
  exerciseName: string
): Promise<GhostSession | null> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .not('total_volume', 'is', null)
    .gt('total_volume', 0)
    .order('total_volume', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching ghost session:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as ExerciseLogRow;
  const sets = (row.sets_detail || []) as SetDetailLog[];

  // Calculer les moyennes à partir des sets
  let totalReps = 0;
  let totalWeight = 0;
  let validSetsCount = 0;

  for (const set of sets) {
    const anySet = set as any;
    let weight = 0;

    // Extraire le poids depuis load ou weight
    if (anySet.load) {
      const load = anySet.load;
      if (load.type === 'single' || load.type === 'machine') {
        weight = Number(load.value) || 0;
      } else if (load.type === 'double') {
        weight = (Number(load.value) || 0) * 2;
      } else if (load.type === 'barbell') {
        weight = (Number(load.bar) || 0) + (Number(load.plates) || 0) * 2;
      }
    } else if (anySet.weight) {
      weight = parseFloat(String(anySet.weight).replace(',', '.')) || 0;
    }

    const reps = parseInt(String(anySet.reps || '0').replace(/[^0-9]/g, '')) || 0;

    if (weight > 0 || reps > 0) {
      totalWeight += weight;
      totalReps += reps;
      validSetsCount++;
    }
  }

  const avgWeight = validSetsCount > 0 ? Math.round((totalWeight / validSetsCount) * 10) / 10 : 0;
  const avgReps = validSetsCount > 0 ? Math.round((totalReps / validSetsCount) * 10) / 10 : 0;

  return {
    date: row.date,
    sessionLogId: row.session_log_id,
    sets: sets,
    maxWeight: Number(row.max_weight) || 0,
    totalVolume: Number(row.total_volume) || 0,
    estimated1RM: Number(row.estimated_1rm) || 0,
    setCount: validSetsCount,
    avgReps: avgReps,
    avgWeight: avgWeight,
  };
}

/**
 * Vérifie si une performance est un nouveau PR
 * Compare le poids max, volume et 1RM estimé avec les records existants
 */
export async function checkForNewPR(
  userId: string,
  exerciseName: string,
  currentMaxWeight: number,
  currentVolume: number,
  current1RM: number
): Promise<PRCheckResult> {
  // Récupérer les meilleurs records existants pour cet exercice
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('max_weight, total_volume, estimated_1rm')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
;

  if (error) {
    console.error('Error checking PR:', error);
    return { isNewPR: false, prType: null, exerciseName, previousRecord: 0, newRecord: 0, improvement: 0 };
  }

  // Trouver les records max
  let maxWeight = 0;
  let maxVolume = 0;
  let max1RM = 0;

  (data || []).forEach((row: any) => {
    if (row.max_weight && Number(row.max_weight) > maxWeight) {
      maxWeight = Number(row.max_weight);
    }
    if (row.total_volume && Number(row.total_volume) > maxVolume) {
      maxVolume = Number(row.total_volume);
    }
    if (row.estimated_1rm && Number(row.estimated_1rm) > max1RM) {
      max1RM = Number(row.estimated_1rm);
    }
  });

  // Vérifier chaque type de PR (priorité: 1RM > weight > volume)
  if (current1RM > max1RM && current1RM > 0) {
    const improvement = max1RM > 0 ? ((current1RM - max1RM) / max1RM) * 100 : 100;
    return {
      isNewPR: true,
      prType: '1rm',
      exerciseName,
      previousRecord: max1RM,
      newRecord: current1RM,
      improvement: Math.round(improvement * 10) / 10,
    };
  }

  if (currentMaxWeight > maxWeight && currentMaxWeight > 0) {
    const improvement = maxWeight > 0 ? ((currentMaxWeight - maxWeight) / maxWeight) * 100 : 100;
    return {
      isNewPR: true,
      prType: 'weight',
      exerciseName,
      previousRecord: maxWeight,
      newRecord: currentMaxWeight,
      improvement: Math.round(improvement * 10) / 10,
    };
  }

  if (currentVolume > maxVolume && currentVolume > 0) {
    const improvement = maxVolume > 0 ? ((currentVolume - maxVolume) / maxVolume) * 100 : 100;
    return {
      isNewPR: true,
      prType: 'volume',
      exerciseName,
      previousRecord: maxVolume,
      newRecord: currentVolume,
      improvement: Math.round(improvement * 10) / 10,
    };
  }

  return { isNewPR: false, prType: null, exerciseName, previousRecord: 0, newRecord: 0, improvement: 0 };
}

/**
 * Détecte tous les PRs d'une session avant sauvegarde
 * Retourne un tableau de PRDetected pour affichage dans le modal
 */
export async function detectSessionPRs(
  sessionLog: SessionLog,
  userId: string
): Promise<PRDetected[]> {
  const prs: PRDetected[] = [];

  for (const exercise of sessionLog.exercises) {
    // Calculer les métriques de l'exercice
    const completedSets = exercise.sets.filter(s => s.completed);
    if (completedSets.length === 0) continue;

    // Calculer max weight et volume
    let maxWeight = 0;
    let totalVolume = 0;
    let best1RM = 0;

    for (const set of completedSets) {
      // Extraire le poids depuis load ou weight
      let weight = 0;
      if (set.load) {
        if (set.load.type === 'single' || set.load.type === 'machine') {
          weight = set.load.weightKg ?? 0;
        } else if (set.load.type === 'double') {
          weight = (set.load.weightKg ?? 0) * 2;
        } else if (set.load.type === 'barbell') {
          weight = (set.load.barKg ?? 20) + (set.load.addedKg ?? 0);
        }
      } else if (set.weight) {
        const parsed = parseFloat(set.weight.replace(',', '.'));
        weight = isNaN(parsed) ? 0 : parsed;
      }

      // Extraire les reps
      const reps = parseInt(set.reps, 10) || 0;

      if (weight > maxWeight) maxWeight = weight;
      totalVolume += weight * reps;

      // Calculer 1RM estimé (formule Epley) si reps entre 1 et 10
      if (reps > 0 && reps <= 10 && weight > 0) {
        const estimated1RM = weight * (1 + reps / 30);
        if (estimated1RM > best1RM) best1RM = estimated1RM;
      }
    }

    // Vérifier si c'est un PR
    const prCheck = await checkForNewPR(
      userId,
      exercise.exerciseName,
      maxWeight,
      totalVolume,
      best1RM
    );

    if (prCheck.isNewPR && prCheck.prType) {
      prs.push({
        exerciseName: prCheck.exerciseName,
        prType: prCheck.prType,
        previousRecord: prCheck.previousRecord,
        newRecord: prCheck.newRecord,
        improvement: prCheck.newRecord - prCheck.previousRecord,
        improvementPercent: prCheck.improvement, // déjà en %
      });
    }
  }

  return prs;
}

/**
 * Récupère les tendances RPE hebdomadaires
 */
export async function fetchWeeklyRPETrend(
  userId: string,
  weeksBack: number = 12
): Promise<WeeklyRPETrend[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('year, week, rpe, session_log_id')
    .eq('user_id', userId)
    .not('rpe', 'is', null)
    .order('year', { ascending: false })
    .order('week', { ascending: false });

  if (error) {
    console.error('Error fetching weekly RPE trend:', error);
    throw error;
  }

  // Agréger par semaine
  const weekMap = new Map<string, { rpeSum: number; rpeCount: number; sessions: Set<string> }>();

  (data || []).forEach((row: any) => {
    const key = `${row.year}-${row.week}`;
    if (!weekMap.has(key)) {
      weekMap.set(key, { rpeSum: 0, rpeCount: 0, sessions: new Set() });
    }
    const entry = weekMap.get(key)!;
    entry.rpeSum += Number(row.rpe);
    entry.rpeCount++;
    entry.sessions.add(row.session_log_id);
  });

  const result: WeeklyRPETrend[] = [];
  weekMap.forEach((data, key) => {
    const [year, week] = key.split('-').map(Number);
    result.push({
      year,
      week,
      avgRpe: Math.round((data.rpeSum / data.rpeCount) * 10) / 10,
      sessionCount: data.sessions.size,
    });
  });

  // Trier par année/semaine décroissante et limiter
  result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  return result.slice(0, weeksBack);
}

// ===========================================
// SESSION TRENDS (par date réelle)
// ===========================================

export interface SessionTrendData {
  date: string; // Format ISO: "2026-01-20"
  totalVolume: number;
  avgRpe: number | null;
  sessionCount: number;
  sessionNames: string[];
}

/**
 * Récupère les tendances des sessions par date réelle (pas par semaine ISO)
 * Agrège volume et RPE par jour, triés chronologiquement
 */
export async function fetchSessionTrends(
  userId: string,
  weeksBack: number = 12
): Promise<SessionTrendData[]> {
  // Calculer la date de début basée sur weeksBack
  const endDate = new Date();
  const startDate = new Date();
  if (weeksBack > 0) {
    startDate.setDate(startDate.getDate() - (weeksBack * 7));
  } else {
    // All time: on remonte à 10 ans en arrière
    startDate.setFullYear(startDate.getFullYear() - 10);
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Récupérer les exercise_logs avec le nom de session via la relation
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date, total_volume, rpe, session_log_id, session_logs!session_log_id(session_key_name)')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching session trends:', error);
    throw error;
  }

  // Agréger par date
  const dateMap = new Map<string, {
    totalVolume: number;
    rpeSum: number;
    rpeCount: number;
    sessions: Map<string, string>; // session_id -> session_name
  }>();

  (data || []).forEach((row: any) => {
    const date = row.date;
    if (!date) return;

    if (!dateMap.has(date)) {
      dateMap.set(date, { totalVolume: 0, rpeSum: 0, rpeCount: 0, sessions: new Map() });
    }
    const entry = dateMap.get(date)!;
    entry.totalVolume += Number(row.total_volume) || 0;
    if (row.rpe !== null && row.rpe > 0) {
      entry.rpeSum += Number(row.rpe);
      entry.rpeCount++;
    }
    // Stocker le nom de la session
    const sessionName = row.session_logs?.session_key_name || 'Séance';
    entry.sessions.set(row.session_log_id, sessionName);
  });

  // Convertir en tableau trié par date
  const result: SessionTrendData[] = [];
  dateMap.forEach((data, date) => {
    result.push({
      date,
      totalVolume: Math.round(data.totalVolume),
      avgRpe: data.rpeCount > 0
        ? Math.round((data.rpeSum / data.rpeCount) * 10) / 10
        : null,
      sessionCount: data.sessions.size,
      sessionNames: Array.from(data.sessions.values()),
    });
  });

  // Tri chronologique (date ISO trie correctement comme string)
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Récupère les PRs enrichis avec le 1RM estimé, max reps et max duration
 */
export async function fetchPersonalRecordsEnhanced(userId: string): Promise<Record<string, {
  maxWeight: number;
  maxVolume: number;
  max1RM: number;
  maxReps: number;
  maxDuration: number;
  lastDate: string;
  sessionLogId: string;
  movementPattern: string | null;
  muscleGroup: string | null;
  muscleGroupId: string | null;
  categoryCode: string | null;
}>> {
  // Récupérer les logs d'exercices
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('exercise_name, max_weight, total_volume, total_reps, estimated_1rm, exercise_type, date, session_log_id, movement_pattern_name, muscle_group_name, muscle_group_id, exercise_id')
    .eq('user_id', userId)
  ;

  // Récupérer les catégories des exercices
  const { data: exercisesData } = await supabase
    .from('exercises')
    .select('id, exercise_categories!category_id(code)')
  ;

  // Créer un map exerciseId -> categoryCode
  const categoryMap: Record<string, string> = {};
  (exercisesData || []).forEach((ex: any) => {
    if (ex.id && ex.exercise_categories?.code) {
      categoryMap[ex.id] = ex.exercise_categories.code;
    }
  });

  if (error) {
    console.error('Error fetching enhanced PRs:', error);
    throw error;
  }

  // Grouper par exercice et prendre les max (priorité: 1RM > weight > volume > reps > duration)
  const prs: Record<string, {
    maxWeight: number;
    maxVolume: number;
    max1RM: number;
    maxReps: number;
    maxDuration: number;
    lastDate: string;
    sessionLogId: string;
    movementPattern: string | null;
    muscleGroup: string | null;
    muscleGroupId: string | null;
    categoryCode: string | null;
  }> = {};

  (data || []).forEach((row: any) => {
    const name = row.exercise_name;
    if (!prs[name]) {
      prs[name] = {
        maxWeight: 0,
        maxVolume: 0,
        max1RM: 0,
        maxReps: 0,
        maxDuration: 0,
        lastDate: '',
        sessionLogId: '',
        movementPattern: row.movement_pattern_name || null,
        muscleGroup: row.muscle_group_name || null,
        muscleGroupId: row.muscle_group_id || null,
        categoryCode: row.exercise_id ? (categoryMap[row.exercise_id] || null) : null
      };
    }

    const current1RM = Number(row.estimated_1rm) || 0;
    const currentWeight = Number(row.max_weight) || 0;
    const currentReps = Number(row.total_reps) || 0;
    const isTimeExercise = row.exercise_type === 'time';

    if (row.max_weight && currentWeight > prs[name].maxWeight) {
      prs[name].maxWeight = currentWeight;
    }
    if (row.total_volume && Number(row.total_volume) > prs[name].maxVolume) {
      prs[name].maxVolume = Number(row.total_volume);
    }

    // Pour les exercices chronométrés, total_reps contient la durée en secondes
    if (isTimeExercise && currentReps > prs[name].maxDuration) {
      prs[name].maxDuration = currentReps;
    } else if (!isTimeExercise && currentReps > prs[name].maxReps) {
      prs[name].maxReps = currentReps;
    }

    if (row.estimated_1rm && current1RM > prs[name].max1RM) {
      prs[name].max1RM = current1RM;
      // Le sessionLogId correspond au meilleur 1RM
      prs[name].sessionLogId = row.session_log_id;
      prs[name].lastDate = row.date;
    } else if (prs[name].max1RM === 0 && currentWeight > 0) {
      // Si pas de 1RM, utiliser le meilleur poids
      if (currentWeight >= prs[name].maxWeight) {
        prs[name].sessionLogId = row.session_log_id;
        prs[name].lastDate = row.date;
      }
    } else if (prs[name].max1RM === 0 && prs[name].maxWeight === 0) {
      // Pas de 1RM ni de poids -> utiliser la date du meilleur reps/duration
      if (!prs[name].lastDate || row.date > prs[name].lastDate) {
        prs[name].sessionLogId = row.session_log_id;
        prs[name].lastDate = row.date;
      }
    }

    // Mettre à jour les métadonnées si elles étaient null
    if (!prs[name].movementPattern && row.movement_pattern_name) {
      prs[name].movementPattern = row.movement_pattern_name;
    }
    if (!prs[name].muscleGroup && row.muscle_group_name) {
      prs[name].muscleGroup = row.muscle_group_name;
    }
    if (!prs[name].muscleGroupId && row.muscle_group_id) {
      prs[name].muscleGroupId = row.muscle_group_id;
    }
  });

  return prs;
}

// ===========================================
// MUSCLE GROUPS & 1RM HISTORY
// ===========================================

/**
 * Récupère la liste des groupes musculaires utilisés par l'utilisateur
 * Ne retourne que les groupes ayant au moins un exercice avec 1RM
 * Filtré par période de dates optionnelle
 */
export async function fetchUserMuscleGroupsWithExercises(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  id: string;
  name: string;
  exercises: string[];
}[]> {
  let query = supabase
    .from('exercise_logs')
    .select('muscle_group_id, muscle_group_name, exercise_name, estimated_1rm')
    .eq('user_id', userId)
    .not('muscle_group_id', 'is', null)
    .not('estimated_1rm', 'is', null)
    .gt('estimated_1rm', 0);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user muscle groups:', error);
    throw error;
  }

  // Grouper par muscle_group_id et collecter les exercices uniques
  const muscleGroupMap: Record<string, { name: string; exercises: Set<string> }> = {};

  (data || []).forEach((row: any) => {
    if (!row.muscle_group_id || !row.muscle_group_name) return;

    if (!muscleGroupMap[row.muscle_group_id]) {
      muscleGroupMap[row.muscle_group_id] = {
        name: row.muscle_group_name,
        exercises: new Set()
      };
    }
    muscleGroupMap[row.muscle_group_id].exercises.add(row.exercise_name);
  });

  // Convertir en tableau et trier
  return Object.entries(muscleGroupMap)
    .map(([id, data]) => ({
      id,
      name: data.name,
      exercises: Array.from(data.exercises).sort()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Récupère l'historique des 1RM pour des exercices spécifiques
 * Filtré par période de dates optionnelle
 */
export async function fetch1RMHistoryByExercises(
  userId: string,
  exerciseNames: string[],
  startDate?: string,
  endDate?: string
): Promise<{
  exerciseName: string;
  date: string;
  estimated1RM: number;
}[]> {
  if (exerciseNames.length === 0) {
    return [];
  }

  let query = supabase
    .from('exercise_logs')
    .select('exercise_name, date, estimated_1rm')
    .eq('user_id', userId)
    .in('exercise_name', exerciseNames)
    .not('estimated_1rm', 'is', null)
    .gt('estimated_1rm', 0)
    .order('date', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching 1RM history by exercises:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    exerciseName: row.exercise_name,
    date: row.date,
    estimated1RM: Number(row.estimated_1rm)
  }));
}

/**
 * Récupère les données hiérarchiques pour les filtres 1RM :
 * Catégorie → Groupe musculaire → Exercices
 * Ne retourne que les données où l'utilisateur a des 1RM enregistrés
 */
export interface CategoryWithMuscleGroups {
  categoryCode: string;
  categoryName: string;
  muscleGroups: {
    id: string;
    name: string;
    exercises: string[];
  }[];
}

export async function fetch1RMFilterHierarchy(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CategoryWithMuscleGroups[]> {
  // Requête pour récupérer les exercise_logs avec les infos de catégorie via exercises
  let query = supabase
    .from('exercise_logs')
    .select(`
      exercise_name,
      muscle_group_id,
      muscle_group_name,
      estimated_1rm,
      exercises!inner (
        category_id,
        exercise_categories (
          code,
          name,
          display_order
        )
      )
    `)
    .eq('user_id', userId)
    .not('muscle_group_id', 'is', null)
    .not('estimated_1rm', 'is', null)
    .gt('estimated_1rm', 0);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching 1RM filter hierarchy:', error);
    throw error;
  }

  // Structure pour regrouper : categoryCode → muscleGroupId → exerciseNames
  const hierarchy: Record<string, {
    categoryName: string;
    displayOrder: number;
    muscleGroups: Record<string, {
      name: string;
      exercises: Set<string>;
    }>;
  }> = {};

  (data || []).forEach((row: any) => {
    const categoryInfo = row.exercises?.exercise_categories;
    if (!categoryInfo || !row.muscle_group_id || !row.muscle_group_name) return;

    const categoryCode = categoryInfo.code;
    const categoryName = categoryInfo.name;
    const displayOrder = categoryInfo.display_order;

    if (!hierarchy[categoryCode]) {
      hierarchy[categoryCode] = {
        categoryName,
        displayOrder,
        muscleGroups: {}
      };
    }

    if (!hierarchy[categoryCode].muscleGroups[row.muscle_group_id]) {
      hierarchy[categoryCode].muscleGroups[row.muscle_group_id] = {
        name: row.muscle_group_name,
        exercises: new Set()
      };
    }

    hierarchy[categoryCode].muscleGroups[row.muscle_group_id].exercises.add(row.exercise_name);
  });

  // Convertir en tableau et trier
  return Object.entries(hierarchy)
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
    .map(([categoryCode, catData]) => ({
      categoryCode,
      categoryName: catData.categoryName,
      muscleGroups: Object.entries(catData.muscleGroups)
        .map(([id, mgData]) => ({
          id,
          name: mgData.name,
          exercises: Array.from(mgData.exercises).sort()
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }));
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

// Récupérer les commentaires pour un coach (ses athlètes + ses propres réponses)
export async function fetchTeamComments(coachId: string, onlyUnread: boolean = false): Promise<AthleteComment[]> {
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

  // Étape 2: Récupérer les commentaires des athlètes ET du coach
  // On inclut le coachId dans la liste pour récupérer ses réponses
  const allUserIds = [...athleteIds, coachId];

  let query = supabase
    .from('athlete_comments')
    .select('*')
    .in('user_id', allUserIds)
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

  // Récupérer les infos du coach pour ses messages
  const { data: coachData } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name')
    .eq('id', coachId)
    .single();

  // Mapper les données en ajoutant les infos de l'utilisateur
  const mapped: AthleteComment[] = data.map((row: any) => {
    const isCoachMessage = row.user_id === coachId;
    const athlete = isCoachMessage ? coachData : athleteMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
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

// Récupérer les commentaires d'un athlète (ses propres commentaires + réponses du coach)
export async function fetchAthleteOwnComments(athleteId: string): Promise<AthleteComment[]> {
  console.log('[fetchAthleteOwnComments] Récupération pour athleteId:', athleteId);

  // Étape 1: Récupérer le coachId de l'athlète
  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_id')
    .eq('id', athleteId)
    .single();

  const coachId = profile?.coach_id;
  console.log('[fetchAthleteOwnComments] CoachId de l\'athlète:', coachId);

  // Étape 2: Récupérer les messages de l'athlète
  const { data: athleteMessages, error: athleteError } = await supabase
    .from('athlete_comments')
    .select('*')
    .eq('user_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (athleteError) {
    console.error('[fetchAthleteOwnComments] Erreur Supabase athlète:', athleteError);
    return [];
  }

  // Étape 3: Si l'athlète a un coach, récupérer les exerciseNames et chercher les réponses du coach
  let coachMessages: any[] = [];
  if (coachId && athleteMessages && athleteMessages.length > 0) {
    const exerciseNames = [...new Set(athleteMessages.map((m: any) => m.exercise_name))];

    const { data: coachData, error: coachError } = await supabase
      .from('athlete_comments')
      .select('*')
      .eq('user_id', coachId)
      .in('exercise_name', exerciseNames)
      .order('created_at', { ascending: false });

    if (!coachError && coachData) {
      coachMessages = coachData;
    }
  }

  // Étape 4: Combiner et trier
  const allMessages = [...(athleteMessages || []), ...coachMessages];
  allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  console.log('[fetchAthleteOwnComments] Total messages:', allMessages.length);

  if (allMessages.length === 0) {
    return [];
  }

  // Mapper les données
  const mapped: AthleteComment[] = allMessages.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
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
    userId: comment.userId,
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
    user_id: comment.userId,
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

  try {
    void syncUserBadgesProgress(comment.userId);
  } catch (badgeError) {
    console.error('[saveAthleteComment] Erreur sync badges:', badgeError);
  }

  console.log('[saveAthleteComment] Réponse Supabase:', data);

  if (!data || data.length === 0) {
    console.log('[saveAthleteComment] Aucune donnée retournée mais pas d\'erreur');
    // Créer un objet de retour minimal
    return {
      id: 'temp-' + Date.now(),
      userId: comment.userId,
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
    userId: row.user_id,
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
// EXERCISES
// ===========================================

/**
 * Récupère les exercices visibles par l'utilisateur connecté.
 * RLS gère la visibilité : exercices globaux + exercices de son coach.
 */
export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }

  return (data as ExerciseRow[]).map(mapExerciseRowToExercise);
}

/**
 * Récupère un exercice par son ID.
 */
export async function fetchExerciseById(exerciseId: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching exercise:', error);
    throw error;
  }

  return mapExerciseRowToExercise(data as ExerciseRow);
}

/**
 * Recherche des exercices par nom (partiel).
 */
export async function searchExercises(searchTerm: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error searching exercises:', error);
    throw error;
  }

  return (data as ExerciseRow[]).map(mapExerciseRowToExercise);
}

/**
 * Crée un nouvel exercice (coach uniquement via RLS).
 */
export async function createExercise(
  exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Exercise> {
  const rowData = mapExerciseToRow(exercise);

  const { data, error } = await supabase
    .from('exercises')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    console.error('Error creating exercise:', error);
    throw error;
  }

  return mapExerciseRowToExercise(data as ExerciseRow);
}

/**
 * Met à jour un exercice existant (coach propriétaire uniquement via RLS).
 */
export async function updateExercise(
  exerciseId: string,
  updates: Partial<Exercise>
): Promise<Exercise> {
  const rowData = mapExerciseToRow(updates);

  const { data, error } = await supabase
    .from('exercises')
    .update(rowData)
    .eq('id', exerciseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating exercise:', error);
    throw error;
  }

  return mapExerciseRowToExercise(data as ExerciseRow);
}

/**
 * Supprime un exercice (coach propriétaire uniquement via RLS).
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) {
    console.error('Error deleting exercise:', error);
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
