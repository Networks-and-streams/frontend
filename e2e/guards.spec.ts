import { expect, test } from '@playwright/test';
import { useSession } from './helpers';

/**
 * §4.1 — guards.spec.ts
 *
 *  - anonymous on /graph → /auth,
 *  - signed in without an active subscription → /subscribe,
 *  - signed in with an active subscription → / and /graph are reachable,
 *    while /auth redirects back to /.
 */
test.describe('Route guards', () => {
	test('anonymous visitor on /graph is redirected to /auth', async ({ page }) => {
		await page.goto('/graph');
		await page.waitForURL('**/auth');
		await expect(page.locator('#auth-email')).toBeVisible();
		await expect(page.locator('#auth-password')).toBeVisible();
	});

	test('active subscriber reaches / and /graph, /auth redirects home', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'guard-active' });

		await page.goto('/');
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { name: 'Welcome to Graph Resolver' })).toBeVisible();

		await page.goto('/graph');
		await expect(page.locator('#algorithm-select')).toBeVisible();
		await expect(page.getByRole('img', { name: /Graph with 5 vertices/ })).toBeVisible();

		// Already authenticated: /auth sends the user back to the entry point.
		await page.goto('/auth');
		await expect(page).toHaveURL('/');
	});

	test('subscriber without an active plan is redirected to /subscribe', async ({ page }) => {
		await useSession(page.context(), { active: false, prefix: 'guard-nosub' });

		await page.goto('/');
		await page.waitForURL('**/subscribe');
		await expect(page.getByRole('heading', { name: 'Subscribe to Graph Resolver' })).toBeVisible();

		// The workspace is protected by the same guard.
		await page.goto('/graph');
		await page.waitForURL('**/subscribe');
	});
});
