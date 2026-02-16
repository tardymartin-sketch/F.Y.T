-- ============================================================
-- F.Y.T - Migration Mode Démo
-- migrations/demo_sessions_migration.sql
-- ============================================================

-- 1. Ajouter colonne is_demo sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- 2. Créer la table demo_sessions pour tracker les sessions démo
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index pour le nettoyage efficace
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires_at ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON profiles(is_demo) WHERE is_demo = TRUE;

-- 3. Coach démo
-- Note: On n'a pas besoin de créer un coach démo permanent.
-- Les athlètes démo auront coach_id = NULL, ce qui est acceptable
-- car ils n'ont pas besoin d'être liés à un vrai coach.

-- 4. Fonction pour nettoyer les sessions démo expirées
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les profils démo expirés (cascade supprimera demo_sessions et données liées)
  WITH deleted AS (
    DELETE FROM profiles
    WHERE id IN (
      SELECT profile_id FROM demo_sessions WHERE expires_at < NOW()
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS policies pour demo_sessions
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture de sa propre session démo
CREATE POLICY "Users can view own demo session"
  ON demo_sessions FOR SELECT
  USING (profile_id = auth.uid());

-- Permettre l'insertion (pour le service de création)
CREATE POLICY "Service can insert demo sessions"
  ON demo_sessions FOR INSERT
  WITH CHECK (TRUE);

-- Permettre la suppression par le cleanup
CREATE POLICY "Service can delete expired demo sessions"
  ON demo_sessions FOR DELETE
  USING (TRUE);

-- ============================================================
-- EDGE FUNCTION pour le cron (à déployer séparément)
-- ============================================================
--
-- Créer une Edge Function Supabase "cleanup-demo-sessions":
--
-- import { createClient } from '@supabase/supabase-js'
--
-- Deno.serve(async () => {
--   const supabase = createClient(
--     Deno.env.get('SUPABASE_URL')!,
--     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
--   )
--
--   const { data, error } = await supabase.rpc('cleanup_expired_demo_sessions')
--
--   return new Response(
--     JSON.stringify({ deleted: data, error }),
--     { headers: { 'Content-Type': 'application/json' } }
--   )
-- })
--
-- Configurer un cron job dans Supabase Dashboard:
-- Schedule: 0 * * * * (toutes les heures)
-- ============================================================
