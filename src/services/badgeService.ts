// ============================================
// F.Y.T V3 — SERVICE BADGES
// src/services/badgeService.ts
// Calcul progression et déblocage automatique
// ============================================

import { supabase } from '../supabaseClient';
import type {
  Badge,
  UserBadge,
  BadgeWithProgress,
  BadgeRow,
  UserBadgeRow,
  BadgeConditionType,
} from '../../types';

function parseSessionLogDate(dateStr: string): Date {
  return new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
}

async function fetchAthleteStats(userId: string): Promise<{
  message_count: number | null;
  cumulative_minutes: number | null;
  unique_exercise_count: number | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('athlete_stats')
      .select('message_count,cumulative_minutes,unique_exercise_count')
      .eq('athlete_id', userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as any) ?? null;
  } catch {
    return null;
  }
}

// ============================================
// CONSTANTS
// ============================================

const STREAK_TOLERANCE_DAYS = 2; // Max jours repos consécutifs autorisés
const RPE_THRESHOLD = 7; // Seuil RPE pour badges persévérance
const COMEBACK_MIN_DAYS = 14; // Jours d'absence pour badge "Revenant"
const CONSISTENCY_MAX_GAP = 7; // Max jours sans séance pour "Incassable"

// ============================================
// STREAK TOLÉRANT
// ============================================

/**
 * Calcule la série active avec tolérance de 2 jours de repos
 * ≤2 jours repos consécutifs = série continue
 * >2 jours repos = série cassée
 */
export async function calculateStreakTolerant(userId: string): Promise<number> {
  try {
    // Récupérer toutes les dates de séances triées DESC
    const { data: sessions, error } = await supabase
      .from('session_logs')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!sessions || sessions.length === 0) return 0;

    // Extraire les dates uniques (un jour = une entrée max)
    const uniqueDates = new Set<string>();
    sessions.forEach((s) => {
      const date = parseSessionLogDate(s.date).toISOString().split('T')[0];
      uniqueDates.add(date);
    });

    const sortedDates = Array.from(uniqueDates).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    if (sortedDates.length === 0) return 0;

    // Calculer la série
    let streak = 0;
    let consecutiveRestDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vérifier si la dernière séance est trop ancienne
    const lastSessionDate = new Date(sortedDates[0]);
    lastSessionDate.setHours(0, 0, 0, 0);
    const daysSinceLastSession = Math.floor(
      (today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSession > STREAK_TOLERANCE_DAYS) {
      return 0; // Série cassée
    }

    // Parcourir les jours depuis aujourd'hui
    let currentDate = new Date(today);
    let dateIndex = 0;

    while (dateIndex < sortedDates.length || consecutiveRestDays <= STREAK_TOLERANCE_DAYS) {
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const hasSession = sortedDates.includes(currentDateStr);

      if (hasSession) {
        streak++;
        consecutiveRestDays = 0;
        dateIndex = sortedDates.indexOf(currentDateStr) + 1;
      } else {
        consecutiveRestDays++;
        if (consecutiveRestDays > STREAK_TOLERANCE_DAYS) {
          break; // Série cassée
        }
      }

      // Reculer d'un jour
      currentDate.setDate(currentDate.getDate() - 1);

      // Safety: ne pas remonter plus loin que la première séance
      if (dateIndex >= sortedDates.length && consecutiveRestDays > 0) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

// ============================================
// SÉANCES CUMULÉES
// ============================================

/**
 * Compte le nombre total de séances complétées
 */
export async function calculateCumulativeSessions(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('session_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Error calculating cumulative sessions:', error);
    return 0;
  }
}

// ============================================
// HEURES CUMULÉES
// ============================================

/**
 * Calcule le temps total d'entraînement en heures
 */
export async function calculateCumulativeHours(userId: string): Promise<number> {
  try {
    const stats = await fetchAthleteStats(userId);
    const statsMinutes = stats?.cumulative_minutes;
    if (typeof statsMinutes === 'number') {
      return Math.floor(statsMinutes / 60);
    }

    const { data, error } = await supabase
      .from('session_logs')
      .select('duration_minutes')
      .eq('user_id', userId);

    if (error) throw error;
    if (!data) return 0;

    const totalMinutes = data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return Math.floor(totalMinutes / 60);
  } catch (error) {
    console.error('Error calculating cumulative hours:', error);
    return 0;
  }
}

// ============================================
// COMPTEUR RPE
// ============================================

/**
 * Compte les séances avec RPE >= seuil (par défaut 7)
 */
export async function calculateRPECount(
  userId: string,
  minRPE: number = RPE_THRESHOLD
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('session_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('session_rpe', minRPE);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Error calculating RPE count:', error);
    return 0;
  }
}

// ============================================
// COMEBACK (RETOUR APRÈS ABSENCE)
// ============================================

/**
 * Vérifie si l'utilisateur a fait un comeback après X jours d'absence
 * Retourne 1 si oui, 0 sinon
 */
export async function checkComeback(
  userId: string,
  minDays: number = COMEBACK_MIN_DAYS
): Promise<number> {
  try {
    const { data: sessions, error } = await supabase
      .from('session_logs')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length < 2) return 0;

    // Chercher un gap de plus de minDays suivi d'une reprise
    for (let i = 1; i < sessions.length; i++) {
      const prevDate = parseSessionLogDate(sessions[i - 1].date);
      const currDate = parseSessionLogDate(sessions[i].date);
      const daysDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff >= minDays) {
        return 1; // Comeback détecté
      }
    }

    return 0;
  } catch (error) {
    console.error('Error checking comeback:', error);
    return 0;
  }
}

