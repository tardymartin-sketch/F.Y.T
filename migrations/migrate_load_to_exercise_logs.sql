-- ============================================================
-- F.Y.T - MIGRATION: Ajouter 'load' dans exercise_logs.sets_detail
-- ============================================================
-- Ce script migre les données de session_logs.exercises vers exercise_logs.sets_detail
-- en préservant le champ 'load' (type d'équipement: single, double, barbell, machine)
-- ============================================================

-- ============================================================
-- SECTION 1: DIAGNOSTIC - État actuel des données
-- ============================================================

-- 1.1 Compter les exercise_logs avec/sans load dans sets_detail
SELECT
  'Avec load' as status,
  COUNT(*) as count
FROM exercise_logs
WHERE sets_detail IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(sets_detail) s
    WHERE s->'load' IS NOT NULL AND s->'load' != 'null'::jsonb
  )
UNION ALL
SELECT
  'Sans load' as status,
  COUNT(*) as count
FROM exercise_logs
WHERE sets_detail IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(sets_detail) s
    WHERE s->'load' IS NOT NULL AND s->'load' != 'null'::jsonb
  );

-- 1.2 Échantillon de session_logs avec le format 'load' dans exercises
SELECT
  id,
  date,
  jsonb_array_length(exercises) as nb_exercises,
  exercises->0->'sets'->0->'load' as first_set_load_sample
FROM session_logs
WHERE exercises IS NOT NULL
  AND jsonb_array_length(exercises) > 0
ORDER BY date DESC
LIMIT 10;


-- ============================================================
-- SECTION 2: FONCTION DE MIGRATION
-- ============================================================

-- Fonction pour reconstruire sets_detail avec load depuis session_logs
CREATE OR REPLACE FUNCTION migrate_load_to_sets_detail(
  p_session_log_id UUID,
  p_exercise_name TEXT,
  p_current_sets_detail JSONB
) RETURNS JSONB AS $$
DECLARE
  v_session_exercises JSONB;
  v_exercise JSONB;
  v_original_sets JSONB;
  v_new_sets_detail JSONB := '[]'::jsonb;
  v_set JSONB;
  v_original_set JSONB;
  v_load JSONB;
  v_weight_str TEXT;
  v_weight_num NUMERIC;
  i INT;
BEGIN
  -- Récupérer les exercises depuis session_logs
  SELECT exercises INTO v_session_exercises
  FROM session_logs
  WHERE id = p_session_log_id;

  IF v_session_exercises IS NULL THEN
    RETURN p_current_sets_detail;
  END IF;

  -- Trouver l'exercice correspondant par nom
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_session_exercises)
  LOOP
    IF v_exercise->>'exerciseName' = p_exercise_name THEN
      v_original_sets := v_exercise->'sets';
      EXIT;
    END IF;
  END LOOP;

  IF v_original_sets IS NULL THEN
    RETURN p_current_sets_detail;
  END IF;

  -- Reconstruire sets_detail avec load
  FOR i IN 0..jsonb_array_length(p_current_sets_detail) - 1
  LOOP
    v_set := p_current_sets_detail->i;

    -- Chercher le set original correspondant (par setNumber ou index)
    v_original_set := v_original_sets->i;

    -- Si pas trouvé par index, chercher par setNumber
    IF v_original_set IS NULL THEN
      FOR v_original_set IN SELECT * FROM jsonb_array_elements(v_original_sets)
      LOOP
        IF (v_original_set->>'setNumber')::int = (v_set->>'setNumber')::int THEN
          EXIT;
        END IF;
      END LOOP;
    END IF;

    -- Extraire le load ou en créer un par défaut
    IF v_original_set IS NOT NULL AND v_original_set->'load' IS NOT NULL AND v_original_set->'load' != 'null'::jsonb THEN
      -- Utiliser le load existant depuis session_logs
      v_load := v_original_set->'load';
    ELSE
      -- Créer un load par défaut basé sur le weight
      v_weight_str := COALESCE(v_set->>'weight', '');

      -- Parser le poids
      IF v_weight_str = '' OR v_weight_str = '0' THEN
        -- Bodyweight: pas de poids
        v_load := jsonb_build_object(
          'type', 'single',
          'unit', 'kg',
          'weightKg', NULL
        );
      ELSE
        -- Essayer de parser comme nombre
        BEGIN
          v_weight_num := REPLACE(v_weight_str, ',', '.')::numeric;
          v_load := jsonb_build_object(
            'type', 'single',
            'unit', 'kg',
            'weightKg', v_weight_num
          );
        EXCEPTION WHEN OTHERS THEN
          -- Valeur non numérique (texte comme "Negative")
          v_load := jsonb_build_object(
            'type', 'single',
            'unit', 'kg',
            'weightKg', NULL
          );
        END;
      END IF;
    END IF;

    -- Ajouter le load au set
    v_set := v_set || jsonb_build_object('load', v_load);

    -- Ajouter à la nouvelle liste
    v_new_sets_detail := v_new_sets_detail || v_set;
  END LOOP;

  RETURN v_new_sets_detail;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SECTION 3: MIGRATION DES DONNÉES
