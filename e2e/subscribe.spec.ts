import { expect, test } from '@playwright/test';
import { useSession } from './helpers';

/**
 * §5.7 — subscribe.spec.ts: the manual-testing purchase flow.
 *
 * The E2E backend runs with `PAYMENTS_TEST_MODE` (set in global-setup), so
 * the Subscribe page offers the "Test purchase" button instead of Google Pay
 * (which needs a real merchant account). One click runs the full purchase
 * through the backend's local test gateway and unlocks the workspace — the
 * same path a real purchase takes, minus the external PSP.
 */
test.describe('Test purchase (PAYMENTS_TEST_MODE)', () => {
	test('the subscribe page offers the test purchase', async ({ page }) => {
		await useSession(page.context(), { active: false, prefix: 'sub-flag' });

		await page.goto('/subscribe');
		await expect(page.getByRole('heading', { name: 'Subscribe to Graph Resolver' })).toBeVisible();

		// Test-mode affordance: badge + note + button (no Google Pay button).
		await expect(page.getByText('Test mode', { exact: true })).toBeVisible();
		await expect(page.getByText(/test mode is enabled/i)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Test purchase' })).toBeVisible();
	});

	test('one click activates the subscription and unlocks the workspace', async ({ page }) => {
		await useSession(page.context(), { active: false, prefix: 'sub-buy' });

		await page.goto('/subscribe');
		await page.getByRole('button', { name: 'Test purchase' }).click();

		// Backend confirms the payment → the subscription reads back ACTIVE →
		// RequireInactiveSubscription redirects to the home page.
		await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 });
		await expect(page.getByRole('heading', { name: 'Welcome to Graph Resolver' })).toBeVisible();

		// The paid workspace is now reachable (no redirect back to /subscribe).
		await page.goto('/graph');
		await expect(page.locator('#algorithm-select')).toBeVisible();
		await expect(page).toHaveURL(/\/graph$/);
	});
});