// ============================================
// CONSISTENCY (RÉGULARITÉ SUR X MOIS)
// ============================================

/**
 * Vérifie si l'utilisateur a maintenu une activité régulière
 * pendant X mois sans interruption de plus de 7 jours
 */
export async function checkConsistency(
  userId: string,
  months: number = 3
): Promise<number> {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: sessions, error } = await supabase
      .from('session_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) return 0;

    // Vérifier qu'il n'y a pas de gap > 7 jours
    let prevDate = parseSessionLogDate(sessions[0].date);

    for (let i = 1; i < sessions.length; i++) {
      const currDate = parseSessionLogDate(sessions[i].date);
      const daysDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > CONSISTENCY_MAX_GAP) {
        return 0; // Interruption détectée
      }
      prevDate = currDate;
    }

    // Vérifier que la dernière séance n'est pas trop ancienne
    const lastSession = parseSessionLogDate(sessions[sessions.length - 1].date);
    const daysSinceLast = Math.floor(
      (Date.now() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLast > CONSISTENCY_MAX_GAP) {
      return 0;
    }

    // Vérifier que la période couvre bien X mois
    const firstSession = parseSessionLogDate(sessions[0].date);
    const monthsCovered = (Date.now() - firstSession.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return monthsCovered >= months ? 1 : 0;
  } catch (error) {
    console.error('Error checking consistency:', error);
    return 0;
  }
}

// ============================================
// MESSAGE COUNT
// ============================================

/**
 * Compte le nombre de messages envoyés par l'utilisateur
 */
export async function calculateMessageCount(userId: string): Promise<number> {
  try {
    const stats = await fetchAthleteStats(userId);
    const statsCount = stats?.message_count;
    if (typeof statsCount === 'number') {
      return statsCount;
    }

    const { count, error } = await supabase
      .from('athlete_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Error calculating message count:', error);
    return 0;
  }
}

// ============================================
// RESPONSIVE (RÉPONSE SOUS 24H)
// ============================================

/**
 * Compte le nombre de fois où l'utilisateur a répondu sous 24h
 */
