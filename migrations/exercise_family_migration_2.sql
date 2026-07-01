-- ============================================================
-- F.Y.T - MIGRATION: exercise_family (complément #2)
-- Date        : 2026-07-01
-- Description : Complète la colonne exercise_family pour les exercices
--               restés NULL après la migration initiale — y compris les
--               exercices propres au coach (coach_id NON NULL), que la
--               première passe (limitée à coach_id IS NULL) n'avait pas
--               touchés.
--
--               Ajoute deux nouvelles familles : sprint et agility, utiles
--               pour un suivi prépa physique (regroupement des sprints /
--               changements de direction dans le carrousel d'historique).
--
--               On n'assigne une famille QUE lorsque le regroupement est
--               pertinent. Les mouvements réellement isolés (conditioning,
--               mobilité, étirements) restent volontairement NULL.
--
-- Idempotence : chaque UPDATE est borné par `exercise_family IS NULL`, donc
--               sûr à rejouer et sans effet sur les lignes déjà mappées.
-- Aucune donnée existante supprimée.
-- ============================================================

-- ============================================================
-- SECTION 1 : Rattachement à des familles EXISTANTES
-- ============================================================

-- ── JAMBES - Squat ───────────────────────────────────────────
UPDATE exercises SET exercise_family = 'squat'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  '1/2 Squat lourd 1'
);

-- ── JAMBES - Fente ───────────────────────────────────────────
UPDATE exercises SET exercise_family = 'lunge'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Bulgarian split squat sauté'
);

-- ── JAMBES - Soulevé de terre ────────────────────────────────
UPDATE exercises SET exercise_family = 'deadlift'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Soulevé de terre roumain'
);

-- ── ÉPAULES - Développé overhead ─────────────────────────────
UPDATE exercises SET exercise_family = 'overhead_press'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Développé militaire',
  'Push press'
);

-- ── TRICEPS - Extension ──────────────────────────────────────
UPDATE exercises SET exercise_family = 'tricep_extension'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Extension triceps poulie'
);

-- ── DOS - Rowing horizontal ──────────────────────────────────
UPDATE exercises SET exercise_family = 'row'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Rowing haltère'
);

-- ── DOS - Tirage vertical ────────────────────────────────────
UPDATE exercises SET exercise_family = 'vertical_pull'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Tirage vertical poulie'
);

-- ── CORE - Anti-rotation ─────────────────────────────────────
UPDATE exercises SET exercise_family = 'anti_rotation'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Planche bras / jambe opposé'
);

-- ── SAUTS / PLIOMÉTRIE ───────────────────────────────────────
UPDATE exercises SET exercise_family = 'jump'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Box jump',
  'Broadjump',
  'Broad Jump X2 + SL Broad Jump + Broad Jump',
  'BroadJump + Saut vertical X 4',
  'Drop broadjump',
  'Contre mouvement jump sans les mains',
  'Pogo jumps',
  'Skater Jump',
  'Skater jumps',
  'Squat sauté'
);


-- ============================================================
-- SECTION 2 : Nouvelles familles (sprint, agility)
-- ============================================================

-- ── SPRINT / COURSE ──────────────────────────────────────────
UPDATE exercises SET exercise_family = 'sprint'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'Sprint 10m',
  'Sprint 40m - 50m - 40m - 50m',
  'Fractionné'
);

-- ── AGILITÉ / CHANGEMENT DE DIRECTION ────────────────────────
UPDATE exercises SET exercise_family = 'agility'
WHERE exercise_family IS NULL AND deleted_at IS NULL AND name IN (
  'COD en Z',
  'Shuttle'
);


-- ============================================================
-- SECTION 3 : Vérification
-- ============================================================

SELECT
  COUNT(*) AS total,
  COUNT(exercise_family) AS with_family,
  COUNT(*) - COUNT(exercise_family) AS without_family
FROM exercises
WHERE deleted_at IS NULL;

-- Exercices laissés volontairement sans famille (isolés / mobilité / conditioning)
SELECT name, (coach_id IS NULL) AS is_global
FROM exercises
WHERE deleted_at IS NULL AND exercise_family IS NULL
ORDER BY is_global DESC, name;
