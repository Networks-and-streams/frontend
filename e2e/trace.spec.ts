import { expect, test } from '@playwright/test';
import { runAlgorithm, useSession } from './helpers';

/**
 * §4.1 — trace.spec.ts
 *
 * Animation of the execution trace (§3.5): after a run the player lands on
 * the final frame, ▶ plays the frames with a 700 ms cadence and auto-pauses
 * at the end. Ford–Fulkerson renders the detailed two-level trace:
 * ⏮/⏭ jump between stages, ◀/▶ step inside the current stage, the counter
 * reads `stage S / T · step K / N`, and the step card below the player
 * shows the marks, the labeled/unlabeled sets and the reverse chain.
 *
 * Sample graph (sink 4) produces 19 frames in 3 stages:
 *   stage 1 = 8 steps (4 labels, 3 reverse, 1 augment),
 *   stage 2 = 7 steps (3 labels, 3 reverse, 1 augment),
 *   stage 3 = 4 steps (3 labels + the final check).
 */
test.describe('Trace animation', () => {
	test('plays, auto-pauses and navigates the detailed max-flow trace', async ({ page }) => {
		await useSession(page.context(), { active: true, prefix: 'trace' });
		await page.goto('/graph');

		await runAlgorithm(page, { algorithm: 'ford_fulkerson', sink: 4 });

		const counter = page.locator('span', { hasText: /^stage \d+ \/ \d+ · step \d+ \/ \d+$/ });
		const stepMessage = page.locator('p').filter({ hasText: /Stage \d+ step \d+/ });
		const play = page.getByRole('button', { name: 'Play', exact: true });
		const pause = page.getByRole('button', { name: 'Pause', exact: true });
		const prevStage = page.getByRole('button', { name: 'Previous stage' });
		const nextStage = page.getByRole('button', { name: 'Next stage' });
		const prevStep = page.getByRole('button', { name: 'Previous step' });
		const nextStep = page.getByRole('button', { name: 'Next step' });

		// The run lands on the finished frame: flow == cut == 5.
		await expect(counter).toHaveText('stage 3 / 3 · step 4 / 4');
		await expect(stepMessage).toHaveText('Stage 3 step 4: finished — flow 5, min cut 5');
		// Both counters of the last stage are exhausted.
		await expect(nextStep).toBeDisabled();
		await expect(nextStage).toBeDisabled();

		// Step card of the final frame: the marked set is the source side.
		await expect(page.getByText('No augmenting path', { exact: true })).toBeVisible();
		await expect(page.getByText('Marks', { exact: true })).toBeVisible();
		await expect(page.getByText('Labeled', { exact: true })).toBeVisible();
		await expect(page.getByText('Unlabeled', { exact: true })).toBeVisible();
		await expect(page.getByText('1: ∞', { exact: true })).toBeVisible();
		await expect(page.getByText('not built yet', { exact: true })).toBeVisible();

		// ⏮ jumps to the previous stage…
		await prevStage.click();
		await expect(counter).toHaveText('stage 2 / 3 · step 1 / 7');
		await expect(stepMessage).toHaveText('Stage 2 step 1: source 1 gets mark ∞');
		await expect(prevStep).toBeDisabled(); // first step of the stage

		await prevStage.click();
		await expect(counter).toHaveText('stage 1 / 3 · step 1 / 8');
		await expect(prevStage).toBeDisabled(); // first stage

		// …◀/▶ step inside the current stage only.
		await nextStep.click();
		await expect(counter).toHaveText('stage 1 / 3 · step 2 / 8');
		await expect(stepMessage).toHaveText('Stage 1 step 2: vertex 2 gets mark min(∞, 5) = 5 from 1');

		// Labeling completes, then the reverse chain grows one vertex per step.
		await nextStep.click(); // 3
		await nextStep.click(); // 4 (sink labeled)
		await nextStep.click(); // 5
		await expect(counter).toHaveText('stage 1 / 3 · step 5 / 8');
		await expect(stepMessage).toHaveText('Stage 1 step 5: reverse chain 4');

		await nextStep.click(); // 6
		await nextStep.click(); // 7
		await expect(stepMessage).toHaveText('Stage 1 step 7: reverse chain 4→3→1');

		await nextStep.click(); // 8 — the stage's augment frame
		await expect(counter).toHaveText('stage 1 / 3 · step 8 / 8');
		await expect(stepMessage).toHaveText('Stage 1 step 8: augmenting path 1→3→4, +2, flow 2');
		await expect(nextStep).toBeDisabled(); // end of the stage
		await expect(nextStage).toBeEnabled(); // ⏭ crosses into the next one

		await nextStage.click();
		await expect(counter).toHaveText('stage 2 / 3 · step 1 / 7');

		// ▶ starts the automatic playback across stages…
		await play.click();
		await expect(pause).toBeVisible();
		await expect(counter).not.toHaveText('stage 2 / 3 · step 1 / 7');

		// …which auto-pauses on the last frame (▶ is offered again).
		await expect(play).toBeVisible({ timeout: 20_000 });
		await expect(counter).toHaveText('stage 3 / 3 · step 4 / 4');
		await expect(stepMessage).toHaveText('Stage 3 step 4: finished — flow 5, min cut 5');
		await expect(nextStage).toBeDisabled();
	});
});
