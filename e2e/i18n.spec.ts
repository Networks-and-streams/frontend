import { expect, test } from '@playwright/test';
import { useSession } from './helpers';

/**
 * §4.1 — i18n.spec.ts
 *
 * EN ↔ UA toggle (LanguageSwitcher): the workspace re-renders every string
 * live — controls, headings, the run button, the result panel and the trace
 * counter — and switching back restores English. Each test starts from a
 * fresh browser context, so the persisted locale is always EN initially.
 *
 * The detailed Ford–Fulkerson counter is two-level: English reads
 * `stage 3 / 3 · step 4 / 4`, Ukrainian `етап 3 / 3 · крок 4 / 4` for the
 * same frame (the flat Edmonds–Karp `step N / M` lives in flow.spec.ts).
 */
test.describe('Language switching', () => {
	test('switches the workspace between EN and UA', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'i18n' });
		await page.goto('/graph');

		// --- EN baseline --------------------------------------------------
		await expect(page.getByRole('button', { name: 'Run algorithm', exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Graph input', exact: true })).toBeVisible();
		await expect(page.getByText('Maximum flow', { exact: true })).toHaveCount(0);

		// --- → UA ---------------------------------------------------------
		await page.getByRole('button', { name: 'UA', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Запустити алгоритм', exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Ввід графа', exact: true })).toBeVisible();

		// Run the algorithm while UA is active: result + trace in Ukrainian.
		await page.selectOption('#algorithm-select', 'ford_fulkerson');
		await page.locator('#sink-input').fill('4');
		await page.getByRole('button', { name: 'Запустити алгоритм', exact: true }).click();

		await expect(page.getByText('Максимальний потік', { exact: true })).toBeVisible();
		await expect(page.locator('span', { hasText: /^етап \d+ \/ \d+ · крок \d+ \/ \d+$/ })).toHaveText(
			'етап 3 / 3 · крок 4 / 4',
		);
		await expect(page.locator('p').filter({ hasText: 'завершено — потік 5' })).toBeVisible();
		// The step card of the final frame is localized too.
		await expect(page.getByText('Шляху немає', { exact: true })).toBeVisible();

		// --- → back to EN --------------------------------------------------
		await page.getByRole('button', { name: 'EN', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Run algorithm', exact: true })).toBeVisible();
		await expect(page.getByText('Maximum flow', { exact: true })).toBeVisible();
		await expect(page.locator('span', { hasText: /^stage \d+ \/ \d+ · step \d+ \/ \d+$/ })).toHaveText(
			'stage 3 / 3 · step 4 / 4',
		);
	});

	test('switches the auth page between EN and UA', async ({ page }) => {
		await page.goto('/auth');

		// Login mode: heading + submit in English.
		await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();

		// → UA: heading, submit and the mode toggle all re-render.
		await page.getByRole('button', { name: 'UA', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'З поверненням', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Увійти', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Зареєструватися', exact: true })).toBeVisible();

		// Toggle to register mode — labels stay Ukrainian.
		await page.getByRole('button', { name: 'Зареєструватися', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Створіть обліковий запис', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Зареєструватися', exact: true })).toBeVisible(); // submit

		// → back to EN: everything restores.
		await page.getByRole('button', { name: 'EN', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Create your account', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible(); // submit
	});
});
