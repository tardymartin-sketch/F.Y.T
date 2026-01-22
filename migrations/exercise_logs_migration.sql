-- ============================================================
-- F.Y.T - MIGRATION: Table exercise_logs dénormalisée
-- ============================================================
-- Ce fichier contient toutes les migrations SQL à exécuter dans Supabase
-- Ordre d'exécution: Copier et exécuter section par section dans l'éditeur SQL de Supabase
-- ============================================================

-- ============================================================
-- SECTION 1: CREATE TYPE load_type
-- ============================================================

CREATE TYPE load_type AS ENUM ('numeric', 'additive', 'bodyweight', 'assisted');


-- ============================================================
-- SECTION 2: CREATE TABLE exercise_logs
-- ============================================================

CREATE TABLE exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  session_log_id UUID NOT NULL REFERENCES session_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,

  -- Identifiants dénormalisés (pour requêtes rapides sans JOIN)
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL,
  year INT NOT NULL,
  week INT NOT NULL,
  session_name TEXT,

  -- Type de charge (pour filtrage analytics)
  load_type load_type NOT NULL DEFAULT 'numeric',

  -- Type de mouvement (dénormalisé depuis exercises)
  limb_type TEXT DEFAULT 'bilateral',  -- 'bilateral', 'unilateral', 'asymmetrical'

  -- Catégorisation musculaire (FK + dénormalisation pour analytics)
  muscle_group_id UUID REFERENCES muscle_groups(id) ON DELETE SET NULL,
  muscle_group_name TEXT,              -- "Pectoraux", "Dos", etc.
  movement_pattern_id UUID REFERENCES movement_patterns(id) ON DELETE SET NULL,
  movement_pattern_name TEXT,          -- "horizontal_push", "squat", etc.
  analytics_category TEXT,             -- 'push', 'pull', 'legs_squat', 'legs_hinge', 'core'

  -- Métriques pré-calculées
  sets_count INT NOT NULL DEFAULT 0,
  total_reps INT NOT NULL DEFAULT 0,        -- "2x8" → 16
  max_weight DECIMAL(10,2),                 -- NULL si assisted
  avg_weight DECIMAL(10,2),                 -- NULL si assisted
  total_volume DECIMAL(12,2),               -- reps × weight, NULL si assisted
  rpe SMALLINT CHECK (rpe >= 1 AND rpe <= 10),

  -- Détails par série (avec loadType calculé par set)
  sets_detail JSONB,  -- [{setNumber, reps, weight, loadType, completed}, ...]

  -- Backup temporaire des données JSONB originales (migration)
  backup_temp JSONB,

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 3: CREATE INDEXES
-- ============================================================

-- Index pour les requêtes analytiques
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, date DESC);
CREATE INDEX idx_exercise_logs_user_exercise ON exercise_logs(user_id, exercise_name);
CREATE INDEX idx_exercise_logs_user_year_week ON exercise_logs(user_id, year, week);
CREATE INDEX idx_exercise_logs_exercise_id ON exercise_logs(exercise_id) WHERE exercise_id IS NOT NULL;
CREATE INDEX idx_exercise_logs_session ON exercise_logs(session_log_id);
CREATE INDEX idx_exercise_logs_load_type ON exercise_logs(user_id, load_type);

-- Index pour catégorisation musculaire et analytics
CREATE INDEX idx_exercise_logs_analytics_category ON exercise_logs(user_id, analytics_category, date);
CREATE INDEX idx_exercise_logs_muscle_group ON exercise_logs(user_id, muscle_group_id);
CREATE INDEX idx_exercise_logs_movement_pattern ON exercise_logs(user_id, movement_pattern_id);


-- ============================================================
-- SECTION 4: RLS POLICIES
-- ============================================================

-- Activer RLS
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- L'utilisateur voit ses propres exercise_logs
CREATE POLICY "Users can view own exercise_logs"
  ON exercise_logs FOR SELECT
  USING (auth.uid() = user_id);

-- L'utilisateur peut insérer ses propres exercise_logs
CREATE POLICY "Users can insert own exercise_logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- L'utilisateur peut modifier ses propres exercise_logs
CREATE POLICY "Users can update own exercise_logs"
  ON exercise_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- L'utilisateur peut supprimer ses propres exercise_logs
CREATE POLICY "Users can delete own exercise_logs"
  ON exercise_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Le coach peut voir les exercise_logs de ses athlètes
