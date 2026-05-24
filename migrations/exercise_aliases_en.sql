-- ============================================================
-- F.Y.T - MIGRATION: Alias anglais des exercices
-- Date        : 2026-05-20
-- Description : Ajoute la colonne alias_en à la table exercises
--               et complète la bibliothèque d'exercices (FR + EN).
--
-- Idempotence : sûr à rejouer (ADD COLUMN IF NOT EXISTS, WHERE NOT EXISTS).
-- Pas de TRUNCATE ni de DELETE sur des données utilisateur.
-- ============================================================


-- ============================================================
-- SECTION 1 : Ajout de la colonne alias_en
-- ============================================================

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS alias_en TEXT;

COMMENT ON COLUMN exercises.alias_en IS
  'Nom anglais de l''exercice (alias). Permet la recherche bilingue FR/EN.
   L''historique et les stats sont partagés via l''ID commun.';

CREATE INDEX IF NOT EXISTS idx_exercises_alias_en
  ON exercises (alias_en)
  WHERE alias_en IS NOT NULL;


-- ============================================================
-- SECTION 2 : Alimentation alias_en sur les exercices existants
-- ============================================================
-- Stratégie : UPDATE par nom exact (ILIKE pour robustesse casse/accents).
-- Si un exercice n'est pas dans cette liste → alias_en reste NULL.

-- ── Pectoraux ────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Barbell Bench Press'          WHERE name ILIKE 'Développé couché'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dumbbell Bench Press'         WHERE name ILIKE 'Développé couché haltères'           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Incline Barbell Bench Press'  WHERE name ILIKE 'Développé incliné barre'             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Incline Dumbbell Press'       WHERE name ILIKE 'Développé incliné haltères'          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Decline Bench Press'          WHERE name ILIKE 'Développé décliné'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Close Grip Bench Press'       WHERE name ILIKE 'Développé couché prise serrée'       AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Push-ups'                     WHERE name ILIKE 'Pompes'                              AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Incline Push-ups'             WHERE name ILIKE 'Pompes inclinées'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Decline Push-ups'             WHERE name ILIKE 'Pompes déclinées'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Clapping Push-ups'            WHERE name ILIKE 'Pompes explosives'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Diamond Push-ups'             WHERE name ILIKE 'Pompes diamant'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Cable Fly'                    WHERE name ILIKE 'Écartés poulie'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dumbbell Fly'                 WHERE name ILIKE 'Écartés haltères'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Incline Dumbbell Fly'         WHERE name ILIKE 'Écartés haltères incliné'            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Pec Deck'                     WHERE name ILIKE 'Pec Deck'                            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Chest Dips'                   WHERE name ILIKE 'Dips (pectoraux)'                    AND coach_id IS NULL AND alias_en IS NULL;

-- ── Dos ──────────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Pull-ups'                     WHERE name ILIKE 'Tractions'                           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Overhand Pull-ups'            WHERE name ILIKE 'Tractions pronation'                 AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Chin-ups'                     WHERE name ILIKE 'Tractions supination'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Lat Pulldown'                 WHERE name ILIKE 'Tirage poulie haute'                 AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Close Grip Lat Pulldown'      WHERE name ILIKE 'Tirage poulie haute prise serrée'    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Neutral Grip Lat Pulldown'    WHERE name ILIKE 'Tirage poulie haute neutre'          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Lat Pulldown'                 WHERE name ILIKE 'Tirage poitrine poulie'              AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Barbell Row'                  WHERE name ILIKE 'Tirage horizontal barre'             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dumbbell Row'                 WHERE name ILIKE 'Tirage horizontal haltère'           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Single Arm Dumbbell Row'      WHERE name ILIKE 'Rowing haltère unilatéral'           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Seated Cable Row'             WHERE name ILIKE 'Tirage câble assis'                  AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Pendlay Row'                  WHERE name ILIKE 'Rowing Pendlay'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'T-bar Row'                    WHERE name ILIKE 'Rowing T-bar'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Face Pulls'                   WHERE name ILIKE 'Face pulls'                          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Rear Delt Fly'                WHERE name ILIKE 'Oiseau (élévations dorsales)'        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dumbbell Shrugs'              WHERE name ILIKE 'Shrugs haltères'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Barbell Shrugs'               WHERE name ILIKE 'Shrugs barre'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Straight Arm Pulldown'        WHERE name ILIKE 'Tirage bras tendus poulie'           AND coach_id IS NULL AND alias_en IS NULL;

