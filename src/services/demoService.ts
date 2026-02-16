// ============================================================
// F.Y.T - SERVICE MODE DÉMO
// src/services/demoService.ts
// Gestion des sessions démo avec données LOCALES (localStorage)
// ============================================================

import { supabase } from '../supabaseClient';
import { WorkoutRow, SessionLog, ExerciseLog, SetLog, AnalyticsCategory } from '../../types';

// ============================================================
// CLÉS LOCALSTORAGE
// ============================================================

const DEMO_SESSION_KEY = 'fyt_demo_session_id';
const DEMO_PROFILE_KEY = 'fyt_demo_profile_id';
const DEMO_TRAINING_KEY = 'fyt_demo_training_plans';
const DEMO_HISTORY_KEY = 'fyt_demo_session_history';

// ============================================================
// NOMS ALÉATOIRES POUR LES PROFILS DÉMO
// ============================================================

const DEMO_FIRST_NAMES = [
  'Thomas', 'Lucas', 'Hugo', 'Nathan', 'Louis', 'Gabriel', 'Raphaël', 'Arthur',
  'Jules', 'Ethan', 'Adam', 'Léo', 'Noah', 'Mathis', 'Maxime', 'Alexandre',
  'Antoine', 'Victor', 'Paul', 'Théo', 'Emma', 'Jade', 'Louise', 'Alice',
  'Chloé', 'Léa', 'Manon', 'Inès', 'Camille', 'Sarah', 'Lola', 'Anna'
];

const DEMO_LAST_NAMES = [
  'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois',
  'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David',
  'Bertrand', 'Morel', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine'
];

function getRandomDemoName(): { firstName: string; lastName: string; username: string } {
  const firstName = DEMO_FIRST_NAMES[Math.floor(Math.random() * DEMO_FIRST_NAMES.length)];
  const lastName = DEMO_LAST_NAMES[Math.floor(Math.random() * DEMO_LAST_NAMES.length)];
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const username = `${firstName} ${lastName}`;
  return { firstName, lastName, username: `${username} #${suffix}` };
}

// ============================================================
// TYPES
// ============================================================

interface CreateDemoResult {
  success: boolean;
  sessionId?: string;
  profileId?: string;
  error?: string;
}

// ============================================================
// FONCTIONS PRINCIPALES
// ============================================================

/**
 * Vérifie si l'utilisateur est en mode démo
 */
export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_SESSION_KEY) !== null;
}

/**
 * Récupère l'ID du profil démo actuel
 */
export function getDemoProfileId(): string | null {
  return localStorage.getItem(DEMO_PROFILE_KEY);
}

/**
 * Récupère l'ID de session démo actuel
 */
export function getDemoSessionId(): string | null {
  return localStorage.getItem(DEMO_SESSION_KEY);
}

/**
 * Crée une nouvelle session démo complète
 * - Nettoie les anciennes données démo
 * - Génère un profil athlète temporaire
 * - Initialise les données LOCALEMENT
 */
