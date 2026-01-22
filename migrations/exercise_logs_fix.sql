-- ============================================================
-- F.Y.T - MIGRATION FIX: Corrections pour exercise_logs
-- ============================================================
-- Ce fichier corrige les problèmes identifiés lors de la recette :
-- 1. Ajouter colonne "exercise_order" pour l'ordre dans la séance
-- 2. Ajouter colonne "exercise_type" pour différencier reps/temps
-- 3. Supprimer les doublons créés par erreur
-- 4. Re-migrer proprement avec WITH ORDINALITY pour capturer l'ordre
-- ============================================================

-- ============================================================
-- SECTION 1: NETTOYER LES DONNÉES EXISTANTES
-- ============================================================
-- ATTENTION: Cette section vide la table exercise_logs pour re-migrer proprement

TRUNCATE TABLE exercise_logs;


-- ============================================================
-- SECTION 2: AJOUTER LES COLONNES MANQUANTES
-- ============================================================

-- Colonne pour l'ordre de l'exercice dans la séance (1, 2, 3, ...)
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS exercise_order INT NOT NULL DEFAULT 0;

-- Colonne pour le type d'exercice (reps vs temps)
-- 'reps' = répétitions (8 reps)
-- 'time' = chronométré (30s, 1:30)
-- 'distance' = distance (réservé pour futur usage)
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS exercise_type TEXT NOT NULL DEFAULT 'reps';

-- Index sur exercise_order pour tri
CREATE INDEX IF NOT EXISTS idx_exercise_logs_order
ON exercise_logs(session_log_id, exercise_order);


-- ============================================================
-- SECTION 3: FONCTION HELPER POUR DÉTECTER LE TYPE D'EXERCICE
-- ============================================================

DROP FUNCTION IF EXISTS detect_exercise_type(TEXT);

CREATE OR REPLACE FUNCTION detect_exercise_type(reps_str TEXT)
RETURNS TEXT AS $$
BEGIN
  IF reps_str IS NULL OR reps_str = '' THEN
    RETURN 'reps';
  END IF;

  -- Format temps: "30s", "1:30", "45sec", "1min", "1'30"
  IF reps_str ~* '^\d+\s*(s|sec|seconds?)$' THEN
    RETURN 'time';
  END IF;

  IF reps_str ~ '^\d+:\d+$' THEN
    RETURN 'time';
  END IF;

  IF reps_str ~* '^\d+\s*(min|minutes?)$' THEN
    RETURN 'time';
  END IF;

  IF reps_str ~ '^\d+''\d+$' THEN
    RETURN 'time';
  END IF;

  -- Sinon c'est des reps
  RETURN 'reps';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- SECTION 4: FONCTION HELPER POUR PARSER LE TEMPS EN SECONDES
-- ============================================================

DROP FUNCTION IF EXISTS parse_time_to_seconds(TEXT);

CREATE OR REPLACE FUNCTION parse_time_to_seconds(time_str TEXT)
RETURNS INT AS $$
DECLARE
  parts TEXT[];
  minutes INT;
  seconds INT;
