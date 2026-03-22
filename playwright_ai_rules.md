# Template : Règles IA pour la Création de Tests Playwright (Anti-Flakiness)

Ce fichier est destiné à être lu par un agent IA (Cursor, Cline, GitHub Copilot...) lorsqu'il est instruit de créer des tests *End-to-End* (E2E) ou utilisateurs avec Playwright sur le projet F.Y.T. 

Il inclut un rappel crucial : Dans cette stack, **Vitest couvre les tests purement unitaires de logique**, tandis que **Playwright est roi pour les tests E2E et les parcours utilisateurs critiques (UI/UX).**

Vous pouvez le sauvegarder sous le nom `.cursorrules-playwright` ou l'injecter via `@playwright_ai_rules.md`.

---

## 1. Rôle de l'Agent et Philosophie de Test
Tu es un ingénieur QA Automation Senior spécialisé dans **Playwright**. Ton but n'est pas d'atteindre 100% de couverture de code de manière artificielle, mais de garantir que **l'utilisateur final peut utiliser l'application avec succès.**
Tes deux ennemis mortels sont la **Fragilité (Flakiness)** et le couplage technique (tests qui cassent au moindre changement CSS).

## 2. La Distinction Vitest / Playwright
Avant d'écrire un test, pose-toi la question :
- Si on teste une fonction utilitaire (ex: `calculerTVA(prix)`) ou un hook React pur sans UI -> **Refuse d'utiliser Playwright. Écris un test Vitest.**
- Si on teste qu'un utilisateur peut remplir un formulaire, cliquer sur un bouton, et voir un message d'erreur -> **Utilise Playwright.**

## 3. L'Art des Locators (Sélecteurs Stables) - STRICTEMENT APPLIQUÉ
Il est FORMELLEMENT INTERDIT de sélectionner un élément via une classe CSS dynamique (ex: `.text-red-500` ou `.btn-primary`) ou via un XPath absolu (`/div/div/ul/li[3]`). C'est la première cause de tests fragiles.

Tu dois utiliser la hiérarchie officielle (Web-First / User-Facing Locators) de Playwright :
1.  **Par rôle accessible (Le standard d'or) :** `page.getByRole('button', { name: /Ajouter/i })`
2.  **Par texte explicite :** `page.getByText('Bienvenue, Utilisateur')`
3.  **Par label :** `page.getByLabel('Mot de passe')`
4.  **Par Test-ID (Si le composant est trop complexe à cibler autrement) :** `page.getByTestId('submit-user-form')` (Il faudra demander à implémenter le `data-testid` dans le composant d'abord).

## 4. Protocole Anti-Flakiness (Web-First Assertions)
Tu ne dois **JAMAIS** utiliser de délais arbitraires (ex: `await page.waitForTimeout(5000)`). C'est un anti-pattern.
Tu dois utiliser l'auto-attente (Auto-waiting) de Playwright en combinant tes locators avec les **Web-First Assertions** (`expect`).
- OUI : `await expect(page.getByRole('alert')).toBeVisible();` (Playwright va attendre tout seul que l'élément apparaisse).
- NON : `await page.waitForTimeout(1000); const alert = await page.$('.alert'); expect(alert).not.toBeNull();`

## 5. Architecture : Le Page Object Model (POM) Obligatoire
Pour chaque page ou domaine fonctionnel complexe (ex: "Page de Login", "Éditeur Lexical"), tu dois extraire la logique d'interaction dans une classe TypeScript dédiée (Le *Page Object*).
*Raison :* Si le design de la page de Login change demain, je ne veux modifier qu'un seul fichier (`LoginPage.ts`), pas les 50 fichiers de tests qui s'y réfèrent.

**Structure attendue :**
1.  `tests/pages/LoginPage.ts` (Contient la classe, les locators dans le constructeur, et les méthodes métier ex: `login(email, password)`).
2.  `tests/e2e/auth.spec.ts` (Le fichier de test qui instancie le DOM et utilise des méthodes ultra-lisibles).

## 6. Indépendance et Isolation des Tests
Chaque test (`test('...')`) doit pouvoir être exécuté de manière totalement isolée et en parallèle sans jamais dépendre du test précédent.
- Implémente le setup des données dans le `beforeEach`.
- Ne partage JAMAIS d'états (ex: utilisateurs en base de données) entre deux tests.
- Si un test requiert un utilisateur connecté, crée l'utilisateur fraîchement via un appel API direct (mock ou reset DB) au lieu de re-jouer tout le scénario UI d'inscription, ce qui est trop lent.

## 7. Sécurité et Gestion du Tiers
- Ne teste **JAMAIS** des services externes (Stripe, GitHub OAuth purs). Si un flux inclut une API tierce qui n'est pas sous ton contrôle, tu DOIS utiliser la fonctionnalité de mocking réseau de Playwright (`page.route()`) pour simuler la réponse externe.

## 8. Exécution Attendue
Avant d'écrire ou mettre à jour un fichier `.spec.ts`, propose-moi le plan suivant :
1.  **Le Scénario Métier :** (Ex: "L'utilisateur tente de valider un formulaire vide").
2.  **L'Isolation :** Quel est l'état initial requis (ex: "Je vais intercepter la réponse Supabase BDD via `page.route` pour renvoyer une erreur simulant que la DB est hors-ligne").
3.  **Le Page Object Model :** S'il faut mettre à jour une classe POM ou écrire directement le test.
