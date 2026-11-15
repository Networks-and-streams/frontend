import { expect, test } from '@playwright/test';
import { runAlgorithm, useSession } from './helpers';

/**
 * §4.1 — minty.spec.ts
 *
 * Sample graph (5 vertices, source 1):
 *   1→2:5, 1→3:2, 2→4:3, 3→4:6, 2→5:1
 * Shortest distances from 1: d(2)=5, d(3)=2, d(4)=8 (two tied routes), d(5)=6.
 */
test.describe('Minty shortest paths', () => {
	test('computes distances and shows every tied shortest route', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'minty' });
		await page.goto('/graph');

		// The editor opens with the reference sample graph already loaded.
		await expect(page.locator('#graph-vertices')).toHaveValue('5');
		await expect(page.locator('#graph-source')).toHaveValue('1');

		await runAlgorithm(page, { algorithm: 'minty' });

		// Distances.
		await expect(page.getByRole('heading', { name: 'Shortest paths from vertex 1' })).toBeVisible();
		await expect(page.getByText('To 2:', { exact: true })).toBeVisible();
		await expect(page.getByText('weight: 5', { exact: true })).toBeVisible();
		await expect(page.getByText('To 3:', { exact: true })).toBeVisible();
		await expect(page.getByText('weight: 2', { exact: true })).toBeVisible();
		await expect(page.getByText('To 5:', { exact: true })).toBeVisible();
		await expect(page.getByText('weight: 6', { exact: true })).toBeVisible();

		// Vertex 4 is reachable by two equally short routes — both are listed.
		await expect(page.getByText('To 4:', { exact: true })).toBeVisible();
		await expect(page.getByText('weight: 8', { exact: true })).toBeVisible();
		await expect(page.getByText('1 -> 2 -> 4', { exact: true })).toBeVisible();
		await expect(page.getByText('1 -> 3 -> 4', { exact: true })).toBeVisible();

		// Visualization + trace are in place.
		await expect(page.getByRole('img', { name: 'Graph with 5 vertices and 5 edges' })).toBeVisible();
		await expect(page.getByText(/^step \d+ \/ \d+$/)).toBeVisible();
	});
});
