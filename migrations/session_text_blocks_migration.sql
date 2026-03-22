-- ============================================================
-- MIGRATION: Création de la table session_text_blocks
-- Version: 1.0
-- Date: 2026-02-19
-- Description: Ajoute des blocs de texte riche dans les séances
-- ============================================================

-- ============================================================
-- ÉTAPE 1: Créer la table session_text_blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS session_text_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_template_id UUID NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,

    -- Contenu du bloc
    content TEXT NOT NULL DEFAULT '',   -- Contenu HTML (Tiptap rich text)

    -- Position dans la séance (partage le même espace de positions que les exercices)
    position INTEGER NOT NULL,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour session_text_blocks
CREATE INDEX IF NOT EXISTS idx_text_blocks_template ON session_text_blocks(session_template_id);
CREATE INDEX IF NOT EXISTS idx_text_blocks_position ON session_text_blocks(session_template_id, position);

-- RLS pour session_text_blocks (via session_templates.coach_id)
ALTER TABLE session_text_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access text blocks via template ownership" ON session_text_blocks;
CREATE POLICY "Access text blocks via template ownership" ON session_text_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM session_templates st
            WHERE st.id = session_template_id
            AND st.coach_id = auth.uid()
        )
    );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_session_text_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_text_blocks_updated_at ON session_text_blocks;
CREATE TRIGGER trg_session_text_blocks_updated_at
    BEFORE UPDATE ON session_text_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_session_text_blocks_updated_at();

-- ============================================================
-- ÉTAPE 2: Ajouter une colonne coach_instructions riche aux exercices
-- (pour les blocs texte dans les exercices individuels)
-- ============================================================

-- Note: La colonne coach_instructions existe déjà dans la table exercises
-- mais elle stocke du texte simple. On va la réutiliser pour du texte riche (HTML).
-- Pas de modification de schéma nécessaire, juste un changement côté frontend.

-- ============================================================
-- VÉRIFICATION
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_text_blocks') THEN
        RAISE EXCEPTION 'Table session_text_blocks non créée';
    END IF;

    RAISE NOTICE 'Migration session_text_blocks terminée avec succès';
END $$;
