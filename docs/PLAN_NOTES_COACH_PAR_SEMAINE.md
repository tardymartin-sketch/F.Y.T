# Plan — Notes du coach par semaine (découplage du template)

Branche : `feat/coach-notes-per-week`
Décision produit (validée) : **notes 100% décorrélées du template**. Le template ne sert que de point de départ ; à l'assignation, ses notes sont copiées dans la semaine, puis chaque semaine est indépendante.

## Décisions verrouillées (revue archi)

| # | Décision | Choix |
|---|----------|-------|
| D1 | Surface d'édition coach par semaine | **Bypass pour l'instant.** Pas d'UI. Le coach insère les notes directement en DB (via Claude). Le code doit **documenter** où/comment brancher l'édition plus tard (marqueurs `// TODO(coach-edit)`) + comment insérer une note à la main. |
| D2 | Stockage | **Lignes bloc-texte dans `training_plans`** (`is_text_block` + `text_block_content`). Consolidation, pas de nouvelle table, per-semaine par construction. Respecte le learning maison `fyt-programs-live-in-training-plans`. |
| D3 | Format du contenu | **HTML** (révisé : tout le stack rich-text existant est HTML — `RichTextDisplay`, `LexicalEditor` I/O). Réutilise `RichTextDisplay`. Hand-writable. |
| D4 | Ancien chemin template-keyé | **Remplacer proprement + migrer.** Rendu depuis les lignes per-semaine ; migration défensive des 6 `session_text_blocks` existants vers les semaines concernées ; retrait de `getSessionTextBlocks`/`TextBlockBanner`. Table `session_text_blocks` conservée (pas de DROP), plus lue. |
| D5 | XSS `RichTextDisplay` | **Sanitiser maintenant** (DOMPurify) au seul point de rendu HTML → corrige le risque partout (DRY). |
| Lock-A | Colonne contenu | Nouvelle colonne `text_block_content` (explicite > réutiliser `Notes/Consignes`). |
| Lock-B | Multi-athlètes | Les notes d'une séance-semaine sont **partagées** par les athlètes ciblés (héritées via `athlete_target` sur les lignes). |

---

## 1. Contexte & cause racine

Notes du coach actuelles = `session_text_blocks`, keyée **uniquement** par `session_template_id` (`migrations/session_text_blocks_migration.sql`). Lecture : `programsApi.getSessionTextBlocks(templateId)` (`src/services/api/programs.api.ts:51`). Affichage : `TextBlockBanner` (`ActiveSessionMobile.tsx:679`) via `currentTemplateId = session.sourceTemplateId`. → toutes les semaines réutilisant un template partagent la même note. DB prod : **4 templates réutilisés multi-semaines**.

