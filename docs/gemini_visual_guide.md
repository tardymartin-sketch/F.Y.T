# GEMINI VISUAL GUIDE

**Projet**: F.Y.T — Version V3
**Style**: "Soft Obsidian" — muted pastel on dark charcoal, premium, organic, calm.
**But**: document d'entrée pour Claude Opus — 1 wireframe = 1 écran décrit (visuel + contrat technique).

---

## Règles générales (Design System / Socle)

### 1. Thème & tokens (Tailwind v4 - `theme.extend`)
Fournir ces tokens à Claude Opus en tant que `tailwind.config.js` + `:root` CSS variables.

**Palette (exemples hex précis à injecter dans config)**
```
--color-bg: #0f1314;           /* very dark charcoal w/ warm undertone */
--color-surface: #16191a;      /* slightly lighter surface */
--color-muted-grey: #bfc7c5;   /* desaturated pale stone for text-secondary */
--accent-sage: #89a688;        /* muted sage green */
--accent-dusty-rose: #c89aa0;  /* dusty rose */
--accent-pale-sand: #d9cdbf;   /* pale sand */
--soft-shadow: 0 8px 24px rgba(5,6,8,0.55);
```

**Tailwind color tokens (suggestion `theme.extend.colors`)**
```
softObsidian: {
  DEFAULT: '#0f1314',
  surface: '#16191a'
},
muted: {
  stone: '#bfc7c5'
},
mutedPastel: {
  sage: '#89a688',
  rose: '#c89aa0',
  sand: '#d9cdbf'
}
```

**Typography**
- `font-family: Inter, ui-sans-serif, system-ui`.
- Scale: `h1: 1.6rem (text-2xl)`, `h2: 1.25rem`, `body: 1rem`, `small: .875rem`.
- Line-height: use `leading-tight` for headings, `leading-relaxed` for body text.

**Radii / Shadow**
- `rounded-2xl` for primary cards (approx radius = 1rem).
- Soft diffused shadows: use CSS var `--soft-shadow`.

**Spacing & layout rules**
- Base: `1rem = 16px`. Use `clamp()` for responsive paddings.
- Grids: mobile-first single column; desktop uses `grid` with fractional columns.
- Use `dvh` for modals when needed.

**Interaction system**
- Transitions defaults: `transition: all 300ms ease-out`.
- Hover: `translateY(-2px)`, subtle scale, raised shadow.
- Focus: `outline: 2px solid rgba(accent, .12)` + `ring-offset` subtle.
- Motion reduced: respect `prefers-reduced-motion`.

**Accessibility**
- Contrast: avoid pure black/white harshness; ensure AA contrast by tuning text color (`--muted-grey` for secondary, near-white `#F8F7F6` for primary text).
- All interactive elements: `role`, `aria-label`, keyboard focus states, hit area >=44px.

---

## Structure du document
Pour chaque écran extrait du fichier wireframe, la fiche contient :
1. **Titre / correspondance wireframe**
2. **But UX**
3. **Structure (zones & layout)**
4. **Design system appliqué (classes Tailwind / variables)**
5. **Composants React (nom, props, comportements)**
6. **Animations & micro-interactions**
7. **Contraintes techniques & rendu (Server/Client, data loading, accessible states)**

---

### 1) NAVIGATION BOTTOM BAR (Mobile)
**Wireframe**: `Navigation Bottom Bar` (MODE ATHLÈTE)

**But UX**: navigation primaire mobile, 4 onglets, visible sur toutes les vues athlète; respecter safe-area.

**Structure**:
- Container fixed bottom: height `calc(64px + env(safe-area-inset-bottom))`.
- 4 onglets égaux (flex-row, `justify-between`), each 25% width.
- Badge non-lus: small badge on Coach icon top-right.

**Styles / classes Tailwind**
- Container: `fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-softObsidian.surface border-t border-[rgba(255,255,255,0.04)] backdrop-blur-sm z-30`.
- Item: `flex-1 flex flex-col items-center justify-center gap-1 text-sm text-muted-stone/80`.
- Active item: `text-white/95` + small top indicator `w-2 h-2 rounded-full bg-mutedPastel.sage`.
- Badge: `absolute top-1 right-6 w-3 h-3 rounded-full bg-[#e85a5a]` (red notification dot).

