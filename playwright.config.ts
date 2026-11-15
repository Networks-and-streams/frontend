import { defineConfig, devices } from '@playwright/test';
import { APP_URL, BACKEND_URL } from './e2e/config';

/**
 * E2E configuration (expansion plan §4.1).
 *
 * Playwright owns an isolated stack so it never collides with the dev one:
 *
 *   vite      http://127.0.0.1:5199  (webServer below, proxies /api → backend)
 *   backend   http://127.0.0.1:3101  (spawned by e2e/global-setup.ts)
 *   compute   127.0.0.1:50052        (spawned by e2e/global-setup.ts)
 *   postgres  localhost:5432/streams_test (Docker container `graph_db`)
 *
 * `globalSetup` migrates the test database and spawns backend + compute,
 * `globalTeardown` kills them (PIDs are stored in `.e2e-state.json`).
 * Everything runs with `workers: 1` because the specs share one compute
 * instance (errors.spec.ts takes it down and brings it back).
 */
export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	globalTeardown: './e2e/global-teardown.ts',

	// One worker: the suite talks to a single compute service and one of the
	// specs deliberately restarts it.
	workers: 1,
	// One retry — a failed test re-runs against the same isolated stack.
	retries: 1,
	forbidOnly: !!process.env.CI,

	timeout: 60_000,
	expect: { timeout: 10_000 },

	reporter: [['list'], ['html', { open: 'never' }]],

	use: {
		baseURL: APP_URL,
		locale: 'en-US',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		actionTimeout: 15_000,
		navigationTimeout: 30_000,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	// Dedicated dev server on 5199 pointed at the E2E backend (3101).
	webServer: {
		command: 'npm run dev:e2e',
		url: APP_URL,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			VITE_API_PROXY_TARGET: BACKEND_URL,
		},
	},
});
