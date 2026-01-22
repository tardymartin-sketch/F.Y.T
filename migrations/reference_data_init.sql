-- ============================================================
-- F.Y.T - INITIALISATION DES DONNÉES DE RÉFÉRENCE
-- ============================================================
-- Ce script initialise les tables muscle_groups et movement_patterns
-- avec les données nécessaires pour la catégorisation des exercices
-- ============================================================

-- ============================================================
-- SECTION 1: CRÉER LES TABLES SI ELLES N'EXISTENT PAS
-- ============================================================

-- Table muscle_groups
CREATE TABLE IF NOT EXISTS muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL UNIQUE,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table movement_patterns
CREATE TABLE IF NOT EXISTS movement_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes FK à exercises si elles n'existent pas
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS primary_muscle_group_id UUID REFERENCES muscle_groups(id) ON DELETE SET NULL;

ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS movement_pattern_id UUID REFERENCES movement_patterns(id) ON DELETE SET NULL;

ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS limb_type TEXT DEFAULT 'bilateral';


-- ============================================================
-- SECTION 2: INSERTION DES GROUPES MUSCULAIRES
-- ============================================================

INSERT INTO muscle_groups (name_fr, name_en, description) VALUES
  ('Pectoraux', 'Chest', 'Muscles de la poitrine'),
  ('Dos', 'Back', 'Muscles du dos (lats, trapèzes, rhomboïdes)'),
  ('Épaules', 'Shoulders', 'Deltoïdes et coiffe des rotateurs'),
  ('Biceps', 'Biceps', 'Muscles avant du bras'),
  ('Triceps', 'Triceps', 'Muscles arrière du bras'),
  ('Avant-bras', 'Forearms', 'Muscles de l''avant-bras'),
  ('Quadriceps', 'Quadriceps', 'Muscles avant de la cuisse'),
  ('Ischio-jambiers', 'Hamstrings', 'Muscles arrière de la cuisse'),
  ('Fessiers', 'Glutes', 'Muscles fessiers'),
  ('Mollets', 'Calves', 'Muscles du mollet'),
  ('Abdominaux', 'Abs', 'Muscles abdominaux'),
  ('Obliques', 'Obliques', 'Muscles obliques'),
  ('Lombaires', 'Lower Back', 'Muscles du bas du dos'),
  ('Trapèzes', 'Traps', 'Muscles trapèzes'),
  ('Adducteurs', 'Adductors', 'Muscles intérieurs de la cuisse'),
  ('Abducteurs', 'Abductors', 'Muscles extérieurs de la hanche')
ON CONFLICT (name_fr) DO NOTHING;


-- ============================================================
-- SECTION 3: INSERTION DES PATTERNS DE MOUVEMENT
-- ============================================================

