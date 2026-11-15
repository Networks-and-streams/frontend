import { type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import net from 'node:net';
import { Client as PgClient } from 'pg';
import {
	APP_URL,
	BACKEND_URL,
	COMPUTE_PORT,
	CONTROL_FILE,
	E2E_PASSWORD,
	TEST_DB_CONNECTION,
} from './config';

/**
 * Shared building blocks of the E2E suite (expansion plan §4.1).
 *
 * Authentication model: every test gets a brand-new user created through
 * `POST /auth/register` (which is not login-throttled) and, when the test
 * needs the workspace, an ACTIVE/PREMIUM subscription written directly into
 * `streams_test`. The registration response already carries the HttpOnly
 * refresh cookie, so the session is injected into the browser context and the
 * app restores it on load (`POST /auth/refresh`).
 *
 * `/auth/login` is throttled to 10/min per IP — `reserveLoginSlot()` keeps
 * UI/API logins inside that budget so the suite never trips a 429.
 */

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface E2EUser {
	email: string;
	password: string;
}

// ---------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------

export function uniqueEmail(prefix = 'e2e'): string {
	const stamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${stamp}-${random}@example.com`;
}

/** Creates a fresh user through the backend API (no UI, no login quota). */
export async function registerUser(prefix = 'e2e'): Promise<E2EUser> {
	return (await registerWithCookie(prefix)).user;
}

/** Registration response — it already carries a usable refresh cookie. */
async function registerWithCookie(prefix: string): Promise<E2ESession> {
	const email = uniqueEmail(prefix);
	const response = await fetch(`${BACKEND_URL}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password: E2E_PASSWORD }),
	});
	if (!response.ok) {
		throw new Error(`POST /auth/register failed: ${response.status} ${await response.text()}`);
	}
	return { user: { email, password: E2E_PASSWORD }, refreshToken: readRefreshCookie(response) };
}

/**
 * Flips the user's subscription to ACTIVE/PREMIUM with a future expiry.
 * The payment flow is backend-confirmed only, so E2E writes the row directly.
 */
export async function activateSubscription(email: string): Promise<void> {
	const client = new PgClient({ connectionString: TEST_DB_CONNECTION, connectionTimeoutMillis: 5_000 });
	try {
		await client.connect();
		const result = await client.query(
			`UPDATE "Subscription"
			 SET status = 'ACTIVE', plan = 'PREMIUM',
			     "startedAt" = now(), "expiresAt" = now() + interval '30 days'
			 WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`,
			[email],
		);
		if (result.rowCount !== 1) {
			throw new Error(`No subscription row updated for ${email} (rowCount=${result.rowCount})`);
		}
	} finally {
		await client.end().catch(() => undefined);
	}
}

function readRefreshCookie(response: Response): string {
	const headers = response.headers as Headers & { getSetCookie?: () => string[] };
	const entries =
		typeof headers.getSetCookie === 'function'
			? headers.getSetCookie()
			: [headers.get('set-cookie') ?? ''];
	const entry = entries.find((value) => value?.startsWith('refreshToken='));
	if (!entry) throw new Error('register response did not set the refreshToken cookie');
	return entry.split(';')[0].slice('refreshToken='.length);
}

export interface E2ESession {
	user: E2EUser;
	refreshToken: string;
}

/** New user (+ optional active subscription) with a ready refresh cookie. */
export async function createSession(options: { active: boolean; prefix?: string }): Promise<E2ESession> {
	const session = await registerWithCookie(options.prefix ?? 'e2e');
	if (options.active) await activateSubscription(session.user.email);
	return session;
}

/** Injects a session cookie so the app restores it on the next page load. */
export async function useSession(
	context: BrowserContext,
	options: { active: boolean; prefix?: string },
): Promise<E2EUser> {
	const session = await createSession(options);
	await context.addCookies([
		{
			name: 'refreshToken',
			value: session.refreshToken,
			url: APP_URL,
			httpOnly: true,
			sameSite: 'Lax',
		},
	]);
	return session.user;
}

