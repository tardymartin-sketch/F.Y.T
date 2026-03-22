import { Page, Locator, expect } from '@playwright/test';

export class ActiveSessionPage {
    readonly page: Page;
    readonly finishButton: Locator;
    readonly sessionRpeModal: Locator;
    readonly confirmFinishButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.finishButton = page.locator('[data-tour-id="tour-finish-session-button"]');
        this.sessionRpeModal = page.locator('div:has-text("Séance terminée !")');
        this.confirmFinishButton = page.getByRole('button', { name: /Valider \(RPE/i });
    }

    async fillExerciseSet(exerciseIndex: number, reps: string, weight: string) {
        const exerciseTile = this.page.locator(`[data-tour-id="tour-exercise-tile"]`).nth(exerciseIndex);
        
        // If not expanded, click to expand
        if (await exerciseTile.locator('button:has-text("Démarrer")').isVisible()) {
             await exerciseTile.locator('button:has-text("Démarrer")').click();
        }

        const repsInput = this.page.locator(`[data-tour-id="tour-reps-input"]`).nth(exerciseIndex).locator('input');
        const weightInput = this.page.locator(`[data-tour-id="tour-weight-input"]`).nth(exerciseIndex).locator('input');
        const validateButton = this.page.locator(`[data-tour-id="tour-validate-set-button"]`).nth(exerciseIndex);

        await repsInput.fill(reps);
        await weightInput.fill(weight);
        await validateButton.click();
    }

    async setExerciseRpe(exerciseIndex: number, rpe: number) {
        const rpeSection = this.page.locator(`[data-tour-id="tour-exercise-rpe"]`).nth(exerciseIndex);
        await rpeSection.getByRole('button', { name: String(rpe), exact: true }).click();
    }

    async addComment(exerciseIndex: number, comment: string) {
        const commentSection = this.page.locator(`[data-tour-id="tour-message-section"]`).nth(exerciseIndex);
        await commentSection.locator('textarea, input[type="text"]').fill(comment);
        await commentSection.locator('button').click();
    }

    async finishSession(sessionRpe: number) {
        await this.finishButton.click();
        await expect(this.sessionRpeModal).toBeVisible();
        await this.page.getByRole('button', { name: String(sessionRpe), exact: true }).click();
        await this.confirmFinishButton.click();
    }

    async expectSuccessToast() {
        // Based on common patterns, look for a toast or redirect to home
        await expect(this.page).toHaveURL(/.*#home/);
    }
}