**Component**: `<BottomNav items={[{id,label,icon,badge}]} activeId>`
- Props: `items`, `activeId`, `onSelect`.
- Behavior: keyboard accessible; arrows for nav; swipe ignored.

**Interactions**
- Tap: `scale-95` quick feedback, `transition duration-150`.
- When entering view: slight slide-up `translateY(6px -> 0)`.

**Tech notes**
- Render as Client Component (interaction, badge updates via websocket/rt updates).
- Use `position: fixed` and `env(safe-area-inset-bottom)`.

---

### 2) ACCUEIL ATHLÈTE (Mobile) — "Écran ACCUEIL"
**Wireframe**: `Écran ACCUEIL Athlète` (ATH-001, ATH-002)

**Objectif UX**: fournir un état d'encouragement immédiat (KPI motivant), mettre en avant séance suggérée et actions rapides.

**Structure** (mobile vertical stack):
1. Header sticky `h-14` (F.Y.T + profile avatar right).
2. KPI encouragement card (rounded-2xl) — priorité visuelle.
3. SessionSelector card (rounded-2xl) — chips, preview and main CTA.
4. Secondary actions (Choisir ma séance).
5. Bottom bar.

**Design / classes**
- Page container: `min-h-screen bg-softObsidian p-4 pb-[calc(64px+env(safe-area-inset-bottom))]`.
- Header: `flex items-center justify-between h-14 text-sm`.
- KPI Card: `bg-softObsidian.surface rounded-2xl p-4 shadow-[var(--soft-shadow)] border border-[rgba(255,255,255,0.03)]`.
  - Title: `text-lg font-semibold text-[--text-primary:#F8F7F6]`.
  - ProgressBar: custom component with `height: 8px; border-radius: 999px; background: linear-gradient(90deg, rgba(...sage) 0%, rgba(...sand) 100%); track: rgba(255,255,255,0.04)`.
- SessionSelector: inner chips `inline-flex px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] text-sm`. Selected chip: `bg-mutedPastel.sage/12 border-1 border-mutedPastel.sage/18`.
- Primary CTA `DÉMARRER`: `w-full rounded-2xl py-3 font-semibold bg-mutedPastel.sage text-softObsidian.surface shadow-sm`.
- Secondary CTA `Choisir ma séance`: `w-full rounded-xl py-2 border border-[rgba(255,255,255,0.04)] text-muted-stone`.

**Components & props**
- `<KpiEncouragement type="weekly" value={2} target={5} variant="progressCard" />` — props: `state` (enum: record/new/equal/approach/fallback), `progressPercent` (0-100), `message`.
- `<SessionSelector options={[...]} selected, onSelect>` — chips, preview button toggles `<SessionPreviewModal/>`.

**Interactions**
- KPI card progress animates on mount (width from 0% to value % over 500ms, ease-out).
- Chips are toggles (tap: ripple-like micro interaction `scale(0.98)` for 80ms).
- Primary CTA: elevated press animation (shadow increase, `translateY(-1px)`).

**Tech notes**
- KPI data: server-side fetched (getStaticProps or RSC) but rendered client-side progress animation.
- SessionPreviewModal: Client component, accessible, trap focus.
- All buttons must expose `aria-pressed`, `aria-label`.

---

### 3) MODAL PREVIEW SÉANCE (SessionPreview)
**Wireframe**: `Modal Preview Séance Complète` (clic SessionPreview)

**But**: lecture rapide et lancement session.

**Structure**:
- Modal container centered, max-width `min(90vw, 480px)`, rounded-2xl, padding `1rem`.
- Header: session name + close [✕].
- Scrollable list of exercises: each exercise as card with title, sets×reps, tempo, short coach note.
- Footer sticky action `DÉMARRER CETTE SÉANCE` (full width).

**Styles**
- Modal bg: `bg-softObsidian.surface border border-[rgba(255,255,255,0.03)]`.
- Exercise row: `bg-[rgba(255,255,255,0.02)] rounded-xl p-3 mb-3`.
- Icons: simple line icons in `muted-grey`.