export async function createDemoSession(): Promise<CreateDemoResult> {
  try {
    // 1. Nettoyer les anciennes données démo
    clearDemoLocalData();

    // 2. Générer un UUID unique pour cette session
    const sessionId = crypto.randomUUID();

    // 3. Créer un compte anonyme Supabase (pour l'auth uniquement)
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      console.error('Erreur création auth démo:', authError);
      return { success: false, error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'Pas de user ID retourné' };
    }

    // 4. Générer un nom aléatoire pour ce profil démo
    const { firstName, lastName, username } = getRandomDemoName();

    // 5. Créer ou mettre à jour le profil avec les infos démo
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username,
        first_name: firstName,
        last_name: lastName,
        role: 'athlete',
        coach_id: null,
        weight: 60 + Math.floor(Math.random() * 30),
        is_demo: true
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Erreur création profil démo:', profileError);
      return { success: false, error: 'Erreur création profil: ' + profileError.message };
    }

    // 6. Enregistrer la session démo (pour le tracking)
    const { error: sessionError } = await supabase
      .from('demo_sessions')
      .insert({
        id: sessionId,
        profile_id: userId
      });

    if (sessionError) {
      console.error('Erreur enregistrement session démo:', sessionError);
    }

    // 7. Initialiser les données démo LOCALEMENT
    initDemoLocalData();

    // 8. Stocker les flags de session
    localStorage.setItem(DEMO_SESSION_KEY, sessionId);
    localStorage.setItem(DEMO_PROFILE_KEY, userId);

    console.log('[createDemoSession] Session démo créée avec succès');

    return {
      success: true,
      sessionId,
      profileId: userId
    };

  } catch (error) {
    console.error('Erreur création session démo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Quitte le mode démo et nettoie
 */
export function exitDemoMode(): void {
  clearDemoLocalData();
}

/**
 * Réinitialise l'état de la session démo (pour le tour guidé)
 */
export function resetDemoState(): void {
  localStorage.removeItem('F.Y.T_active_session');
  localStorage.removeItem('F.Y.T_add_session');
  localStorage.removeItem('F.Y.T_session_preview');
}

/**
 * Vérifie si la session démo est encore valide
 */
export async function checkDemoSessionValid(): Promise<boolean> {
  const sessionId = getDemoSessionId();
  if (!sessionId) return false;

  const { data, error } = await supabase
    .from('demo_sessions')
    .select('expires_at')
    .eq('id', sessionId)
    .single();

  if (error || !data) return false;

  const expiresAt = new Date(data.expires_at);
  return expiresAt > new Date();
}

// ============================================================
// DONNÉES DÉMO LOCALES
// ============================================================

/**
 * Nettoie toutes les données démo locales
 */
export function clearDemoLocalData(): void {
  localStorage.removeItem(DEMO_TRAINING_KEY);
  localStorage.removeItem(DEMO_HISTORY_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
  localStorage.removeItem(DEMO_PROFILE_KEY);
  localStorage.removeItem('F.Y.T_active_session');
  localStorage.removeItem('F.Y.T_add_session');
  localStorage.removeItem('F.Y.T_session_preview');
  console.log('[clearDemoLocalData] Données démo nettoyées');
}

/**
 * Initialise les données démo locales
 */
export function initDemoLocalData(): void {
  const now = new Date();

  // Générer et stocker les training plans
  const trainingData = generateDemoTrainingData(now);
  localStorage.setItem(DEMO_TRAINING_KEY, JSON.stringify(trainingData));
  console.log(`[initDemoLocalData] ${trainingData.length} training plans générés`);

  // Générer et stocker l'historique
  const historyData = generateDemoSessionHistory(now);
  localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(historyData));
  console.log(`[initDemoLocalData] ${historyData.length} sessions d'historique générées`);
}

/**
 * Récupère les training plans depuis le cache local
 */
export function getDemoTrainingPlans(): WorkoutRow[] {
  const data = localStorage.getItem(DEMO_TRAINING_KEY);
  if (!data) {
    console.warn('[getDemoTrainingPlans] Pas de données, initialisation...');
    initDemoLocalData();
    const newData = localStorage.getItem(DEMO_TRAINING_KEY);
    return newData ? JSON.parse(newData) : [];
  }
  return JSON.parse(data);
}

/**
 * Récupère l'historique depuis le cache local
 */
export function getDemoSessionHistory(): SessionLog[] {
  const data = localStorage.getItem(DEMO_HISTORY_KEY);
  if (!data) {
    console.warn('[getDemoSessionHistory] Pas de données, initialisation...');
    initDemoLocalData();
    const newData = localStorage.getItem(DEMO_HISTORY_KEY);
    return newData ? JSON.parse(newData) : [];
  }
  return JSON.parse(data);
}

/**
 * Sauvegarde une session en mode démo (localStorage)
 */
export function saveDemoSessionLog(log: SessionLog): SessionLog {
  const history = getDemoSessionHistory();

  // Vérifier si la session existe déjà (mise à jour) ou est nouvelle
  const existingIndex = history.findIndex(s => s.id === log.id);

  if (existingIndex >= 0) {
    history[existingIndex] = log;
  } else {
    history.push(log);
  }

  localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(history));
  console.log('[saveDemoSessionLog] Session sauvegardée localement:', log.id);

  return log;
}

// ============================================================
// GÉNÉRATEURS DE DONNÉES
// ============================================================

// Templates de séances
const SESSION_TEMPLATES = [
  {
    name: 'Lower 1',
    exercises: [
      { name: 'Squat', sets: '4', reps: '6-8', rest: 180, tempo: '3-1-1-0', notes: 'Contrôler la descente' },
      { name: 'Romanian Deadlift', sets: '3', reps: '8-10', rest: 120, tempo: '3-1-1-0', notes: 'Garder le dos droit' },
      { name: 'Leg Press', sets: '3', reps: '10-12', rest: 90, tempo: '2-0-2-0', notes: '' },
      { name: 'Leg Curl', sets: '3', reps: '10-12', rest: 60, tempo: '2-0-2-0', notes: '' },
      { name: 'Calf Raises', sets: '4', reps: '12-15', rest: 45, tempo: '2-1-2-0', notes: 'Amplitude complète' }
    ]
  },
  {
    name: 'Upper 1',
    exercises: [
      { name: 'Bench Press', sets: '4', reps: '6-8', rest: 180, tempo: '3-1-1-0', notes: 'Pause en bas' },
      { name: 'Barbell Row', sets: '4', reps: '6-8', rest: 120, tempo: '2-1-2-0', notes: 'Tirer vers le nombril' },
      { name: 'Overhead Press', sets: '3', reps: '8-10', rest: 120, tempo: '2-0-2-0', notes: '' },
      { name: 'Pull-ups', sets: '3', reps: '6-10', rest: 90, tempo: '2-1-2-0', notes: 'Amplitude complète' },
      { name: 'Tricep Dips', sets: '3', reps: '10-12', rest: 60, tempo: '2-0-2-0', notes: '' }
    ]
  },
  {
    name: 'Lower 2',
    exercises: [
      { name: 'Deadlift', sets: '4', reps: '5', rest: 180, tempo: '2-1-1-0', notes: 'Reset à chaque rep' },
      { name: 'Bulgarian Split Squat', sets: '3', reps: '8-10', rest: 90, tempo: '2-1-2-0', notes: 'Chaque jambe' },
      { name: 'Hip Thrust', sets: '3', reps: '10-12', rest: 90, tempo: '2-1-2-0', notes: 'Squeeze en haut' },
      { name: 'Leg Extension', sets: '3', reps: '12-15', rest: 60, tempo: '2-0-2-0', notes: '' },
      { name: 'Hanging Leg Raises', sets: '3', reps: '10-15', rest: 60, tempo: '2-0-2-0', notes: 'Contrôler le mouvement' }
    ]
  },
  {
    name: 'Upper 2',
    exercises: [
      { name: 'Incline Dumbbell Press', sets: '4', reps: '8-10', rest: 120, tempo: '2-1-2-0', notes: '30° d\'inclinaison' },
      { name: 'Lat Pulldown', sets: '4', reps: '8-10', rest: 90, tempo: '2-1-2-0', notes: 'Tirer les coudes vers le bas' },
      { name: 'Dumbbell Lateral Raises', sets: '3', reps: '12-15', rest: 60, tempo: '2-0-2-0', notes: 'Légère flexion coudes' },
      { name: 'Cable Row', sets: '3', reps: '10-12', rest: 90, tempo: '2-1-2-0', notes: '' },
      { name: 'Bicep Curls', sets: '3', reps: '10-12', rest: 60, tempo: '2-0-2-0', notes: '' }
    ]
  },
  {
    name: 'Core 1',
    exercises: [
      { name: 'Plank', sets: '3', reps: '30-60s', rest: 60, tempo: '', notes: 'Maintenir le corps aligné' },
      { name: 'Russian Twist', sets: '3', reps: '20', rest: 45, tempo: '1-0-1-0', notes: 'Avec poids si possible' },
      { name: 'Dead Bug', sets: '3', reps: '10', rest: 45, tempo: '2-1-2-1', notes: 'Chaque côté' },
      { name: 'Bird Dog', sets: '3', reps: '10', rest: 45, tempo: '2-1-2-1', notes: 'Chaque côté' }
    ]
  }
];

/**
 * Génère les training plans pour le mois en cours + 3 semaines
 */
function generateDemoTrainingData(now: Date): WorkoutRow[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = getMonthName(month);
  const currentWeek = getWeekNumber(now);

  const plans: WorkoutRow[] = [];
  let id = 1;

  // Générer pour 4 semaines (semaine courante + 3)
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const weekNum = currentWeek + weekOffset;

    SESSION_TEMPLATES.forEach(session => {
      session.exercises.forEach((ex, order) => {
        plans.push({
          id: id++,
          annee: year.toString(),
          moisNom: monthName,
          moisNum: month.toString(),
          semaine: weekNum.toString(),
          seance: session.name,
          ordre: order + 1,
          exercice: ex.name,
          exerciseId: `demo-ex-${ex.name.toLowerCase().replace(/\s+/g, '-')}`,
          series: ex.sets,
          repsDuree: ex.reps,
          repos: ex.rest.toString(),
          tempoRpe: ex.tempo,
          notes: ex.notes,
          video: ''
        });
      });
    });
  }

  return plans;
}

