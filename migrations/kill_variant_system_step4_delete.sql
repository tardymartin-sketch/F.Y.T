-- ===========================================
-- Kill Variant System — Étape 4 : Suppression des lignes variantes
-- POINT DE NON-RETOUR
-- Exécuter seulement après :
--   + Étape 3 COMMIT avec tous les counts à 0
--   + Backup pg_dump disponible (étape 0 du runbook)
-- ===========================================

-- Vérifications finales (relancer après le COMMIT de l'étape 3)

SELECT COUNT(*) AS tp_orphelins
FROM training_plans tp
JOIN exercises e ON e.id = tp.exercise_id
WHERE e.name LIKE '% :: %';
-- Attendu : 0

SELECT COUNT(*) AS usage_orphelins
FROM exercise_usage
WHERE exercise_name LIKE '% :: %';
-- Attendu : 0

-- Combien de lignes seront supprimées ?
SELECT COUNT(*) AS variantes_a_supprimer
FROM exercises
WHERE name LIKE '% :: %';

-- -----------------------------------------------
-- Suppression
-- -----------------------------------------------
BEGIN;
DELETE FROM exercises WHERE name LIKE '% :: %';
COMMIT;

-- -----------------------------------------------
-- Critères de succès — tous doivent être à 0
-- -----------------------------------------------

SELECT COUNT(*) AS variantes_restantes
FROM exercises
WHERE name LIKE '% :: %';
-- Attendu : 0

SELECT COUNT(*) AS training_plans_orphelins
FROM training_plans
WHERE exercise_id NOT IN (SELECT id FROM exercises);
-- Attendu : 0

SELECT COUNT(*) AS usage_avec_variantes
FROM exercise_usage
WHERE exercise_name LIKE '% :: %';
-- Attendu : 0

SELECT COUNT(*) AS session_logs_avec_variantes
FROM session_logs
WHERE exercises::text LIKE '% :: %';
-- Attendu : 0
