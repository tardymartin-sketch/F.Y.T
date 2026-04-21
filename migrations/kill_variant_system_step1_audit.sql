-- ===========================================
-- Kill Variant System — Étape 1 : Audit
-- LECTURE SEULE — aucune modification de données
-- Exécuter en premier pour mesurer la portée de la migration
-- ===========================================

-- 1a. Combien de variantes existent ?
SELECT id, name
FROM exercises
WHERE name LIKE '% :: %'
ORDER BY name;

-- 1b. Ces variantes sont-elles référencées dans training_plans ?
SELECT e.name, COUNT(tp.id) AS plan_refs
FROM exercises e
LEFT JOIN training_plans tp ON tp.exercise_id = e.id
WHERE e.name LIKE '% :: %'
GROUP BY e.name
ORDER BY e.name;

-- 1c. Ces variantes sont-elles dans exercise_usage ?
SELECT exercise_name, COUNT(*) AS usage_count
FROM exercise_usage
WHERE exercise_name LIKE '% :: %'
GROUP BY exercise_name
ORDER BY exercise_name;

-- 1d. Ces variantes sont-elles dans session_logs (JSONB) ?
SELECT COUNT(*) AS session_logs_with_variants
FROM session_logs
WHERE exercises::text LIKE '% :: %';

-- 1e. Quels noms canoniques manquent ?
SELECT DISTINCT
  split_part(name, ' :: ', 1) AS base_name_manquant
FROM exercises
WHERE name LIKE '% :: %'
  AND NOT EXISTS (
    SELECT 1 FROM exercises e2
    WHERE e2.name = split_part(exercises.name, ' :: ', 1)
      AND e2.name NOT LIKE '% :: %'
  )
ORDER BY 1;

-- 1f. Colonnes NOT NULL dans exercises
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 1g. Colonnes tempo/coach_instructions/video_url présentes ?
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'exercises'
  AND column_name IN ('tempo', 'coach_instructions', 'video_url');
