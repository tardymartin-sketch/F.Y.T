import { test, expect, devices } from '@playwright/test';
import { AuthPage } from './pom/AuthPage';
import { AthleteHomePage } from './pom/AthleteHomePage';

test.use({ ...devices['Pixel 5'] });

test.describe('Login & Navigation', () => {
    test('devrait se connecter et afficher le tableau de bord athlète', async ({ page }) => {
        const authPage = new AuthPage(page);
        const homePage = new AthleteHomePage(page);

        // 1. Accéder à l'application
        await authPage.goto();

        // 2. Se connecter
        await authPage.login('athlete.rock@test.com', 'Rock2025!');

        // 3. Vérifier la présence du message de bienvenue
        await homePage.expectGreetingVisible();
    });

    test('devrait afficher une erreur avec des identifiants invalides', async ({ page }) => {
        const authPage = new AuthPage(page);

        await authPage.goto();
        await authPage.login('wrong@test.com', 'wrongpassword');

        await authPage.expectErrorMessage('Invalid login credentials');
    });

    test('devrait pouvoir lancer le mode démo', async ({ page }) => {
        const authPage = new AuthPage(page);
        const homePage = new AthleteHomePage(page);

        await authPage.goto();
        await authPage.startDemo();

        // Le mode démo recharge la page, on attend que l'accueil s'affiche
        await homePage.expectGreetingVisible();
    });
});
