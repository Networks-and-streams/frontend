import { expect, test } from '@playwright/test';
import { E2E_PASSWORD } from './config';
import { activateSubscription, loginViaUi, logoutViaUi, registerUser, reserveLoginSlot, uniqueEmail } from './helpers';

/**
 * §4.1 — auth.spec.ts
 *
 *  - registration → session (guard redirect + survives a reload),
 *  - login → logout,
 *  - invalid input → client-side and server-side errors,
 *  - Google OAuth button (smoke: it navigates to /oauth/google).
 */
test.describe('Authentication', () => {
	test('registration establishes a session that survives a reload', async ({ page }) => {
		// A brand-new address: registering an API-created one would be a
		// duplicate ("User with this email already exists").
		const email = uniqueEmail('auth-reg');

		await page.goto('/auth');
		// Login mode is the default: the footer link switches to registration.
		await page.getByRole('button', { name: 'Register', exact: true }).click();
		await page.locator('#auth-email').fill(email);
		await page.locator('#auth-password').fill(E2E_PASSWORD);
		await page.locator('form button[type="submit"]').click();

		// A fresh account has no subscription → the guard parks it on /subscribe.
		await page.waitForURL('**/subscribe');
		await expect(page.getByRole('heading', { name: 'Subscribe to Graph Resolver' })).toBeVisible();
		await expect(page.getByText(email, { exact: true })).toBeVisible();

		// The refresh cookie restores the session on a full page reload.
		await page.reload();
		await expect(page).toHaveURL(/\/subscribe$/);
		await expect(page.getByText(email, { exact: true })).toBeVisible();
	});

	test('login lands in the workspace and logout returns to /auth', async ({ page }) => {
		const user = await registerUser('auth-login');
		await activateSubscription(user.email);

		await loginViaUi(page, user);
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { name: 'Welcome to Graph Resolver' })).toBeVisible();
		await expect(page.getByText(user.email, { exact: true })).toBeVisible();

		await logoutViaUi(page);
		await expect(page.locator('#auth-email')).toBeVisible();
		await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
	});

	test('invalid input surfaces validation errors', async ({ page }) => {
		await page.goto('/auth');

		// Malformed e-mail (client-side check).
		await page.locator('#auth-email').fill('not-an-email');
		await page.locator('#auth-password').fill('123456');
		await page.locator('form button[type="submit"]').click();
		await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');

		// Too short password (client-side check).
		await page.locator('#auth-email').fill('user@example.com');
		await page.locator('#auth-password').fill('123');
		await page.locator('form button[type="submit"]').click();
		await expect(page.getByRole('alert')).toHaveText('Password must be at least 6 characters.');

		// Valid shape but wrong credentials → the backend rejects the login.
		const user = await registerUser('auth-badcreds');
		await reserveLoginSlot();
		await page.locator('#auth-email').fill(user.email);
		await page.locator('#auth-password').fill('wrong-password');
		await page.locator('form button[type="submit"]').click();
		await expect(page.getByRole('alert')).toBeVisible();
		await expect(page.getByRole('alert')).not.toHaveText(/valid email|at least 6/);

		// Still on /auth — no session was established.
		await expect(page).toHaveURL(/\/auth$/);
	});

	test('Google OAuth button points at the backend /oauth/google entry', async ({ page }) => {
		// Intercept the navigation so the smoke test never leaves the local stack.
		await page.route('**/oauth/google*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/html',
				body: '<!doctype html><html><body>oauth stub</body></html>',
			}),
		);

		await page.goto('/auth');
		await page.getByRole('button', { name: 'Continue with Google' }).click();
		await expect(page).toHaveURL(/\/oauth\/google/);
	});
});
