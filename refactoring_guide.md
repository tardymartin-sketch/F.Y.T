# Guide de Réfractoring Haute Performance : De la Dette Technique à l'Échelle

Ce document est le plan d'action de niveau "Staff Engineer" pour résoudre la dette architecturale de l'application (spécifiquement la surcharge de `App.tsx` et l'optimisation des requêtes Supabase).

L'objectif n'est pas seulement de "nettoyer le code", mais de mettre en place une architecture robuste, sécurisée, testable et réversible, prête à accueillir de nouvelles fonctionnalités complexes sans s'effondrer.

---

## Phase 0 : Prérequis & Sécurité (Le Filet de Sauvetage)

Avant toute modification de code, il est impératif de sécuriser l'existant. Un refactoring sans filet est suicidaire.

1.  **Isolation (Git) :** Créer une branche dédiée au refactoring (ex: `refactor/state-and-supabase-optimization`). Ne jamais travailler sur `main` ou `develop`.
2.  **État Zéro (Tests) :** S'assurer que les tests actuels (Vitest/Playwright) passent à 100%. Si la couverture est faible, écrire un test E2E de base couvrant le "Happy Path" critique de l'application avant de toucher au code.
3.  **Surveillance (Monitoring) :** Si l'application est en production, s'assurer d'avoir accès aux logs d'erreurs (Sentry ou équivalent) pour identifier rapidement des régressions post-déploiement.

---

## Phase 1 : Extraction du State Management (Zustand & React Query)

La surcharge de `App.tsx` provient généralement d'états locaux (`useState`) soulevés trop haut et d'appels API (Supabase) gérés directement dans le composant principal.

### 1.1 Séparation des Responsabilités (États vs UI)
*   **Zustand (État Global Client) :** Déplacer toute la logique d'état purement client (thème UI, utilisateur connecté, préférences locales) hors de `App.tsx` vers un ou plusieurs "stores" Zustand dédiés (ex: `src/stores/useAuthStore.ts`, `src/stores/useAppStore.ts`).
*   **React Query / TanStack Query (État Serveur) :** C'est le point crucial. Ne **jamais** utiliser `useEffect` pour fetcher les données Supabase. Introduire React Query pour gérer le cache, le *stale-time*, le *refetch on window focus*, et le *retry* automatique des requêtes.

### 1.2 Nettoyage de `App.tsx`
*   `App.tsx` ne doit plus contenir **aucune** logique métier ni appel réseau direct.
*   Il doit se limiter à :
    *   La définition des Providers (ThemeProvider, QueryClientProvider).
    *   Le système de routage global (React Router).
    *   La structure principale du Layout (Header, Content, Main, Footer).

---

## Phase 2 : Optimisation Stratégique Supabase (Back-End)

Maintenir une scalabilité requiert que la couche d'accès aux données soit performante, typée et sécurisée.

### 2.1 Services Extrait (Couche d'Accès aux Données)
*   Créer un dossier `src/services/api/` (ou `api-client`).
*   Créer des fichiers dédiés par ressource (ex: `users.service.ts`, `documents.service.ts`).
*   **Toutes** les requêtes Supabase doivent y être centralisées et exposées via des fonctions asynchrones nommées clairement (ex: `fetchUserById()`, `updateDocument()`).

### 2.2 Optimisation des Requêtes et Modèles
*   **Générateurs TypeScript Supabase :** Si ce n'est pas fait, générer les types TS directement depuis le schéma Supabase (via le CLI Supabase). Ne plus écrire manuellement les interfaces des tables.
*   **Typage Strict des Réponses :** Chaque fonction de service doit retourner un type précis dérivé du schéma Supabase pour garantir que le front-end sait toujours ce qu'il manipule.
*   **Limitation des Colonnes (Select) :** Dans chaque requête `supabase.from()`, optimiser les `select()` pour ne ramener **que** les données nécessaires à l'écran, évitant les `select(*)` coûteux en bande passante et en mémoire.

### 2.3 Sécurité des Données
*   **Row Level Security (RLS) :** Confirmer côté dashboard Supabase que les politiques (Policies) RLS sont activées et restrictives sur toutes les tables exposées. Le client ne doit pouvoir lire/écrire que ce qui lui appartient.
*   **Validation des Inputs :** Au niveau des formulaires ou avant l'appel API, utiliser une librairie comme Zod pour valider strictement le format des données envoyées à Supabase.

---

## Phase 3 : Validation du Refactoring & Éviter les Régressions

C'est ici que l'on vérifie que l'on a amélioré le code sans casser le produit.

1.  **Vérification de Conformité :** S'assurer que l'application se compile et ne génère aucune erreur TypeScript ou de linter (ESLint) de gravité critique.
2.  **Passage des Tests Unitaires & E2E :** Lancer la suite de tests complète (Vitest et Playwright). Tous les tests doivent réussir. Si l'extraction vers Zustand a modifié la manière dont l'état est mocké, mettre à jour les tests en conséquence.
3.  **Revue de Code (Assistance IA) :** Demander à l'IA d'auditer spécifiquement la Pull Request avec les "règles d'audit" précédentes, en se focalisant sur les fuites de re-rendus dans `App.tsx` et la sécurité des appels Supabase.
4.  **Test "Manuel" Ciblé :** Effectuer un test ciblé sur les parties les plus complexes (l'éditeur Lexical, les interactions DB lourdes) dans un environnement de staging ou en local. Mettre un point d'honneur à tester la perte des données en naviguant hors page ou après rafraichissement, pour vérifier que le cache React Query et Zustand fonctionnent.

---

## Plan de Rollback (Sauvetage d'Urgence)

Même avec le meilleur filet de sécurité, une mise en production peut révéler un problème imprévu.

*   **Rollback Stratégique :** En cas d'anomalie critique post-déploiement :
    1.  Revert (Annulation) de la Pull Request associée au refactoring sur le repo Git.
    2.  Redéploiement immédiat de dernier commit stable (l'`upstream` ou tag précédent).
    3.  L'équipe analyse le bug sur la branche de refactoring isolée (avec les logs d'erreurs en prod pour comprendre pourquoi, par exemple un problème de typage inattendu avec Supabase).
    4.  Nouveau déploiement seulement quand la cause profonde est identifiée, corrigée et couverte par un test E2E.

**Ne Jamais Faire de "Patchs Chirurgicaux" directement en production pour masquer l'erreur de Réfractoring. On rollback, on analyse calmement, on fixe, on redéploie.**
