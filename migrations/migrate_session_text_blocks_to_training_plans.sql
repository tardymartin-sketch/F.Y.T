-- ============================================================
-- MIGRATION DONNÉES (T7): session_text_blocks (template-keyé) -> training_plans (per-semaine)
-- Branche: feat/coach-notes-per-week
-- Prérequis: migrations/training_plans_text_blocks.sql appliquée (colonnes is_text_block, text_block_content)
-- Description:
--   Copie défensive des notes legacy. Pour chaque bloc-texte d'un template et
--   chaque (programme, semaine, séance) où ce template est utilisé, crée une
--   ligne training_plans bloc-texte avec le contenu de la note. Idempotent.
-- ============================================================

INSERT INTO training_plans
  (is_text_block, text_block_content, order_index,
   coach_id, seance_type, program_name, week_start_date, week_end_date,
   athlete_target, group_target, source_template_id, year, week, execution_mode)
SELECT DISTINCT
  true                AS is_text_block,
  stb.content         AS text_block_content,
  stb.position        AS order_index,
  tp.coach_id,
  tp.seance_type,
  tp.program_name,
  tp.week_start_date,
  tp.week_end_date,
  tp.athlete_target,
  tp.group_target,
  tp.source_template_id,
  tp.year,
  tp.week,
  'straight'          AS execution_mode
FROM session_text_blocks stb
JOIN training_plans tp
  ON tp.source_template_id = stb.session_template_id
WHERE tp.program_name IS NOT NULL
  AND COALESCE(tp.is_text_block, false) = false        -- on s'appuie sur les lignes exercice pour l'identité de la séance
  AND NOT EXISTS (                                      -- idempotence : ne pas recréer une note déjà migrée
    SELECT 1 FROM training_plans existing
    WHERE COALESCE(existing.is_text_block, false) = true
      AND existing.source_template_id = stb.session_template_id
      AND existing.program_name      = tp.program_name
      AND existing.week_start_date IS NOT DISTINCT FROM tp.week_start_date
      AND existing.seance_type       = tp.seance_type
      AND existing.text_block_content = stb.content
  );

-- VÉRIFICATION (informatif)
-- SELECT program_name, week_start_date, seance_type, left(text_block_content,40)
-- FROM training_plans WHERE is_text_block = true ORDER BY program_name, week_start_date;
