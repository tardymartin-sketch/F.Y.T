# Plan QA — Construction collaborative des tests F.Y.T

> **Document de référence pour la session de tests entre Martin et Claude.**
> Le but : créer ensemble des tests qui ont du sens, pas de la couverture artificielle.
> Chaque étape importante demande une validation explicite avant de passer à la suite.

---

## 1. Contexte et objectifs

### Pourquoi ce plan
Les tentatives précédentes de génération automatique de tests par Claude ont échoué.
Cause probable : génération en masse sans compréhension partagée des parcours utilisateurs critiques, sans validation intermédiaire, sans exécution réelle.

### Objectifs de cette session
- **Collaboratif** : Martin valide chaque scénario *avant* l'écriture du code
- **Pédagogique** : Martin doit comprendre ce que chaque test fait et pourquoi
- **Itératif** : un test à la fois, lancé et vérifié, avant de passer au suivant
- **Pragmatique** : on couvre les parcours critiques d'abord, pas la couverture à 100 %

### Hors scope (pour l'instant)
- Tests unitaires (Vitest) → on s'y mettra dans une session ultérieure
- Tests des composants Lexical → trop spécifiques, à isoler plus tard
- Tests Supabase mockés ou réels → après les E2E
- Tests de performance / accessibilité → à la fin si on a le temps

---

## 2. Stack choisie (déjà installée — rien à télécharger)

| Outil | Version | Rôle dans cette session |
|-------|---------|-------------------------|
| **Playwright** | 1.58 | Tests E2E (navigation réelle dans le navigateur) |
| `@playwright/test` | 1.58 | Runner + assertions web-first |
| Chromium / Firefox / WebKit | embarqués | Multi-navigateurs (on commencera par Chromium seul) |

### Pourquoi Playwright pour les E2E
- Auto-attente des éléments (anti-flakiness intégré)
- Sélecteurs accessibles par défaut (`getByRole`, `getByLabel`, `getByText`)
- Mocking réseau natif (`page.route()`) pour Supabase
- Tracing visuel pour debug rapide
- Déjà installé dans le projet

### Règles strictes (déjà documentées dans `playwright_ai_rules.md`)
1. **Jamais** de `waitForTimeout` arbitraire
2. **Jamais** de sélecteur CSS dynamique (`.text-red-500`, `.btn-primary`)
3. **Toujours** des locators user-facing (`getByRole`, `getByLabel`, `getByText`, `getByTestId`)
4. **Toujours** un Page Object Model par page/domaine fonctionnel
5. **Tests indépendants** : chaque test peut tourner seul, dans n'importe quel ordre
6. **Mock des services tiers** (Supabase, Strava, etc.) via `page.route()`

---

## 3. Phases du projet

### PHASE 0 — Préparation (en cours)
- [x] Stash de `demoService.ts` (working tree propre)
- [x] Plan validé par Martin (TU LIS)
- [ ] Suppression de `tests/`, `playwright-report/`, `test-results/`

**Checkpoint Martin** : "OK pour tout supprimer ?" → Claude attend la réponse.

---

### PHASE 1 — Découverte des parcours critiques
**Objectif** : Identifier ENSEMBLE les 4-6 parcours utilisateur les plus critiques.

**Méthode** :
1. Claude propose une liste de parcours basée sur la lecture du code (App.tsx, services, components)
2. Martin valide / supprime / ajoute des parcours
3. On classe par criticité (P0 / P1 / P2)

**Output** : un tableau commenté dans ce fichier (section §6 ci-dessous)

**Checkpoint Martin** : Validation de la liste finale des parcours et de leur priorité.

---

### PHASE 2 — Configuration Playwright
**Objectif** : S'assurer que `playwright.config.ts` est adapté.

Modifications proposées :
- Garder `chromium` seul au début (firefox + webkit seront décommentés à la fin)
- `baseURL: http://localhost:3000` ✅ déjà OK
- Ajouter `testIdAttribute: 'data-testid'` (au cas où on ajoute des `data-testid`)
- Garder `webServer` qui lance `npm run dev`
- Ajouter un dossier `tests/fixtures/` pour les données de test (utilisateurs, mocks Supabase)

**Checkpoint Martin** : Validation de la config avant écriture.

---

### PHASE 3 — Architecture de tests
**Objectif** : Définir la structure de dossiers ENSEMBLE.

Proposition :
```
tests/
├── fixtures/
│   ├── users.ts             # Utilisateurs de test (athlète, coach)
│   └── supabase-mocks.ts    # Réponses Supabase mockées
├── pages/                   # Page Object Models
│   ├── BasePage.ts          # Méthodes communes (goto, wait, etc.)
│   ├── AuthPage.ts
│   ├── AthleteHomePage.ts
│   └── ... (à compléter selon parcours validés)
└── e2e/
    ├── auth.spec.ts         # Tests Auth
    ├── athlete-session.spec.ts
    └── ... (1 fichier par parcours)
```

**Checkpoint Martin** : Validation de la structure.

---

### PHASE 4 — Boucle test-par-test (cœur de la session)

Pour CHAQUE test, on suit ce protocole en 6 étapes :

