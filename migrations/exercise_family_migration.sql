-- ============================================================
-- F.Y.T - MIGRATION: exercise_family
-- Date        : 2026-06-22
-- Description : Ajoute la colonne exercise_family à exercises.
--               Permet de regrouper les variantes d'un même mouvement
--               (ex: tous les développés couchés) pour le carrousel
--               d'historique dans ActiveSessionMobile.
--
-- Idempotence : sûr à rejouer (ADD COLUMN IF NOT EXISTS, UPDATE idempotent).
-- Aucune donnée existante supprimée.
-- ============================================================

-- ============================================================
-- SECTION 1 : Ajout de la colonne
-- ============================================================

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS exercise_family TEXT;

COMMENT ON COLUMN exercises.exercise_family IS
  'Famille fonctionnelle de l''exercice (snake_case). Regroupe les variantes
   d''un même mouvement pour l''historique multi-séances. NULL = exercice isolé.
   Exemples : bench_press, squat, deadlift, bicep_curl, row.';

CREATE INDEX IF NOT EXISTS idx_exercises_family
  ON exercises (exercise_family)
  WHERE exercise_family IS NOT NULL AND deleted_at IS NULL;


-- ============================================================
-- SECTION 2 : Population des familles
-- ============================================================

-- ── PECTORAUX - Développé (bench press variants) ─────────────
UPDATE exercises SET exercise_family = 'bench_press'
WHERE coach_id IS NULL AND name IN (
  'Développé couché à la barre',
  'Développé couché haltère',
  'Développé couché haltères',
  'Développé couché haltères désynchronisé',
  'Développé couché prise serrée',
  'Développé décliné barre',
  'Développé incliné barre',
  'Développé incliné haltères',
  'Chest press machine'
);

-- ── PECTORAUX - Écarté / Fly ─────────────────────────────────
UPDATE exercises SET exercise_family = 'chest_fly'
WHERE coach_id IS NULL AND name IN (
  'Écarté couché haltères',
  'Écarté incliné haltères',
  'Écarté poulie croisée',
  'Pec deck machine'
);

-- ── PECTORAUX - Pompes ───────────────────────────────────────
UPDATE exercises SET exercise_family = 'push_up'
WHERE coach_id IS NULL AND name IN (
  'Pompes',
  'Pompes prise serrée',
  'Pompes scapulaire'
);

-- ── ÉPAULES - Développé overhead ────────────────────────────
UPDATE exercises SET exercise_family = 'overhead_press'
WHERE coach_id IS NULL AND name IN (
  'Arnold press',
  'Développé épaules unilatéral',
  'Handstand hold',
  'Handstand push-up',
  'Push jerk',
  'Push press'
);

-- ── ÉPAULES - Élévations / Rotations ────────────────────────
UPDATE exercises SET exercise_family = 'shoulder_raise'
WHERE coach_id IS NULL AND name IN (
  'Élévations frontales disque',
  'Élévations frontales haltères',
  'Élévations latérales poulie',
  'Bandes de résistance épaules',
  'Shoulder front raise to lateral',
  'Cercles d''épaules bâton',
  'Rotation externe épaules',
  'Rotation externe élastique',
  'Tirage menton'
);

-- ── TRAPÈZES - Shrugs ────────────────────────────────────────
UPDATE exercises SET exercise_family = 'shrug'
WHERE coach_id IS NULL AND name IN (
  'Shrugs barre',
  'Shrugs haltères'
);

-- ── DOS - Rowing horizontal ──────────────────────────────────
UPDATE exercises SET exercise_family = 'row'
WHERE coach_id IS NULL AND name IN (
  'Rowing à la barre',
  'Rowing assis poulie',
  'Rowing barre debout',
  'Rowing T-bar'
);

-- ── DOS - Tirage vertical / Tractions ────────────────────────
UPDATE exercises SET exercise_family = 'vertical_pull'
WHERE coach_id IS NULL AND name IN (
  'Traction en pronation',
  'Traction en supination',
  'Tractions lestées',
  'Tractions supination',
  'Tirage poitrine prise serrée',
  'Muscle-up anneaux',
  'Muscle-up barre',
  'Skin the cat',
  'Dead hang'
);

