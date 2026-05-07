// ============================================================
// Page Object Model — Page d'authentification
// tests/pages/AuthPage.ts
//
// Pourquoi un POM : on isole la connaissance des sélecteurs et des
// actions de la page Auth dans une seule classe. Si demain le bouton
// "Essayer la démo" change de texte, on modifie UN seul endroit.
//
// Règles internes (cf playwright_ai_rules.md) :
//   - Locators user-facing en priorité (getByRole > getByLabel > getByText)
//   - Pas de sélecteur CSS dynamique
//   - Aucun waitForTimeout — auto-attente Playwright via expect()
// ============================================================

import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;

  // Locators définis dans le constructeur — 1 seule source de vérité
  readonly demoButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Bouton "Essayer la démo" — texte exact dans Auth.tsx ligne 311
    // Le bouton contient aussi un icône Play, mais getByRole filtre sur le name accessible.
    this.demoButton = page.getByRole('button', { name: /Essayer la démo/i });

    // Inputs du formulaire login (utilisés par les tests AUTH-1 / AUTH-3 plus tard)
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/mot de passe/i);
    this.submitButton = page.getByRole('button', { name: /se connecter/i });
  }

  /**
   * Va sur la page de connexion (racine de l'app).
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Vérifie que la page d'auth est bien chargée
   * (le bouton "Essayer la démo" est visible).
   */
  async expectLoaded(): Promise<void> {
    await expect(this.demoButton).toBeVisible();
  }

  /**
   * Clique sur "Essayer la démo".
   * NE retourne PAS tant que le clic n'est pas effectué (Playwright auto-await).
   * Le reload qui suit (window.location.reload dans handleDemoMode) sera
   * géré par les assertions dans AthleteHomePage.
   */
  async clickEssayerDemo(): Promise<void> {
    await this.demoButton.click();
  }
}
