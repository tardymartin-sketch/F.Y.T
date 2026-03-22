-- ============================================================
-- MIGRATION: Fix unique constraint to exclude soft-deleted records
-- Version: 1.1
-- Date: 2026-02-17
-- Description: Remplace la contrainte UNIQUE par un index unique partiel
--              qui exclut les enregistrements soft-deleted (deleted_at IS NOT NULL).
--              Cela permet de modifier les dates d'une séance sans conflit
--              avec des enregistrements précédemment supprimés.
-- ============================================================

-- 1. Supprimer l'ancienne contrainte UNIQUE qui inclut les soft-deleted
ALTER TABLE session_templates
  DROP CONSTRAINT IF EXISTS unique_session_template_per_coach;

-- 2. Créer un index unique partiel qui exclut les enregistrements soft-deleted
CREATE UNIQUE INDEX IF NOT EXISTS unique_session_template_per_coach
  ON session_templates (name, coach_id, start_date, end_date)
  WHERE deleted_at IS NULL;

-- 3. Nettoyer les doublons soft-deleted existants (garder le plus récent)
-- Cela évite des problèmes futurs si des doublons existent déjà
DELETE FROM session_templates a
USING session_templates b
WHERE a.deleted_at IS NOT NULL
  AND b.deleted_at IS NOT NULL
  AND a.name = b.name
  AND a.coach_id = b.coach_id
  AND COALESCE(a.start_date::text, '') = COALESCE(b.start_date::text, '')
  AND COALESCE(a.end_date::text, '') = COALESCE(b.end_date::text, '')
  AND a.updated_at < b.updated_at;

-- Vérification
DO $$
BEGIN
    -- Vérifier que l'index existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'unique_session_template_per_coach'
    ) THEN
        RAISE EXCEPTION 'Index unique_session_template_per_coach non créé';
    END IF;

    RAISE NOTICE 'Migration fix_unique_constraint_soft_delete terminée avec succès';
END $$;
