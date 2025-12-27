-- ============================================================
-- F.Y.T - STRAVA INTEGRATION UPDATE
-- Ajouter la colonne segment_efforts si elle n'existe pas
-- Exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Ajouter la colonne segment_efforts si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'strava_activities' 
        AND column_name = 'segment_efforts'
    ) THEN
        ALTER TABLE strava_activities ADD COLUMN segment_efforts JSONB;
    END IF;
END $$;

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'strava_activities' 
AND column_name IN ('streams_data', 'segment_efforts');