**Interactions & animation**
- Modal appear: scale `0.95 -> 1` + opacity `0 -> 1` (300ms ease-out).
- Exercise rows: slide in with 75ms stagger.
- Close returns focus to trigger.

**Tech notes**
- Use `role="dialog" aria-modal="true" aria-labelledby`.
- Content scroll is independent, footer sticky.

---

### 4) VUE "CHOISIR MA SÉANCE" (Filters modal / page)
**Wireframe**: `Vue "Choisir ma séance"`

**But**: filtrer large catalogue et lancer session.

**Structure**:
- Header + filter chips / dropdowns stacked.
- Dropdowns: Year / Month / Week / Séance type (each is a controlled component supporting multi-select for weeks & séances).
- Result preview area (session preview + start CTA).
- Back control to return to main accueil.

**Style**
- Controls: `bg-[rgba(255,255,255,0.02)] rounded-lg px-3 py-2`.
- Active filter chips: `bg-mutedPastel.sage/10 text-mutedPastel.sage`.

**Interactions**
- Dropdown open: overlay panel anchored with keyboard & mouse interactions.
- Multi-select: pills with remove icon.

**Tech notes**
- Filters produce SQL-like query (as in wireframe). Compose query client-side and call backend API.
- Debounce searches on `exercise` autocomplete (300ms).

---

### 5) HISTORIQUE ATHLÈTE (Mobile)
**Wireframe**: `Écran HISTORIQUE Athlète` (ATH-003)

**But**: fournir vue chronologique + KPI dépliable.

**Structure**:
- Top KPI condensed card (monthly numbers) collapsible to expanded stats.
- Horizontal month scroller (touch optimized).
- List of day cards (Today, Hier, Il y a 2 jours...).

**Visual**
- Day cards: `bg-softObsidian.surface rounded-xl p-3` with icon + meta row + chevron.
- When expanded, animate height with CSS transition.

**Components**
- `<HistoryTimeline months, items />` — items virtualized for long lists.
- `<KpiDetail expanded>` — toggled state.

**Tech**
- Virtualize lists using `react-virtual` or similar for performance.
- Ensure swipe gestures don't conflict with page vertical scrolling (use pointer events detection).

---

### 6) COACH (Mobile tab) — Mon Coach
**Wireframe**: `Écran COACH (Onglet athlète)` (ATH-004..)

**But**: canal de communication coach-athlète + messages rapides + highlights.

**Structure**:
- Header
- Messages cards surfaced (swipable carousel for coach messages)
- Conversations list with unread badges

**Visual**
- Carousel card: full width rounded-2xl with dots below.
- Conversations: list-of-cards with small avatar, last message excerpt, timestamp and unread red dot.

**Animations**
- Swipe hint animation (keyframes swipe-hint provided in wireframe). Implement as CSS keyframes with a localStorage flag to run once.

**Tech**
- Carousel accessible with `aria-roledescription="carousel"`, `aria-live="polite"` for auto-advance hints; pause on touch/hover.
- Unread badges subscribe via websocket updates.

---

### 7) THREAD Conversation (Full screen thread)
**Wireframe**: `Écran THREAD Conversation` (ATH-006)

**But**: lecture / envoi messages, contexte de séance.

**Structure**:
- Header with back control + context (session).
- Scrollable message list with alternating message bubbles (right = athlete, left = coach).
- Composer: input + send button pinned to bottom above safe-area.

**Visual / classes**
- Athlete bubble: `bg-mutedPastel.sage/10 text-muted-stone self-end rounded-xl p-3 max-w-[78%]`.
- Coach bubble: `bg-[rgba(255,255,255,0.02)] text-muted-stone self-start rounded-xl p-3`.
- Timestamps small `text-xs text-muted-grey`.

**Interactions**
- Message status icons: ✓, ✓✓ as small inline svgs.
- Composer: multiline input that expands to up to 5 lines; send disabled when empty.
- Attach video action: `aria-label`.

**Tech**
- Messages streamed with web sockets; new messages autoscroll only if user at bottom, otherwise show `new messages` indicator.
- Use optimistic UI updates for send (show ✓ then sync to server).

---

### 8) PROFIL ATHLÈTE (Mon Profil)
**Wireframe**: `Écran PROFIL Athlète` (ATH-008..)

