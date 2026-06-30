# Tests F.Y.T — guide court

> Objectif : des tests **utiles**, **rapides à lancer**, et **verts**.
> Pas de couverture artificielle, pas de méthodo lourde. Si un test ne sert à
> rien ou casse tout le temps, on le supprime.

---

## Lancer les tests (les 3 commandes à retenir)

```bash
npm test              # tests unitaires (Vitest) — 2 s, à lancer tout le temps
npm run test:coverage # idem + rapport de couverture dans ./coverage
npm run test:e2e      # tests end-to-end (Playwright) — lent, lance le navigateur
```

En développement, garde un terminal sur `npm run test:watch` : il relance
seulement les tests touchés à chaque sauvegarde.

---

## Les deux étages de test

| Étage | Outil | Quoi | Coût | Quand en écrire |
|-------|-------|------|------|-----------------|
| **Unitaire** | Vitest | Fonctions pures de `src/utils/` (calculs, transformations, machine à états) | ~instantané, fiable | **Par défaut.** Dès qu'une fonction a une logique non triviale. |
| **E2E** | Playwright | Parcours utilisateur réels dans le navigateur (login, lancer une séance) | lent, fragile, demande de la maintenance | **Avec parcimonie.** Seulement les 3-4 parcours critiques (P0). |

**Règle de décision** : si tu peux tester une logique en unitaire, fais-le en
unitaire. L'E2E coûte cher à maintenir (cf. le test démo qui a dérivé). On en
garde un minimum, sur les parcours qui rapportent vraiment de la confiance.

---

## Tests unitaires (Vitest)

- **Où** : à côté du fichier testé. `src/utils/momentum.ts` → `src/utils/momentum.test.ts`.
- **Quoi tester** : les cas limites, pas le chemin heureux évident.
  Exemple : entrée vide, valeurs nulles, un seul élément, débordement.
- **Cibles naturelles** : tout `src/utils/`. Les fonctions pures sont le
  meilleur rapport valeur/effort — déterministes, aucun mock.

Squelette :

```ts
import { describe, it, expect } from 'vitest';
import { maFonction } from './maFonction';

describe('maFonction', () => {
  it('gère le cas vide', () => {
    expect(maFonction([])).toEqual(/* attendu */);
  });
});
```

Le scan Vitest est **limité à `src/`** (cf. `vite.config.ts`) : les copies de
worktree (`.claude/`) et l'outillage (`.agents/`) sont ignorés. Si `npm test`
remonte des fichiers hors `src/`, c'est un bug de config à corriger là.

---

## Tests E2E (Playwright)

Architecture en place dans `tests/` :

```
tests/
├── e2e/        # les tests (1 fichier par domaine : auth.spec.ts…)
├── pages/      # Page Object Models (AuthPage, AthleteHomePage…)
└── fixtures/   # mocks Supabase réutilisables (supabase-mocks.ts)
```

Règles non négociables (anti-fragilité) :

1. **Jamais** de `waitForTimeout` arbitraire — Playwright auto-attend.
2. **Jamais** de sélecteur CSS (`.btn-primary`) — utilise `getByRole`,
   `getByLabel`, `getByText`, ou `getByTestId` en dernier recours.
3. **Mock des services tiers** (Supabase) via `page.route()` — jamais de vrai
   backend en test.
4. Un POM par page, un fichier `.spec.ts` par domaine fonctionnel.

### Tests en quarantaine

Un test E2E cassé est marqué `test.fixme(...)` avec un commentaire daté
expliquant la cause. Il n'échoue pas la suite mais reste visible. On le
répare quand on a le temps, ou on le supprime s'il n'apporte plus rien.

État actuel : `tests/e2e/auth.spec.ts` (mode démo) est en quarantaine —
le mock Supabase a dérivé. À reconnecter avec `npm run test:e2e:headed`.

---

## Comment on ajoute un test (mode autonome)

La méthode lourde « valide chaque scénario avant que j'écrive une ligne » a
échoué (trop de friction). Nouvelle approche :

1. Claude écrit le test **en entier** (unitaire de préférence), le lance, le
   rend vert.
2. Claude te montre à la fin : ce qui est couvert, ce qui ne l'est pas, et
   pourquoi.
3. Tu relis le résultat, tu ajustes si besoin. Pas de checkpoint à chaque pas.

L'ancien plan détaillé (`docs/QA_TEST_PLAN.md`) reste comme archive du
raisonnement, mais ce fichier-ci fait foi.