export async function calculateResponsiveCount(userId: string): Promise<number> {
  try {
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, coach_id')
      .eq('athlete_id', userId);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) return 0;

    let responsiveCount = 0;

    for (const conv of conversations) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgError) continue;
      if (!messages || messages.length < 2) continue;

      for (let i = 1; i < messages.length; i++) {
        const prevMsg = messages[i - 1];
        const currMsg = messages[i];

        if (prevMsg.sender_id === conv.coach_id && currMsg.sender_id === userId) {
          const prevTime = new Date(prevMsg.created_at).getTime();
          const currTime = new Date(currMsg.created_at).getTime();
          const hoursDiff = (currTime - prevTime) / (1000 * 60 * 60);

          if (hoursDiff <= 24) {
            responsiveCount++;
          }
        }
      }
    }

    return responsiveCount;
  } catch (error) {
    console.error('Error calculating responsive count:', error);
    return 0;
  }
}

// ============================================
// UNIQUE EXERCISES
// ============================================

/**
 * Compte le nombre d'exercices distincts effectués
 */
export async function calculateUniqueExercises(userId: string): Promise<number> {
  try {
    const stats = await fetchAthleteStats(userId);
    const statsCount = stats?.unique_exercise_count;
    if (typeof statsCount === 'number') {
      return statsCount;
    }

    const parseReps = (value: unknown): number => {
      if (typeof value !== 'string') return 0;
      const m = value.match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };

    const isExercisePerformed = (exercise: any): boolean => {
      const sets = exercise?.sets;
      if (!Array.isArray(sets)) return false;

      return sets.some((s: any) => {
        const completed = s?.completed === true;
        const reps = parseReps(s?.reps);
        return completed && reps >= 1;
      });
    };

    const pageSize = 1000;
    const uniqueExercises = new Set<string>();

    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('session_logs')
        .select('exercises')
        .eq('user_id', userId)
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data as Array<{ exercises?: unknown }>) {
        const exercises = row?.exercises;
        if (!Array.isArray(exercises)) continue;

        for (const ex of exercises as any[]) {
          if (!isExercisePerformed(ex)) continue;
          const name = typeof ex?.exerciseName === 'string' ? ex.exerciseName.trim().toLowerCase() : '';
          if (name) uniqueExercises.add(name);
        }
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return uniqueExercises.size;
  } catch (error) {
    console.error('Error calculating unique exercises:', error);
    return 0;
  }
}

// ============================================
// SESSION TYPES
// ============================================

/**
 * Compte le nombre de types de séances distincts
 */
export async function calculateSessionTypes(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('seance_type')
      .eq('user_id', userId)
      ;

    if (error) throw error;
    if (!data) return 0;

    const uniqueTypes = new Set(
      data.map((s) => s.seance_type?.toLowerCase()).filter(Boolean)
    );
    return uniqueTypes.size;
  } catch (error) {
    console.error('Error calculating session types:', error);
    return 0;
  }
}

// ============================================
// STRAVA CONNECTED
// ============================================

/**
 * Vérifie si le compte Strava est connecté
 */
export async function checkStravaConnected(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('strava_connections')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? 1 : 0;
  } catch (error) {
    console.error('Error checking Strava connection:', error);
    return 0;
  }
}

// ============================================
// STRAVA IMPORTS
// ============================================

/**
 * Compte le nombre d'activités importées depuis Strava
 */
export async function calculateStravaImports(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('strava_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_imported_to_history', true);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Error calculating Strava imports:', error);
    return 0;
  }
}

// ============================================
// GET ALL BADGES
// ============================================

/**
 * Récupère tous les badges définis
 */
export async function getAllBadges(): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: BadgeRow) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category as Badge['category'],
      iconSvg: row.icon_svg,
      conditionType: row.condition_type as BadgeConditionType,
      conditionValue: row.condition_value,
      orderIndex: row.order_index,
    }));
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
}

// ============================================
// GET USER BADGES
// ============================================

