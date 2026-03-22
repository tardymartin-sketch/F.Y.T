<!-- doc-meta
version: 1.0.0
last_updated: 2026-03-04
sources:
  - package.json
  - vite.config.ts
  - tsconfig.json
  - .env
-->

# F.Y.T -- Documentation technique

## 1. Presentation du projet

F.Y.T est une application web monopage (SPA) de suivi d'entrainement sportif, en version 2.0. Elle permet aux utilisateurs de consigner leurs seances, suivre leur progression et interagir avec un coach.

**Roles utilisateur :**

| Role | Description |
|---|---|
| Athlete | Enregistrement de seances, consultation des statistiques personnelles, badges |
| Coach | Gestion d'equipe, creation de templates/programmes, messagerie avec athletes |
| Admin | Administration des utilisateurs et de la plateforme |

**Fonctionnalites principales :**

| Fonctionnalite | Description |
|---|---|
| Workout logging | Saisie de seances avec support RPE (Rate of Perceived Exertion) |
| Analytics | Tendances de volume, estimation 1RM, heatmap d'activite |
| Badges / Gamification | Systeme de recompenses base sur la progression |
| Coach messaging | Messagerie entre coach et athletes |
| Strava integration | Synchronisation via OAuth 2.0 |
| Templates / Programmes | Bibliotheque de seances et programmes d'entrainement |
| Mode demo | Decouverte de l'application avec donnees fictives et tour guide |
| Responsive | Interface adaptee mobile et desktop |

---

## 2. Architecture

### Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│                    NAVIGATEUR                           │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │ React 19    │  │ Tailwind 4  │  │ Recharts      │   │
│  │ TypeScript  │  │ PostCSS     │  │ Tiptap/Lexical│   │
│  └──────┬──────┘  └─────────────┘  └───────────────┘   │
│         │                                               │
│  ┌──────┴──────┐                                        │
│  │ Services    │                                        │
│  │ Layer       │                                        │
│  └──────┬──────┘                                        │
└─────────┼───────────────────────────────────────────────┘
          │ @supabase/supabase-js
          ▼
┌──────────────────┐      ┌─────────────────┐
│  Supabase        │      │  Strava API     │
│  ├─ Auth         │      │  (OAuth 2.0)    │
│  ├─ PostgreSQL   │      │                 │
│  ├─ PostgREST    │      └─────────────────┘
│  ├─ RLS          │
│  └─ Realtime     │
└──────────────────┘
```

Le frontend communique exclusivement avec Supabase via le client `@supabase/supabase-js`. Les regles RLS (Row Level Security) assurent la securite des donnees au niveau de la base. L'integration Strava passe par un flux OAuth 2.0 avec echange de tokens cote client.

### Architecture responsive

```
App.tsx (root)
├── useDeviceDetect() → isMobile?
├── Mobile path:
│   ├── MobileLayout (header + FAB + BottomNav)
│   └── HomeMobile / ActiveSessionMobile / HistoryMobile / StatsPage / CoachTab / ProfileTab
└── Desktop path:
    ├── Sidebar (collapsible navigation)
    └── HomeDesktop / ActiveSessionDesktop / HistoryDesktop / TeamView / LibraryView / AdminUsersView