-- ============================================================

-- 3.1 Mise à jour de exercise_logs.sets_detail avec load depuis session_logs
UPDATE exercise_logs el
SET sets_detail = migrate_load_to_sets_detail(
  el.session_log_id,
  el.exercise_name,
  el.sets_detail
)
WHERE el.sets_detail IS NOT NULL
  AND jsonb_array_length(el.sets_detail) > 0;

-- 3.2 Vérification après migration
SELECT
  'Avec load après migration' as status,
  COUNT(*) as count
FROM exercise_logs
WHERE sets_detail IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(sets_detail) s
    WHERE s->'load' IS NOT NULL AND s->'load' != 'null'::jsonb
  );


-- ============================================================
-- SECTION 4: VÉRIFICATION DÉTAILLÉE
-- ============================================================

-- 4.1 Échantillon de sets_detail après migration
SELECT
  el.exercise_name,
  el.date,
  el.sets_detail->0 as first_set_sample
FROM exercise_logs el
WHERE el.sets_detail IS NOT NULL
  AND jsonb_array_length(el.sets_detail) > 0
ORDER BY el.date DESC
LIMIT 10;

-- 4.2 Distribution des types de load
SELECT
  s->>'type' as load_type,
  COUNT(*) as count
FROM exercise_logs el,
     jsonb_array_elements(el.sets_detail) s
WHERE s->'load' IS NOT NULL
GROUP BY s->'load'->>'type'
ORDER BY count DESC;

-- 4.3 Vérifier les sessions qui avaient déjà load dans session_logs
SELECT
  el.exercise_name,
  el.date,
  sl.exercises->0->'sets'->0->'load' as original_load,
  el.sets_detail->0->'load' as migrated_load
FROM exercise_logs el
JOIN session_logs sl ON sl.id = el.session_log_id
WHERE sl.exercises IS NOT NULL
  AND sl.exercises->0->'sets'->0->'load' IS NOT NULL
ORDER BY el.date DESC
LIMIT 5;


-- ============================================================
-- SECTION 5: NETTOYAGE (optionnel)
-- ============================================================

-- Supprimer la fonction de migration après usage
-- DROP FUNCTION IF EXISTS migrate_load_to_sets_detail(UUID, TEXT, JSONB);


-- ============================================================
-- SECTION 6: ROLLBACK (si nécessaire)
-- ============================================================
-- Pour annuler la migration, on peut supprimer le champ 'load' de sets_detail:
/*
UPDATE exercise_logs
SET sets_detail = (
  SELECT jsonb_agg(s - 'load')
  FROM jsonb_array_elements(sets_detail) s
)
WHERE sets_detail IS NOT NULL;
*/