/**
 * Récupère les badges débloqués par un utilisateur
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map((row: UserBadgeRow) => ({
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      unlockedAt: row.unlocked_at ?? undefined,
      progressValue: row.progress_value,
    }));
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

// ============================================
// CALCULATE PROGRESS FOR CONDITION TYPE
// ============================================

async function calculateProgressForType(
  userId: string,
  conditionType: BadgeConditionType
): Promise<number> {
  switch (conditionType) {
    case 'cumulative_sessions':
      return calculateCumulativeSessions(userId);
    case 'streak_tolerant':
      // Convertir jours en semaines (badges endurance attendent des semaines)
      const streakDays = await calculateStreakTolerant(userId);
      return Math.floor(streakDays / 7);
    case 'cumulative_hours':
      return calculateCumulativeHours(userId);
    case 'count_rpe_gte':
      return calculateRPECount(userId, RPE_THRESHOLD);
    case 'comeback':
      return checkComeback(userId, COMEBACK_MIN_DAYS);
    case 'consistency':
      return checkConsistency(userId, 3);
    case 'message_count':
      return calculateMessageCount(userId);
    case 'responsive':
      return calculateResponsiveCount(userId);
    case 'unique_exercises':
      return calculateUniqueExercises(userId);
    case 'session_types':
      return calculateSessionTypes(userId);
    case 'strava_connected':
      return checkStravaConnected(userId);
    case 'strava_imports':
      return calculateStravaImports(userId);
    default:
      console.warn(`[BadgeService] Unknown condition type: ${conditionType}`);
      return 0;
  }
}

// ============================================
// GET USER BADGES WITH PROGRESS (avec cache)
// ============================================

// Cache simple avec TTL de 5 minutes
const badgesCache = new Map<string, { data: BadgeWithProgress[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calcule et retourne tous les badges avec leur progression
 * Met à jour user_badges en DB
 * @param forceRefresh - Force le recalcul même si le cache est valide
 */
export async function getUserBadgesProgress(
  userId: string,
  forceRefresh = false
): Promise<BadgeWithProgress[]> {
  try {
    // Vérifier le cache
    const cached = badgesCache.get(userId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    const badges = await getAllBadges();
    const userBadges = await getUserBadges(userId);

    // Map des badges déjà débloqués
    const unlockedMap = new Map<string, UserBadge>();
    userBadges.forEach((ub) => {
      unlockedMap.set(ub.badgeId, ub);
    });

    // Calculer la progression pour chaque type de condition (une seule fois par type)
    const progressByType = new Map<BadgeConditionType, number>();

    for (const badge of badges) {
      if (!progressByType.has(badge.conditionType)) {
        const progress = await calculateProgressForType(userId, badge.conditionType);
        progressByType.set(badge.conditionType, progress);
      }
    }

    // Construire le résultat
    const result: BadgeWithProgress[] = [];

    for (const badge of badges) {
      const userBadge = unlockedMap.get(badge.id);
      const progress = progressByType.get(badge.conditionType) ?? 0;
      const isUnlocked = userBadge?.unlockedAt !== undefined || progress >= badge.conditionValue;

      result.push({
        ...badge,
        progress,
        isUnlocked,
        unlockedAt: userBadge?.unlockedAt,
      });
    }

    // Mettre en cache
    badgesCache.set(userId, { data: result, timestamp: now });

    return result;
  } catch (error) {
    console.error('Error getting user badges progress:', error);
    return [];
  }
}

/**
 * Invalide le cache des badges pour un utilisateur
 * À appeler après complétion d'une séance
 */
export function invalidateBadgesCache(userId: string): void {
  badgesCache.delete(userId);
}

export async function syncUserBadgesProgress(userId: string): Promise<void> {
  try {
    invalidateBadgesCache(userId);

    const badges = await getAllBadges();
    const userBadges = await getUserBadges(userId);

    const unlockedMap = new Map<string, UserBadge>();
    userBadges.forEach((ub) => {
      unlockedMap.set(ub.badgeId, ub);
    });

    const progressByType = new Map<BadgeConditionType, number>();
    for (const badge of badges) {
      if (!progressByType.has(badge.conditionType)) {
        const progress = await calculateProgressForType(userId, badge.conditionType);
        progressByType.set(badge.conditionType, progress);
      }
    }

    const upsertRows: Array<Pick<UserBadgeRow, 'user_id' | 'badge_id' | 'progress_value' | 'unlocked_at'>> = badges.map(
      (badge) => {
        const existing = unlockedMap.get(badge.id);
        const progress = progressByType.get(badge.conditionType) ?? 0;
        const isUnlocked = existing?.unlockedAt !== undefined || progress >= badge.conditionValue;

        return {
          user_id: userId,
          badge_id: badge.id,
          progress_value: progress,
          unlocked_at: isUnlocked
            ? (existing?.unlockedAt ?? new Date().toISOString())
            : null,
        };
      }
    );

    const { error } = await supabase
      .from('user_badges')
      .upsert(upsertRows, { onConflict: 'user_id,badge_id' });

    if (error) {
      throw error;
    }
  } catch (error) {
    try {
      const badgesWithProgress = await getUserBadgesProgress(userId, true);
      for (const badge of badgesWithProgress) {
        await upsertUserBadgeProgress(userId, badge.id, badge.progress ?? 0, badge.isUnlocked);
      }
    } catch (fallbackError) {
      console.error('Error syncing user badges progress:', fallbackError);
    }
  }
}

// ============================================
// UPSERT USER BADGE PROGRESS
// ============================================

async function upsertUserBadgeProgress(
  userId: string,
  badgeId: string,
  progress: number,
  isUnlocked: boolean
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('user_badges')
      .select('id, unlocked_at')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .maybeSingle();

    if (existing) {
      const updateData: Partial<UserBadgeRow> = {
        progress_value: progress,
      };

      if (isUnlocked && !existing.unlocked_at) {
        updateData.unlocked_at = new Date().toISOString();
      }

      await supabase
        .from('user_badges')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badgeId,
        progress_value: progress,
        unlocked_at: isUnlocked ? new Date().toISOString() : null,
      });
    }
  } catch (error) {
    console.error('Error upserting user badge progress:', error);
  }
}