#### Étape A — Scénario en français
Claude écrit dans ce fichier (§7 Journal de session) :
- **Nom du test** (ex: "L'athlète peut démarrer une session de démo sans compte")
- **Préconditions** (ex: page d'accueil, pas de session active)
- **Actions utilisateur** (ex: 1. Clique "Démo", 2. Attend la page d'accueil athlète)
- **Assertions** (ex: titre "Bienvenue" visible, bouton "Lancer la séance" présent)
- **Mocks nécessaires** (ex: `page.route('**/auth/v1/token**')` pour intercepter Supabase)

**STOP — Checkpoint Martin** : "Ce scénario est correct ? Je code ?"

#### Étape B — POM (si nouveau)
Si le test nécessite un Page Object qui n'existe pas, Claude écrit le POM minimal.
Claude montre le POM, Martin valide les noms de méthodes et les sélecteurs choisis.

**STOP — Checkpoint Martin** : "Le POM est OK ?"

#### Étape C — Code du test
Claude écrit le `.spec.ts` avec commentaires explicatifs.

#### Étape D — Lancement
```bash
npx playwright test tests/e2e/<fichier>.spec.ts --project=chromium --headed
```
On regarde ENSEMBLE le navigateur s'ouvrir, voir ce qui se passe.

#### Étape E — Debug si besoin
Si le test casse, Claude analyse, propose un fix, Martin valide avant modification.
Outils utilisés :
- `npx playwright test --debug` (mode pas-à-pas)
- `npx playwright show-trace <trace.zip>` (replay visuel)
- `await page.pause()` dans le test pour inspection

#### Étape F — Validation finale
Test passe vert → commit atomique :
```bash
git commit -m "test(e2e): <nom du parcours> — <ce qui est testé>"
```

**Checkpoint Martin** : "On passe au test suivant ?"

---

### PHASE 5 — Couverture multi-navigateur (à la fin)
- Décommenter `firefox` et `webkit` dans `playwright.config.ts`
- Lancer la suite complète `npx playwright test`
- Corriger les divergences entre navigateurs si besoin

---

### PHASE 6 — Documentation finale
- Mettre à jour `playwright_ai_rules.md` avec les patterns réellement utilisés
- Ajouter une section "Comment lancer les tests" dans `README.md`
- Récupérer le stash : `git stash pop`

---

## 4. Conventions de code

### Nommage des tests
- Fichier : `<domaine>.spec.ts` (ex: `auth.spec.ts`, `athlete-session.spec.ts`)
- `test.describe('<Domaine fonctionnel>', () => {...})`
- `test('devrait <comportement attendu>', async ({ page }) => {...})`

### Nommage des POM
- Fichier : `<NomPage>.ts` en PascalCase
- Une classe TypeScript par fichier
- Méthodes en français descriptif (`seConnecter`, `lancerSeance`, `attendreAccueil`)

### Sélecteurs (par ordre de préférence)
1. `getByRole('button', { name: /Connexion/i })` — STANDARD
2. `getByLabel('Mot de passe')` — pour les inputs
3. `getByText('Bienvenue')` — pour du texte unique
4. `getByTestId('submit-form')` — en dernier recours, après ajout du `data-testid` dans le composant

### Données de test
- Aucun mot de passe en dur dans les fichiers committés
- Utiliser des fixtures (`tests/fixtures/users.ts`)
- Pour Supabase, mocker au maximum via `page.route()`

### Commits
- Un commit par test fonctionnel
- Format : `test(e2e): <parcours> — <action testée>`
- Exemple : `test(e2e): auth — login athlète avec identifiants valides`

---

## 5. Critères de réussite de la session

✅ Au moins 1 test E2E qui passe en vert
✅ Martin comprend chaque ligne de code écrite
✅ Architecture en place pour ajouter facilement de nouveaux tests
✅ Aucun test fragile (pas de `waitForTimeout`, pas de sélecteur CSS)
✅ `playwright_ai_rules.md` respecté à 100 %

---

## 6. Parcours utilisateur critiques (validés ensemble)

**Décisions prises ensemble** :
- 🎯 **1er test** : `AUTH-2` Mode démo
- 🔒 **Stratégie réseau** : Mock Supabase via `page.route()` (tous les tests, y compris le mode démo)
- 📱 **Viewport** : Mobile d'abord (Pixel 5 émulé via `devices['Pixel 5']`)

> ⚠️ **Découverte sur le mode démo** : malgré son nom, il appelle quand même Supabase pour créer un utilisateur anonyme (`signInAnonymously`) + upsert dans `profiles`. Donc on mocke dès le 1er test. C'est en fait pédagogiquement parfait : on apprend la technique de mocking tout de suite.

### Liste des parcours à couvrir

| ID | Parcours | Priorité | Statut | Test associé |
|----|----------|----------|--------|--------------|
| AUTH-1 | Login email/mot de passe | P0 | À faire | `auth.spec.ts` |
| **AUTH-2** | **Mode démo (1er test)** | **P0** | **EN COURS** | `auth.spec.ts` |
| AUTH-3 | Erreur identifiants | P0 | À faire | `auth.spec.ts` |
| ATH-1 | Voir programme du jour | P1 | À faire | `athlete-home.spec.ts` |
| ATH-2 | Démarrer une séance | P1 | À faire | `athlete-session.spec.ts` |
| ATH-3 | Compléter une séance | P1 | À faire | `athlete-session.spec.ts` |
| ATH-4 | Voir l'historique | P2 | À faire | `athlete-history.spec.ts` |
| COACH-1 | Voir mes athlètes | P1 | À faire | `coach-team.spec.ts` |
| COACH-2 | Créer un programme | P2 | À faire | `coach-program.spec.ts` |
| COACH-3 | Conversations | P2 | À faire | `coach-messages.spec.ts` |

---

## 7. Journal de session (rempli au fil de l'eau)

> Chaque test démarre par une entrée dans ce journal :
> scénario, préconditions, actions, assertions, mocks.

---

### Test #001 — AUTH-2 : Démarrer le mode démo

**Statut** : 🟡 Scénario proposé, en attente de validation Martin

#### Scénario métier
Un utilisateur arrive sur la page d'accueil de F.Y.T sans compte. Il clique sur "Essayer la démo" et doit atterrir dans l'application en mode démo (avec la bannière démo visible et la vue d'accueil athlète chargée).

#### Préconditions
- App accessible sur `http://localhost:3000` (lancé par `webServer` Playwright)
- localStorage vide (Playwright ouvre un contexte navigateur frais à chaque test)
- Aucun mock externe nécessaire pour le chargement de la page initiale

#### Actions utilisateur (pas-à-pas)
1. Aller sur `/` (page de connexion)
2. Vérifier que le bouton "Essayer la démo" est visible
3. Cliquer sur "Essayer la démo"
4. Attendre que le spinner disparaisse et que l'accueil athlète apparaisse

#### Assertions (ce qu'on vérifie)
- ✅ Le bouton "Essayer la démo" est visible avant le clic (`getByRole('button', { name: /Essayer la démo/i })`)
- ✅ Après clic, la bannière de mode démo (`DemoBanner`) apparaît
- ✅ Le titre/greeting de l'accueil athlète est visible (à confirmer via inspection)
- ✅ Aucune erreur console pendant le flow
- ✅ Le localStorage contient `fyt_demo_session_id` et `fyt_demo_profile_id`

#### Mocks Supabase nécessaires (page.route)
Le mode démo n'est pas 100 % local, il fait 3 appels Supabase :

| Méthode | Route Supabase | Réponse mockée | Pourquoi |
|---------|----------------|----------------|----------|
| `signInAnonymously()` | `POST **/auth/v1/signup` | `{ user: { id: 'demo-uuid' }, session: {...} }` | Crée un user anonyme côté auth |
| `profiles.upsert()` | `POST **/rest/v1/profiles*` | `[]` (200 OK) | Crée le profil démo |
| `demo_sessions.insert()` | `POST **/rest/v1/demo_sessions*` | `[]` (200 OK) | Tracking de la session démo |

**Note** : ces mocks vivront dans `tests/fixtures/supabase-mocks.ts` et seront réutilisés par d'autres tests plus tard.

#### Architecture de test
- `tests/pages/AuthPage.ts` (nouveau POM) — méthodes : `goto()`, `clickEssayerDemo()`, `expectButtonsVisible()`
- `tests/pages/AthleteHomePage.ts` (nouveau POM) — méthodes : `expectDemoBannerVisible()`, `expectGreetingVisible()`
- `tests/fixtures/supabase-mocks.ts` (nouveau) — fonction `mockDemoSession(page)`
- `tests/e2e/auth.spec.ts` (nouveau) — le test lui-même

#### Risques connus
- ⚠️ Après l'auth, l'app va probablement appeler d'autres routes Supabase (training_plans, sessions, etc.) → on les laisse faire, on ne mocke QUE ce qui bloque le flow démo. Si l'accueil reste vide, c'est OK pour ce test.
- ⚠️ Si l'app fait du polling Supabase, on ajoutera des mocks "catch-all" qui renvoient `[]`.

#### Commit prévu
`test(e2e): auth — d\u00e9marrage du mode d\u00e9mo + mocks supabase r\u00e9utilisables`

---

---

## 8. Annexes

### Commandes utiles
```bash
# Lancer l'app en dev (Playwright le fait automatiquement, mais utile en debug manuel)
npm run dev

# Lancer tous les tests
npx playwright test

# Lancer un seul fichier en mode visuel
npx playwright test tests/e2e/auth.spec.ts --headed --project=chromium

# Mode debug pas-à-pas
npx playwright test tests/e2e/auth.spec.ts --debug

# Voir le rapport HTML après un run
npx playwright show-report

# Generer un test en enregistrant les actions dans le navigateur
npx playwright codegen http://localhost:3000
```

### Liens utiles
- Doc Playwright : https://playwright.dev/docs/intro
- Doc locators : https://playwright.dev/docs/locators
- Web-first assertions : https://playwright.dev/docs/test-assertions
- Règles internes : `playwright_ai_rules.md` (à la racine du projet)
