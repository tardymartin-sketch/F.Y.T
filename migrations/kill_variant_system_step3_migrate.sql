-- ===========================================
-- Kill Variant System — Étape 3 : Migration des données (TRANSACTION)
-- Prérequis : étapes 1 et 2 OK + vérification = 0
-- Couvre les étapes 3, 4, 5 et 5.5 du plan.
-- Tout est dans une transaction : rollback automatique si erreur.
-- POINT DE NON-RETOUR : le COMMIT en fin de fichier.
-- ===========================================

BEGIN;

-- -----------------------------------------------
-- Étape 3 : Migrer tempo/notes/video des variantes → training_plans
-- COALESCE : ne remplace que si la cible est vide (préserve les données existantes)
-- -----------------------------------------------
UPDATE training_plans tp
SET
  "Tempo"           = COALESCE(NULLIF(tp."Tempo", ''),          e.tempo),
  "Notes/Consignes" = COALESCE(NULLIF(tp."Notes/Consignes", ''), e.coach_instructions),
  video_url         = COALESCE(NULLIF(tp.video_url, ''),         e.video_url)
FROM exercises e
WHERE tp.exercise_id = e.id
  AND e.name LIKE '% :: %';

-- -----------------------------------------------
-- Étape 4 : Remapper les FKs training_plans → exercices canoniques
-- -----------------------------------------------
UPDATE training_plans tp
SET
  exercise_id   = canonical.id,
  exercise_name = canonical.name
FROM exercises variant
JOIN exercises canonical
  ON canonical.name = split_part(variant.name, ' :: ', 1)
 AND canonical.name NOT LIKE '% :: %'
WHERE tp.exercise_id = variant.id
  AND variant.name LIKE '% :: %';

-- -----------------------------------------------
-- Étape 5 : Consolider exercise_usage (historique de poids)
-- -----------------------------------------------

-- 5a. Noms canoniques affectés
CREATE TEMP TABLE affected_canonical_names AS
SELECT DISTINCT split_part(exercise_name, ' :: ', 1) AS canonical_name
FROM exercise_usage
WHERE exercise_name LIKE '% :: %';

-- 5b. Renommer les lignes variantes → noms canoniques
UPDATE exercise_usage
SET
  exercise_name = split_part(exercise_name, ' :: ', 1),
  exercise_id   = (
    SELECT id FROM exercises
    WHERE name = split_part(exercise_usage.exercise_name, ' :: ', 1)
      AND name NOT LIKE '% :: %'
    LIMIT 1
  )
WHERE exercise_name LIKE '% :: %';

-- 5c. Déduplication : garder uniquement la ligne la plus récente
--     par (user_id, exercise_name) pour les noms canoniques affectés
DELETE FROM exercise_usage eu
WHERE eu.exercise_name IN (SELECT canonical_name FROM affected_canonical_names)
  AND EXISTS (
    SELECT 1 FROM exercise_usage newer
    WHERE newer.user_id       = eu.user_id
      AND newer.exercise_name = eu.exercise_name
      AND newer.id            != eu.id
      AND (
        newer.used_at > eu.used_at
        OR (newer.used_at = eu.used_at AND newer.id > eu.id)
      )
  );

DROP TABLE affected_canonical_names;

-- -----------------------------------------------
-- Étape 5.5 : Nettoyer les noms :: dans session_logs JSONB
-- SI la query 1d de l'audit retournait 0 → commenter ce bloc UPDATE
-- -----------------------------------------------
UPDATE session_logs
SET exercises = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'exerciseName') LIKE '% :: %'
      THEN jsonb_set(
             elem,
             '{exerciseName}',
             to_jsonb(split_part(elem->>'exerciseName', ' :: ', 1))
           )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(exercises) AS elem
)
WHERE exercises::text LIKE '% :: %';

-- -----------------------------------------------
-- Vérifications avant COMMIT — tous doivent être à 0
-- -----------------------------------------------

SELECT COUNT(*) AS tp_encore_lies_a_une_variante
FROM training_plans tp
JOIN exercises e ON e.id = tp.exercise_id
WHERE e.name LIKE '% :: %';
-- Attendu : 0

SELECT COUNT(*) AS usage_encore_avec_variante
FROM exercise_usage
WHERE exercise_name LIKE '% :: %';
-- Attendu : 0

SELECT COUNT(*) AS session_logs_encore_avec_variante
FROM session_logs
WHERE exercises::text LIKE '% :: %';
-- Attendu : 0

-- Si tous = 0 → COMMIT
-- Sinon → fermer la session sans commiter (rollback automatique)
COMMIT;