// ============================================
// CHECK AND UNLOCK BADGES
// ============================================

/**
 * Vérifie et débloque automatiquement les badges dont la condition est atteinte
 * Retourne la liste des badges nouvellement débloqués
 */
export async function checkAndUnlockBadges(
  userId: string
): Promise<Badge[]> {
  try {
    const badgesWithProgress = await getUserBadgesProgress(userId);
    const newlyUnlocked: Badge[] = [];

    for (const badge of badgesWithProgress) {
      if (badge.isUnlocked && !badge.unlockedAt) {
        newlyUnlocked.push({
          id: badge.id,
          code: badge.code,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          iconSvg: badge.iconSvg,
          conditionType: badge.conditionType,
          conditionValue: badge.conditionValue,
          orderIndex: badge.orderIndex,
        });
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking and unlocking badges:', error);
    return [];
  }
}

// ============================================
// GET BADGES BY CATEGORY
// ============================================

export async function getBadgesByCategory(
  userId: string
): Promise<Map<string, BadgeWithProgress[]>> {
  const badges = await getUserBadgesProgress(userId);
  const byCategory = new Map<string, BadgeWithProgress[]>();

  for (const badge of badges) {
    const existing = byCategory.get(badge.category) || [];
    existing.push(badge);
    byCategory.set(badge.category, existing);
  }

  return byCategory;
}

// ============================================
// GET BADGE STATS
// ============================================

export interface BadgeStats {
  total: number;
  unlocked: number;
  byCategory: Record<string, { total: number; unlocked: number }>;
}

export async function getBadgeStats(userId: string): Promise<BadgeStats> {
  const badges = await getUserBadgesProgress(userId);

  const stats: BadgeStats = {
    total: badges.length,
    unlocked: badges.filter((b) => b.isUnlocked).length,
    byCategory: {},
  };

  for (const badge of badges) {
    if (!stats.byCategory[badge.category]) {
      stats.byCategory[badge.category] = { total: 0, unlocked: 0 };
    }
    stats.byCategory[badge.category].total++;
    if (badge.isUnlocked) {
      stats.byCategory[badge.category].unlocked++;
    }
  }

  return stats;
}