-- ── Épaules ──────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Military Press'               WHERE name ILIKE 'Développé militaire'                 AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dumbbell Overhead Press'      WHERE name ILIKE 'Développé militaire haltères'        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Seated Dumbbell Press'        WHERE name ILIKE 'Développé haltères assis'            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Arnold Press'                 WHERE name ILIKE 'Arnold press'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Lateral Raises'               WHERE name ILIKE 'Élévations latérales'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Front Raises'                 WHERE name ILIKE 'Élévations frontales'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Cable Lateral Raise'          WHERE name ILIKE 'Élévations latérales câble'          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Upright Row'                  WHERE name ILIKE 'Upright row'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Cuban Press'                  WHERE name ILIKE 'Cuban press'                         AND coach_id IS NULL AND alias_en IS NULL;

-- ── Biceps ───────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Dumbbell Curl'                WHERE name ILIKE 'Curl biceps haltères'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Barbell Curl'                 WHERE name ILIKE 'Curl biceps barre'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'EZ Bar Curl'                  WHERE name ILIKE 'Curl biceps barre EZ'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hammer Curl'                  WHERE name ILIKE 'Curl marteau'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Incline Dumbbell Curl'        WHERE name ILIKE 'Curl incliné haltères'               AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Cable Curl'                   WHERE name ILIKE 'Curl câble poulie basse'             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Concentration Curl'           WHERE name ILIKE 'Curl concentré'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Spider Curl'                  WHERE name ILIKE 'Curl spider'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Reverse Curl'                 WHERE name ILIKE 'Curl pronation'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Preacher Curl'                WHERE name ILIKE 'Curl Larry Scott'                    AND coach_id IS NULL AND alias_en IS NULL;

-- ── Triceps ──────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Tricep Pushdown'              WHERE name ILIKE 'Extension triceps poulie'            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Tricep Pushdown'              WHERE name ILIKE 'Pushdown triceps'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Overhead Tricep Extension'    WHERE name ILIKE 'Extension triceps au-dessus tête'    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Tricep Rope Pushdown'         WHERE name ILIKE 'Extension triceps corde'             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Skull Crushers'               WHERE name ILIKE 'Skull crushers'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dips'                         WHERE name ILIKE 'Dips'                                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Tricep Kickbacks'             WHERE name ILIKE 'Kickbacks triceps'                   AND coach_id IS NULL AND alias_en IS NULL;

-- ── Quadriceps / Jambes ──────────────────────────────────────

UPDATE exercises SET alias_en = 'Back Squat'                   WHERE name ILIKE 'Squat'                               AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Front Squat'                  WHERE name ILIKE 'Squat avant'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Goblet Squat'                 WHERE name ILIKE 'Squat goblet'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Sumo Squat'                   WHERE name ILIKE 'Squat sumo'                          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Box Squat'                    WHERE name ILIKE 'Squat box'                           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Paused Squat'                 WHERE name ILIKE 'Squat pausa'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hack Squat'                   WHERE name ILIKE 'Hack squat'                          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Leg Press'                    WHERE name ILIKE 'Presse à jambes'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Forward Lunges'               WHERE name ILIKE 'Fentes avant'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Reverse Lunges'               WHERE name ILIKE 'Fentes inverses'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Bulgarian Split Squat'        WHERE name ILIKE 'Fentes bulgares'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Side Lunges'                  WHERE name ILIKE 'Fentes latérales'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Jump Lunges'                  WHERE name ILIKE 'Fentes sautées'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Step-up'                      WHERE name ILIKE 'Step-up'                             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Leg Extension'                WHERE name ILIKE 'Leg extension'                       AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Pistol Squat'                 WHERE name ILIKE 'Pistol squat'                        AND coach_id IS NULL AND alias_en IS NULL;

-- ── Ischio-jambiers / Fessiers ───────────────────────────────

