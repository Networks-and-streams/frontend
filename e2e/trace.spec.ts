import { expect, test } from '@playwright/test';
import { runAlgorithm, useSession } from './helpers';

/**
 * §4.1 — trace.spec.ts
 *
 * Animation of the execution trace (§3.5): after a run the player lands on
 * the final frame, ▶ plays the frames with a 700 ms cadence and auto-pauses
 * at the end, ⏮/⏭/◀/▶ navigate manually.
 */
test.describe('Trace animation', () => {
	test('plays, auto-pauses and navigates the max-flow trace', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'trace' });
		await page.goto('/graph');

		await runAlgorithm(page, { algorithm: 'ford_fulkerson', sink: 4 });

		const counter = page.locator('span', { hasText: /^step \d+ \/ \d+$/ });
		const stepMessage = page.locator('p').filter({ hasText: /Step \d+/ });
		const play = page.getByRole('button', { name: 'Play', exact: true });
		const pause = page.getByRole('button', { name: 'Pause', exact: true });

		// The run lands on the finished frame: flow == cut == 5.
		await expect(counter).toHaveText('step 3 / 3');
		await expect(page.locator('p').filter({ hasText: 'finished — flow 5, min cut 5' })).toBeVisible();

		// Rewind to the first frame.
		await page.getByRole('button', { name: 'First step' }).click();
		await expect(counter).toHaveText('step 1 / 3');
		await expect(page.getByRole('button', { name: 'Previous step' })).toBeDisabled();
		await expect(stepMessage).toHaveText(/^Step \d+: path/);

		// ▶ starts the automatic playback…
		await play.click();
		await expect(pause).toBeVisible();
		await expect(counter).not.toHaveText('step 1 / 3');

		// …which auto-pauses on the last frame (▶ is offered again).
		await expect(play).toBeVisible({ timeout: 8_000 });
		await expect(counter).toHaveText('step 3 / 3');
		await expect(page.locator('p').filter({ hasText: 'finished — flow 5, min cut 5' })).toBeVisible();
		// Already at the end of the trace — nothing left to jump to.
		await expect(page.getByRole('button', { name: 'Last step' })).toBeDisabled();

		// Manual navigation: ⏭ jumps to the end, ◀/▶ step through the frames.
		await page.getByRole('button', { name: 'First step' }).click();
		await expect(counter).toHaveText('step 1 / 3');
		await page.getByRole('button', { name: 'Last step' }).click();
		await expect(counter).toHaveText('step 3 / 3');
		await expect(page.getByRole('button', { name: 'Next step' })).toBeDisabled();

		await page.getByRole('button', { name: 'First step' }).click();
		await expect(counter).toHaveText('step 1 / 3');
		await page.getByRole('button', { name: 'Next step' }).click();
		await expect(counter).toHaveText('step 2 / 3');
		await expect(pause).toHaveCount(0); // navigation never starts playback
		await expect(stepMessage).toHaveText(/^Step \d+: path/);
	});
});