CREATE POLICY "Coaches can view team exercise_logs"
  ON exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = exercise_logs.user_id
      AND profiles.coach_id = auth.uid()
    )
  );


-- ============================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================

-- 5.1: Fonction pour parser les reps ("2x8" → 16, "8" → 8)
CREATE OR REPLACE FUNCTION parse_reps(reps_str TEXT)
RETURNS INT AS $$
DECLARE
  parts TEXT[];
  result INT;
BEGIN
  IF reps_str IS NULL OR reps_str = '' THEN
    RETURN 0;
  END IF;

  -- Format "2x8" ou "2X8"
  IF reps_str ~* '^\d+[xX]\d+$' THEN
    parts := regexp_split_to_array(LOWER(reps_str), 'x');
    RETURN (parts[1]::int) * (parts[2]::int);
  END IF;

  -- Format numérique simple
  IF reps_str ~ '^\d+$' THEN
    RETURN reps_str::int;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5.2: Fonction pour parser le poids ("20+10" → 30, "50" → 50, "Negative" → NULL)
CREATE OR REPLACE FUNCTION parse_weight(weight_str TEXT)
RETURNS DECIMAL AS $$
DECLARE
  parts TEXT[];
  total DECIMAL := 0;
  part TEXT;
BEGIN
  IF weight_str IS NULL OR weight_str = '' THEN
    RETURN NULL;
  END IF;

  -- Format texte (Negative, Négative, etc.) → NULL
  IF weight_str ~* '^[a-zA-ZÀ-ÿ]+$' THEN
    RETURN NULL;
  END IF;

  -- Format avec addition "20+10" ou "5+5"
  IF weight_str ~ '\+' THEN
    parts := string_to_array(REPLACE(weight_str, ',', '.'), '+');
    FOREACH part IN ARRAY parts LOOP
      total := total + COALESCE(NULLIF(TRIM(part), '')::decimal, 0);
    END LOOP;
    RETURN total;
  END IF;

  -- Format numérique simple (avec virgule européenne)
  RETURN NULLIF(REPLACE(weight_str, ',', '.'), '')::decimal;

EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5.3: Fonction pour déterminer le type de charge d'un poids
CREATE OR REPLACE FUNCTION detect_load_type(weight_str TEXT)
RETURNS load_type AS $$
BEGIN
  IF weight_str IS NULL OR weight_str = '' THEN
    RETURN 'bodyweight';
  END IF;

  -- Texte = assisted (Negative, Négative, etc.)
  IF weight_str ~* '^[a-zA-ZÀ-ÿ]+$' THEN
    RETURN 'assisted';
  END IF;

  -- Addition = additive
  IF weight_str ~ '\+' THEN
    RETURN 'additive';
  END IF;

  -- Zéro = bodyweight
  IF weight_str ~ '^0+([,.]0+)?$' THEN
    RETURN 'bodyweight';
  END IF;

  -- Sinon = numeric
  RETURN 'numeric';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5.4: Fonction pour déterminer le type majoritaire (égalité → 1er utilisé)
CREATE OR REPLACE FUNCTION get_majority_load_type(sets JSONB)
RETURNS load_type AS $$
DECLARE
  type_counts RECORD;
  max_count INT := 0;
  first_type load_type := 'numeric';
  result_type load_type := 'numeric';
  s JSONB;
  current_type load_type;
  set_index INT := 0;
  first_type_index INT := 999;
BEGIN
  -- Compter chaque type et noter le premier index
  FOR type_counts IN
    SELECT
      detect_load_type(s->>'weight') as lt,
      COUNT(*) as cnt,
      MIN(ordinality) as first_idx
    FROM jsonb_array_elements(sets) WITH ORDINALITY s
    WHERE s->>'completed' = 'true'
    GROUP BY detect_load_type(s->>'weight')
  LOOP
    IF type_counts.cnt > max_count OR
       (type_counts.cnt = max_count AND type_counts.first_idx < first_type_index) THEN
      max_count := type_counts.cnt;
      result_type := type_counts.lt;
      first_type_index := type_counts.first_idx;
    END IF;
  END LOOP;

  RETURN result_type;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 5.5: Fonction pour déterminer la catégorie analytics depuis le movement_pattern