UPDATE exercises SET alias_en = 'Deadlift'                     WHERE name ILIKE 'Soulevé de terre'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Romanian Deadlift'            WHERE name ILIKE 'Soulevé de terre roumain'            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Sumo Deadlift'                WHERE name ILIKE 'Soulevé de terre sumo'               AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Stiff Leg Deadlift'           WHERE name ILIKE 'Soulevé de terre jambes tendues'     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Trap Bar Deadlift'            WHERE name ILIKE 'Soulevé de terre hexagonal'          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hip Thrust'                   WHERE name ILIKE 'Hip thrust'                          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Glute Bridge'                 WHERE name ILIKE 'Pont fessier'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Lying Leg Curl'               WHERE name ILIKE 'Leg curl couché'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Seated Leg Curl'              WHERE name ILIKE 'Leg curl assis'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Standing Leg Curl'            WHERE name ILIKE 'Leg curl debout'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Good Morning'                 WHERE name ILIKE 'Good morning'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Back Extensions'              WHERE name ILIKE 'Hyperextensions'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Nordic Curl'                  WHERE name ILIKE 'Curl nordique'                       AND coach_id IS NULL AND alias_en IS NULL;

-- ── Mollets ──────────────────────────────────────────────────

UPDATE exercises SET alias_en = 'Calf Raises'                  WHERE name ILIKE 'Élévations de mollets'               AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Seated Calf Raises'           WHERE name ILIKE 'Élévations de mollets assis'         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Standing Calf Raise Machine'  WHERE name ILIKE 'Mollets debout machine'              AND coach_id IS NULL AND alias_en IS NULL;

-- ── Abdominaux / Core ─────────────────────────────────────────

UPDATE exercises SET alias_en = 'Plank'                        WHERE name ILIKE 'Planche avant'                       AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Side Plank'                   WHERE name ILIKE 'Planche latérale'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Crunches'                     WHERE name ILIKE 'Crunchs'                             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Reverse Crunches'             WHERE name ILIKE 'Crunchs inversés'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hanging Leg Raises'           WHERE name ILIKE 'Relevé de jambes suspendu'           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Leg Raises'                   WHERE name ILIKE 'Relevé de jambes sol'                AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Russian Twist'                WHERE name ILIKE 'Russian twist'                       AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Dead Bug'                     WHERE name ILIKE 'Dead bug'                            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Bird Dog'                     WHERE name ILIKE 'Bird dog'                            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Ab Wheel Rollout'             WHERE name ILIKE 'Rollout (roue abdominale)'           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Pallof Press'                 WHERE name ILIKE 'Pallof press'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Mountain Climbers'            WHERE name ILIKE 'Mountain climbers'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'V-Sit'                        WHERE name ILIKE 'V-sit'                               AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Windshield Wipers'            WHERE name ILIKE 'Windshield wipers'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hollow Body Hold'             WHERE name ILIKE 'Hollow body'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Cable Woodchop'               WHERE name ILIKE 'Bûcheron poulie'                     AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Sit-ups'                      WHERE name ILIKE 'Sit-ups'                             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Toe Touches'                  WHERE name ILIKE 'Toucher les orteils'                 AND coach_id IS NULL AND alias_en IS NULL;

-- ── Fonctionnel / Conditionning ──────────────────────────────

UPDATE exercises SET alias_en = 'Burpees'                      WHERE name ILIKE 'Burpees'                             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Jump Squat'                   WHERE name ILIKE 'Sauts squat'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Box Jump'                     WHERE name ILIKE 'Box jump'                            AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Broad Jump'                   WHERE name ILIKE 'Saut en longueur'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'High Knees'                   WHERE name ILIKE 'Sprint sur place'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Jumping Jacks'                WHERE name ILIKE 'Jumping jacks'                       AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Jump Rope'                    WHERE name ILIKE 'Sauts à la corde'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Kettlebell Swing'             WHERE name ILIKE 'Kettlebell swing'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Kettlebell Clean'             WHERE name ILIKE 'Kettlebell clean'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Kettlebell Snatch'            WHERE name ILIKE 'Kettlebell snatch'                   AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Turkish Get-up'               WHERE name ILIKE 'Turkish get-up'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Battle Rope'                  WHERE name ILIKE 'Battle rope'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Thrusters'                    WHERE name ILIKE 'Thrusters'                           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Wall Ball'                    WHERE name ILIKE 'Wall ball'                           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Rowing Machine'               WHERE name ILIKE 'Rowing ergomètre'                    AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Assault Bike'                 WHERE name ILIKE 'Vélo ergomètre'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Farmer Walk'                  WHERE name ILIKE 'Farmer carry'                        AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Suitcase Carry'               WHERE name ILIKE 'Suitcase carry'                      AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Sled Push'                    WHERE name ILIKE 'Poussée de traîneau'                 AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Sled Pull'                    WHERE name ILIKE 'Tirage de traîneau'                  AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Tyre Flip'                    WHERE name ILIKE 'Retournement de pneu'               AND coach_id IS NULL AND alias_en IS NULL;