-- ── DOS - Pull-over ──────────────────────────────────────────
UPDATE exercises SET exercise_family = 'pullover'
WHERE coach_id IS NULL AND name IN (
  'Pull-over câble',
  'Pull-over haltère'
);

-- ── BICEPS - Curl ────────────────────────────────────────────
UPDATE exercises SET exercise_family = 'bicep_curl'
WHERE coach_id IS NULL AND name IN (
  'Curl barre droite',
  'Curl câble basse poulie',
  'Curl concentration',
  'Curl pupitre',
  'Curl Zottman'
);

-- ── TRICEPS - Extension ──────────────────────────────────────
UPDATE exercises SET exercise_family = 'tricep_extension'
WHERE coach_id IS NULL AND name IN (
  'Extension triceps câble une main',
  'Kick-back haltère',
  'Skullcrusher barre EZ',
  'Dips anneaux',
  'Dips banc'
);

-- ── AVANT-BRAS ───────────────────────────────────────────────
UPDATE exercises SET exercise_family = 'forearm'
WHERE coach_id IS NULL AND name IN (
  'Curl poignet barre',
  'Extension poignet barre',
  'Farmer''s walk'
);

-- ── JAMBES - Squat ───────────────────────────────────────────
UPDATE exercises SET exercise_family = 'squat'
WHERE coach_id IS NULL AND name IN (
  'Squat',
  'Squat avant',
  'Front squat profond',
  'Squat goblet',
  'Squat stato-dynamique',
  'Squat sumo',
  '½ Squat lourd',
  '1/2 Squat lourd',
  'Hack squat machine',
  'Pistol squat',
  'Thruster',
  'Wall ball'
);

-- ── JAMBES - Fente ───────────────────────────────────────────
UPDATE exercises SET exercise_family = 'lunge'
WHERE coach_id IS NULL AND name IN (
  'Bulgarian split squat',
  'Fente arrière croisée',
  'Fente vers l''arrière',
  'Walking lunge',
  'Fentes avant',
  'Fentes latérales'
);

-- ── JAMBES - Soulevé de terre ────────────────────────────────
UPDATE exercises SET exercise_family = 'deadlift'
WHERE coach_id IS NULL AND name IN (
  'Deadlift',
  'Good morning',
  'Single leg deadlift',
  'Soulevé de terre jambes tendues'
);

-- ── JAMBES - Hip thrust / Fessiers ───────────────────────────
UPDATE exercises SET exercise_family = 'hip_thrust'
WHERE coach_id IS NULL AND name IN (
  'Hip thrust',
  'Hip thrust unilatéral',
  'Donkey kicks',
  'Kickback câble',
  'Hips raise jambes tendues'
);

-- ── JAMBES - Kettlebell swing ────────────────────────────────
UPDATE exercises SET exercise_family = 'kettlebell_swing'
WHERE coach_id IS NULL AND name IN (
  'Kettlebell swing',
  'One arm kettlebell walk'
);

-- ── JAMBES - Leg curl / Ischio-jambiers ─────────────────────
UPDATE exercises SET exercise_family = 'leg_curl'
WHERE coach_id IS NULL AND name IN (
  'Nordic curl',
  'Glute ham raise',
  'Eccentric single leg hamstring curl'
);

-- ── JAMBES - Step up ─────────────────────────────────────────
UPDATE exercises SET exercise_family = 'step_up'
WHERE coach_id IS NULL AND name IN (
  'Monté de box',
  'Montée de box',
  'Montée de box latérale croisée',
  'Step-up sur box'
);

-- ── MOLLETS ──────────────────────────────────────────────────
UPDATE exercises SET exercise_family = 'calf'
WHERE coach_id IS NULL AND name IN (
  'Élévation mollet assis avec poids sur step',
  'Élévation sur un mollet sur un step',
  'Élévations mollets sur step',
  'Élévations de mollets à la presse',
  'Élévations de mollets assis',
  'Élévations de mollets unilatéral'
);

