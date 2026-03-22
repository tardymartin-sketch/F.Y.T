import { Page, Locator, expect } from '@playwright/test';

export class AthleteHomePage {
    readonly page: Page;
    readonly greeting: Locator;
    readonly startButton: Locator;
    readonly resumeButton: Locator;
    readonly chooseMySessionButton: Locator;
    readonly bottomNav: Locator;
    readonly historyTab: Locator;
    readonly statsTab: Locator;
    readonly coachTab: Locator;
    readonly profileTab: Locator;

    constructor(page: Page) {
        this.page = page;
        this.greeting = page.getByText(/Bonjour|Salut|Bonsoir|Hey|Prêt à repousser/i);
        this.startButton = page.locator('[data-tour-id="tour-start-session-button"]');
        this.resumeButton = page.getByRole('button', { name: /Reprendre/i });
        this.chooseMySessionButton = page.getByRole('button', { name: /Choisir ma séance/i });
        this.bottomNav = page.getByRole('navigation', { name: 'Navigation principale' });
        this.historyTab = this.bottomNav.getByRole('button', { name: 'Historique' });
        this.statsTab = this.bottomNav.getByRole('button', { name: 'Stats' });
        this.coachTab = this.bottomNav.getByRole('button', { name: 'Coach' });
        this.profileTab = this.bottomNav.getByRole('button', { name: 'Profil' });
    }

    async selectSession(sessionName: string) {
        await this.page.getByRole('button', { name: sessionName, exact: true }).click();
    }

    async startSession() {
        await this.startButton.click();
    }

    async goToHistory() {
        await this.historyTab.click();
    }

    async goToStats() {
        await this.statsTab.click();
    }

    async goToCoach() {
        await this.coachTab.click();
    }

    async goToProfile() {
        await this.profileTab.click();
    }

    async expectGreetingVisible() {
        // We wait for the greeting to be visible as the primary indicator of being on the home page.
        // It's more robust than checking the URL which might not have #home immediately after a reload.
        await expect(this.greeting.first()).toBeVisible({ timeout: 15000 });
    }
}