// Définition des exercices avec métadonnées pour les stats
// categoryCode: 'upper' | 'lower' | 'core' | 'saq' - pour les filtres de l'écran Records
interface DemoExercise {
  name: string;
  baseWeight: number;
  analyticsCategory: AnalyticsCategory;
  categoryCode: 'upper' | 'lower' | 'core' | 'saq';
  muscleGroup: string;
  movementPattern: string;
}

const DEMO_EXERCISES: Record<string, DemoExercise[]> = {
  'Upper A': [
    { name: 'Bench Press', baseWeight: 40, analyticsCategory: 'push', categoryCode: 'upper', muscleGroup: 'Pectoraux', movementPattern: 'Horizontal Push' },
    { name: 'Barbell Row', baseWeight: 35, analyticsCategory: 'pull', categoryCode: 'upper', muscleGroup: 'Dorsaux', movementPattern: 'Horizontal Pull' },
    { name: 'Overhead Press', baseWeight: 25, analyticsCategory: 'push', categoryCode: 'upper', muscleGroup: 'Épaules', movementPattern: 'Vertical Push' },
    { name: 'Pull-ups', baseWeight: 0, analyticsCategory: 'pull', categoryCode: 'upper', muscleGroup: 'Dorsaux', movementPattern: 'Vertical Pull' }
  ],
  'Lower A': [
    { name: 'Squat', baseWeight: 50, analyticsCategory: 'legs_squat', categoryCode: 'lower', muscleGroup: 'Quadriceps', movementPattern: 'Squat' },
    { name: 'Romanian Deadlift', baseWeight: 45, analyticsCategory: 'legs_hinge', categoryCode: 'lower', muscleGroup: 'Ischio-jambiers', movementPattern: 'Hip Hinge' },
    { name: 'Leg Press', baseWeight: 80, analyticsCategory: 'legs_squat', categoryCode: 'lower', muscleGroup: 'Quadriceps', movementPattern: 'Squat' },
    { name: 'Leg Curl', baseWeight: 30, analyticsCategory: 'legs_hinge', categoryCode: 'lower', muscleGroup: 'Ischio-jambiers', movementPattern: 'Isolation' }
  ],
  'Upper B': [
    { name: 'Incline Dumbbell Press', baseWeight: 16, analyticsCategory: 'push', categoryCode: 'upper', muscleGroup: 'Pectoraux', movementPattern: 'Horizontal Push' },
    { name: 'Lat Pulldown', baseWeight: 45, analyticsCategory: 'pull', categoryCode: 'upper', muscleGroup: 'Dorsaux', movementPattern: 'Vertical Pull' },
    { name: 'Dumbbell Lateral Raises', baseWeight: 8, analyticsCategory: 'push', categoryCode: 'upper', muscleGroup: 'Épaules', movementPattern: 'Isolation' },
    { name: 'Cable Row', baseWeight: 40, analyticsCategory: 'pull', categoryCode: 'upper', muscleGroup: 'Dorsaux', movementPattern: 'Horizontal Pull' }
  ],
  'Lower B': [
    { name: 'Deadlift', baseWeight: 60, analyticsCategory: 'legs_hinge', categoryCode: 'lower', muscleGroup: 'Dorsaux', movementPattern: 'Hip Hinge' },
    { name: 'Bulgarian Split Squat', baseWeight: 12, analyticsCategory: 'legs_squat', categoryCode: 'lower', muscleGroup: 'Quadriceps', movementPattern: 'Lunge' },
    { name: 'Hip Thrust', baseWeight: 50, analyticsCategory: 'legs_hinge', categoryCode: 'lower', muscleGroup: 'Fessiers', movementPattern: 'Hip Extension' },
    { name: 'Leg Extension', baseWeight: 35, analyticsCategory: 'legs_squat', categoryCode: 'lower', muscleGroup: 'Quadriceps', movementPattern: 'Isolation' }
  ],
  'Core 1': [
    { name: 'Plank', baseWeight: 0, analyticsCategory: 'core', categoryCode: 'core', muscleGroup: 'Abdominaux', movementPattern: 'Isometric' },
    { name: 'Russian Twist', baseWeight: 5, analyticsCategory: 'core', categoryCode: 'core', muscleGroup: 'Obliques', movementPattern: 'Rotation' },
    { name: 'Dead Bug', baseWeight: 0, analyticsCategory: 'core', categoryCode: 'core', muscleGroup: 'Abdominaux', movementPattern: 'Anti-Extension' }
  ]
};