// ---------------------------------------------------------------------
// Login quota (POST /auth/login: 10/min per IP)
// ---------------------------------------------------------------------

const loginTimestamps: number[] = [];
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 60_000;

/** Blocks until a login slot is free (called before every UI/API login). */
export async function reserveLoginSlot(): Promise<void> {
	const now = Date.now();
	while (loginTimestamps.length > 0 && loginTimestamps[0] <= now - LOGIN_WINDOW_MS) {
		loginTimestamps.shift();
	}
	if (loginTimestamps.length >= LOGIN_LIMIT) {
		const waitMs = loginTimestamps[0] + LOGIN_WINDOW_MS - now + 250;
		await sleep(waitMs);
		return reserveLoginSlot();
	}
	loginTimestamps.push(now);
}

// ---------------------------------------------------------------------
// UI flows
// ---------------------------------------------------------------------

/** Signs in through the auth form and waits for the guard redirect. */
export async function loginViaUi(page: Page, user: E2EUser): Promise<void> {
	await reserveLoginSlot();
	await page.goto('/auth');
	await page.locator('#auth-email').fill(user.email);
	await page.locator('#auth-password').fill(user.password);
	await page.locator('form button[type="submit"]').click();

	try {
		await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
	} catch {
		const alert = await page
			.locator('[role="alert"]')
			.first()
			.textContent()
			.catch(() => null);
		throw new Error(`Login did not redirect away from /auth${alert ? ` — form error: ${alert.trim()}` : ''}`);
	}
}

/** Signs out from the app header and waits for /auth. */
export async function logoutViaUi(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Sign out' }).click();
	await page.waitForURL('**/auth');
}

/**
 * Selects an algorithm (and the sink for flow algorithms) and presses
 * "Run algorithm". The sample graph is already loaded in the editor.
 */
export async function runAlgorithm(
	page: Page,
	options: { algorithm: 'minty' | 'ford_fulkerson' | 'edmonds_karp'; sink?: number },
): Promise<void> {
	await page.selectOption('#algorithm-select', options.algorithm);
	if (options.sink !== undefined) {
		await page.locator('#sink-input').fill(String(options.sink));
	}
	await page.getByRole('button', { name: 'Run algorithm' }).click();
}

// ---------------------------------------------------------------------
// Compute lifecycle (errors.spec.ts takes the service down and back up)
// ---------------------------------------------------------------------
//
// The compute binary is owned by the supervisor spawned in global-setup
// (a child of Playwright's MAIN process — it survives worker lifecycle
// events). Specs only flip the desired state in CONTROL_FILE and wait for
// the port to follow, so an outage test can never race with (or poison)
// the way the service is spawned.

function isPortListening(port: number, timeoutMs = 1_500): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = net.connect({ port, host: '127.0.0.1' });
		const done = (value: boolean) => {
			socket.removeAllListeners();
			socket.destroy();
			resolve(value);
		};
		socket.once('connect', () => done(true));
		socket.once('error', () => done(false));
		socket.setTimeout(timeoutMs, () => done(false));
	});
}

async function waitForPort(port: number, shouldListen: boolean, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if ((await isPortListening(port)) === shouldListen) return;
		await sleep(200);
	}
	throw new Error(`Port ${port} did not become ${shouldListen ? 'available' : 'listening'} in ${timeoutMs / 1000}s.`);
}

function setComputeDesired(running: boolean): void {
	fs.writeFileSync(CONTROL_FILE, JSON.stringify({ running }), 'utf8');
}

/** Asks the supervisor to stop compute and waits for the port to close. */
export async function stopCompute(): Promise<void> {
	setComputeDesired(false);
	await waitForPort(COMPUTE_PORT, false, 15_000);
}

/** Asks the supervisor to (re)start compute and waits for the port to open. */
export async function startCompute(): Promise<void> {
	setComputeDesired(true);
	await waitForPort(COMPUTE_PORT, true, 30_000);
}