**But**: édition profil, badges, préférences, connexions.

**Structure**:
- Profile header card (avatar, name, handle, email readonly indicator edit icon for editable fields)
- Badges grid with progress bars and counts
- Preferences toggles
- Integration status (Strava)

**Visual**
- Avatar: circular or initials box `w-16 h-16 rounded-lg bg-[rgba(255,255,255,0.03)] flex items-center justify-center`.
- Badges grid: 5-column responsive grid for small squares; locked badges appear desaturated (opacity 0.25), unlocked full color and subtle glow.
- Toggles: custom switch `w-12 h-6 rounded-full` with dot moving and background `mutedPastel.sage` for ON.

**Modal Edition Profil**
- Layout as modal form; editable inputs styled `bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] rounded-lg`.
- Readonly fields: disabled with lock icon and explanatory hint.

**Tech**
- Validation client-side; save action calls batch API to Supabase; show toast confirmations.

---

### 9) MODAL DÉTAIL BADGE
**Wireframe**: `Modal Détail Badge` (ATH-010)

**But**: afficher condition, progrès, CTA.

**Structure**: SVG 64×64, title, description, progress bar, CTA close.

**Visual**
- Progress bar: full width, `height: 10px`, thumb shaded with `mutedPastel.rose` or `sage` depending on badge.
- If unlocked: show `✅ Débloqué le <date>` row.

**Tech**
- Use accessible `aria-valuenow` on progress bar.

---

## MODE COACH (Desktop) — Layout + composants

> Les écrans desktop reprennent les mêmes tokens mais densifient l'information (table-first, ultra-fine dividers, Paper-on-Dark feel).

### Principes généraux desktop coach
- Sidebar fixe (min 256px, max 320px) animé via transform for open/close.
- Main content centered with `max-width: 1440px`.
- Tables: `border-separate: collapse` alternative with ultra-fine dividers `1px solid rgba(255,255,255,0.03)`.
- Use `font-size: .9375rem` for table cell copy to increase data density.

---

### 10) SIDEBAR Coach
**Wireframe**: `Layout Principal Coach + Sidebar`

**But**: navigation persistante, quick glance.

**Structure**: vertical list of nav items with small counters and avatar block at bottom.

**Visual**
- Tooltip on collapsed state: card-like tooltips `bg-softObsidian.surface` with small drop shadow.

**Behavior**
- Hover pre-open (0-150ms), click to pin; leaving triggers close after 300ms.
- Animations: `transform translateX(-100%) -> 0` 300ms ease-out.

**Tech**
- Sidebar as Client component (interaction heavy). Overlay accessible via `aria-hidden` toggles.

---

### 11) ACCUEIL COACH (Dashboard)
**Wireframe**: `Écran ACCUEIL Coach` (COA-002..)

**But**: overview metrics, group trends, quick actions.

**Structure**:
- KPI grid (4 cards 25% each)
- RPE grouped visualization (card with sparkline & mini bars)
- Program quick access card