/**
 * Génère l'historique sur 6 mois avec ~1.5 séances/semaine en moyenne
 * Total: ~39 séances sur 26 semaines
 */
function generateDemoSessionHistory(now: Date): SessionLog[] {
  const history: SessionLog[] = [];
  const sessionTypes = ['Upper A', 'Lower A', 'Upper B', 'Lower B'];

  // Pattern pour 1.5 séances/semaine: alterner entre 1 et 2 séances
  // Sur 26 semaines: 13 semaines à 1 séance + 13 semaines à 2 séances = 39 séances

  let sessionTypeIndex = 0;

  for (let weekOffset = 25; weekOffset >= 0; weekOffset--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - (weekOffset * 7));

    const year = weekDate.getFullYear();
    const month = weekDate.getMonth() + 1;
    const week = getWeekNumber(weekDate);

    // Alterner entre 1 et 2 séances par semaine (sauf semaine courante = 0)
    const sessionsCount = weekOffset === 0 ? 0 : (weekOffset % 2 === 0 ? 2 : 1);

    for (let i = 0; i < sessionsCount; i++) {
      const sessionDate = new Date(weekDate);
      // Espacer les séances dans la semaine (lundi, jeudi)
      sessionDate.setDate(sessionDate.getDate() + (i === 0 ? 0 : 3));

      const sessionType = sessionTypes[sessionTypeIndex % sessionTypes.length];
      sessionTypeIndex++;

      const sessionExercises = DEMO_EXERCISES[sessionType] || DEMO_EXERCISES['Upper A'];

      // Progression: ~0.5kg par semaine (plus réaliste)
      const progressionFactor = Math.floor((25 - weekOffset) * 0.5);

      const exercises: ExerciseLog[] = sessionExercises.map((ex, idx) => {
        const weight = ex.baseWeight > 0 ? ex.baseWeight + progressionFactor : 0;
        const setsCount = 3 + Math.floor(Math.random() * 2); // 3-4 séries
        const sets: SetLog[] = [];

        let totalVolume = 0;
        let maxWeight = 0;

        for (let s = 0; s < setsCount; s++) {
          const reps = 6 + Math.floor(Math.random() * 6); // 6-11 reps
          const setWeight = weight > 0 ? weight + (s === setsCount - 1 ? -2 : 0) : 0; // Dernière série légèrement plus légère

          totalVolume += setWeight * reps;
          maxWeight = Math.max(maxWeight, setWeight);

          sets.push({
            setNumber: s + 1,
            reps: reps.toString(),
            weight: setWeight.toString(),
            load: setWeight > 0 ? {
              type: 'single',
              unit: 'kg',
              weightKg: setWeight
            } : undefined,
            completed: true
          });
        }

        return {
          exerciseName: ex.name,
          exerciseId: `demo-ex-${ex.name.toLowerCase().replace(/\s+/g, '-')}`,
          sets,
          rpe: 6 + Math.floor(Math.random() * 3),
          notes: idx === 0 && Math.random() > 0.8 ? 'Bonne sensation' : undefined,
          // Métadonnées pour les stats
          totalVolume,
          maxWeight,
          analyticsCategory: ex.analyticsCategory,
          muscleGroup: ex.muscleGroup,
          movementPattern: ex.movementPattern
        };
      });

      history.push({
        id: crypto.randomUUID(),
        date: sessionDate.toISOString().split('T')[0],
        durationMinutes: 45 + Math.floor(Math.random() * 30),
        sessionKey: {
          annee: year.toString(),
          moisNum: month.toString(),
          semaine: week.toString(),
          seance: sessionType
        },
        exercises,
        sessionRpe: 6 + Math.floor(Math.random() * 3)
      });
    }
  }

  return history;
}

