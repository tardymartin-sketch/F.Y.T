-- ============================================================
-- F.Y.T - DIAGNOSTIC & FIX: Mapping exercise_logs avec exercises
-- ============================================================
-- Ce script diagnostique pourquoi les colonnes muscle_group/movement_pattern
-- sont vides et propose des solutions
-- ============================================================

-- ============================================================
-- SECTION 1: DIAGNOSTIC - État de la table exercises
-- ============================================================

-- 1.1 Vérifier les colonnes de la table exercises
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- 1.2 Vérifier combien d'exercices ont primary_muscle_group_id et movement_pattern_id renseignés
SELECT
  COUNT(*) as total_exercises,
  COUNT(primary_muscle_group_id) as with_muscle_group,
  COUNT(movement_pattern_id) as with_movement_pattern,
  COUNT(limb_type) as with_limb_type
FROM exercises;

-- 1.3 Lister les exercices SANS muscle_group ou movement_pattern
SELECT
  id,
  name,
  primary_muscle_group_id,
  movement_pattern_id,
  limb_type
FROM exercises
WHERE primary_muscle_group_id IS NULL
   OR movement_pattern_id IS NULL
ORDER BY name;


-- ============================================================
-- SECTION 2: DIAGNOSTIC - État des tables référentielles
-- ============================================================

-- 2.1 Contenu de muscle_groups
SELECT * FROM muscle_groups ORDER BY name_fr;

-- 2.2 Contenu de movement_patterns
SELECT * FROM movement_patterns ORDER BY code;


-- ============================================================
-- SECTION 3: DIAGNOSTIC - Mappage actuel dans exercise_logs
-- ============================================================

-- 3.1 État des colonnes dans exercise_logs
SELECT
  COUNT(*) as total_logs,
  COUNT(exercise_id) as with_exercise_id,
  COUNT(muscle_group_id) as with_muscle_group_id,
  COUNT(muscle_group_name) as with_muscle_group_name,
  COUNT(movement_pattern_id) as with_movement_pattern_id,
  COUNT(movement_pattern_name) as with_movement_pattern_name,
  COUNT(analytics_category) as with_analytics_category
FROM exercise_logs;

-- 3.2 Vérifier les exercices dans exercise_logs qui ont un exercise_id mais pas de muscle_group
SELECT DISTINCT
  el.exercise_name,
  el.exercise_id,
  e.primary_muscle_group_id as ex_muscle_group_id,
  e.movement_pattern_id as ex_movement_pattern_id,
  el.muscle_group_id as log_muscle_group_id,
  el.movement_pattern_id as log_movement_pattern_id
FROM exercise_logs el
LEFT JOIN exercises e ON e.id = el.exercise_id
WHERE el.muscle_group_id IS NULL
ORDER BY el.exercise_name;


-- ============================================================
-- SECTION 4: FIX - Mettre à jour exercise_logs depuis exercises
-- ============================================================
-- Cette section met à jour exercise_logs en rejoignant avec exercises
-- pour récupérer les données de catégorisation

-- 4.1 Mise à jour des colonnes depuis exercises (si exercises a les données)
UPDATE exercise_logs el
SET
  limb_type = COALESCE(e.limb_type, 'bilateral'),
  muscle_group_id = e.primary_muscle_group_id,
  muscle_group_name = mg.name_fr,
  movement_pattern_id = e.movement_pattern_id,
  movement_pattern_name = mp.name_fr,
  analytics_category = get_analytics_category(mp.code)
FROM exercises e
LEFT JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
LEFT JOIN movement_patterns mp ON mp.id = e.movement_pattern_id
WHERE el.exercise_id = e.id
  AND el.exercise_id IS NOT NULL;

-- 4.2 Vérification après mise à jour
SELECT
  COUNT(*) as total_logs,
  COUNT(muscle_group_id) as with_muscle_group_id,
  COUNT(muscle_group_name) as with_muscle_group_name,
  COUNT(movement_pattern_id) as with_movement_pattern_id,
  COUNT(movement_pattern_name) as with_movement_pattern_name,
  COUNT(analytics_category) as with_analytics_category
FROM exercise_logs;


-- ============================================================
-- SECTION 5: LISTE DES EXERCICES À ENRICHIR
-- ============================================================
-- Si les colonnes sont toujours vides, c'est que les exercises
-- n'ont pas primary_muscle_group_id et movement_pattern_id renseignés

-- 5.1 Exercices utilisés dans exercise_logs mais sans catégorisation
SELECT DISTINCT
  e.id as exercise_id,
  e.name as exercise_name,
  e.primary_muscle_group_id,
  e.movement_pattern_id,
  COUNT(el.id) as usage_count
FROM exercise_logs el
JOIN exercises e ON e.id = el.exercise_id
WHERE e.primary_muscle_group_id IS NULL
   OR e.movement_pattern_id IS NULL
GROUP BY e.id, e.name, e.primary_muscle_group_id, e.movement_pattern_id
ORDER BY usage_count DESC;

-- 5.2 ALTERNATIVE: Si exercise_id est NULL dans exercise_logs,
-- on peut essayer de matcher par nom
SELECT DISTINCT
  el.exercise_name,
  el.exercise_id,
  e.id as matched_exercise_id,
  e.primary_muscle_group_id,
  e.movement_pattern_id
FROM exercise_logs el
LEFT JOIN exercises e ON LOWER(e.name) = LOWER(el.exercise_name)
WHERE el.exercise_id IS NULL
ORDER BY el.exercise_name;


-- ============================================================
-- SECTION 6: SCRIPT DE MISE À JOUR DES EXERCISES (À PERSONNALISER)
-- ============================================================
-- CE SCRIPT EST UN TEMPLATE - IL FAUT L'ADAPTER SELON VOS DONNÉES
-- Décommentez et modifiez selon vos besoins

/*
-- Exemple: Mettre à jour un exercice spécifique
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Pectoraux'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'horizontal_push')
WHERE name = 'Développé couché à la barre';

-- Exemple: Mise à jour en masse pour les exercices de poussée
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Pectoraux'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'horizontal_push')
WHERE name ILIKE '%développé couché%'
   OR name ILIKE '%bench press%';

-- Après mise à jour des exercises, relancer la Section 4 pour propager à exercise_logs
*/


-- ============================================================
-- SECTION 7: VÉRIFICATION FINALE
-- ============================================================

-- 7.1 Distribution par analytics_category
SELECT
  analytics_category,
  COUNT(*) as count
FROM exercise_logs
GROUP BY analytics_category
ORDER BY count DESC;

-- 7.2 Distribution par muscle_group_name
SELECT
  muscle_group_name,
  COUNT(*) as count
FROM exercise_logs
GROUP BY muscle_group_name
ORDER BY count DESC;

-- 7.3 Échantillon de données complètes
SELECT
  exercise_name,
  exercise_order,
  exercise_type,
  load_type,
  limb_type,
  muscle_group_name,
  movement_pattern_name,
  analytics_category,
  sets_count,
  total_reps,
  max_weight
FROM exercise_logs
ORDER BY date DESC, exercise_order
LIMIT 20;