-- ── Haltérophilie / Olympic lifting ──────────────────────────

UPDATE exercises SET alias_en = 'Clean and Jerk'               WHERE name ILIKE 'Épaulé-jeté'                         AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Snatch'                       WHERE name ILIKE 'Arraché'                             AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Power Clean'                  WHERE name ILIKE 'Épaulé'                              AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hang Snatch'                  WHERE name ILIKE 'Arraché à la hanche'                 AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Hang Clean'                   WHERE name ILIKE 'Épaulé à la hanche'                  AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Push Press'                   WHERE name ILIKE 'Push press'                          AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Push Jerk'                    WHERE name ILIKE 'Push jerk'                           AND coach_id IS NULL AND alias_en IS NULL;
UPDATE exercises SET alias_en = 'Overhead Squat'               WHERE name ILIKE 'Squat en dessus de la tête'          AND coach_id IS NULL AND alias_en IS NULL;


-- ============================================================
-- SECTION 3 : Insertion des exercices manquants
-- ============================================================
-- Convention : coach_id IS NULL = exercice commun (visible par tous).
-- Idempotence : WHERE NOT EXISTS sur (name, coach_id IS NULL).
-- Les colonnes limb_type, primary_muscle_group_id, movement_pattern_id
-- sont délibérément NULL ici — à renseigner via reference_data_init.sql.
-- ============================================================

DO $$
DECLARE
  v_inserted INT := 0;