// ============================================================
// GÉNÉRATEURS DE DONNÉES POUR STATS
// ============================================================

/**
 * Type pour les PRs enrichis
 */
export interface DemoPersonalRecord {
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
}

/**
 * Génère les Personal Records depuis l'historique local
 */
export function getDemoPersonalRecords(): Record<string, DemoPersonalRecord> {
  const history = getDemoSessionHistory();
  const prs: Record<string, DemoPersonalRecord> = {};

  history.forEach(session => {
    session.exercises.forEach(exercise => {
      const name = exercise.exerciseName;

      // Calculer les métriques
      let totalReps = 0;
      let maxWeight = 0;
      let totalVolume = 0;

      exercise.sets.forEach(set => {
        const reps = parseInt(set.reps) || 0;
        const weight = parseFloat(set.weight) || 0;
        totalReps += reps;
        maxWeight = Math.max(maxWeight, weight);
        totalVolume += reps * weight;
      });

      // Estimer le 1RM avec la formule d'Epley
      const avgRepsPerSet = totalReps / exercise.sets.length;
      const estimated1RM = maxWeight > 0 ? Math.round(maxWeight * (1 + avgRepsPerSet / 30)) : 0;

      if (!prs[name]) {
        // Trouver les métadonnées de l'exercice
        let metadata: DemoExercise | undefined;
        Object.values(DEMO_EXERCISES).forEach(exercises => {
          const found = exercises.find(e => e.name === name);
          if (found) metadata = found;
        });

        prs[name] = {
          maxWeight: 0,
          maxVolume: 0,
          max1RM: 0,
          maxReps: 0,
          maxDuration: 0,
          lastDate: '',
          sessionLogId: '',
          movementPattern: metadata?.movementPattern || null,
          muscleGroup: metadata?.muscleGroup || null,
          muscleGroupId: null,
          categoryCode: metadata?.categoryCode || null
        };
      }

      // Mettre à jour les PRs
      if (estimated1RM > prs[name].max1RM) {
        prs[name].max1RM = estimated1RM;
        prs[name].lastDate = session.date;
        prs[name].sessionLogId = session.id;
      }
      if (maxWeight > prs[name].maxWeight) {
        prs[name].maxWeight = maxWeight;
      }
      if (totalVolume > prs[name].maxVolume) {
        prs[name].maxVolume = Math.round(totalVolume);
      }
      if (totalReps > prs[name].maxReps) {
        prs[name].maxReps = totalReps;
      }
    });
  });

  return prs;
}

