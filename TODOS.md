# TODOs — Feature "Mon programme"

> Issus du plan-eng-review du 2026-06-04. Ces items ne bloquent pas le lancement mais améliorent l'expérience une fois la feature de base livrée.

---

## 1. Semaines relatives

**Quoi** : Afficher "Semaine 3/12" plutôt que "Sem du 6 jan" dans la vue programme de l'athlète.

**Pourquoi** : Le repère temporel absolu est peu lisible dans le contexte d'un programme structuré. L'athlète veut savoir où il en est dans sa progression, pas quelle date c'est.

**Comment** : Ajouter un champ `start_date` par assignation, soit directement dans `training_plans`, soit via une nouvelle table `program_assignments`. Le numéro de semaine se calcule alors en `(today - start_date) / 7 + 1`.

**Dépendances** : Migration DB, mise à jour des requêtes de lecture du programme.

**Effort** : ~1 jour humain / ~15 min CC

---

## 2. Suivi de progression

**Quoi** : Checkbox "fait" par séance, badge de complétion par semaine, barre de progression globale du programme.

**Pourquoi** : Sans feedback visuel de complétion, l'athlète ne sait pas ce qu'il a réellement fait. C'est le principal levier de motivation et de rétention de la feature.

**Comment** :
- Relier `session_logs.created_from_template_id` aux `session_templates` pour savoir quelle séance planifiée a été réalisée.
- Étendre la signature `onStartNewSession(exercises, templateId?)` pour propager l'identifiant du template au moment du démarrage.
- Vérifier que `workoutToExerciseLogs.ts` renseigne correctement `source_template_id` en base.

**Dépendances** :
- `source_template_id` doit être correctement persisté en DB (prérequis bloquant).
- `workoutToExerciseLogs.ts`
- Signature de `onStartNewSession`

**Effort** : ~2 jours humains / ~30 min CC

---

## 3. Assignation coach mobile

**Quoi** : Permettre au coach de créer et d'assigner un programme directement depuis l'app mobile.

**Pourquoi** : Aujourd'hui le coach doit passer par le desktop. Bloquer l'assignation sur une seule plateforme freine l'adoption, notamment pour les coachs terrain.

**Comment** : Porter `ProgramsList.tsx` (desktop, ~1 666 lignes) en version mobile simplifiée. L'objectif n'est pas la parité fonctionnelle complète mais couvrir le flux minimal : sélectionner un programme, choisir un athlète, valider l'assignation.

**Dépendances** : La feature "Mon programme" côté athlète doit être stable avant d'attaquer ce chantier. L'API d'assignation doit exposer un endpoint mobile-friendly.

**Effort** : ~3–5 jours humains / ~1 h CC
