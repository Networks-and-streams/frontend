import { expect, test } from '@playwright/test';
import { runAlgorithm, useSession } from './helpers';

/**
 * §4.1 — flow.spec.ts
 *
 * Sample graph with sink 4 (1→2:5, 1→3:2, 2→4:3, 3→4:6, 2→5:1):
 *   max_flow = 5 == min_cut = 5,
 *   source side [1, 2, 5], sink side [3, 4],
 *   cut edges 1→3 (cap 2) and 2→4 (cap 3).
 */
test.describe('Max flow / min cut', () => {
	test('Ford–Fulkerson reports max_flow, the flow table and the minimum cut', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'flow-ff' });
		await page.goto('/graph');

		await runAlgorithm(page, { algorithm: 'ford_fulkerson', sink: 4 });

		// Headline number: max flow 5 from source 1 to sink 4 (DFS mode).
		await expect(page.getByText('Maximum flow', { exact: true })).toBeVisible();
		await expect(page.locator('span.text-3xl')).toHaveText('5');
		await expect(page.getByText('source 1 → sink 4', { exact: true })).toBeVisible();
		await expect(page.getByText('DFS augmentation (Ford–Fulkerson)', { exact: true })).toBeVisible();

		// Edge flow table: every input edge with its flow/capacity pair.
		await expect(page.getByRole('heading', { name: 'Edge flows' })).toBeVisible();
		await expect(page.getByText('3 / 5', { exact: true })).toBeVisible(); // 1 → 2
		await expect(page.getByText('2 / 2', { exact: true })).toBeVisible(); // 1 → 3 (saturated)
		await expect(page.getByText('3 / 3', { exact: true })).toBeVisible(); // 2 → 4 (saturated)
		await expect(page.getByText('2 / 6', { exact: true })).toBeVisible(); // 3 → 4
		await expect(page.getByText('0 / 1', { exact: true })).toBeVisible(); // 2 → 5
		await expect(page.getByText('saturated', { exact: true })).toHaveCount(2);

		// Minimum cut block: value, both sides and the crossing edges.
		await expect(page.getByRole('heading', { name: 'Minimum cut' })).toBeVisible();
		await expect(page.getByText('value: 5', { exact: true })).toBeVisible();
		await expect(page.locator('text="Source side"').locator('xpath=..')).toContainText('1, 2, 5');
		await expect(page.locator('text="Sink side"').locator('xpath=..')).toContainText('3, 4');
		const cutEdges = page.getByText('Cut edges', { exact: true }).locator('xpath=..');
		await expect(cutEdges).toContainText('1 → 3');
		await expect(cutEdges).toContainText('capacity: 2');
		await expect(cutEdges).toContainText('2 → 4');
		await expect(cutEdges).toContainText('capacity: 3');

		// Legend of the visualization is present, canvas is rendered.
		await expect(page.getByText('cut edge', { exact: true })).toBeVisible();
		await expect(page.getByRole('img', { name: 'Graph with 5 vertices and 5 edges' })).toBeVisible();

		// View switch: flow ⇄ cut ⇄ both.
		await expect(page.getByRole('radio', { name: 'Both', exact: true })).toBeChecked();
		await page.getByRole('radio', { name: 'Cut', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Edge flows' })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Minimum cut' })).toBeVisible();
		await page.getByRole('radio', { name: 'Flow', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Edge flows' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Minimum cut' })).toHaveCount(0);
		await page.getByRole('radio', { name: 'Both', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Minimum cut' })).toBeVisible();
	});

	test('Edmonds–Karp (BFS) reaches the same optimum', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'flow-ek' });
		await page.goto('/graph');

		await runAlgorithm(page, { algorithm: 'edmonds_karp', sink: 4 });

		await expect(page.locator('span.text-3xl')).toHaveText('5');
		await expect(page.getByText('BFS augmentation (Edmonds–Karp)', { exact: true })).toBeVisible();
		await expect(page.getByText('value: 5', { exact: true })).toBeVisible();
		await expect(page.getByText(/^step \d+ \/ \d+$/)).toBeVisible();
	});
});
