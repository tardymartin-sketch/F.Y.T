# Design System — F.Y.T

## Product Context
- **What this is:** Mobile-first workout tracker for solo athletes. Create sessions once, reuse them with last-used weights prefilled.
- **Who it's for:** Solo athletes (no coach-athlete duality). One-handed mobile use at the gym.
- **Space/industry:** Fitness / workout logging (peers: Strong, Hevy, Strava)
- **Project type:** Mobile web app (React + Vite, Supabase backend)

## Aesthetic Direction
- **Direction:** Clean / Athletic — "Scoreboard" direction
- **Decoration level:** Minimal — typography and spacing do all the work. No decorative blobs, gradients, or icon grids.
- **Mood:** The weights and session names are the hero. Logging a set should feel like posting a score, not filling a form. Professional tool energy, not lifestyle brand.
- **Competitive positioning:** Every other fitness app (Strong, Hevy, Strava) uses cold grays + Inter/system fonts. F.Y.T uses warm neutrals + Cabinet Grotesk — the only typographically ambitious app in the category.

## Typography
- **Display / Session names / Hero headings:** [Cabinet Grotesk](https://fonts.google.com/specimen/Cabinet+Grotesk) Weight 700–900 — geometric, confident. Unused in the fitness category. Session names like "Bench Day" should feel editorial.
- **Body / Labels / Navigation:** [Geist](https://vercel.com/font) Weight 300–600 — clean, modern, minimal. Optimized for UI.
- **Weights / Reps / Timers (numeric data):** [Geist Mono](https://vercel.com/font) Weight 400–500 with `font-variant-numeric: tabular-nums` — makes "100 kg × 8" feel precise and earned.
- **Loading:** Google Fonts CDN (Cabinet Grotesk), Vercel CDN or self-hosted (Geist, Geist Mono)
- **Scale:**
  ```
  Display:  72px / Cabinet Grotesk 800 / tracking -0.04em / line-height 0.95
  Title:    28px / Cabinet Grotesk 700 / tracking -0.03em / line-height 1.1
  Heading:  20px / Cabinet Grotesk 600 / tracking -0.02em
  Body:     16px / Geist 400          / tracking 0        / line-height 1.6
  Label:    13px / Geist 500          / tracking 0
  Caption:  11px / Geist Mono 500     / tracking 0.1em    / UPPERCASE (section headers only)
  Scoreboard: 44px / Geist Mono 500  / tabular-nums       / line-height 1
  ```

## Color
- **Approach:** Restrained — 1 accent + warm neutrals. Color is rare and meaningful.
- **Accent:** `#D97706` (amber) — associates with achievement, craft, gold. Not used by Strong, Hevy, Strava, WHOOP, or Nike. Completely unowned territory in the fitness category.
- **Accent Dark:** `#B45309` — hover states, pressed state on CTA
- **Accent Light:** `#FEF3C7` — featured template card background, subtle highlights

### Light mode (default)
```
Background:    #FAFAF9  (warm off-white — not cold gray)
Surface:       #FFFFFF
Surface 2:     #F4F3F1  (input backgrounds, scoreboards)
Border:        #E5E4E0
Text Primary:  #0C0C0B
Text Secondary: #4B4A47
Text Muted:    #8B8A86
```

### Dark mode
```
Background:    #111110  (warm near-black — not blue-black)
Surface:       #1C1C1A
Surface 2:     #252523
Border:        #2E2E2B
Text Primary:  #F7F7F6
Text Secondary: #C4C3BF
Text Muted:    #6B6A66
Accent:        #F59E0B  (slightly brighter in dark mode)
```

### Semantic
```
Success: #059669  / bg #D1FAE5  (dark: #064E3B / #6EE7B7)
Warning: #D97706  (same as accent — intentional)
Error:   #DC2626  / bg #FEE2E2  (dark: #7F1D1D / #FCA5A5)
Info:    #2563EB
```

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — not cramped like Strong, not airy like WHOOP. Every element gets room to breathe but the UI stays efficient for one-handed logging.
- **Scale:**
  ```
  2xs:  2px
  xs:   4px
  sm:   8px
  md:  16px
  lg:  24px
  xl:  32px
  2xl: 48px
  3xl: 64px
  ```

## Layout
- **Approach:** Grid-disciplined — consistent column alignment, predictable tap targets. One-handed mobile use is the primary constraint.
- **Grid:** 4-column mobile (16px gutters, 16px margin), 12-column desktop
- **Max content width:** 480px (mobile-first, no wide desktop dashboard needed in Phase 1)
- **Border radius:**
  ```
  sm:   4px  (badges, tags)
  md:   8px  (inputs, buttons)
  lg:  12px  (cards, component cards)
  xl:  16px  (scoreboard, phone-scale cards)
  2xl: 24px  (phone shell, bottom sheets)
  full: 9999px (pills, tab indicators)
  ```
- **Bottom tab navigation:** 4 tabs — Active, Récents, Templates, Réglages. Standard pattern, expected by users.
- **Tap targets:** Minimum 44×44px for all interactive elements (WCAG AA + Apple HIG)

## Motion
- **Approach:** Intentional — only transitions that aid comprehension. Nothing decorative.
- **Easing:** enter: `ease-out`, exit: `ease-in`, move: `ease-in-out`
- **Duration:**
  ```
  micro:  50–100ms  (button press, toggle state)
  short:  150–250ms (panel enter/exit, tab switch)
  medium: 250–400ms (sheet slide-up, modal open)
  long:   400–700ms (session complete celebration)
  ```
- **Reduced motion:** Always wrap animations in `@media (prefers-reduced-motion: reduce)` — skip or reduce all transitions.
- **Specific patterns:**
  - Set logged → brief scale pulse on the scoreboard row (micro, ease-out)
  - Exercise complete → amber dot fills in (short, ease-out)
  - Session complete → score-reveal animation on total volume (medium, only if no reduced motion)

## CSS Custom Properties

Full token set for implementation:

```css
:root {
  /* Accent */
  --color-accent: #D97706;
  --color-accent-dark: #B45309;
  --color-accent-light: #FEF3C7;

  /* Light mode surfaces */
  --color-bg: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-surface-2: #F4F3F1;
  --color-border: #E5E4E0;
  --color-text-primary: #0C0C0B;
  --color-text-secondary: #4B4A47;
  --color-text-muted: #8B8A86;

  /* Semantic */
  --color-success: #059669;
  --color-success-bg: #D1FAE5;
  --color-error: #DC2626;
  --color-error-bg: #FEE2E2;
  --color-info: #2563EB;

  /* Typography */
  --font-display: 'Cabinet Grotesk', sans-serif;
  --font-body: 'Geist', sans-serif;
  --font-mono: 'Geist Mono', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Motion */
  --duration-micro: 75ms;
  --duration-short: 200ms;
  --duration-medium: 300ms;
  --duration-long: 500ms;
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-move: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  --color-accent: #F59E0B;
  --color-bg: #111110;
  --color-surface: #1C1C1A;
  --color-surface-2: #252523;
  --color-border: #2E2E2B;
  --color-text-primary: #F7F7F6;
  --color-text-secondary: #C4C3BF;
  --color-text-muted: #6B6A66;
  --color-success-bg: #064E3B;
  --color-error-bg: #7F1D1D;
}
```

## Anti-patterns (Never Use)

- Purple/violet gradients as accent
- 3-column feature grid with icons in colored circles
- Gradient buttons as primary CTA
- Inter, Roboto, Arial, Helvetica as primary font (overused in the category)
- Cold blue-gray backgrounds (every competitor does this)
- Full-bleed video/photo hero sections (this is a tool, not a lifestyle brand)
- Decorative blobs, particles, or animated backgrounds

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | Cabinet Grotesk for display | Unused in fitness category. Makes session names feel editorial and owned. |
| 2026-04-16 | Geist Mono for numeric data | Tabular-nums alignment, precise feel. "100 kg × 8" reads like a score. |
| 2026-04-16 | Amber accent (#D97706) | Not used by any major fitness app. Associates with achievement/gold. |
| 2026-04-16 | Warm neutrals (#FAFAF9, #111110) | Every competitor uses cold blue-gray. Differentiation by temperature. |
| 2026-04-16 | Light-first default | Unusual in fitness (most apps are dark-first). Signals "professional tool." |
| 2026-04-16 | Minimal decoration | Typography carries the aesthetic. No decorative chrome. |
| 2026-04-16 | Scoreboard layout for set logging | Weights and reps as dominant display numbers. Logging a set = posting a score. |
