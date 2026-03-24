import { test, expect, devices } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { AthleteHomePage } from '../pom/AthleteHomePage';
import { ActiveSessionPage } from '../pom/ActiveSessionPage';

test.use({ ...devices['Pixel 5'] });

test.describe('Athlete - Perfect Session', () => {
    test('devrait effectuer une séance complète avec succès', async ({ page }) => {
        const authPage = new AuthPage(page);
        const homePage = new AthleteHomePage(page);
        const activeSessionPage = new ActiveSessionPage(page);

        // 1. Connexion
        await authPage.goto();
        await authPage.login('athlete.rock@test.com', 'Rock2025!');
        await homePage.expectGreetingVisible();

        // 2. Sélection de la première séance disponible
        // On attend que les données soient chargées
        const firstSessionChip = page.locator('[data-tour-id="tour-session-selector"] button').first();
        await expect(firstSessionChip).toBeVisible({ timeout: 10000 });
        const sessionNameText = await firstSessionChip.innerText();
        const sessionName = sessionNameText.trim().split('\n')[0].trim();
        await firstSessionChip.click({ force: true });

        // 3. Démarrer la séance
        // On attend que le bouton devienne actif après la sélection
        await expect(homePage.startButton).toBeEnabled();
        await homePage.startSession();
        
        // On vérifie qu'on est sur l'écran de séance en cherchant le titre de la séance
        // Using locator('h1').filter() avoids strict text mismatches due to whitespace/newlines.
        await expect(page.locator('h1').filter({ hasText: new RegExp(sessionName, 'i') }).first()).toBeVisible({ timeout: 15000 });

        // 4. Remplir le premier exercice
        // On remplit 10 reps à 50kg pour la première série
        await activeSessionPage.fillExerciseSet(0, '10', '50');
        
        // 5. Ajouter un commentaire
        await activeSessionPage.addComment(0, 'Feeling strong today! (E2E Test)');

        // 6. Définir le RPE de l'exercice
        await activeSessionPage.setExerciseRpe(0, 7);

        // 7. Terminer la séance
        // On définit un RPE de session de 8
        await activeSessionPage.finishSession(8);

        // 8. Vérifier le retour à l'accueil
        await homePage.expectGreetingVisible();
    });
});
