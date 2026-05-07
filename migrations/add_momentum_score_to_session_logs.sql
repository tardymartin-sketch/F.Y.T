-- Migration: add momentum_score column to session_logs
-- Context: momentum_score was added to SessionLogRow type and mapSessionLogToRow
-- in the March 2026 refactor but the ALTER TABLE was never written.
-- Without this column the session save upsert fails with PGRST204.

ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS momentum_score numeric;
