import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { CoachDashboardPage, ProgramEditorPage } from '../pom/ProgramEditorPage';

test.describe('Coach - Program Management', () => {
    test.skip('devrait créer un nouveau programme pour ses athlètes', async ({ page }) => {
        const authPage = new AuthPage(page);
        const dashboard = new CoachDashboardPage(page);
        const programEditor = new ProgramEditorPage(page);

        // 1. Connexion Coach
        await authPage.goto();
        await authPage.loginAsCoach('coach.ben@test.com', 'Coach2025!');
        
        // 2. Navigation vers la bibliothèque
        await dashboard.goToLibrary();
        
        // 3. Aller sur l'onglet Programmes
        await programEditor.goToProgramsTab();
        
        // 4. Ouvrir le formulaire de création
        await programEditor.openNewProgramForm();
        
        // 5. Remplir les détails
        const programName = `E2E Test Program ${Date.now()}`;
        // On choisit des dates dans le futur (prochain mois)
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const startDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-28`;
        
        await programEditor.fillProgramDetails(programName, startDate, endDate);
        
        // 6. Sélectionner une séance (On suppose "Full Body A" existe car c'est un classique)
        // En E2E réel, on pourrait avoir besoin de créer une séance d'abord ou d'utiliser une existante connue.
        // On va essayer de prendre la première séance disponible dans le dropdown s'il y en a.
        await page.getByRole('button', { name: /Selectionner des seances/i }).click();
        const firstSession = page.locator('div[class*="bg-theme-secondary"] button').first();
        await expect(firstSession).toBeVisible();
        const sessionName = await firstSession.innerText();
        await firstSession.click();
        
        // 7. Sélectionner tous les athlètes
        await programEditor.selectAllAthletes();
        
        // 8. Sauvegarder
        await programEditor.saveProgram();
        
        // 9. Vérifier la présence dans la liste
        await programEditor.expectProgramInList(programName);
    });
});
