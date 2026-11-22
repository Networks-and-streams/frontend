import { expect, test } from '@playwright/test';
import { useSession } from './helpers';

/**
 * Theme switching (light / dark).
 *
 * The pill lives on /auth and in the app header; the choice is the `.dark`
 * class on <html>, persisted in localStorage and re-applied before first
 * paint by the inline script in index.html (a reload proves that path).
 */
test.describe('Theme switching', () => {
	test('the pill toggles the dark class and survives a reload', async ({ page }) => {
		await page.goto('/auth');
		const html = page.locator('html');
		const pill = page.getByRole('group', { name: 'Theme' });

		// Dark is the product default.
		await expect(html).toHaveClass(/dark/);
		await expect(pill.getByRole('button', { name: 'Light theme' })).toBeVisible();
		await expect(pill.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');

		// Switch to light: class removed, button pressed, body background flips.
		await pill.getByRole('button', { name: 'Light theme' }).click();
		await expect(html).not.toHaveClass(/dark/);
		await expect(pill.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

		// Persisted: the inline pre-paint script restores it on reload (no dark flash).
		await page.reload();
		await expect(page.locator('html')).not.toHaveClass(/dark/);
		await expect(
			page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light theme' }),
		).toHaveAttribute('aria-pressed', 'true');

		// And back to dark.
		await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark theme' }).click();
		await expect(html).toHaveClass(/dark/);
	});

	test('the workspace canvas survives a theme switch', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'theme-canvas' });

		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/graph');
		await expect(page.locator('#algorithm-select')).toBeVisible();

		await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light theme' }).click();
		await expect(page.locator('html')).not.toHaveClass(/dark/);

		// The cytoscape container is still there and no runtime error fired
		// (the stylesheet re-materialization must not break rendering).
		await expect(page.locator('[role="img"]').first()).toBeVisible();
		expect(errors).toEqual([]);
	});
});