-- ── CORE - Gainage anti-extension ────────────────────────────
UPDATE exercises SET exercise_family = 'plank'
WHERE coach_id IS NULL AND name IN (
  'Dragon flag',
  'Hollow body hold',
  'Inchworm',
  'L-sit',
  'Back lever',
  'Front lever'
);

-- ── CORE - Gainage latéral ───────────────────────────────────
UPDATE exercises SET exercise_family = 'side_plank'
WHERE coach_id IS NULL AND name IN (
  'Human flag',
  'Planche latérale',
  'Copenhagen plank'
);

-- ── CORE - Anti-rotation ─────────────────────────────────────
UPDATE exercises SET exercise_family = 'anti_rotation'
WHERE coach_id IS NULL AND name IN (
  'Bird dog',
  'Core déplacement à la poulie',
  'Planche avec rotation sur ballon',
  'Swissball press iso wall',
  'Planche sur le côté avec élévation de jambe'
);

-- ── CORE - Flexion (crunch) ───────────────────────────────────
UPDATE exercises SET exercise_family = 'crunch'
WHERE coach_id IS NULL AND name IN (
  'Crunch',
  'Crunch inversé',
  'Relevé de jambes suspendu',
  'Toes to bar',
  'V-up',
  'Bicycle crunch'
);

-- ── CORE - Extension du tronc ────────────────────────────────
UPDATE exercises SET exercise_family = 'back_extension'
WHERE coach_id IS NULL AND name IN (
  'Cat-cow',
  'Superman'
);

-- ── CORE - Rotation ──────────────────────────────────────────
UPDATE exercises SET exercise_family = 'rotation'
WHERE coach_id IS NULL AND name IN (
  'Thread the needle'
);

-- ── HALTÉROPHILIE - Arraché ──────────────────────────────────
UPDATE exercises SET exercise_family = 'snatch'
WHERE coach_id IS NULL AND name IN (
  'Arraché',
  'Kettlebell snatch',
  'Variante haltérophilie: Arraché niveau 1'
);

-- ── HALTÉROPHILIE - Épaulé ───────────────────────────────────
UPDATE exercises SET exercise_family = 'clean'
WHERE coach_id IS NULL AND name IN (
  'Épaulé de force',
  'Épaulé-jeté',
  'Tirage épaulé'
);

-- ── SAUTS ────────────────────────────────────────────────────
UPDATE exercises SET exercise_family = 'jump'
WHERE coach_id IS NULL AND name IN (
  'Depth drop',
  'Drop jump to box jump',
  'Seated jump',
  'Box jump'
);

-- ── HANCHES - Abducteurs ─────────────────────────────────────
UPDATE exercises SET exercise_family = 'hip_abduction'
WHERE coach_id IS NULL AND name IN (
  'Abduction hanche debout câble',
  'Abduction hanche machine',
  'Leg swing latéral',
  'Monster walk élastique',
  'Standing band hip abduction'
);

-- ── HANCHES - Adducteurs ─────────────────────────────────────
UPDATE exercises SET exercise_family = 'hip_adduction'
WHERE coach_id IS NULL AND name IN (
  '90/90 hip stretch',
  'Adduction hanche machine',
  'Contraction psoas isométrique',
  'Renfo adducteur : déplacement de poids'
);


-- ============================================================
-- SECTION 3 : Vérification
-- ============================================================

SELECT
  COUNT(*) AS total,
  COUNT(exercise_family) AS with_family,
  COUNT(*) - COUNT(exercise_family) AS without_family
FROM exercises
WHERE coach_id IS NULL AND deleted_at IS NULL;

-- Détail des familles
SELECT exercise_family, COUNT(*) AS count
FROM exercises
WHERE coach_id IS NULL AND deleted_at IS NULL AND exercise_family IS NOT NULL
GROUP BY exercise_family
ORDER BY count DESC;

-- Exercices sans famille (standalone intentionnels ou à mapper)
SELECT name, movement_pattern_id IS NOT NULL AS has_pattern
FROM exercises
WHERE coach_id IS NULL AND deleted_at IS NULL AND exercise_family IS NULL
ORDER BY name;
