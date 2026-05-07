// ============================================================
// Test E2E — Authentification F.Y.T
// tests/e2e/auth.spec.ts
//
// Test #001 — AUTH-2 : Démarrer le mode démo
// Cf docs/QA_TEST_PLAN.md §7 pour le scénario détaillé.
// ============================================================

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { AthleteHomePage } from '../pages/AthleteHomePage';
import { mockDemoSession } from '../fixtures/supabase-mocks';

test.describe('Authentification', () => {
  test.describe('AUTH-2 — Mode démo', () => {
    test('un visiteur peut lancer le mode démo et atterrir sur l\'accueil athlète', async ({ page }) => {
      // ÉTAPE 1 — Préparation
      // On installe les mocks Supabase AVANT de naviguer, sinon les premiers
      // appels du SDK partiront en vrai vers le backend.
      await mockDemoSession(page);

      const authPage = new AuthPage(page);
      const homePage = new AthleteHomePage(page);

      // ÉTAPE 2 — On arrive sur la page de connexion
      await authPage.goto();
      await authPage.expectLoaded();

      // ÉTAPE 3 — Clic sur "Essayer la démo"
      // → handleDemoMode déclenche createDemoSession() (3 appels Supabase mockés)
      // → puis window.location.reload() qui remonte l'app avec la session démo.
      await authPage.clickEssayerDemo();

      // ÉTAPE 4 — Vérifier qu'on est arrivé sur l'accueil athlète
      // expect attend automatiquement que l'élément apparaisse (auto-waiting).
      await homePage.expectDemoBannerVisible();
      await homePage.expectGreetingVisible();

      // ÉTAPE 5 — Vérifier les flags localStorage du mode démo
      const demoSessionId = await page.evaluate(() => localStorage.getItem('fyt_demo_session_id'));
      const demoProfileId = await page.evaluate(() => localStorage.getItem('fyt_demo_profile_id'));
      expect(demoSessionId).not.toBeNull();
      expect(demoProfileId).not.toBeNull();
    });
  });
});