CREATE OR REPLACE FUNCTION get_analytics_category(pattern_code TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE pattern_code
    -- PUSH (Poussées)
    WHEN 'horizontal_push', 'vertical_push', 'elbow_extension' THEN RETURN 'push';

    -- PULL (Tractions)
    WHEN 'horizontal_pull', 'vertical_pull', 'scapular_retraction', 'scapular_protraction' THEN RETURN 'pull';

    -- LEGS SQUAT (Jambes dominance quadriceps)
    WHEN 'squat', 'lunge', 'step_up', 'leg_extension' THEN RETURN 'legs_squat';

    -- LEGS HINGE (Jambes dominance ischio/fessiers)
    WHEN 'hinge', 'hip_thrust', 'leg_curl' THEN RETURN 'legs_hinge';

    -- CORE (Gainage/Abdos)
    WHEN 'anti_extension', 'anti_rotation', 'anti_lateral_flexion', 'flexion', 'extension', 'rotation' THEN RETURN 'core';

    -- ARMS (Bras isolés)
    WHEN 'elbow_flexion' THEN RETURN 'arms';

    -- OTHER (Autres mouvements)
    ELSE RETURN 'other';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- SECTION 6: DATA MIGRATION
-- ============================================================
-- ATTENTION: Cette section migre les données existantes depuis session_logs
-- Vérifier que les tables muscle_groups et movement_patterns existent
-- et que les exercises ont les champs primary_muscle_group_id et movement_pattern_id
-- ============================================================

INSERT INTO exercise_logs (
  session_log_id,
  user_id,
  exercise_id,
  exercise_name,
  date,
  year,
  week,
  session_name,
  load_type,
  limb_type,
  muscle_group_id,
  muscle_group_name,
  movement_pattern_id,
  movement_pattern_name,
  analytics_category,
  sets_count,
  total_reps,
  max_weight,
  avg_weight,
  total_volume,
  rpe,
  sets_detail,
  backup_temp,
  notes
)
SELECT
  sl.id as session_log_id,
  sl.user_id,
  (ex->>'exerciseId')::uuid as exercise_id,
  ex->>'exerciseName' as exercise_name,
  sl.date::date,
  COALESCE(sl.session_key_year, EXTRACT(YEAR FROM sl.date)::int) as year,
  COALESCE(sl.session_key_week, EXTRACT(WEEK FROM sl.date)::int) as week,
  sl.session_key_name as session_name,

  -- Type de charge majoritaire (égalité → 1er utilisé)
  get_majority_load_type(ex->'sets') as load_type,

  -- Récupérer limb_type depuis exercises (défaut: bilateral)
  COALESCE(e.limb_type, 'bilateral') as limb_type,

  -- Catégorisation musculaire (depuis exercises + tables référentielles)
  e.primary_muscle_group_id as muscle_group_id,
  mg.name_fr as muscle_group_name,
  e.movement_pattern_id,
  mp.name_fr as movement_pattern_name,
  get_analytics_category(mp.code) as analytics_category,

  jsonb_array_length(ex->'sets') as sets_count,

  -- Total reps avec parsing "2x8" → 16 (ancien format)
  -- + doublement si unilatéral ET format simple (nouveau format)
  (SELECT COALESCE(SUM(
    CASE
      -- Ancien format "2x8" : déjà multiplié, ne pas re-doubler
      WHEN s->>'reps' ~* '^\d+[xX]\d+$' THEN parse_reps(s->>'reps')
      -- Nouveau format simple + unilatéral : doubler
      WHEN COALESCE(e.limb_type, 'bilateral') = 'unilateral' THEN parse_reps(s->>'reps') * 2
      -- Sinon : tel quel
      ELSE parse_reps(s->>'reps')
    END
  ), 0)
   FROM jsonb_array_elements(ex->'sets') s
   WHERE s->>'completed' = 'true') as total_reps,

  -- Max weight avec parsing "20+10" → 30
  (SELECT MAX(parse_weight(s->>'weight'))
   FROM jsonb_array_elements(ex->'sets') s
   WHERE s->>'completed' = 'true') as max_weight,

  -- Avg weight
  (SELECT AVG(parse_weight(s->>'weight'))
   FROM jsonb_array_elements(ex->'sets') s
   WHERE s->>'completed' = 'true'
     AND parse_weight(s->>'weight') IS NOT NULL
     AND parse_weight(s->>'weight') > 0) as avg_weight,

  -- Volume = sum(reps × weight) avec même logique de doublement
  (SELECT SUM(
    CASE
      WHEN s->>'reps' ~* '^\d+[xX]\d+$' THEN parse_reps(s->>'reps')
      WHEN COALESCE(e.limb_type, 'bilateral') = 'unilateral' THEN parse_reps(s->>'reps') * 2
      ELSE parse_reps(s->>'reps')
    END * COALESCE(parse_weight(s->>'weight'), 0)
  )
   FROM jsonb_array_elements(ex->'sets') s
   WHERE s->>'completed' = 'true') as total_volume,

  (ex->>'rpe')::smallint as rpe,

  -- sets_detail enrichi avec loadType par set
  (SELECT jsonb_agg(
    jsonb_build_object(
      'setNumber', s->>'setNumber',
      'reps', s->>'reps',
      'weight', s->>'weight',
      'loadType', detect_load_type(s->>'weight')::text,
      'completed', (s->>'completed')::boolean
    )
  )
  FROM jsonb_array_elements(ex->'sets') s) as sets_detail,

  -- Backup des données originales
  ex->'sets' as backup_temp,

  ex->>'notes' as notes

FROM session_logs sl
CROSS JOIN jsonb_array_elements(sl.exercises) as ex
LEFT JOIN exercises e ON e.id = (ex->>'exerciseId')::uuid
LEFT JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
LEFT JOIN movement_patterns mp ON mp.id = e.movement_pattern_id
WHERE sl.exercises IS NOT NULL
  AND jsonb_array_length(sl.exercises) > 0
  -- Exclure les sessions avec données invalides/test (garbage data identifié)
  AND sl.id NOT IN (
    'f5e6d001-5c3a-4198-a78c-8b176dfe7d19',  -- 23 incomplete, garbage values
    'f69e4b14-c4a3-44ab-bb7b-ed6188e2c471',  -- 1 garbage set
    '76632f5b-e889-4d78-92a9-ceffe447dbb5',  -- 6 garbage sets
    '29f1cb89-09cc-4151-86ad-f362c6c5d8dd',  -- 13/13 incomplete, all garbage
    '64142352-d3f0-4012-8e98-30698a84ed38'   -- 9/9 incomplete, all garbage
  );


-- ============================================================
-- SECTION 7: VERIFICATION QUERIES
-- ============================================================
-- Ces requêtes permettent de vérifier que la migration s'est bien passée
-- ============================================================

-- Vérifier le nombre de lignes migrées
SELECT COUNT(*) as total_exercise_logs FROM exercise_logs;

-- Comparer avec le nombre d'exercices dans JSONB
SELECT SUM(jsonb_array_length(exercises)) as total_exercises_in_jsonb
FROM session_logs WHERE exercises IS NOT NULL;

-- Vérifier la répartition par type de charge
SELECT
  load_type,
  COUNT(*) as count,
  ROUND(AVG(max_weight)::numeric, 1) as avg_max_weight,
  ROUND(AVG(total_reps)::numeric, 1) as avg_reps
FROM exercise_logs
GROUP BY load_type
ORDER BY count DESC;

-- Vérifier la répartition par catégorie analytics
SELECT
  analytics_category,
  COUNT(*) as count,
  ROUND(AVG(total_volume)::numeric, 1) as avg_volume
FROM exercise_logs
WHERE analytics_category IS NOT NULL
GROUP BY analytics_category
ORDER BY count DESC;

-- Vérifier quelques exemples de parsing
SELECT
  exercise_name,
  sets_detail->0->>'weight' as first_set_weight,
  max_weight,
  load_type
FROM exercise_logs
WHERE load_type = 'additive'
LIMIT 5;


-- ============================================================
-- SECTION 8: CLEANUP (OPTIONNEL)
-- ============================================================
-- Supprimer les sessions garbage identifiées (à exécuter APRÈS vérification)
-- ============================================================

-- DELETE FROM session_logs WHERE id IN (
--   'f5e6d001-5c3a-4198-a78c-8b176dfe7d19',
--   'f69e4b14-c4a3-44ab-bb7b-ed6188e2c471',
--   '76632f5b-e889-4d78-92a9-ceffe447dbb5',
--   '29f1cb89-09cc-4151-86ad-f362c6c5d8dd',
--   '64142352-d3f0-4012-8e98-30698a84ed38'
-- );
