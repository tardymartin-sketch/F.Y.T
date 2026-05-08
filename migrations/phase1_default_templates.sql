-- ============================================================
-- MIGRATION: Phase 1 — Default Templates
-- Date: 2026-04-18
-- Creates the default_templates table and seeds 10 templates.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- PART 1: Create default_templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS default_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  emoji        VARCHAR(10)  NOT NULL DEFAULT '🏋️',
  category     VARCHAR(50)  NOT NULL DEFAULT 'general',
  exercises    JSONB        NOT NULL DEFAULT '[]',
  pinned       BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order   INT          NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Read-only for all authenticated users; no user can write
ALTER TABLE default_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "default_templates_read" ON default_templates;
CREATE POLICY "default_templates_read" ON default_templates
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- PART 2: Seed 10 default templates
-- Clear first for idempotency
-- ============================================================

TRUNCATE TABLE default_templates;

-- ─── 1. Push ────────────────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Push — Pec / Épaules / Triceps',
  'Programme PPL classique. Axé sur les mouvements de poussée horizontaux et verticaux.',
  '💪',
  'push',
  1,
  '[
    {"exerciseName":"Développé couché","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false},{"setNumber":4,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Développé incliné haltères","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Développé militaire","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Dips","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Élévations latérales","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Extension triceps poulie","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 2. Pull ────────────────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Pull — Dos / Biceps',
  'Programme PPL classique. Accent sur les mouvements de tirage vertical et horizontal.',
  '🔙',
  'pull',
  2,
  '[
    {"exerciseName":"Soulevé de terre","sets":[{"setNumber":1,"reps":"5","weight":"","completed":false},{"setNumber":2,"reps":"5","weight":"","completed":false},{"setNumber":3,"reps":"5","weight":"","completed":false},{"setNumber":4,"reps":"5","weight":"","completed":false}]},
    {"exerciseName":"Tractions","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Tirage horizontal barre","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Tirage poulie haute","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Face pulls","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]},
    {"exerciseName":"Curl biceps haltères","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 3. Legs ────────────────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Legs — Quadriceps / Ischio / Fessiers',
  'Programme PPL classique. Squat dominant avec volume quadriceps et ischio-jambiers.',
  '🦵',
  'legs',
  3,
  '[
    {"exerciseName":"Squat","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false},{"setNumber":4,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Presse à jambes","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Fentes bulgares","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Leg curl couché","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Leg extension","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Élévations de mollets","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 4. Upper A — Horizontal ────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Upper A — Haut du corps horizontal',
  'Split Upper/Lower. Accent sur les mouvements horizontaux (développé + tirage).',
  '🏋️',
  'upper',
  4,
  '[
    {"exerciseName":"Développé couché","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false},{"setNumber":4,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Tirage horizontal barre","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false},{"setNumber":4,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Développé incliné haltères","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Rowing haltère unilatéral","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Curl marteau","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Extension triceps au-dessus tête","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 5. Upper B — Vertical ──────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Upper B — Haut du corps vertical',
  'Split Upper/Lower. Accent sur les mouvements verticaux (tractions + overhead press).',
  '⬆️',
  'upper',
  5,
  '[
    {"exerciseName":"Tractions","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false},{"setNumber":4,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Développé militaire","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false},{"setNumber":4,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Tirage poitrine poulie","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Développé haltères assis","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Face pulls","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]},
    {"exerciseName":"Dips","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 6. Lower — Hip Hinge ───────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Lower — Bas du corps hip hinge',
  'Split Upper/Lower. Accent fessiers et ischio-jambiers (soulevé de terre + hip thrust).',
  '🍑',
  'lower',
  6,
  '[
    {"exerciseName":"Soulevé de terre roumain","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false},{"setNumber":3,"reps":"6","weight":"","completed":false},{"setNumber":4,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Hip thrust","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Fentes inverses","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Leg curl assis","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Hyperextensions","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Élévations de mollets","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 7. Full Body ────────────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Full Body',
  'Séance corps entier. Basé sur les programmes GZCLP et Jeff Nippard Fundamentals. Idéal 3x/semaine.',
  '🌐',
  'fullbody',
  7,
  '[
    {"exerciseName":"Squat","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Développé couché","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Tirage horizontal barre","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false},{"setNumber":3,"reps":"8","weight":"","completed":false}]},
    {"exerciseName":"Soulevé de terre","sets":[{"setNumber":1,"reps":"6","weight":"","completed":false},{"setNumber":2,"reps":"6","weight":"","completed":false}]},
    {"exerciseName":"Développé militaire","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Tractions","sets":[{"setNumber":1,"reps":"8","weight":"","completed":false},{"setNumber":2,"reps":"8","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 8. Core & Gainage ──────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Core & Gainage',
  'Stabilité et gainage. Basé sur les protocoles NASM. Antirotation, force abdominale profonde.',
  '🧘',
  'core',
  8,
  '[
    {"exerciseName":"Planche avant","sets":[{"setNumber":1,"reps":"45s","weight":"","completed":false},{"setNumber":2,"reps":"45s","weight":"","completed":false},{"setNumber":3,"reps":"45s","weight":"","completed":false}]},
    {"exerciseName":"Dead bug","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Pallof press","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Rollout (roue abdominale)","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Pont fessier","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]},
    {"exerciseName":"Mountain climbers","sets":[{"setNumber":1,"reps":"30s","weight":"","completed":false},{"setNumber":2,"reps":"30s","weight":"","completed":false},{"setNumber":3,"reps":"30s","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 9. HIIT & Conditionnement ──────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'HIIT & Conditionnement',
  'Protocole 40s effort / 20s repos. 3-4 rounds. Cardio-vasculaire et explosivité.',
  '⚡',
  'hiit',
  9,
  '[
    {"exerciseName":"Burpees","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]},
    {"exerciseName":"Sauts squat","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]},
    {"exerciseName":"Pompes explosives","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]},
    {"exerciseName":"Fentes sautées","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]},
    {"exerciseName":"Mountain climbers","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]},
    {"exerciseName":"Sprint sur place","sets":[{"setNumber":1,"reps":"40s","weight":"","completed":false},{"setNumber":2,"reps":"40s","weight":"","completed":false},{"setNumber":3,"reps":"40s","weight":"","completed":false}]}
  ]'::jsonb
);

-- ─── 10. Épaules & Bras ─────────────────────────────────────

INSERT INTO default_templates (name, description, emoji, category, sort_order, exercises) VALUES (
  'Épaules & Bras',
  'Séance accessoires. Complémentaire à un programme PPL 5j. Isolation épaules + bras.',
  '🎯',
  'accessories',
  10,
  '[
    {"exerciseName":"Développé militaire haltères","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Élévations latérales","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false},{"setNumber":4,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Oiseau (élévations dorsales)","sets":[{"setNumber":1,"reps":"15","weight":"","completed":false},{"setNumber":2,"reps":"15","weight":"","completed":false},{"setNumber":3,"reps":"15","weight":"","completed":false}]},
    {"exerciseName":"Curl biceps barre EZ","sets":[{"setNumber":1,"reps":"10","weight":"","completed":false},{"setNumber":2,"reps":"10","weight":"","completed":false},{"setNumber":3,"reps":"10","weight":"","completed":false}]},
    {"exerciseName":"Curl incliné haltères","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]},
    {"exerciseName":"Pushdown triceps","sets":[{"setNumber":1,"reps":"12","weight":"","completed":false},{"setNumber":2,"reps":"12","weight":"","completed":false},{"setNumber":3,"reps":"12","weight":"","completed":false}]}
  ]'::jsonb
);

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
  template_count INT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM default_templates;

  IF template_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 default templates, found %', template_count;
  END IF;

  RAISE NOTICE 'default_templates migration complete: % templates inserted.', template_count;
END $$;
