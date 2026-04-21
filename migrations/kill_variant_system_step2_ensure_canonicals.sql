-- ===========================================
-- Kill Variant System — Étape 2 : Créer les exercices canoniques manquants
-- Prérequis : étape 1 exécutée — ne lancer que si 1e retourne des lignes
-- Si 1e = 0 lignes → sauter directement à l'étape 3
-- ===========================================

-- Insère une ligne canonique pour chaque base_name manquant,
-- en copiant les attributs de la variante la plus ancienne (id ASC).
-- IMPORTANT : vérifier la query 1f et ajouter toute colonne NOT NULL manquante.

INSERT INTO exercises (
  name,
  muscle_group,
  limb_type,
  primary_muscle_group_id,
  movement_pattern_id,
  category_id,
  coach_id
)
SELECT DISTINCT ON (split_part(name, ' :: ', 1))
  split_part(name, ' :: ', 1) AS name,
  muscle_group,
  limb_type,
  primary_muscle_group_id,
  movement_pattern_id,
  category_id,
  coach_id
FROM exercises
WHERE name LIKE '% :: %'
  AND NOT EXISTS (
    SELECT 1 FROM exercises e2
    WHERE e2.name = split_part(exercises.name, ' :: ', 1)
      AND e2.name NOT LIKE '% :: %'
  )
ORDER BY split_part(name, ' :: ', 1), id ASC;

-- Vérification : doit retourner 0 avant de continuer
SELECT COUNT(*) AS canoniques_manquants_restants
FROM exercises
WHERE name LIKE '% :: %'
  AND NOT EXISTS (
    SELECT 1 FROM exercises e2
    WHERE e2.name = split_part(exercises.name, ' :: ', 1)
      AND e2.name NOT LIKE '% :: %'
  );
-- Attendu : 0 — sinon ne pas continuer