```

L'application detecte le type d'appareil au chargement via le hook `useDeviceDetect()` et rend un arbre de composants entierement different selon le contexte mobile ou desktop. Chaque chemin possede ses propres composants de layout et de pages, partageant uniquement la couche services et les composants communs.

---

## 3. Stack technique

| Categorie | Technologie | Version |
|---|---|---|
| Framework UI | React | 19.2.1 |
| Langage | TypeScript | 5.8.2 |
| Bundler | Vite | 6.2.0 |
| CSS | Tailwind CSS | 4.1.18 |
| Backend | Supabase (PostgreSQL + Auth + RLS + PostgREST) | -- |
| Editeur rich text (coach) | Tiptap | 2.10.4 |
| Editeur rich text (sessions) | Lexical | 0.40.0 |
| Graphiques | Recharts | 2.15.0 |
| Icones | Lucide React | 0.556.0 |
| Integration externe | Strava API (OAuth 2.0) | -- |
| Documentation composants | Storybook | 10.2.2 |
| Tests unitaires | Vitest | 4.0.18 |
| Tests E2E | Playwright | 1.58.0 |
| Inspection dev | React Dev Inspector | 2.0.1 |

---

## 4. Structure du projet

```
F.Y.T/
├── src/
│   ├── components/
│   │   ├── common/          Composants partages mobile/desktop
│   │   │   ├── stats/       Graphiques et analytics
│   │   │   └── history/     Composants historique
│   │   ├── mobile/          ~28 composants mobile
│   │   ├── desktop/         ~28 composants desktop
│   │   │   └── library/     Bibliotheque coach (exercises, sessions, programs)
│   │   └── shared/          Primitives UI (Button, Card, Badge, Stepper)
│   ├── services/
│   │   ├── supabaseService.ts  Service principal (~3870 lignes)
│   │   ├── supabaseClient.ts   Client Supabase singleton
│   │   ├── badgeService.ts     Gamification (~700 lignes)
│   │   ├── stravaService.ts    Integration Strava (~600 lignes)
│   │   ├── messagesService.ts  Messaging (~300 lignes)
│   │   └── demoService.ts      Mode demo (~1000 lignes)
│   ├── contexts/
│   │   ├── ThemeContext.tsx     5 themes (light/dark)
│   │   └── DemoTourContext.tsx  Tour guide
│   ├── hooks/               11 custom hooks
│   ├── stores/
│   │   └── UIStateStore.ts  State management singleton
│   ├── layouts/
│   │   ├── MobileLayout.tsx
│   │   └── CoachLayout.tsx
│   ├── types/
│   │   └── strava.ts
│   ├── utils/
│   │   ├── historyUtils.ts
│   │   ├── csv.ts
│   │   └── localStorageEvents.ts
│   ├── styles/
│   │   ├── tokens.ts        Design tokens
│   │   └── index.css        Tailwind + custom CSS
│   └── main.tsx             Point d'entree React
├── App.tsx                  Composant racine (50KB)
├── types.ts                 Types TypeScript (50KB, ~1634 lignes)
├── index.html               Page HTML
├── vite.config.ts           Config Vite
├── tsconfig.json            Config TypeScript
├── postcss.config.js        Config PostCSS
├── package.json             Dependances
├── .env                     Variables Supabase
└── docs/                    Documentation
```

**Points notables :**

| Element | Detail |
|---|---|
| `App.tsx` | Composant racine de ~50 KB, gere le routage interne et le branchement mobile/desktop |
| `types.ts` | Fichier central de ~1634 lignes contenant tous les types TypeScript de l'application |
| `supabaseService.ts` | Service principal de ~3870 lignes couvrant toutes les operations CRUD |
| `src/components/` | Organisation stricte en 4 sous-dossiers : `common`, `mobile`, `desktop`, `shared` |

---

## 5. Dependances

### Dependances de production

| Package | Version | Role |
|---|---|---|
| `react` | ^19.2.1 | Framework UI |
| `react-dom` | ^19.2.1 | Rendu DOM |
| `@supabase/supabase-js` | ^2.89.0 | Client BDD + Auth |
| `@tiptap/react` | ^2.10.4 | Editeur rich text (coach) |
| `@tiptap/starter-kit` | ^2.10.4 | Extensions Tiptap de base |
| `@tiptap/extension-color` | ^2.10.4 | Couleurs texte Tiptap |
| `@tiptap/extension-text-style` | ^2.10.4 | Styles texte Tiptap |
| `@tiptap/pm` | ^2.10.4 | ProseMirror core |
| `lexical` | ^0.40.0 | Editeur rich text (sessions) |
| `@lexical/react` | ^0.40.0 | Bindings React Lexical |
| `@lexical/*` (5 paquets) | ^0.40.0 | Extensions Lexical |
| `lucide-react` | ^0.556.0 | Bibliotheque d'icones |
| `recharts` | ^2.15.0 | Graphiques et charts |
| `react-dev-inspector` | ^2.0.1 | Inspection composants (dev) |
| `@tailwindcss/postcss` | ^4.1.18 | Plugin Tailwind PostCSS |

### Dependances de developpement

| Package | Version | Role |
|---|---|---|
| `vite` | ^6.2.0 | Bundler / dev server |
| `@vitejs/plugin-react` | ^5.0.0 | Plugin React pour Vite |
| `typescript` | ~5.8.2 | Typage statique |
| `tailwindcss` | ^4.1.18 | Framework CSS |
| `postcss` | ^8.5.6 | Processeur CSS |
| `autoprefixer` | ^10.4.23 | Prefixes CSS auto |
| `storybook` | ^10.2.2 | Documentation composants |
| `@storybook/react-vite` | ^10.2.2 | Integration Storybook+Vite |
| `@storybook/addon-docs` | ^10.2.2 | Addon documentation |
| `@storybook/addon-a11y` | ^10.2.2 | Addon accessibilite |
| `@storybook/addon-vitest` | ^10.2.2 | Addon tests |
| `@chromatic-com/storybook` | ^5.0.0 | Tests visuels Chromatic |
| `vitest` | ^4.0.18 | Framework de tests |
| `@vitest/browser-playwright` | ^4.0.18 | Tests navigateur |
| `@vitest/coverage-v8` | ^4.0.18 | Couverture de code |
| `playwright` | ^1.58.0 | Tests E2E |
| `@types/react` | ^18.2.0 | Types React |
| `@types/react-dom` | ^18.2.0 | Types React DOM |
| `@types/node` | ^22.14.0 | Types Node.js |

### Scripts npm

| Script | Commande | Description |
|---|---|---|
| `npm run dev` | `vite` | Serveur developpement (port 3000) |
| `npm run build` | `vite build` | Build production |
| `npm run preview` | `vite preview` | Preview build production |
| `npm run storybook` | `storybook dev -p 6006` | Storybook composants (port 6006) |
| `npm run build-storybook` | `storybook build` | Build Storybook statique |

---

## 6. Deploiement et execution

### Prerequis

| Outil | Remarque |
|---|---|
| Node.js | Version LTS recommandee |
| npm | Installe avec Node.js |

### Variables d'environnement

Creer un fichier `.env` a la racine du projet avec les variables suivantes :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Cle anonyme Supabase |
| `VITE_STRAVA_CLIENT_ID` | (optionnel) Client ID Strava |
| `VITE_STRAVA_CLIENT_SECRET` | (optionnel) Client secret Strava |
| `VITE_STRAVA_REDIRECT_URI` | (optionnel) URI callback OAuth |

Les variables Strava ne sont necessaires que si l'integration Strava est activee. Sans elles, l'application fonctionne normalement sans la synchronisation Strava.

### Installation et lancement

```bash
# 1. Installer les dependances
npm install

# 2. Lancer le serveur de developpement
npm run dev

# 3. Ouvrir dans le navigateur
# http://localhost:3000
```

### Build production

```bash
# Generer le build optimise
npm run build

# Previsualiser le build
npm run preview
```

---

## 7. Navigation documentaire

| Document | Contenu |
|---|---|
| [data-model.md](data-model.md) | Types TypeScript, mapping DB-App, utilitaires |
| [services.md](services.md) | 5 services (supabase, badge, strava, messages, demo) |
| [components.md](components.md) | 70+ composants React (mobile/desktop/common/shared) |
| [state-and-navigation.md](state-and-navigation.md) | UIStateStore, contexts, hooks, routing, styling |
| [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) | Reference des 25 tables Supabase |
| [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) | Architecture de la base de donnees |
| [CHANGELOG.md](CHANGELOG.md) | Journal des mises a jour documentation |

---

## 8. Maintenance de la documentation

### En-tetes doc-meta

Chaque fichier de documentation contient un en-tete `doc-meta` au format HTML comment :

```html
<!-- doc-meta
version: X.Y.Z
last_updated: YYYY-MM-DD
sources:
  - fichier_source_1
  - fichier_source_2
-->
```

| Champ | Role |
|---|---|
| `version` | Version semantique du document (majeure.mineure.patch) |
| `last_updated` | Date de derniere mise a jour au format ISO |
| `sources` | Liste des fichiers sources dont depend le document |

### Table de correspondance

| Documentation | Fichiers sources surveilles |
|---|---|
| `README.md` | `package.json`, `vite.config.ts`, `tsconfig.json`, `.env` |
| `data-model.md` | `types.ts`, `src/types/strava.ts` |
| `services.md` | `src/services/*.ts` |
| `components.md` | `src/components/**/*.tsx`, `App.tsx`, `src/layouts/*.tsx` |
| `state-and-navigation.md` | `src/stores/UIStateStore.ts`, `src/contexts/*.tsx`, `src/hooks/*.ts`, `src/styles/*.ts`, `src/styles/index.css` |
| `CHANGELOG.md` | (tous -- journal transversal) |

### Processus de mise a jour

1. Identifier le fichier source modifie.
2. Consulter la table de correspondance pour determiner le(s) document(s) impacte(s).
3. Mettre a jour le contenu du document concerne.
4. Incrementer le champ `version` dans l'en-tete `doc-meta`.
5. Mettre a jour le champ `last_updated` avec la date du jour.
6. Consigner la modification dans `CHANGELOG.md`.

---

*Retour a l'[index](README.md)*