BEGIN

  -- Helper macro: insertion sécurisée
  -- (on répète la structure pour éviter une fonction temporaire)

  -- ── PECTORAUX ────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Développé couché',               'Barbell Bench Press'         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé couché'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé couché haltères',      'Dumbbell Bench Press'        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé couché haltères'      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé incliné barre',        'Incline Barbell Bench Press' WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé incliné barre'        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé incliné haltères',     'Incline Dumbbell Press'      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé incliné haltères'     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé décliné',              'Decline Bench Press'         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé décliné'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé couché prise serrée',  'Close Grip Bench Press'      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé couché prise serrée'  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pompes',                         'Push-ups'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pompes'                         AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pompes inclinées',               'Incline Push-ups'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pompes inclinées'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pompes déclinées',               'Decline Push-ups'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pompes déclinées'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pompes explosives',              'Clapping Push-ups'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pompes explosives'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pompes diamant',                 'Diamond Push-ups'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pompes diamant'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Écartés poulie',                 'Cable Fly'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Écartés poulie'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Écartés haltères',               'Dumbbell Fly'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Écartés haltères'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Écartés haltères incliné',       'Incline Dumbbell Fly'        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Écartés haltères incliné'       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pec Deck',                       'Pec Deck'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pec Deck'                       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Dips (pectoraux)',               'Chest Dips'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Dips (pectoraux)'               AND coach_id IS NULL);

  -- ── DOS ───────────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Tractions',                      'Pull-ups'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tractions'                      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tractions pronation',            'Overhand Pull-ups'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tractions pronation'            AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tractions supination',           'Chin-ups'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tractions supination'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage poulie haute',            'Lat Pulldown'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage poulie haute'            AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage poulie haute prise serrée','Close Grip Lat Pulldown'    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage poulie haute prise serrée' AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage poulie haute neutre',     'Neutral Grip Lat Pulldown'   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage poulie haute neutre'     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage poitrine poulie',         'Lat Pulldown'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage poitrine poulie'         AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage horizontal barre',        'Barbell Row'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage horizontal barre'        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage horizontal haltère',      'Dumbbell Row'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage horizontal haltère'      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rowing haltère unilatéral',      'Single Arm Dumbbell Row'     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rowing haltère unilatéral'      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage câble assis',             'Seated Cable Row'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage câble assis'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rowing Pendlay',                 'Pendlay Row'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rowing Pendlay'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rowing T-bar',                   'T-bar Row'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rowing T-bar'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Face pulls',                     'Face Pulls'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Face pulls'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Oiseau (élévations dorsales)',   'Rear Delt Fly'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Oiseau (élévations dorsales)'   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Shrugs haltères',                'Dumbbell Shrugs'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Shrugs haltères'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Shrugs barre',                   'Barbell Shrugs'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Shrugs barre'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage bras tendus poulie',      'Straight Arm Pulldown'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage bras tendus poulie'      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pull-over barre',                'Barbell Pullover'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pull-over barre'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pull-over haltère',              'Dumbbell Pullover'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pull-over haltère'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rétraction scapulaire',          'Scapular Retraction'         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rétraction scapulaire'          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Superman',                       'Superman Hold'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Superman'                       AND coach_id IS NULL);

  -- ── ÉPAULES ─────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Développé militaire',            'Military Press'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé militaire'            AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé militaire haltères',   'Dumbbell Overhead Press'     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé militaire haltères'   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Développé haltères assis',       'Seated Dumbbell Press'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Développé haltères assis'       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Arnold press',                   'Arnold Press'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Arnold press'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Élévations latérales',           'Lateral Raises'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations latérales'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Élévations frontales',           'Front Raises'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations frontales'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Élévations latérales câble',     'Cable Lateral Raise'         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations latérales câble'     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Upright row',                    'Upright Row'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Upright row'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Cuban press',                    'Cuban Press'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Cuban press'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Shrugs épaules',                 'Shoulder Shrugs'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Shrugs épaules'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Élévations Y-T-W',              'YTW Raises'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations Y-T-W'              AND coach_id IS NULL);

  -- ── BICEPS ───────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Curl biceps haltères',           'Dumbbell Curl'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl biceps haltères'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl biceps barre',              'Barbell Curl'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl biceps barre'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl biceps barre EZ',           'EZ Bar Curl'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl biceps barre EZ'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl marteau',                   'Hammer Curl'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl marteau'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl incliné haltères',          'Incline Dumbbell Curl'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl incliné haltères'          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl câble poulie basse',        'Cable Curl'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl câble poulie basse'        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl concentré',                 'Concentration Curl'          WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl concentré'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl spider',                    'Spider Curl'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl spider'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl pronation',                 'Reverse Curl'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl pronation'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl Larry Scott',               'Preacher Curl'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl Larry Scott'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl câble unilatéral',          'Single Arm Cable Curl'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl câble unilatéral'          AND coach_id IS NULL);

  -- ── TRICEPS ──────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Extension triceps poulie',       'Tricep Pushdown'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extension triceps poulie'       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pushdown triceps',               'Tricep Pushdown'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pushdown triceps'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Extension triceps au-dessus tête','Overhead Tricep Extension'  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extension triceps au-dessus tête' AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Extension triceps corde',        'Tricep Rope Pushdown'        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extension triceps corde'        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Skull crushers',                 'Skull Crushers'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Skull crushers'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Dips',                           'Dips'                        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Dips'                           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Kickbacks triceps',              'Tricep Kickbacks'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Kickbacks triceps'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Extension triceps haltère couché','Lying Tricep Extension'     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extension triceps haltère couché' AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'JM Press',                       'JM Press'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'JM Press'                       AND coach_id IS NULL);

  -- ── AVANT-BRAS ───────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Curl poignet',                   'Wrist Curl'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl poignet'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Extension poignet',              'Wrist Extension'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Extension poignet'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rouleau avant-bras',             'Forearm Roller'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rouleau avant-bras'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pinch grip',                     'Pinch Grip'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pinch grip'                     AND coach_id IS NULL);

  -- ── QUADRICEPS / JAMBES ──────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Squat',                          'Back Squat'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat'                          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat avant',                    'Front Squat'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat avant'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat goblet',                   'Goblet Squat'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat goblet'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat sumo',                     'Sumo Squat'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat sumo'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat box',                      'Box Squat'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat box'                      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat pausa',                    'Paused Squat'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat pausa'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Hack squat',                     'Hack Squat'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hack squat'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Presse à jambes',                'Leg Press'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Presse à jambes'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Fentes avant',                   'Forward Lunges'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Fentes avant'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Fentes inverses',                'Reverse Lunges'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Fentes inverses'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Fentes bulgares',                'Bulgarian Split Squat'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Fentes bulgares'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Fentes latérales',               'Side Lunges'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Fentes latérales'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Fentes sautées',                 'Jump Lunges'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Fentes sautées'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Step-up',                        'Step-up'                     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Step-up'                        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Leg extension',                  'Leg Extension'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg extension'                  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pistol squat',                   'Pistol Squat'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pistol squat'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Leg press unilatéral',           'Single Leg Press'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg press unilatéral'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Adducteurs machine',             'Adductor Machine'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Adducteurs machine'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Abducteurs machine',             'Abductor Machine'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Abducteurs machine'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Sissy squat',                    'Sissy Squat'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sissy squat'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Wall sit',                       'Wall Sit'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Wall sit'                       AND coach_id IS NULL);

  -- ── ISCHIO-JAMBIERS / FESSIERS ───────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Soulevé de terre',               'Deadlift'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Soulevé de terre'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Soulevé de terre roumain',       'Romanian Deadlift'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Soulevé de terre roumain'       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Soulevé de terre sumo',          'Sumo Deadlift'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Soulevé de terre sumo'          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Soulevé de terre jambes tendues','Stiff Leg Deadlift'          WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Soulevé de terre jambes tendues' AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Soulevé de terre hexagonal',     'Trap Bar Deadlift'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Soulevé de terre hexagonal'     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Hip thrust',                     'Hip Thrust'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hip thrust'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pont fessier',                   'Glute Bridge'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pont fessier'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Hip thrust unilatéral',          'Single Leg Hip Thrust'       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hip thrust unilatéral'          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Leg curl couché',                'Lying Leg Curl'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg curl couché'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Leg curl assis',                 'Seated Leg Curl'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg curl assis'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Leg curl debout',                'Standing Leg Curl'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg curl debout'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Good morning',                   'Good Morning'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Good morning'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Hyperextensions',                'Back Extensions'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hyperextensions'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Curl nordique',                  'Nordic Curl'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Curl nordique'                  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Glute kickback câble',           'Cable Glute Kickback'        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Glute kickback câble'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Monster walk',                   'Monster Walk'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Monster walk'                   AND coach_id IS NULL);

  -- ── MOLLETS ──────────────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Élévations de mollets',          'Calf Raises'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations de mollets'          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Élévations de mollets assis',    'Seated Calf Raises'          WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Élévations de mollets assis'    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Mollets debout machine',         'Standing Calf Raise Machine' WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Mollets debout machine'         AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Mollets leg press',              'Leg Press Calf Raise'        WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Mollets leg press'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Sauts à la corde',               'Jump Rope'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sauts à la corde'               AND coach_id IS NULL);

  -- ── ABDOMINAUX / CORE ────────────────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Planche avant',                  'Plank'                       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Planche avant'                  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Planche latérale',               'Side Plank'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Planche latérale'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Crunchs',                        'Crunches'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Crunchs'                        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Crunchs inversés',               'Reverse Crunches'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Crunchs inversés'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Relevé de jambes suspendu',      'Hanging Leg Raises'          WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Relevé de jambes suspendu'      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Relevé de jambes sol',           'Leg Raises'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Relevé de jambes sol'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Russian twist',                  'Russian Twist'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Russian twist'                  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Dead bug',                       'Dead Bug'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Dead bug'                       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Bird dog',                       'Bird Dog'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Bird dog'                       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rollout (roue abdominale)',       'Ab Wheel Rollout'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rollout (roue abdominale)'       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Pallof press',                   'Pallof Press'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pallof press'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Mountain climbers',              'Mountain Climbers'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Mountain climbers'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'V-sit',                          'V-Sit'                       WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'V-sit'                          AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Windshield wipers',              'Windshield Wipers'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Windshield wipers'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Hollow body',                    'Hollow Body Hold'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Hollow body'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Bûcheron poulie',                'Cable Woodchop'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Bûcheron poulie'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Sit-ups',                        'Sit-ups'                     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sit-ups'                        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Gainage dynamique',              'Dynamic Plank'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Gainage dynamique'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Toes to bar',                    'Toes to Bar'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Toes to bar'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Dragon flag',                    'Dragon Flag'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Dragon flag'                    AND coach_id IS NULL);

  -- ── CONDITIONNING / FONCTIONNEL ──────────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Burpees',                        'Burpees'                     WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Burpees'                        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Sauts squat',                    'Jump Squat'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sauts squat'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Box jump',                       'Box Jump'                    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Box jump'                       AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Saut en longueur',               'Broad Jump'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Saut en longueur'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Sprint sur place',               'High Knees'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Sprint sur place'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Jumping jacks',                  'Jumping Jacks'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Jumping jacks'                  AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Kettlebell swing',               'Kettlebell Swing'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Kettlebell swing'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Kettlebell clean',               'Kettlebell Clean'            WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Kettlebell clean'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Kettlebell snatch',              'Kettlebell Snatch'           WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Kettlebell snatch'              AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Turkish get-up',                 'Turkish Get-up'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Turkish get-up'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Battle rope',                    'Battle Rope'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Battle rope'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Thrusters',                      'Thrusters'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Thrusters'                      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Wall ball',                      'Wall Ball'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Wall ball'                      AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Rowing ergomètre',               'Rowing Machine'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Rowing ergomètre'               AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Vélo ergomètre',                 'Assault Bike'                WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Vélo ergomètre'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Farmer carry',                   'Farmer Walk'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Farmer carry'                   AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Suitcase carry',                 'Suitcase Carry'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Suitcase carry'                 AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Poussée de traîneau',            'Sled Push'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Poussée de traîneau'            AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Tirage de traîneau',             'Sled Pull'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Tirage de traîneau'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Retournement de pneu',           'Tyre Flip'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Retournement de pneu'           AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Lancer de medicine ball',        'Medicine Ball Throw'         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Lancer de medicine ball'        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Course sur tapis',               'Treadmill Run'               WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Course sur tapis'               AND coach_id IS NULL);

  -- ── HALTÉROPHILIE / OLYMPIC LIFTING ──────────────────────────

  INSERT INTO exercises (name, alias_en) SELECT 'Épaulé-jeté',                    'Clean and Jerk'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Épaulé-jeté'                    AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Arraché',                        'Snatch'                      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Arraché'                        AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Épaulé',                         'Power Clean'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Épaulé'                         AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Arraché à la hanche',            'Hang Snatch'                 WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Arraché à la hanche'            AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Épaulé à la hanche',             'Hang Clean'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Épaulé à la hanche'             AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Push press',                     'Push Press'                  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Push press'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Push jerk',                      'Push Jerk'                   WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Push jerk'                     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Squat en dessus de la tête',     'Overhead Squat'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat en dessus de la tête'     AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Arraché haltère',                'Dumbbell Snatch'             WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Arraché haltère'                AND coach_id IS NULL);
  INSERT INTO exercises (name, alias_en) SELECT 'Épaulé haltère',                 'Dumbbell Clean'              WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Épaulé haltère'                 AND coach_id IS NULL);

  RAISE NOTICE 'Migration exercise_aliases_en terminée avec succès.';
END $$;


-- ============================================================
-- SECTION 4 : Vérification
-- ============================================================

SELECT
  COUNT(*) AS total_exercises,
  COUNT(alias_en) AS with_alias_en,
  COUNT(*) - COUNT(alias_en) AS without_alias_en
FROM exercises
WHERE coach_id IS NULL;

-- Aperçu des 20 premiers
SELECT name, alias_en
FROM exercises
WHERE coach_id IS NULL
ORDER BY name
LIMIT 20;