**Design specifics**
- KPI cards: small icon top-left, numeric big center, label small bottom.
- Chart styling: minimal axis, line stroke muted sand, fill gradient with low opacity.
- Microcopy: small grey (#bfc7c5) for meta.

**Tech**
- Charts: `recharts` or `apexcharts` SSR-safe; render client-side where required.
- Data-fetch: batched endpoints to minimize round trips.

---

### 12) PROGRAMMES Coach (Table editor)
**Wireframe**: `Écran PROGRAMMES Coach` (COA-005..)

**But**: edition tabulaire avancée (inline editable cells) avec re-order, validation et batch save.

**Structure**:
- Filter row (top)
- Charts (left or above) + table full width
- Inline editor row modes

**Table styles**
- `table-layout: auto; width: 100%;` cells min-width set.
- Row hover: `bg-[rgba(255,255,255,0.02)]`.
- Inline editable cell: `input` styled as `bg-transparent border-b-2 border-[rgba(255,255,255,0.04)]` when focused.

**Interactions**
- Re-order: drag handles (aria-grabbed) or up/down arrows.
- Add row: adds empty row with focus on first cell.
- Global save: disabled until changes exist.

**Tech**
- Use optimistic UI for inline edits; batch commit to DB.
- Use `contentEditable=false` and proper inputs to avoid accessibility issues.

---

### 13) IMPORT Coach
**Wireframe**: `Écran IMPORT Coach` (COA-007..)

**But**: importer template CSV et prévisualiser.

**Structure**: 3-step progress bar, template pick, uploader + preview table.

**Visual**
- Dropzone: dashed border `border-dashed border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center`.
- Preview table: same table style as programs.

**Interactions**
- On file drop: parse CSV client-side (Papaparse), show first 5 lines, detect warnings for missing columns.
- Provide inline fix suggestions (default rest_time_sec = 60) with quick apply.

**Tech**
- Validate CSV schema client-side before upload; allow user to map columns.
- Allow large file chunked upload.

---

### 14) MES ATHLÈTES (Coach)
**Wireframe**: `Écran MES ATHLÈTES Coach`

**But**: browse athletes, search, quick status.

**Structure**: tiles or list, quick metadata, filter tabs for team/group/week.

**Tech**: lazy-load avatars, server-side filtering, client caching.

---

### 15) MESSAGES (Coach)
**Wireframe**: `Écran MESSAGES Coach`

**But**: centraliser conversations côté coach.

**Structure**: search & filter header, list of conversation rows, detail pane optional (split view on wide screens).

**Visual**: same chat styling as mobile, but denser, show unread counts.

**Tech**: split pane for desktop — click row opens conversation in right pane; maintain websocket connections per open pane.

---

### 16) PARAMÈTRES Coach
**Wireframe**: `Écran PARAMÈTRES Coach`

**But**: manage coach preferences & integrations.

**Structure**: form groups, toggles, integrations, data export and logout action.

**Tech**: Save to Supabase and external integrations handshake (Strava) with OAuth state.

---

## Spécifications d’implémentation communes (Contrat pour Claude Opus)

1. **Architecture React 19**
   - Prefer RSC (React Server Components) for static/dataloaded sections (Dashboard cards), and Client Components for interactive parts (modals, chat, inline editing).
   - Suggested file structure: `components/ui/*`, `components/screens/*`, `lib/api/*`.

2. **Tailwind CSS 4**
   - Provide `tailwind.config.js` with `theme.extend` tokens above.
   - Use `@apply` in component CSS for common patterns (cards, buttons).

3. **State management**
   - Local state with React hooks + SWR/React Query for remote data caching.
   - Websockets for chat / live badges (use shared hook `useSocket`).

4. **Accessibility**
   - All modals: focus trap, `aria-modal`, labelled close.
   - Tables: `aria-sort` when sortable, keyboard navigation for inline editing.

5. **Animations**
   - Implement general motion utils (e.g. `motion-fade`, `motion-slide-up`) and respect `prefers-reduced-motion`.

6. **Testing & visual QA**
   - Storybook stories for each UI component and main screen.
   - Visual regression tests (Percy or Playwright snapshots) using the defined tokens.

7. **Performance**
   - Use memoization and virtualization for long lists.
   - Defer non-critical charts to client hydration.

---

## Livraison / Fichiers à générer pour Claude Opus
1. `tailwind.config.js` (theme tokens + safelist classes)
2. `design-tokens.json` (colors, spacing, typography)
3. `components/` (React components skeletons with props documented)
4. `screens/` (one file per screen implementing structure & placeholder data)
5. `animations.css` (keyframes & utility classes)
6. `accessibility.md` (aria contract)

---

### Remarque finale
Le document ci-dessus est structuré pour que **Claude Opus** puisse générer des composants React 19 et styles Tailwind 4 de façon fiable et atomique. Chaque écran correspond au wireframe fourni et contient : objectif UX, structure exacte, classes/util tokens, composants React suggérés, interactions et contraintes techniques.

Si tu veux, je peux maintenant :
- générer **un export JSON** structuré (écrans -> composants -> props) prêt à ingérer par Claude Opus, ou
- générer **les composants React + Tailwind** pour 1 écran de démonstration (p.ex. `Accueil Athlète`).

Indique ta préférence pour la suite et j’exécute immédiatement.

