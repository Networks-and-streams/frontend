import { expect, test } from '@playwright/test';
import { useSession } from './helpers';

/**
 * §4.1 — savedGraphs.spec.ts
 *
 * CRUD round-trip of the "My Graphs" collection: name → Save → toast →
 * item in the list → survives a reload → Open restores the editor →
 * badge flips to "Saved" → delete with confirmation → toast → gone.
 */
test.describe('Saved graphs', () => {
	test('saves, reloads, opens and deletes a graph', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'graphs' });
		await page.goto('/graph');

		const name = `E2E-graph-${Date.now().toString(36)}`;
		const openSelector = `[title='Open "${name}"']`;

		// --- Save -------------------------------------------------------
		await page.locator('#graph-name').fill(name);
		await page.getByRole('button', { name: 'Save', exact: true }).click();

		await expect(page.locator('[role="status"]').filter({ hasText: 'Graph saved' })).toBeVisible();

		// --- Appears in "My Graphs" ------------------------------------
		await expect(page.locator(openSelector)).toBeVisible();

		// --- Survives a full page reload --------------------------------
		await page.reload();
		await expect(page.locator(openSelector)).toBeVisible();

		// --- Open it back into the editor --------------------------------
		await page.locator(openSelector).click();
		await expect(page.locator('#graph-name')).toHaveValue(name);
		await expect(page.getByText('Saved', { exact: true })).toBeVisible();

		// --- Delete (confirm step) ----------------------------------------
		await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
		await expect(page.getByText('Delete?', { exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Yes', exact: true }).click();

		await expect(page.locator('[role="status"]').filter({ hasText: 'Graph deleted' })).toBeVisible();
		await expect(page.locator(openSelector)).toHaveCount(0);
	});

	test('keeps local edits unsaved until Save is pressed', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'graphs' });
		await page.goto('/graph');

		// Typing a name alone never hits the backend.
		await page.locator('#graph-name').fill(`Draft-${Date.now().toString(36)}`);
		await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

		// Starting over clears the editor without saving anything.
		await page.getByRole('button', { name: 'New', exact: true }).click();
		await expect(page.locator('#graph-name')).toHaveValue('');
	});
});
