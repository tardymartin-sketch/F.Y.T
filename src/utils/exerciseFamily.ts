// ============================================================
// Matching de familles d'exercices — tolérant aux variantes d'écriture.
//
// Le carrousel d'historique regroupe les exercices par « famille »
// (colonne exercises.exercise_family). La jointure se fait par NOM, or les
// noms loggés varient (anglais, pluriel, accents, forme courte) et ne
// correspondent pas toujours à la bibliothèque française `exercises`.
//
// Ce module centralise :
//  1. normalizeExerciseName() : clé de comparaison robuste (accents/casse/
//     ponctuation/espaces/suffixe variante " :: xxx" neutralisés).
//  2. EXERCISE_FAMILY_ALIASES : rattache les noms fréquents non mappés en base
//     (souvent anglais ou raccourcis) à leur famille.
// ============================================================

/**
 * Normalise un nom d'exercice pour le matching de famille.
 * - retire le suffixe de variante " :: xxx"
 * - supprime les accents (é → e)
 * - insensible à la casse
 * - ponctuation et espaces multiples réduits à un espace simple
 */
export function normalizeExerciseName(name: string): string {
  const base = name.split(' :: ')[0]; // nom principal, sans la variante
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // ponctuation → espace
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Alias nom (normalisé) → famille, pour les exercices dont le nom loggé
 * n'existe pas tel quel dans la table `exercises` (donc sans exercise_family).
 * Les familles ciblées sont celles de migrations/exercise_family_migration.sql.
 * Les clés sont déjà écrites sous forme normalisée (cf. normalizeExerciseName).
 */
export const EXERCISE_FAMILY_ALIASES: Record<string, string> = {
  // ── Pectoraux — développé ──────────────────────────────────
  'bench press': 'bench_press',
  'db bench press': 'bench_press',
  'developpe couche': 'bench_press',

  // ── Dos — tractions / tirage vertical ──────────────────────
  'pull ups': 'vertical_pull',
  'pull up': 'vertical_pull',
  'pullups': 'vertical_pull',
  'tractions': 'vertical_pull',
  'lat pulldown': 'vertical_pull',
  'tirage poulie haute': 'vertical_pull',
  'tirage vertical poulie': 'vertical_pull',

  // ── Dos — rowing horizontal ────────────────────────────────
  'barbell row': 'row',
  'seated row': 'row',
  'rowing haltere': 'row',
  'tirage horizontal barre': 'row',

  // ── Épaules — développé overhead ───────────────────────────
  'overhead press': 'overhead_press',
  'ohp': 'overhead_press',
  'shoulder press': 'overhead_press',
  'developpe militaire': 'overhead_press',

  // ── Épaules — élévations ───────────────────────────────────
  'elevations laterales': 'shoulder_raise',
  'lateral raise': 'shoulder_raise',
  'face pull': 'shoulder_raise',
  'face pulls': 'shoulder_raise',

  // ── Triceps ────────────────────────────────────────────────
  'dips': 'tricep_extension',
  'tricep pushdown': 'tricep_extension',
  'extension triceps poulie': 'tricep_extension',

  // ── Biceps ─────────────────────────────────────────────────
  'bicep curl': 'bicep_curl',
  'curl biceps': 'bicep_curl',
  'curl biceps halteres': 'bicep_curl',

  // ── Jambes ─────────────────────────────────────────────────
  'lunges': 'lunge',
  'back squat': 'squat',
  'back squat atg': 'squat',
  'front squat': 'squat',
  'souleve de terre': 'deadlift',
  'leg curl': 'leg_curl',
  'leg curl allonge': 'leg_curl',
  'pont fessier': 'hip_thrust',
  'glute bridge': 'hip_thrust',

  // ── Core ───────────────────────────────────────────────────
  'plank': 'plank',
  'planche avant': 'plank',
  'rollout roue abdominale': 'plank',
  'dead bug': 'anti_rotation',
  'pallof press': 'anti_rotation',
};

/**
 * Applique la table d'alias à une map nom-normalisé → famille (issue de la base),
 * sans écraser les entrées existantes (la base fait foi quand elle a la famille).
 * Mutation en place, retourne la map pour chaînage.
 */
export function mergeFamilyAliases(
  map: Record<string, string>,
): Record<string, string> {
  for (const [alias, family] of Object.entries(EXERCISE_FAMILY_ALIASES)) {
    if (!(alias in map)) map[alias] = family;
  }
  return map;
}
