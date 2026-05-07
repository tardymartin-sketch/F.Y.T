// ============================================================
// Page Object Model — Accueil athlète (mobile)
// tests/pages/AthleteHomePage.ts
//
// Cible : l'écran qu'un athlète voit après connexion sur Pixel 5.
// Composant React : src/components/mobile/HomeMobile.tsx
//
// Sélecteurs choisis :
//   - Greeting : "Bonjour|Salut|Bonsoir|Hey ${firstName}" (cf HomeMobile.tsx ligne 148-151)
//     On accepte les 4 variantes via une regex pour ne pas dépendre de l'heure de run.
//   - DemoBanner : span "DÉMO" (cf DemoBanner.tsx ligne 30)
//     Visible y compris en mobile (le texte long "Tu explores..." est lui caché).
// ============================================================

import { Page, Locator, expect } from '@playwright/test';

export class AthleteHomePage {
  readonly page: Page;

  readonly demoBannerBadge: Locator;
  readonly demoBannerExitButton: Locator;
  readonly greeting: Locator;

  constructor(page: Page) {
    this.page = page;

    // Badge "DÉMO" (texte exact, en majuscules dans le composant DemoBanner)
    this.demoBannerBadge = page.getByText('DÉMO', { exact: true });

    // Bouton "Déconnexion" du DemoBanner
    this.demoBannerExitButton = page.getByRole('button', { name: /Déconnexion/i });

    // Greeting (heure-dépendant) : on accepte les 4 formes possibles
    // Bonjour / Salut / Bonsoir / Hey suivi du prénom (Demo)
    this.greeting = page.getByText(/^(Bonjour|Salut|Bonsoir|Hey)\s+/);
  }

  /**
   * Vérifie que le DemoBanner est visible — preuve qu'on est connecté en mode démo.
   * Auto-await de Playwright : si la bannière met du temps à apparaître après le
   * reload, expect attend (timeout par défaut : 5s).
   */
  async expectDemoBannerVisible(): Promise<void> {
    await expect(this.demoBannerBadge).toBeVisible();
    await expect(this.demoBannerExitButton).toBeVisible();
  }

  /**
   * Vérifie que la page d'accueil athlète est rendue (greeting visible).
   * En mode démo, le firstName généré peut varier (random). On match le préfixe.
   */
  async expectGreetingVisible(): Promise<void> {
    await expect(this.greeting).toBeVisible();
  }
}
