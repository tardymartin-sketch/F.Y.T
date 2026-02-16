-- ===========================================
-- Migration: Ajout du mode d'exécution (superset, triset, etc.)
-- ===========================================

-- 1. Ajouter les colonnes à session_template_exercises
ALTER TABLE session_template_exercises
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'straight';

ALTER TABLE session_template_exercises
  ADD COLUMN IF NOT EXISTS execution_group_id UUID DEFAULT NULL;

ALTER TABLE session_template_exercises
  ADD COLUMN IF NOT EXISTS execution_group_position INTEGER DEFAULT NULL;

-- 2. Ajouter les colonnes à exercise_logs (analytics)
ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'straight';

ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS execution_group_id UUID DEFAULT NULL;

ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS execution_group_position INTEGER DEFAULT NULL;

-- 3. Mettre à jour les données existantes (explicitement en mode 'straight')
UPDATE session_template_exercises
SET execution_mode = 'straight'
WHERE execution_mode IS NULL;

UPDATE exercise_logs
SET execution_mode = 'straight'
WHERE execution_mode IS NULL;

-- 4. Créer un index pour les requêtes sur les groupes d'exécution
CREATE INDEX IF NOT EXISTS idx_session_template_exercises_execution_group
  ON session_template_exercises(execution_group_id)
  WHERE execution_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_logs_execution_group
  ON exercise_logs(execution_group_id)
  WHERE execution_group_id IS NOT NULL;

-- Note: Pour session_logs.exercises (JSONB), les anciennes séances n'ont pas
-- le champ executionMode. Le code frontend gère cela avec un fallback:
-- const mode = exercise.executionMode ?? 'straight';
