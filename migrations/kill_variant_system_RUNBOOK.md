# Runbook : Kill the :: Variant System

Design doc : `~/.gstack/projects/tardymartin-sketch-F.Y.T/tardy--design-20260420-100357.md`
Review : APPROVED WITH AMENDMENTS (/plan-eng-review 2026-04-20)

---

## Checklist obligatoire avant de commencer

- [ ] Code fixes déployés en production (ce commit)
- [ ] Backup Supabase créé : dashboard → Settings → Backups → "Create backup"
      OU pg_dump local : `pg_dump --table=exercises --table=training_plans --table=exercise_usage --table=session_logs <CONN> > backup_pre_migration.sql`
- [ ] Tu travailles sur une copie Supabase (branch ou instance locale) en premier
- [ ] Session SQL ouverte — ne pas la fermer pendant toute la migration

---

## Fichiers

| Fichier | Contenu | Risque |
|---------|---------|--------|
| `step1_audit.sql` | 7 queries lecture seule | Aucun |
| `step2_ensure_canonicals.sql` | INSERT canoniques manquants | Faible |
| `step3_migrate.sql` | Transaction : steps 3+4+5+5.5 | Moyen — rollback auto si erreur |
| `step4_delete.sql` | DELETE variantes | **Point de non-retour** |

---

## Mode opératoire

### Étape 0 — Backup
Dashboard Supabase → Settings → Database → Backups → "Create a new backup".
Ne pas continuer sans confirmation.

### Étape 1 — Audit (step1_audit.sql)
Exécuter entièrement. Noter :
- **1a** : N variantes = ___
- **1b** : M références training_plans = ___
- **1c** : K lignes exercise_usage = ___
- **1d** : L session_logs avec :: = ___ → si 0, commenter le bloc UPDATE dans step3
- **1e** : noms canoniques manquants → si vide, sauter step2
- **1f** : colonnes NOT NULL → vérifier que step2 les couvre toutes
- **1g** : colonnes tempo/coach_instructions/video_url → si manquantes, adapter step3

### Étape 2 — Canoniques manquants (step2_ensure_canonicals.sql)
Seulement si 1e retourne des lignes. Vérification finale doit retourner **0**.

### Étape 3 — Migration principale (step3_migrate.sql)
Une seule exécution du fichier. BEGIN en ligne 1, COMMIT en dernière ligne.
Avant de laisser le COMMIT s'exécuter, vérifier que les 3 counts intercalés = **0**.
Si un count est non nul → fermer la session → rollback automatique.

### Étape 4 — Suppression (step4_delete.sql)
Seulement si étape 3 COMMIT avec tous les counts à 0.
Critères de succès en bas du fichier : tous doivent retourner **0**.

### Vérification UI
1. ExercisePicker athlète → plus de mur de squats, aucun "::"
2. Bibliothèque coach → dupliquer un exercice → "Squat 2" (pas "Squat :: copie")
3. Importer une session avec exercice inconnu → bouton "Créer l'exercice", nom canonique

---

## Rollback

| Situation | Récupération |
|-----------|-------------|
| Erreur pendant step3 avant COMMIT | Automatique — PostgreSQL rollback |
| step3 committé, step4 pas encore lancé | Lignes variantes toujours en base — restaurer training_plans/exercise_usage depuis backup si besoin |
| step4 exécuté, résultat incorrect | Restaurer depuis le pg_dump backup (seule option) |

---

## Après migration : Step 7 dead code (PR séparée)

- `types.ts` : supprimer VARIANT_NAME_SEPARATOR, DEFAULT_VARIANT_NAME, parseExerciseName, buildExerciseName, getExerciseVariantDisplayName, ExerciseVariant, areExerciseVariants
- `supabaseService.ts` : supprimer fetchExerciseVariants
- `SessionsList.tsx` : supprimer getExerciseVariants, getExerciseVariantDisplayName, usages parseExerciseName
- `ExerciseSelectionModal.tsx` : remplacer grouping par flat filter
- `ExerciseDetail.tsx` : supprimer onglets variantes, variantNameInput, handleStartEditVariantName
- `ExercisesList.tsx` : supprimer normalizeExerciseName, grouping par baseName
