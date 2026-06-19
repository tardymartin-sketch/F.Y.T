-- ============================================================
-- MIGRATION: Blocs de texte (notes du coach) par semaine dans training_plans
-- Branche: feat/coach-notes-per-week
-- Date: 2026-06-19
-- Description:
--   Découple les notes du coach du template. Les notes deviennent des lignes
--   training_plans de type bloc-texte, par semaine par construction (chaque
--   semaine = lignes distinctes via week_start_date). Remplace le système
--   template-keyé session_text_blocks (conservé mais plus lu).
-- Caractère: additive + 1 loosening (exercise_id devient nullable). Non destructif.
-- ============================================================

-- ÉTAPE 1: Colonnes bloc-texte
ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS is_text_block BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS text_block_content TEXT;  -- HTML (rendu via RichTextDisplay sanitisé)

-- ÉTAPE 2: Une ligne bloc-texte n'a pas d'exercice associé.
-- exercise_id était NOT NULL ; on le rend nullable (la FK autorise NULL).
-- Les lignes exercice existantes conservent toutes leur exercise_id.
ALTER TABLE training_plans
  ALTER COLUMN exercise_id DROP NOT NULL;

-- ÉTAPE 3: Garantir l'index GIN sur athlete_target (learning fyt-athlete-program-query-needs-gin-index)
-- La lecture du programme utilise athlete_target @> [userId] → requiert un GIN index.
CREATE INDEX IF NOT EXISTS idx_training_plans_athlete_target_gin
  ON training_plans USING GIN (athlete_target);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_plans' AND column_name = 'is_text_block'
  ) THEN
    RAISE EXCEPTION 'Colonne is_text_block non créée';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_plans' AND column_name = 'text_block_content'
  ) THEN
    RAISE EXCEPTION 'Colonne text_block_content non créée';
  END IF;
  RAISE NOTICE 'Migration training_plans_text_blocks terminée avec succès';
END $$;