Surprises confirmées :
1. **Aucun write path** pour `session_text_blocks` (le coach authoring n'est pas branché ; les 6 lignes sont du seed/legacy).
2. `training_plans` n'a pas de colonne bloc-texte (`is_text_block` absent en DB) ; `WorkoutRow.isTextBlock` existe en type mais n'est jamais peuplé.
3. Le coach n'édite pas une séance-semaine : il assigne des templates avec une plage de dates (`createProgram`). **Aucune surface d'édition par semaine** → bypass (D1).

Identité d'une séance-de-programme (`groupByProgram`, `programUtils.ts:14`) : **(`program_name`, `week_start_date`, `seance_type`)**, porte `source_template_id`.

---

## 2. Modèle de données cible + flux

```
COACH (authoring template, existant)      ASSIGNATION                 ATHLÈTE (active session)
session_templates                         createProgram()             getAthleteProgramSessions()
  └ session_template_exercises  ──copy──> training_plans rows  ──────> session.rows : WorkoutRow[]
      items isTextBlock (HTML)              is_text_block=true            │
                                           text_block_content (HTML)     ├─ exercices (!isTextBlock) → logs
                                           par (program,week,seance)     └─ blocs-texte (isTextBlock)
                                                                              └→ RichTextDisplay(HTML sanitisé)

Per-semaine par construction :  semaine1.rows  ≠  semaine2.rows   (week_start_date différent)
même template source → notes copiées une fois, puis éditables indépendamment par semaine.
```

### Migration `training_plans` (additive, non destructive)
- `is_text_block BOOLEAN NOT NULL DEFAULT false`
- `text_block_content TEXT` (nullable) — HTML
- Lignes bloc-texte : `is_text_block=true`, `text_block_content=<html>`, `order_index`=position, colonnes exercice NULL/placeholder, héritent `program_name`/`week_start_date`/`seance_type`/`source_template_id`/`athlete_target`.
- Vérifier/garantir l'index GIN sur `athlete_target` (learning `fyt-athlete-program-query-needs-gin-index`).

---

## 3. Changements code (fichier par fichier)

1. **Migration** `migrations/training_plans_text_blocks.sql` — 2 colonnes + `CREATE INDEX IF NOT EXISTS idx_training_plans_athlete_target_gin` (garantie).
2. **`types.ts`** — `TrainingPlanRow` : `is_text_block`, `text_block_content`. `WorkoutRow` : `textBlockContent?: string`. `mapTrainingPlanToWorkout` : peupler `isTextBlock` + `textBlockContent`.
3. **`createProgram`** (`supabaseService.ts:3773`) : émettre les lignes bloc-texte (`is_text_block=true`, `text_block_content`) à partir des items `isTextBlock` du template, ordre préservé. **Vérifier** que le mapping template→`SessionExercise` conserve `isTextBlock`+contenu.
4. **`programs.api.ts`** : `getAthleteProgramSessions` — s'assurer que les lignes bloc-texte passent (non filtrées) et portent `textBlockContent`. Retirer `getSessionTextBlocks`.
5. **`ActiveSessionMobile.tsx`** : retirer `TextBlockBanner(templateId)` ; rendre les blocs-texte **depuis `session.rows`** (à leur position) via `RichTextDisplay`. Idem `ActiveSessionDesktop`.
6. **`RichTextDisplay.tsx`** : **sanitiser** avec DOMPurify (D5).
7. **`ProgramSessionCard.tsx`** : afficher un indicateur/preview de bloc-texte (aujourd'hui filtrés à `!isTextBlock`).
8. **`// TODO(coach-edit)`** (D1) : marqueurs dans `createProgram` + `ActiveSessionMobile` rendu, documentant (a) qu'une UI d'édition par semaine reste à faire, (b) comment insérer une note à la main en DB : `INSERT INTO training_plans (is_text_block, text_block_content, program_name, week_start_date, seance_type, source_template_id, athlete_target, order_index, coach_id, year) VALUES (true, '<html>', …)`.

---

## 4. Migration des données existantes (D4)
- Copier les 6 `session_text_blocks` → lignes `training_plans` bloc-texte des semaines où chaque template est utilisé (jointure `source_template_id`). Copie défensive, non destructive.
- Conserver `session_text_blocks` (pas de DROP), plus lue après bascule.

---

## 5. Couverture de tests

```
CODE PATHS                                              USER FLOWS
[+] types.ts mapTrainingPlanToWorkout                   [+] Athlète lance séance-semaine
  ├─ [GAP] is_text_block=true → isTextBlock+content       ├─ [GAP] note semaine 1 ≠ note semaine 2 (CŒUR)
  └─ [GAP] is_text_block=false → exercice inchangé        ├─ [GAP] séance sans note → rien d'affiché
[+] supabaseService.createProgram                        └─ [GAP] note HTML riche rendue correctement
  ├─ [GAP] émet lignes bloc-texte (ordre, contenu)     [+] Sécurité
  └─ [GAP] template sans bloc-texte → 0 ligne extra      ├─ [GAP] <script> dans note → strippé (DOMPurify)
[+] RichTextDisplay (sanitize)                            └─ [GAP] HTML sûr (gras/listes) → préservé
  ├─ [GAP] script/onerror retirés
  └─ [GAP] markup légitime conservé
[+] workoutRowsToExerciseLogs (existant)                REGRESSION (CRITIQUE)
  └─ [★★ TESTED] filtre !isTextBlock                     └─ [GAP] 2 semaines même template → notes indépendantes

COVERAGE cible : 100% des nouveaux paths. Tests unitaires Vitest + 1 régression cœur.
```

Tests à écrire (Vitest, style `src/utils/*.test.ts`) :
- `mapTrainingPlanToWorkout` : `is_text_block` true/false → `isTextBlock` + `textBlockContent`.
- `createProgram` : émet les lignes bloc-texte (ordre `order_index`, contenu), et 0 si template sans bloc-texte.
- `RichTextDisplay` : DOMPurify strippe `<script>`/`onerror`, préserve `<p>/<ul>/<strong>`.
- **Régression cœur** : deux séances (même `source_template_id`, `week_start_date` différents) → contenus de note indépendants.

---

## 6. NOT in scope (différé, avec raison)
- **UI d'édition coach par semaine** (D1) — bypass ; insertion manuelle DB pour l'instant. Marqueurs `// TODO(coach-edit)` posés.
- **Éditeur Lexical read-only / Lexical JSON** — abandonné (D3 révisé : stack HTML). À reconsidérer si migration globale vers Lexical JSON.
- **Blocs Excalidraw / schémas** (FEATURE_RICH_TEXT_PLAN) — hors périmètre.
- **DROP de `session_text_blocks`** — conservée, juste plus lue.

## 7. What already exists (réutilisé)
- `WorkoutRow.isTextBlock` + filtrage (`ProgramSessionCard`, `ActiveSessionMobile`, `workoutToExerciseLogs`) — branché enfin en DB.
- `RichTextDisplay` (HTML) — réutilisé pour le rendu (après sanitisation).
- `createProgram` — copie déjà le contenu template per-semaine ; on étend pour les blocs-texte.
- Learning `fyt-programs-live-in-training-plans` (conf 9) + `fyt-exercise-variants-redundant` (conf 7, consolidation) — précédent direct.

## 8. Failure modes
| Codepath | Échec réaliste | Test ? | Error handling ? | Visible ? |
|----------|----------------|--------|------------------|-----------|
| `mapTrainingPlanToWorkout` | `text_block_content` NULL sur ligne is_text_block | oui | rendu : note vide → n'affiche rien | silencieux (ok) |
| `RichTextDisplay` | HTML malveillant | oui (D5) | DOMPurify | sécurisé |
| `createProgram` | template item isTextBlock sans contenu | oui | skip / ligne vide | silencieux (ok) |
| Rendu active session | contenu HTML cassé | partiel | DOMPurify tolère | dégradé, pas crash |

Aucun **critical gap** (pas de path silencieux + sans test + sans handling) après D5.

## 9. Parallélisation
Implémentation surtout séquentielle (migration → mapping → createProgram → rendu se chaînent). Lane parallèle possible : `RichTextDisplay` sanitisation (D5) indépendante du reste. Sinon séquentiel.

## 10. Implementation Tasks
- [ ] **T1 (P1)** — DB/migration — `migrations/training_plans_text_blocks.sql` : `is_text_block`, `text_block_content`, index GIN. Verify: `\d training_plans`.
- [ ] **T2 (P1)** — types — `TrainingPlanRow` + `WorkoutRow.textBlockContent` + `mapTrainingPlanToWorkout`. Verify: test unitaire mapping.
- [ ] **T3 (P1)** — services — `createProgram` émet lignes bloc-texte ; retirer `getSessionTextBlocks`. Verify: test createProgram.
- [ ] **T4 (P1)** — sécurité — sanitiser `RichTextDisplay` (DOMPurify). Verify: test XSS.
- [ ] **T5 (P1)** — UI athlète — rendu blocs-texte depuis `session.rows` ; retirer `TextBlockBanner` (mobile + desktop). Verify: visuel + test rendu.
- [ ] **T6 (P2)** — UI programme — preview bloc-texte dans `ProgramSessionCard`.
- [ ] **T7 (P1)** — data — migration défensive des 6 `session_text_blocks` → training_plans per-semaine.
- [ ] **T8 (P1)** — régression — test 2 semaines même template → notes indépendantes.
- [ ] **T9 (P2)** — doc code — marqueurs `// TODO(coach-edit)` + recette d'INSERT manuel.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | non lancé (décision produit déjà prise) |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | non lancé |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 5 décisions verrouillées (D1–D5) + 2 locks ; 1 finding sécurité (XSS) à corriger ; 0 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | n/a (pas de nouvelle UI cette phase) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | non lancé |

- **UNRESOLVED:** 0
- **VERDICT:** ENG CLEARED — prêt à implémenter. Pas de nouvelle UI cette phase (design review n/a). Outside voice non lancé (plan bien cadré, décisions verrouillées avec l'utilisateur).
