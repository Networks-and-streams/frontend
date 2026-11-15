import { expect, test } from '@playwright/test';
import { runAlgorithm, startCompute, stopCompute, useSession } from './helpers';

/**
 * §4.1 — errors.spec.ts
 *
 * Failure paths: an invalid graph shows the inline validation message and
 * disables "Run algorithm"; a compute outage must surface as
 * "Compute failed" + "Compute service unavailable" (HTTP 503 mapping).
 * The compute service is always brought back up in `finally`/`afterAll`
 * so a failure here cannot poison the rest of the suite.
 */
test.describe('Error handling', () => {
	test('flags an invalid graph and disables Run', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'errors' });
		await page.goto('/graph');

		const run = page.getByRole('button', { name: 'Run algorithm' });
		const invalid = page.locator('p').filter({ hasText: 'Invalid graph:' });

		await expect(run).toBeEnabled();
		await expect(invalid).toHaveCount(0);

		// Shrink below the edge endpoints (sample edges reach vertex 5).
		await page.locator('#graph-vertices').fill('3');
		await expect(invalid).toBeVisible();
		await expect(run).toBeDisabled();

		// Restore a valid vertex count.
		await page.locator('#graph-vertices').fill('5');
		await expect(invalid).toHaveCount(0);
		await expect(run).toBeEnabled();
	});

	test('surfaces a compute outage as a 503 error message', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'errors' });
		await page.goto('/graph');

		await stopCompute();
		try {
			await runAlgorithm(page, { algorithm: 'ford_fulkerson', sink: 4 });

			await expect(page.getByText('Compute failed', { exact: true })).toBeVisible({ timeout: 15_000 });
			await expect(page.getByText('Compute service unavailable', { exact: true })).toBeVisible({
				timeout: 15_000,
			});

			// The workspace stays usable: no result panel is rendered.
			await expect(page.getByText('Maximum flow', { exact: true })).toHaveCount(0);
		} finally {
			await startCompute();
		}
	});

	// Safety net: whatever happened above, the service must be back.
	test.afterAll(async () => {
		await startCompute().catch(() => undefined);
	});
});
