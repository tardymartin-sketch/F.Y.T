-- ============================================================
-- MIGRATION: Création des tables session_templates
-- Version: 1.0
-- Date: 2026-01-30
-- ============================================================

-- ============================================================
-- ÉTAPE 1: Créer la table session_templates
-- ============================================================

CREATE TABLE IF NOT EXISTS session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- 'force', 'cardio', 'mobilite', 'hypertrophie', etc.

    -- Période de validité suggérée (optionnel)
    validity_year INTEGER,
    validity_month INTEGER CHECK (validity_month IS NULL OR validity_month BETWEEN 1 AND 12),
    validity_week INTEGER CHECK (validity_week IS NULL OR validity_week BETWEEN 1 AND 53),

    -- Dates de validité (pour variantes par période)
    start_date DATE,
    end_date DATE,

    -- Métadonnées
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- Soft delete

    -- Contrainte d'unicité par coach + nom + dates
    CONSTRAINT unique_session_template_per_coach UNIQUE (name, coach_id, start_date, end_date)
);

-- Index pour session_templates
CREATE INDEX IF NOT EXISTS idx_session_templates_coach ON session_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_category ON session_templates(coach_id, category);
CREATE INDEX IF NOT EXISTS idx_session_templates_validity ON session_templates(coach_id, validity_year, validity_month, validity_week);
CREATE INDEX IF NOT EXISTS idx_session_templates_dates ON session_templates(coach_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_session_templates_deleted ON session_templates(coach_id) WHERE deleted_at IS NULL;

-- RLS pour session_templates
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own templates" ON session_templates;
CREATE POLICY "Coaches manage own templates" ON session_templates
    FOR ALL USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_session_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_templates_updated_at ON session_templates;
CREATE TRIGGER trg_session_templates_updated_at
    BEFORE UPDATE ON session_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_session_templates_updated_at();

-- ============================================================
-- ÉTAPE 2: Créer la table session_template_exercises
-- ============================================================

CREATE TABLE IF NOT EXISTS session_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_template_id UUID NOT NULL REFERENCES session_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,

    -- Ordre dans la séance
    position INTEGER NOT NULL,

    -- Paramètres par défaut pour cet exercice dans ce template
    default_sets INTEGER,
    default_reps VARCHAR(50),      -- "8-12", "10", "max"
    default_rest VARCHAR(50),      -- "90", "120" (en secondes)
    default_tempo VARCHAR(20),     -- "3-1-2-0"

    -- Instructions spécifiques à ce template
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un exercice peut apparaître plusieurs fois mais pas à la même position
    CONSTRAINT unique_exercise_position UNIQUE (session_template_id, position)
);

-- Index pour session_template_exercises
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON session_template_exercises(session_template_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_exercise ON session_template_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_position ON session_template_exercises(session_template_id, position);

-- RLS pour session_template_exercises (via session_templates.coach_id)
ALTER TABLE session_template_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access via template ownership" ON session_template_exercises;
CREATE POLICY "Access via template ownership" ON session_template_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM session_templates st
            WHERE st.id = session_template_id
            AND st.coach_id = auth.uid()
        )
    );

-- ============================================================
-- ÉTAPE 3: Modifier training_plans pour les nouveaux champs
-- ============================================================

-- Ajouter les nouvelles colonnes si elles n'existent pas
DO $$
BEGIN
    -- Colonne program_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_plans' AND column_name = 'program_name'
    ) THEN
        ALTER TABLE training_plans ADD COLUMN program_name VARCHAR(255);
    END IF;

    -- Colonne source_template_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_plans' AND column_name = 'source_template_id'
    ) THEN
        ALTER TABLE training_plans ADD COLUMN source_template_id UUID REFERENCES session_templates(id) ON DELETE SET NULL;
    END IF;

    -- Colonne group_target
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_plans' AND column_name = 'group_target'
    ) THEN
        ALTER TABLE training_plans ADD COLUMN group_target UUID[];
    END IF;
END $$;

-- Index pour les nouveaux champs de training_plans
CREATE INDEX IF NOT EXISTS idx_training_plans_program_name ON training_plans(coach_id, program_name);
CREATE INDEX IF NOT EXISTS idx_training_plans_source_template ON training_plans(source_template_id);

-- Commentaires
COMMENT ON COLUMN training_plans.source_template_id IS
    'Référence au template source. NULL si créé directement sans template.';
COMMENT ON COLUMN training_plans.program_name IS
    'Nom personnalisé du programme. Permet de regrouper plusieurs lignes training_plans.';
COMMENT ON COLUMN training_plans.group_target IS
    'Liste des groupes d''athlètes ciblés (pour affichage).';

-- ============================================================
-- ÉTAPE 4: Migration des données existantes (OPTIONNEL)
-- ============================================================

-- Cette section migre les séances templates existantes (sans athlete_target)
-- vers les nouvelles tables session_templates et session_template_exercises

-- Décommenter et exécuter si vous voulez migrer les données existantes

/*
-- Migrer les templates (séances sans athlete_target)
INSERT INTO session_templates (id, coach_id, name, description, category,
  validity_year, validity_month, validity_week, start_date, end_date,
  is_archived, created_at, updated_at)
SELECT DISTINCT ON (coach_id, seance_type, week_start_date, week_end_date)
  gen_random_uuid() as id,
  coach_id,
  seance_type as name,
  NULL as description,
  NULL as category,
  year as validity_year,
  "Month_num" as validity_month,
  week as validity_week,
  week_start_date::date as start_date,
  week_end_date::date as end_date,
  false as is_archived,
  NOW() as created_at,
  NOW() as updated_at
FROM training_plans
WHERE athlete_target IS NULL
  AND coach_id IS NOT NULL
  AND seance_type IS NOT NULL
ORDER BY coach_id, seance_type, week_start_date, week_end_date, id;

-- Migrer les exercices des templates
INSERT INTO session_template_exercises (id, session_template_id, exercise_id,
  position, default_sets, default_reps, default_rest, default_tempo, notes)
SELECT
  gen_random_uuid() as id,
  st.id as session_template_id,
  tp.exercise_id,
  tp.order_index as position,
  CASE WHEN tp.target_sets ~ '^\d+$' THEN tp.target_sets::int ELSE NULL END as default_sets,
  tp.target_reps as default_reps,
  tp.rest_time_sec::text as default_rest,
  tp."Tempo" as default_tempo,
  tp."Notes/Consignes" as notes
FROM training_plans tp
JOIN session_templates st ON
  st.coach_id = tp.coach_id
  AND st.name = tp.seance_type
  AND COALESCE(st.start_date::text, '') = COALESCE(tp.week_start_date, '')
  AND COALESCE(st.end_date::text, '') = COALESCE(tp.week_end_date, '')
WHERE tp.athlete_target IS NULL
  AND tp.coach_id IS NOT NULL
  AND tp.exercise_id IS NOT NULL
ORDER BY tp.order_index;
*/

-- ============================================================
-- VÉRIFICATION
-- ============================================================

-- Vérifier que les tables ont été créées
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_templates') THEN
        RAISE EXCEPTION 'Table session_templates non créée';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_template_exercises') THEN
        RAISE EXCEPTION 'Table session_template_exercises non créée';
    END IF;

    RAISE NOTICE 'Migration terminée avec succès';
END $$;
