-- ============================================================
-- MIGRATION: Phase 1 — Athlete Templates & Exercise Usage
-- Date: 2026-04-16
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- All ALTER TABLE use IF NOT EXISTS to be idempotent.
-- ============================================================

-- ============================================================
-- PART 1: Extend session_logs for template support (Approach A)
-- Templates are sessions with is_template = true.
-- ============================================================

ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS is_template      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pinned           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_from_template_id UUID REFERENCES session_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status           VARCHAR(20) DEFAULT 'complete';
  -- status: 'draft' | 'active' | 'complete' | 'abandoned'

-- Index for templates tab (user's pinned templates)
CREATE INDEX IF NOT EXISTS idx_session_logs_templates
  ON session_logs(user_id, is_template, pinned)
  WHERE is_template = TRUE;

-- Index for recent sessions tab (non-template, sorted by date)
CREATE INDEX IF NOT EXISTS idx_session_logs_recent
  ON session_logs(user_id, date DESC)
  WHERE is_template = FALSE;

-- Index for tracing clones back to their source template
CREATE INDEX IF NOT EXISTS idx_session_logs_from_template
  ON session_logs(created_from_template_id)
  WHERE created_from_template_id IS NOT NULL;

-- ============================================================
-- PART 2: Create exercise_usage table
-- Denormalized "last used weight" per exercise per user.
-- Queried for most-used exercise list and weight prefill on clone.
-- ============================================================

CREATE TABLE IF NOT EXISTS exercise_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  exercise_id UUID,                      -- NULL if exercise not in exercises table yet
  exercise_name VARCHAR(255) NOT NULL,   -- Denormalized for fast reads
  weight_kg   DECIMAL(6,2),              -- Last weight used (store as kg, convert on read)
  reps        INTEGER,
  set_count   INTEGER,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary index: most-used query — user's recent exercises sorted by date
CREATE INDEX IF NOT EXISTS idx_exercise_usage_user_recent
  ON exercise_usage(user_id, used_at DESC);

-- Secondary index: look up usage for a specific exercise
CREATE INDEX IF NOT EXISTS idx_exercise_usage_exercise
  ON exercise_usage(user_id, exercise_id)
  WHERE exercise_id IS NOT NULL;

-- RLS for exercise_usage
ALTER TABLE exercise_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exercise usage" ON exercise_usage;
CREATE POLICY "Users manage own exercise usage" ON exercise_usage
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_logs' AND column_name = 'is_template'
  ) THEN
    RAISE EXCEPTION 'Column is_template not added to session_logs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'exercise_usage'
  ) THEN
    RAISE EXCEPTION 'Table exercise_usage not created';
  END IF;

  RAISE NOTICE 'Phase 1 migration complete.';
END $$;