INSERT INTO movement_patterns (code, name_fr, name_en, description) VALUES
  -- PUSH (Poussées)
  ('horizontal_push', 'Poussée horizontale', 'Horizontal Push', 'Développé couché, pompes, etc.'),
  ('vertical_push', 'Poussée verticale', 'Vertical Push', 'Développé épaules, military press, etc.'),
  ('elbow_extension', 'Extension du coude', 'Elbow Extension', 'Triceps pushdown, dips, etc.'),

  -- PULL (Tractions)
  ('horizontal_pull', 'Traction horizontale', 'Horizontal Pull', 'Rowing, tirage horizontal, etc.'),
  ('vertical_pull', 'Traction verticale', 'Vertical Pull', 'Tractions, tirage vertical, etc.'),
  ('scapular_retraction', 'Rétraction scapulaire', 'Scapular Retraction', 'Face pulls, reverse fly, etc.'),
  ('scapular_protraction', 'Protraction scapulaire', 'Scapular Protraction', 'Serratus push-ups, etc.'),
  ('elbow_flexion', 'Flexion du coude', 'Elbow Flexion', 'Curls biceps, etc.'),

  -- LEGS SQUAT (Dominance quadriceps)
  ('squat', 'Squat', 'Squat', 'Squats, leg press, etc.'),
  ('lunge', 'Fente', 'Lunge', 'Fentes avant, arrière, latérales'),
  ('step_up', 'Step-up', 'Step Up', 'Montée sur box, escaliers'),
  ('leg_extension', 'Extension de jambe', 'Leg Extension', 'Leg extension machine'),

  -- LEGS HINGE (Dominance ischio/fessiers)
  ('hinge', 'Hip hinge', 'Hip Hinge', 'Soulevé de terre, RDL, good morning'),
  ('hip_thrust', 'Hip thrust', 'Hip Thrust', 'Hip thrust, pont fessier'),
  ('leg_curl', 'Flexion de jambe', 'Leg Curl', 'Leg curl machine'),

  -- CORE (Gainage/Abdos)
  ('anti_extension', 'Anti-extension', 'Anti-Extension', 'Planche, ab wheel, dead bug'),
  ('anti_rotation', 'Anti-rotation', 'Anti-Rotation', 'Pallof press, bird dog'),
  ('anti_lateral_flexion', 'Anti-flexion latérale', 'Anti-Lateral Flexion', 'Farmer carry unilatéral, side plank'),
  ('flexion', 'Flexion du tronc', 'Trunk Flexion', 'Crunchs, relevé de jambes'),
  ('extension', 'Extension du tronc', 'Trunk Extension', 'Superman, back extension'),
  ('rotation', 'Rotation du tronc', 'Trunk Rotation', 'Russian twist, cable woodchop'),

  -- AUTRES
  ('isolation_shoulder', 'Isolation épaule', 'Shoulder Isolation', 'Élévations latérales, frontales'),
  ('isolation_calf', 'Isolation mollet', 'Calf Isolation', 'Mollets debout, assis'),
  ('carry', 'Portage', 'Carry', 'Farmer walk, suitcase carry'),
  ('jump', 'Saut', 'Jump', 'Box jump, jump squat'),
  ('throw', 'Lancer', 'Throw', 'Medicine ball throw')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- SECTION 4: VÉRIFICATION
-- ============================================================

SELECT 'muscle_groups' as table_name, COUNT(*) as count FROM muscle_groups
UNION ALL
SELECT 'movement_patterns' as table_name, COUNT(*) as count FROM movement_patterns;


-- ============================================================
-- SECTION 5: TEMPLATE DE MAPPING DES EXERCICES
-- ============================================================
-- Décommentez et exécutez selon vos exercices existants

/*
-- Exemple: Développé couché
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Pectoraux'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'horizontal_push'),
  limb_type = 'bilateral'
WHERE name ILIKE '%développé couché%' OR name ILIKE '%bench press%';

-- Exemple: Squat
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Quadriceps'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'squat'),
  limb_type = 'bilateral'
WHERE name ILIKE '%squat%';

-- Exemple: Tractions
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Dos'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'vertical_pull'),
  limb_type = 'bilateral'
WHERE name ILIKE '%traction%' OR name ILIKE '%pull-up%' OR name ILIKE '%chin-up%';

-- Exemple: Curl biceps
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Biceps'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'elbow_flexion'),
  limb_type = 'bilateral'
WHERE name ILIKE '%curl%biceps%' OR name ILIKE '%biceps curl%';

-- Exemple: Fentes (unilatéral)
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Quadriceps'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'lunge'),
  limb_type = 'unilateral'
WHERE name ILIKE '%fente%' OR name ILIKE '%lunge%';

-- Exemple: Planche (temps, pas reps)
UPDATE exercises
SET
  primary_muscle_group_id = (SELECT id FROM muscle_groups WHERE name_fr = 'Abdominaux'),
  movement_pattern_id = (SELECT id FROM movement_patterns WHERE code = 'anti_extension'),
  limb_type = 'bilateral'
WHERE name ILIKE '%planche%' OR name ILIKE '%plank%';
*/


-- ============================================================
-- SECTION 6: APRÈS MAPPING - PROPAGER À exercise_logs
-- ============================================================
-- Exécuter après avoir mappé les exercices dans la Section 5

/*
UPDATE exercise_logs el
SET
  limb_type = COALESCE(e.limb_type, 'bilateral'),
  muscle_group_id = e.primary_muscle_group_id,
  muscle_group_name = mg.name_fr,
  movement_pattern_id = e.movement_pattern_id,
  movement_pattern_name = mp.name_fr,
  analytics_category = get_analytics_category(mp.code)
FROM exercises e
LEFT JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
LEFT JOIN movement_patterns mp ON mp.id = e.movement_pattern_id
WHERE el.exercise_id = e.id
  AND el.exercise_id IS NOT NULL;
*/
