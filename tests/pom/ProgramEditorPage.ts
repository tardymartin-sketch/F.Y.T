import { Page, Locator, expect } from '@playwright/test';

export class CoachDashboardPage {
    readonly page: Page;
    readonly sidebar: Locator;
    readonly libraryTab: Locator;
    readonly teamTab: Locator;
    readonly hamburgerButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.sidebar = page.getByRole('navigation', { name: 'Navigation coach' });
        this.libraryTab = page.locator('button:has-text("Exercices et Séances")');
        this.teamTab = page.locator('button:has-text("Mes Athlètes")');
        this.hamburgerButton = page.getByLabel(/Ouvrir le menu|Fermer le menu/i);
    }

    async openSidebar() {
        // En desktop, la sidebar peut être masquée (mode replié)
        // On vérifie l'attribut aria-expanded du bouton hamburger
        if (await this.hamburgerButton.isVisible()) {
            const isExpanded = await this.hamburgerButton.getAttribute('aria-expanded');
            if (isExpanded !== 'true') {
                await this.hamburgerButton.click();
            }
        }
        // On attend que la navigation soit prête
        await expect(this.libraryTab).toBeVisible({ timeout: 10000 });
        // Petit délai pour l'animation CSS (transition-transform duration-300)
        await this.page.waitForTimeout(400);
    }

    async goToLibrary() {
        await this.openSidebar();
        await this.libraryTab.click();
    }

    async goToTeam() {
        await this.openSidebar();
        await this.teamTab.click();
    }
}

export class ProgramEditorPage {
    readonly page: Page;
    readonly newProgramButton: Locator;
    readonly programNameInput: Locator;
    readonly startDateInput: Locator;
    readonly endDateInput: Locator;
    readonly sessionDropdown: Locator;
    readonly athletesTab: Locator;
    readonly selectAllAthletesButton: Locator;
    readonly programsTab: Locator;
    readonly createButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.newProgramButton = page.getByRole('button', { name: /Nouveau/i });
        this.programsTab = page.getByRole('button', { name: /Programmes/i });
        this.programNameInput = page.getByPlaceholder(/Ex: Preparation physique Janvier/i);
        this.startDateInput = page.locator('input[type="date"]').first();
        this.endDateInput = page.locator('input[type="date"]').last();
        this.sessionDropdown = page.getByRole('button', { name: /Selectionner des seances/i });
        this.athletesTab = page.getByRole('button', { name: /Athletes/i });
        this.selectAllAthletesButton = page.getByRole('button', { name: /Tout selectionner/i });
        this.createButton = page.getByRole('button', { name: /Creer le programme/i });
    }

    async goToProgramsTab() {
        await this.programsTab.click();
    }

    async openNewProgramForm() {
        await this.newProgramButton.click();
    }

    async fillProgramDetails(name: string, startDate: string, endDate: string) {
        await this.programNameInput.fill(name);
        await this.startDateInput.fill(startDate);
        await this.endDateInput.fill(endDate);
    }

    async selectSession(sessionName: string) {
        await this.sessionDropdown.click();
        await this.page.getByRole('button', { name: sessionName, exact: true }).click();
        // Click outside to close dropdown if needed, but the current UI might close it on click
    }

    async selectAllAthletes() {
        await this.athletesTab.click();
        await this.selectAllAthletesButton.click();
    }

    async saveProgram() {
        await this.createButton.click();
    }

    async expectProgramInList(name: string) {
        await expect(this.page.getByText(name)).toBeVisible();
    }
}
