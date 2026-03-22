import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;
    readonly coachLoginButton: Locator;
    readonly demoButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByPlaceholder('nom@exemple.com');
        this.passwordInput = page.getByPlaceholder('••••••••');
        // Main login button is usually the only 'submit' button in the form
        this.loginButton = page.locator('button[type="submit"]');
        // Coach login is a secondary 'button' type
        this.coachLoginButton = page.locator('button:has-text("Me connecter en tant que coach")');
        this.demoButton = page.getByRole('button', { name: /Essayer la démo/i });
        this.errorMessage = page.locator('div[class*="text-[var(--color-danger)]"]');
    }

    async goto() {
        await this.page.goto('/');
    }

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

    async loginAsCoach(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.coachLoginButton.click();
    }

    async startDemo() {
        await this.demoButton.click();
    }

    async expectErrorMessage(message: string | RegExp) {
        await expect(this.errorMessage).toBeVisible();
        await expect(this.errorMessage).toContainText(message);
    }
}
