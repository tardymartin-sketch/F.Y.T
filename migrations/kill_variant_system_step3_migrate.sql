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
-- NOTE : pas de TEMP TABLE — le SQL editor Supabase exécute chaque
-- instruction dans un contexte séparé, donc une TEMP TABLE créée dans
-- une instruction n'est plus visible dans la suivante.
-- Approche : supprimer d'abord les doublons, puis renommer.
-- -----------------------------------------------

-- 5a. Supprimer toutes les lignes en trop pour les noms affectés.
--     Pour chaque (user_id, nom_canonique), on garde la ligne la plus récente
--     parmi TOUTES les variantes ET l'éventuelle ligne canonique existante.
--     Les exercices non concernés (sans variante ::) ne sont pas touchés.
DELETE FROM exercise_usage
WHERE id NOT IN (
  -- La ligne à conserver : la plus récente par (user_id, nom_canonique)
  SELECT DISTINCT ON (
    user_id,
    CASE WHEN exercise_name LIKE '% :: %'
         THEN split_part(exercise_name, ' :: ', 1)
         ELSE exercise_name END
  ) id
  FROM exercise_usage
  WHERE exercise_name LIKE '% :: %'
     OR exercise_name IN (
       SELECT DISTINCT split_part(exercise_name, ' :: ', 1)
       FROM exercise_usage eu2
       WHERE eu2.exercise_name LIKE '% :: %'
     )
  ORDER BY
    user_id,
    CASE WHEN exercise_name LIKE '% :: %'
         THEN split_part(exercise_name, ' :: ', 1)
         ELSE exercise_name END,
    used_at DESC,
    id DESC
)
AND (
  -- Périmètre : uniquement les lignes variantes ou leurs canoniques associées
  exercise_name LIKE '% :: %'
  OR exercise_name IN (
    SELECT DISTINCT split_part(exercise_name, ' :: ', 1)
    FROM exercise_usage eu2
    WHERE eu2.exercise_name LIKE '% :: %'
  )
);

-- 5b. Renommer les lignes variantes restantes → noms canoniques
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
