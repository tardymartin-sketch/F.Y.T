-- ===========================================
-- Migration: Ajout du mode d'exécution à training_plans
-- ===========================================
-- Cette migration complète execution_mode_migration.sql en ajoutant
-- les colonnes superset à la table training_plans

-- 1. Ajouter les colonnes à training_plans
ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'straight';

ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS execution_group_id UUID DEFAULT NULL;

ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS execution_group_position INTEGER DEFAULT NULL;

-- 2. Mettre à jour les données existantes
UPDATE training_plans
SET execution_mode = 'straight'
WHERE execution_mode IS NULL;

-- 3. Créer un index pour les requêtes sur les groupes d'exécution
CREATE INDEX IF NOT EXISTS idx_training_plans_execution_group
  ON training_plans(execution_group_id)
  WHERE execution_group_id IS NOT NULL;