BEGIN
  IF time_str IS NULL OR time_str = '' THEN
    RETURN 0;
  END IF;

  -- Format "30s" ou "30sec"
  IF time_str ~* '^\d+\s*(s|sec|seconds?)$' THEN
    RETURN regexp_replace(time_str, '[^0-9]', '', 'g')::int;
  END IF;

  -- Format "1:30" (min:sec)
  IF time_str ~ '^\d+:\d+$' THEN
    parts := string_to_array(time_str, ':');
    minutes := parts[1]::int;
    seconds := parts[2]::int;
    RETURN minutes * 60 + seconds;
  END IF;

  -- Format "1min" ou "2minutes"
  IF time_str ~* '^\d+\s*(min|minutes?)$' THEN
    RETURN regexp_replace(time_str, '[^0-9]', '', 'g')::int * 60;
  END IF;

  -- Format "1'30" (min'sec)
  IF time_str ~ '^\d+''\d+$' THEN
    parts := string_to_array(time_str, '''');
    minutes := parts[1]::int;
    seconds := parts[2]::int;
    RETURN minutes * 60 + seconds;
  END IF;

  RETURN 0;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- SECTION 5: FONCTION POUR DÉTECTER LE TYPE MAJORITAIRE D'EXERCICE
-- ============================================================

DROP FUNCTION IF EXISTS get_majority_exercise_type(JSONB);

CREATE OR REPLACE FUNCTION get_majority_exercise_type(sets JSONB)
RETURNS TEXT AS $$
DECLARE
  time_count INT := 0;
  reps_count INT := 0;
  element JSONB;
BEGIN
  IF sets IS NULL OR jsonb_array_length(sets) = 0 THEN
    RETURN 'reps';
  END IF;

  FOR element IN SELECT * FROM jsonb_array_elements(sets)
  LOOP
    IF element->>'completed' = 'true' THEN
      IF detect_exercise_type(element->>'reps') = 'time' THEN
        time_count := time_count + 1;
      ELSE
        reps_count := reps_count + 1;
      END IF;
    END IF;
  END LOOP;

  IF time_count > reps_count THEN
    RETURN 'time';
  ELSE
    RETURN 'reps';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- SECTION 6: RE-MIGRATION DES DONNÉES AVEC WITH ORDINALITY
-- ============================================================
-- Utilise WITH ORDINALITY pour capturer l'index de l'exercice dans le tableau JSONB

INSERT INTO exercise_logs (
  session_log_id,
  user_id,
  exercise_id,
  exercise_name,
  date,
  year,
  week,
  session_name,
  exercise_order,
  exercise_type,
  load_type,
  limb_type,
  muscle_group_id,
  muscle_group_name,
  movement_pattern_id,
  movement_pattern_name,
  analytics_category,
  sets_count,
  total_reps,
  max_weight,
  avg_weight,
  total_volume,
  rpe,
  sets_detail,
  backup_temp,
  notes
)
SELECT
  sl.id as session_log_id,
  sl.user_id,
  (ex_data.element->>'exerciseId')::uuid as exercise_id,
  ex_data.element->>'exerciseName' as exercise_name,
  sl.date::date,
  COALESCE(sl.session_key_year, EXTRACT(YEAR FROM sl.date)::int) as year,
  COALESCE(sl.session_key_week, EXTRACT(WEEK FROM sl.date)::int) as week,
  sl.session_key_name as session_name,

  -- NOUVEAU: Ordre de l'exercice dans la séance (1-based)
  ex_data.ordinality::int as exercise_order,

  -- NOUVEAU: Type d'exercice (reps ou time)
  get_majority_exercise_type(ex_data.element->'sets') as exercise_type,

  -- Type de charge majoritaire (égalité → 1er utilisé)
  get_majority_load_type(ex_data.element->'sets') as load_type,

  -- Récupérer limb_type depuis exercises (défaut: bilateral)
  COALESCE(e.limb_type, 'bilateral') as limb_type,

  -- Catégorisation musculaire (depuis exercises + tables référentielles)
  e.primary_muscle_group_id as muscle_group_id,
  mg.name_fr as muscle_group_name,
  e.movement_pattern_id,
  mp.name_fr as movement_pattern_name,
  get_analytics_category(mp.code) as analytics_category,

  jsonb_array_length(ex_data.element->'sets') as sets_count,

  -- Total reps/temps avec parsing
  -- Pour les exercices chronométrés, on stocke le temps total en secondes
  CASE
    WHEN get_majority_exercise_type(ex_data.element->'sets') = 'time' THEN
      (SELECT COALESCE(SUM(parse_time_to_seconds(s->>'reps')), 0)
       FROM jsonb_array_elements(ex_data.element->'sets') s
       WHERE s->>'completed' = 'true')
    ELSE
      (SELECT COALESCE(SUM(
        CASE
          WHEN s->>'reps' ~* '^\d+[xX]\d+$' THEN parse_reps(s->>'reps')
          WHEN COALESCE(e.limb_type, 'bilateral') = 'unilateral' THEN parse_reps(s->>'reps') * 2
          ELSE parse_reps(s->>'reps')
        END
      ), 0)
       FROM jsonb_array_elements(ex_data.element->'sets') s
       WHERE s->>'completed' = 'true')
  END as total_reps,

  -- Max weight avec parsing "20+10" → 30
  (SELECT MAX(parse_weight(s->>'weight'))
   FROM jsonb_array_elements(ex_data.element->'sets') s
   WHERE s->>'completed' = 'true') as max_weight,

  -- Avg weight
  (SELECT AVG(parse_weight(s->>'weight'))
   FROM jsonb_array_elements(ex_data.element->'sets') s
   WHERE s->>'completed' = 'true'
     AND parse_weight(s->>'weight') IS NOT NULL
     AND parse_weight(s->>'weight') > 0) as avg_weight,

  -- Volume = sum(reps × weight) - NULL pour exercices chronométrés
  CASE
    WHEN get_majority_exercise_type(ex_data.element->'sets') = 'time' THEN NULL
    ELSE
      (SELECT SUM(
        CASE
          WHEN s->>'reps' ~* '^\d+[xX]\d+$' THEN parse_reps(s->>'reps')
          WHEN COALESCE(e.limb_type, 'bilateral') = 'unilateral' THEN parse_reps(s->>'reps') * 2
          ELSE parse_reps(s->>'reps')
        END * COALESCE(parse_weight(s->>'weight'), 0)
      )
       FROM jsonb_array_elements(ex_data.element->'sets') s
       WHERE s->>'completed' = 'true')
  END as total_volume,

  (ex_data.element->>'rpe')::smallint as rpe,

  -- sets_detail enrichi avec loadType et exerciseType par set
  (SELECT jsonb_agg(
    jsonb_build_object(
      'setNumber', s->>'setNumber',
      'reps', s->>'reps',
      'weight', s->>'weight',
      'loadType', detect_load_type(s->>'weight')::text,
      'exerciseType', detect_exercise_type(s->>'reps'),
      'completed', (s->>'completed')::boolean
    )
  )
  FROM jsonb_array_elements(ex_data.element->'sets') s) as sets_detail,

  -- Backup des données originales
  ex_data.element->'sets' as backup_temp,

  ex_data.element->>'notes' as notes

FROM session_logs sl
-- CORRECTION: Utiliser WITH ORDINALITY pour capturer l'index
CROSS JOIN LATERAL jsonb_array_elements(sl.exercises) WITH ORDINALITY AS ex_data(element, ordinality)
LEFT JOIN exercises e ON e.id = (ex_data.element->>'exerciseId')::uuid
LEFT JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
LEFT JOIN movement_patterns mp ON mp.id = e.movement_pattern_id
WHERE sl.exercises IS NOT NULL
  AND jsonb_array_length(sl.exercises) > 0
  -- Exclure les sessions avec données invalides/test (garbage data identifié)
  AND sl.id NOT IN (
    'f5e6d001-5c3a-4198-a78c-8b176dfe7d19',
    'f69e4b14-c4a3-44ab-bb7b-ed6188e2c471',
    '76632f5b-e889-4d78-92a9-ceffe447dbb5',
    '29f1cb89-09cc-4151-86ad-f362c6c5d8dd',
    '64142352-d3f0-4012-8e98-30698a84ed38'
  );


-- ============================================================
-- SECTION 7: VÉRIFICATIONS
-- ============================================================

-- Vérifier que pas de doublons (session_log_id + exercise_order doit être unique)
SELECT
  session_log_id,
  exercise_order,
  COUNT(*) as count
FROM exercise_logs
GROUP BY session_log_id, exercise_order
HAVING COUNT(*) > 1;

-- Vérifier la distribution des exercise_type
SELECT exercise_type, COUNT(*) as count
FROM exercise_logs
GROUP BY exercise_type;

-- Vérifier que exercise_order est bien rempli
SELECT
  MIN(exercise_order) as min_order,
  MAX(exercise_order) as max_order,
  COUNT(DISTINCT session_log_id) as sessions_count,
  COUNT(*) as total_logs
FROM exercise_logs;

-- Vérifier l'état des colonnes muscle_group et movement_pattern
SELECT
  COUNT(*) as total,
  COUNT(muscle_group_id) as with_muscle_group,
  COUNT(movement_pattern_id) as with_movement_pattern,
  COUNT(analytics_category) as with_analytics_category
FROM exercise_logs;

-- Liste des exercises sans catégorisation (à enrichir dans la table exercises)
SELECT DISTINCT
  el.exercise_name,
  el.exercise_id,
  e.primary_muscle_group_id,
  e.movement_pattern_id
FROM exercise_logs el
LEFT JOIN exercises e ON e.id = el.exercise_id
WHERE el.muscle_group_id IS NULL OR el.movement_pattern_id IS NULL
ORDER BY el.exercise_name;
