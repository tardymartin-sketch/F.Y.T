-- ============================================================
-- F.Y.T - STRAVA INTEGRATION
-- Instructions SQL pour Supabase
-- Exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLE: strava_connections
-- Stocke la liaison entre un user F.Y.T et son compte Strava
-- ============================================================

CREATE TABLE IF NOT EXISTS strava_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identifiants Strava
    strava_athlete_id BIGINT NOT NULL UNIQUE,
    strava_username TEXT,
    strava_firstname TEXT,
    strava_lastname TEXT,
    strava_profile_pic TEXT,
    
    -- Tokens OAuth
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Scopes autorisés
    scopes TEXT[] DEFAULT ARRAY['activity:read_all'],
    
    -- Métadonnées
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Un user ne peut avoir qu'une connexion Strava
    UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_strava_connections_user_id ON strava_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_athlete_id ON strava_connections(strava_athlete_id);

-- RLS
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own strava connection" ON strava_connections;
CREATE POLICY "Users can view own strava connection"
    ON strava_connections FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own strava connection" ON strava_connections;
CREATE POLICY "Users can insert own strava connection"
    ON strava_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strava connection" ON strava_connections;
CREATE POLICY "Users can update own strava connection"
    ON strava_connections FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own strava connection" ON strava_connections;
CREATE POLICY "Users can delete own strava connection"
    ON strava_connections FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- 2. TABLE: strava_activities
-- Stocke les activités Strava synchronisées
-- ============================================================

CREATE TABLE IF NOT EXISTS strava_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strava_activity_id BIGINT NOT NULL UNIQUE,
    
    -- Informations de base
    name TEXT NOT NULL,
    sport_type TEXT NOT NULL,
    activity_type TEXT,
    description TEXT,
    
    -- Métriques temporelles
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date_local TIMESTAMP WITH TIME ZONE,
    timezone TEXT,
    elapsed_time INTEGER NOT NULL,
    moving_time INTEGER NOT NULL,
    
    -- Métriques de distance/vitesse
    distance DECIMAL(10, 2),
    total_elevation_gain DECIMAL(8, 2),
    average_speed DECIMAL(6, 3),
    max_speed DECIMAL(6, 3),
    
    -- Métriques cardiaques
    has_heartrate BOOLEAN DEFAULT FALSE,
    average_heartrate DECIMAL(5, 2),
    max_heartrate INTEGER,
    
    -- Métriques de cadence/puissance
    average_cadence DECIMAL(5, 2),
    average_watts DECIMAL(6, 2),
    max_watts INTEGER,
    weighted_average_watts DECIMAL(6, 2),
    kilojoules DECIMAL(8, 2),
    
    -- Calories
    calories INTEGER,
    
    -- Données GPS/Carte
    start_latlng DECIMAL(10, 7)[],
    end_latlng DECIMAL(10, 7)[],
    summary_polyline TEXT,
    
    -- Informations device
    device_name TEXT,
    gear_id TEXT,
    
    -- Données streams détaillées (JSON)
    streams_data JSONB,
    
    -- Segments Strava
    segment_efforts JSONB,
    
    -- Statut d'import dans l'historique F.Y.T
    is_imported_to_history BOOLEAN DEFAULT FALSE,
    imported_at TIMESTAMP WITH TIME ZONE,
    session_log_id UUID REFERENCES session_logs(id),
    
    -- Métadonnées
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB,
    
    UNIQUE(user_id, strava_activity_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_strava_activities_user_id ON strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date ON strava_activities(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_strava_activities_sport_type ON strava_activities(sport_type);
CREATE INDEX IF NOT EXISTS idx_strava_activities_imported ON strava_activities(is_imported_to_history);

-- RLS
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own strava activities" ON strava_activities;
CREATE POLICY "Users can view own strava activities"
    ON strava_activities FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own strava activities" ON strava_activities;
CREATE POLICY "Users can insert own strava activities"
    ON strava_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strava activities" ON strava_activities;
CREATE POLICY "Users can update own strava activities"
    ON strava_activities FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own strava activities" ON strava_activities;
CREATE POLICY "Users can delete own strava activities"
    ON strava_activities FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- 3. TABLE: strava_webhook_events (optionnel - pour debug)
-- ============================================================

CREATE TABLE IF NOT EXISTS strava_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    strava_subscription_id INTEGER,
    object_type TEXT NOT NULL,
    object_id BIGINT NOT NULL,
    aspect_type TEXT NOT NULL,
    owner_id BIGINT NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    updates JSONB,
    
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON strava_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_owner_id ON strava_webhook_events(owner_id);


-- ============================================================
-- 4. TRIGGER: Mettre à jour last_sync_at automatiquement
-- ============================================================

CREATE OR REPLACE FUNCTION update_strava_last_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE strava_connections
    SET last_sync_at = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_strava_sync_timestamp ON strava_activities;
CREATE TRIGGER trigger_update_strava_sync_timestamp
    AFTER INSERT ON strava_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_strava_last_sync_timestamp();


-- ============================================================
-- DONE! 
-- Maintenant configure les variables dans ton .env:
-- VITE_STRAVA_CLIENT_ID=xxx
-- VITE_STRAVA_CLIENT_SECRET=xxx
-- VITE_STRAVA_REDIRECT_URI=http://localhost:5173
-- ============================================================