/**
 * Type pour le volume quotidien
 */
export interface DemoDailyVolume {
  date: string;
  totalVolume: number;
  sessionCount: number;
  avgRpe: number | null;
}

/**
 * Génère le volume quotidien pour une année (heatmap)
 */
export function getDemoDailyVolume(year: number): DemoDailyVolume[] {
  const history = getDemoSessionHistory();
  const dateMap = new Map<string, { totalVolume: number; sessionIds: Set<string>; rpeValues: number[] }>();

  history.forEach(session => {
    const sessionYear = parseInt(session.date.split('-')[0]);
    if (sessionYear !== year) return;

    const date = session.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { totalVolume: 0, sessionIds: new Set(), rpeValues: [] });
    }

    const entry = dateMap.get(date)!;
    entry.sessionIds.add(session.id);

    if (session.sessionRpe) {
      entry.rpeValues.push(session.sessionRpe);
    }

    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        const reps = parseInt(set.reps) || 0;
        const weight = parseFloat(set.weight) || 0;
        entry.totalVolume += reps * weight;
      });
    });
  });

  const result: DemoDailyVolume[] = [];
  dateMap.forEach((data, date) => {
    const avgRpe = data.rpeValues.length > 0
      ? Math.round((data.rpeValues.reduce((sum, r) => sum + r, 0) / data.rpeValues.length) * 10) / 10
      : null;

    result.push({
      date,
      totalVolume: Math.round(data.totalVolume),
      sessionCount: data.sessionIds.size,
      avgRpe
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Type pour la distribution par catégorie
 */
export interface DemoCategoryDistribution {
  category: AnalyticsCategory;
  totalVolume: number;
  sessionCount: number;
  percentage: number;
}

/**
 * Génère la distribution par catégorie analytics (Push/Pull/Legs/Core)
 */
export function getDemoCategoryDistribution(startDate?: string, endDate?: string): DemoCategoryDistribution[] {
  const history = getDemoSessionHistory();
  const categoryMap = new Map<AnalyticsCategory, { totalVolume: number; sessionIds: Set<string> }>();
  let grandTotal = 0;

  history.forEach(session => {
    // Filtrer par date si spécifié
    if (startDate && session.date < startDate) return;
    if (endDate && session.date > endDate) return;

    session.exercises.forEach(ex => {
      // Trouver la catégorie de l'exercice
      let category: AnalyticsCategory | null = null;
      Object.values(DEMO_EXERCISES).forEach(exercises => {
        const found = exercises.find(e => e.name === ex.exerciseName);
        if (found) category = found.analyticsCategory;
      });

      if (!category) return;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { totalVolume: 0, sessionIds: new Set() });
      }

      const entry = categoryMap.get(category)!;
      entry.sessionIds.add(session.id);

      ex.sets.forEach(set => {
        const reps = parseInt(set.reps) || 0;
        const weight = parseFloat(set.weight) || 0;
        const volume = reps * weight;
        entry.totalVolume += volume;
        grandTotal += volume;
      });
    });
  });

  const result: DemoCategoryDistribution[] = [];
  categoryMap.forEach((data, category) => {
    result.push({
      category: category,
      totalVolume: Math.round(data.totalVolume),
      sessionCount: data.sessionIds.size,
      percentage: grandTotal > 0 ? Math.round((data.totalVolume / grandTotal) * 100) : 0
    });
  });

  result.sort((a, b) => b.totalVolume - a.totalVolume);
  return result;
}

/**
 * Type pour les tendances de session
 */
export interface DemoSessionTrend {
  date: string;
  weekNumber: number;
  totalVolume: number;
  avgRpe: number | null;
  sessionCount: number;
}

/**
 * Génère les tendances de session (volume et RPE par semaine)
 */
export function getDemoSessionTrends(weeksBack: number = 12): DemoSessionTrend[] {
  const history = getDemoSessionHistory();
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const weekMap = new Map<string, { totalVolume: number; rpeValues: number[]; sessionIds: Set<string>; weekNum: number }>();

  history.forEach(session => {
    if (session.date < cutoffStr) return;

    const sessionDate = new Date(session.date);
    const weekNum = getWeekNumber(sessionDate);
    const year = sessionDate.getFullYear();
    const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { totalVolume: 0, rpeValues: [], sessionIds: new Set(), weekNum });
    }

    const entry = weekMap.get(weekKey)!;
    entry.sessionIds.add(session.id);

    if (session.sessionRpe) {
      entry.rpeValues.push(session.sessionRpe);
    }

    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        const reps = parseInt(set.reps) || 0;
        const weight = parseFloat(set.weight) || 0;
        entry.totalVolume += reps * weight;
      });
    });
  });

  const result: DemoSessionTrend[] = [];
  weekMap.forEach((data, weekKey) => {
    const avgRpe = data.rpeValues.length > 0
      ? Math.round((data.rpeValues.reduce((sum, r) => sum + r, 0) / data.rpeValues.length) * 10) / 10
      : null;

    result.push({
      date: weekKey,
      weekNumber: data.weekNum,
      totalVolume: Math.round(data.totalVolume),
      avgRpe,
      sessionCount: data.sessionIds.size
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Génère l'historique 1RM pour un exercice donné
 */
export function getDemo1RMHistory(exerciseName: string): Array<{ date: string; estimated1RM: number }> {
  const history = getDemoSessionHistory();
  const result: Array<{ date: string; estimated1RM: number }> = [];

  history.forEach(session => {
    session.exercises.forEach(ex => {
      if (ex.exerciseName !== exerciseName) return;

      let maxWeight = 0;
      let totalReps = 0;

      ex.sets.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        maxWeight = Math.max(maxWeight, weight);
        totalReps += reps;
      });

      if (maxWeight > 0) {
        const avgReps = totalReps / ex.sets.length;
        const estimated1RM = Math.round(maxWeight * (1 + avgReps / 30));
        result.push({
          date: session.date,
          estimated1RM
        });
      }
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Type pour la hiérarchie de filtres 1RM (compatible avec CategoryWithMuscleGroups)
 */
export interface Demo1RMFilterCategory {
  categoryCode: string;
  categoryName: string;
  muscleGroups: {
    id: string;
    name: string;
    exercises: string[];
  }[];
}

/**
 * Génère la hiérarchie de filtres pour le graphique 1RM
 */
export function getDemo1RMFilterHierarchy(): Demo1RMFilterCategory[] {
  // Construire la hiérarchie depuis les exercices démo
  const categories: Record<string, {
    name: string;
    displayOrder: number;
    muscleGroups: Record<string, {
      name: string;
      exercises: Set<string>;
    }>;
  }> = {};

  // Mapper les catégories analytics vers les codes/noms attendus
  const categoryMeta: Record<string, { code: string; name: string; order: number }> = {
    'push': { code: 'PUSH', name: 'Push', order: 1 },
    'pull': { code: 'PULL', name: 'Pull', order: 2 },
    'legs_squat': { code: 'LEGS_SQUAT', name: 'Jambes (Squat)', order: 3 },
    'legs_hinge': { code: 'LEGS_HINGE', name: 'Jambes (Hinge)', order: 4 },
    'core': { code: 'CORE', name: 'Core', order: 5 }
  };

  Object.values(DEMO_EXERCISES).forEach(exercises => {
    exercises.forEach(ex => {
      const catInfo = categoryMeta[ex.analyticsCategory];
      if (!catInfo) return;

      if (!categories[catInfo.code]) {
        categories[catInfo.code] = {
          name: catInfo.name,
          displayOrder: catInfo.order,
          muscleGroups: {}
        };
      }

      const cat = categories[catInfo.code];
      const muscleGroupId = `demo-mg-${ex.muscleGroup.toLowerCase().replace(/\s+/g, '-')}`;

      if (!cat.muscleGroups[muscleGroupId]) {
        cat.muscleGroups[muscleGroupId] = {
          name: ex.muscleGroup,
          exercises: new Set()
        };
      }

      cat.muscleGroups[muscleGroupId].exercises.add(ex.name);
    });
  });

  // Convertir en tableau
  const result: Array<Demo1RMFilterCategory & { displayOrder: number }> = [];
  Object.entries(categories).forEach(([code, cat]) => {
    result.push({
      categoryCode: code,
      categoryName: cat.name,
      displayOrder: cat.displayOrder,
      muscleGroups: Object.entries(cat.muscleGroups).map(([id, mg]) => ({
        id,
        name: mg.name,
        exercises: Array.from(mg.exercises).sort()
      }))
    });
  });

  result.sort((a, b) => a.displayOrder - b.displayOrder);
  // Retourner sans displayOrder qui n'est pas dans l'interface finale
  return result.map(({ displayOrder, ...rest }) => rest);
}

// ============================================================
// FONCTIONS DE CALCUL POUR LES BADGES EN MODE DÉMO
// ============================================================

/**
 * Calcule le nombre total de séances en mode démo
 */
export function getDemoCumulativeSessions(): number {
  const history = getDemoSessionHistory();
  return history.length;
}

/**
 * Calcule le streak actuel en mode démo (jours consécutifs avec tolérance)
 * Retourne le nombre de semaines de streak
 */
export function getDemoStreakTolerant(): number {
  const history = getDemoSessionHistory();
  if (history.length === 0) return 0;

  // Trier par date décroissante
  const sortedDates = history
    .map(s => s.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Calculer les semaines uniques avec séances
  const weeksWithSessions = new Set<string>();
  sortedDates.forEach(date => {
    const d = new Date(date);
    const weekNum = getWeekNumber(d);
    const year = d.getFullYear();
    weeksWithSessions.add(`${year}-W${weekNum}`);
  });

  // Compter les semaines consécutives récentes
  let streak = 0;
  const now = new Date();
  let currentWeek = getWeekNumber(now);
  let currentYear = now.getFullYear();

  for (let i = 0; i < 52; i++) {
    const weekKey = `${currentYear}-W${currentWeek}`;
    if (weeksWithSessions.has(weekKey)) {
      streak++;
    } else if (streak > 0) {
      break; // Streak cassé
    }

    // Passer à la semaine précédente
    currentWeek--;
    if (currentWeek < 1) {
      currentWeek = 52;
      currentYear--;
    }
  }

  return streak;
}

/**
 * Calcule le nombre d'heures cumulées en mode démo
 */
export function getDemoCumulativeHours(): number {
  const history = getDemoSessionHistory();
  const totalMinutes = history.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  return Math.floor(totalMinutes / 60);
}

/**
 * Calcule le nombre de séances avec RPE >= seuil
 */
export function getDemoRPECount(threshold: number): number {
  const history = getDemoSessionHistory();
  return history.filter(s => (s.sessionRpe || 0) >= threshold).length;
}

/**
 * Calcule le nombre d'exercices uniques
 */
export function getDemoUniqueExercises(): number {
  const history = getDemoSessionHistory();
  const uniqueNames = new Set<string>();
  history.forEach(s => {
    s.exercises.forEach(ex => {
      uniqueNames.add(ex.exerciseName);
    });
  });
  return uniqueNames.size;
}

/**
 * Calcule le nombre de types de séances différents
 */
export function getDemoSessionTypes(): number {
  const history = getDemoSessionHistory();
  const uniqueTypes = new Set<string>();
  history.forEach(s => {
    if (s.sessionKey?.seance) {
      uniqueTypes.add(s.sessionKey.seance);
    }
  });
  return uniqueTypes.size;
}

/**
 * Vérifie si l'utilisateur est revenu après une pause (comeback)
 * Retourne 1 si oui, 0 sinon
 */
export function getDemoComeback(_minDaysAway: number): number {
  // En démo, on simule un comeback réussi
  return 1;
}

/**
 * Vérifie la consistance (pas de gap > maxGapDays)
 * Retourne le nombre de semaines de consistance
 */
export function getDemoConsistency(_minWeeks: number): number {
  // En démo, on simule une bonne consistance
  return getDemoStreakTolerant();
}

// ============================================================
// HELPERS
// ============================================================

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month - 1] || 'Inconnu';
}
