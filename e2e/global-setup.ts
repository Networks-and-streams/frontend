import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Client as PgClient } from 'pg';
import {
	BACKEND_DIR,
	BACKEND_PORT,
	BACKEND_URL,
	COMPUTE_ADDR,
	COMPUTE_DIR,
	COMPUTE_PORT,
	CONTROL_FILE,
	FRONTEND_DIR,
	PROTOC,
	STATE_FILE,
	TEST_DB_CONNECTION,
	TEST_DB_NAME,
	TEST_DB_URL,
} from './config';

/**
 * Playwright globalSetup (expansion plan §4.1).
 *
 * Brings up the isolated E2E stack:
 *   1. kills leftovers of a crashed previous run,
 *   2. verifies Docker (postgres + redis) and creates `streams_test` when missing,
 *   3. applies Prisma migrations to `streams_test`,
 *   4. builds + spawns the Rust compute service on 127.0.0.1:50052,
 *   5. builds + spawns the NestJS backend on 127.0.0.1:3101 (test database),
 *   6. waits until the backend answers and persists both PIDs.
 *
 * `e2e/global-teardown.ts` kills whatever is recorded in `.e2e-state.json`.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const q = (value: string) => (/\s/.test(value) ? `"${value}"` : value);

function assertFrontendCwd(): void {
	const pkgPath = path.join(FRONTEND_DIR, 'package.json');
	if (!fs.existsSync(pkgPath)) {
		throw new Error(`Playwright must be started from frontend/ (cwd: ${FRONTEND_DIR}).`);
	}
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
	if (pkg.name !== 'graph-resolver-frontend') {
		throw new Error(`Unexpected cwd ${FRONTEND_DIR} (package "${pkg.name ?? '?'}"). Run: npm run test:e2e`);
	}
}

/** Best-effort: frees a TCP port by killing whatever listens on it. */
function freePort(port: number): void {
	if (process.platform !== 'win32') return;
	const command =
		`Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ` +
		`ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
	spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
		stdio: 'ignore',
		timeout: 15_000,
	});
}

/**
 * Kills supervisors orphaned by a crashed previous run — otherwise they
 * would keep respawning compute and fight the supervisor of this run.
 */
function killStaleSupervisors(): void {
	if (process.platform !== 'win32') return;
	const command =
		`Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ` +
		`Where-Object { $_.CommandLine -like '*compute-supervisor.mjs*' } | ` +
		`ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
	spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
		stdio: 'ignore',
		timeout: 15_000,
	});
}

function isPortListening(port: number, host = '127.0.0.1', timeoutMs = 1_500): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = net.connect({ port, host });
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

async function waitForPort(port: number, timeoutMs: number, label: string): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await isPortListening(port)) return;
		await sleep(250);
	}
	throw new Error(`${label} did not start listening on port ${port} within ${timeoutMs / 1000}s.`);
}

async function waitForBackend(timeoutMs: number): Promise<void> {
	const url = `${BACKEND_URL}/api/docs/openapi-json`;
	const deadline = Date.now() + timeoutMs;
	let lastError = 'no attempt';
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
			lastError = `HTTP ${response.status}`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		}
		await sleep(500);
	}
	throw new Error(`Backend did not become ready on ${BACKEND_URL} (${lastError}). See .e2e-logs/backend.log.`);
}

/** Postgres up? + `streams_test` exists (created on first run when missing). */
async function ensureTestDatabase(): Promise<void> {
	const probe = new PgClient({
		connectionString: TEST_DB_CONNECTION,
		connectionTimeoutMillis: 5_000,
	});
	try {
		await probe.connect();
		await probe.query('SELECT 1');
		return;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		if (/does not exist|3D000/i.test(message)) {
			const admin = new PgClient({
				connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
				connectionTimeoutMillis: 5_000,
			});
			try {
				await admin.connect();
				await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
				console.log(`[e2e] created test database "${TEST_DB_NAME}"`);
				return;
			} catch (createError) {
				const createMessage = createError instanceof Error ? createError.message : String(createError);
				throw new Error(`Could not create "${TEST_DB_NAME}": ${createMessage}`);
			} finally {
				await admin.end().catch(() => undefined);
			}
		}

		if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Connection terminated|timeout/i.test(message)) {
			throw new Error(
				`PostgreSQL is not reachable on localhost:5432 (${message}). ` +
					'Start Docker Desktop and run "npm run docker:up" in backend/.',
			);
		}

		throw error;
	} finally {
		await probe.end().catch(() => undefined);
	}
}

async function ensureRedis(): Promise<void> {
	if (await isPortListening(6379)) return;
	throw new Error(
		'Redis is not reachable on localhost:6379. Start Docker Desktop and run "npm run docker:up" in backend/.',
	);
}

function runCommand(command: string, options: { cwd: string; env?: NodeJS.ProcessEnv }): void {
	const result = spawnSync(command, {
		cwd: options.cwd,
		env: { ...process.env, ...options.env },
		shell: true,
		encoding: 'utf8',
		timeout: 600_000,
	});
	if (result.status !== 0) {
		throw new Error(
			`Command failed (${result.status}): ${command}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
		);
	}
}

function logFile(name: string): number {
	const dir = path.join(FRONTEND_DIR, '.e2e-logs');
	fs.mkdirSync(dir, { recursive: true });
	return fs.openSync(path.join(dir, `${name}.log`), 'w');
}

function spawnLogged(
	command: string,
	args: string[],
	options: { cwd: string; env: NodeJS.ProcessEnv; log: string },
): ChildProcess {
	const fd = logFile(options.log);
	return spawn(command, args, {
		cwd: options.cwd,
		env: { ...process.env, ...options.env },
		stdio: ['ignore', fd, fd],
		windowsHide: true,
	});
}

/** Builds the compute binary (falls back to a previously built one). */
function buildComputeBinary(): string {
	const exe = path.join(COMPUTE_DIR, 'target', 'debug', 'compute.exe');
	const cargoLocal = path.join(os.homedir(), '.cargo', 'bin', 'cargo.exe');
	const cargo = fs.existsSync(cargoLocal) ? cargoLocal : 'cargo';

	const result = spawnSync(`${q(cargo)} build`, {
		cwd: COMPUTE_DIR,
		env: { ...process.env, PROTOC },
		shell: true,
		encoding: 'utf8',
		timeout: 600_000,
	});

	if (result.status !== 0) {
		if (fs.existsSync(exe)) {
			console.warn(`[e2e] cargo build failed — reusing the existing binary ${exe}`);
			return exe;
		}
		throw new Error(`cargo build failed:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
	}
	return exe;
}

function buildBackend(): void {
	console.log('[e2e] building the backend (nest build)…');
	runCommand('npm run build', { cwd: BACKEND_DIR });
}

export default async function globalSetup(): Promise<void> {
	assertFrontendCwd();

	// 1. Leftovers of a crashed run must never leak into this one.
	killStaleSupervisors();
	freePort(BACKEND_PORT);
	freePort(COMPUTE_PORT);
	await sleep(500);

	// 2. Infrastructure (Docker) + test database.
	await ensureTestDatabase();
	await ensureRedis();

	// 3. Schema of the test database.
	console.log('[e2e] applying Prisma migrations to', TEST_DB_NAME);
	runCommand('npx prisma migrate deploy', { cwd: BACKEND_DIR, env: { DATABASE_URL: TEST_DB_URL } });

	// 4. Compute service (Rust, gRPC) on 127.0.0.1:50052 — owned by a
	//    supervisor process (child of this main process). The specs only
	//    flip CONTROL_FILE instead of spawning/killing compute themselves,
	//    so outage tests never race with Playwright's worker lifecycle.
	const computeExe = buildComputeBinary();
	fs.writeFileSync(CONTROL_FILE, JSON.stringify({ running: true }), 'utf8');
	const supervisor = spawnLogged(
		process.execPath,
		[
			path.join(FRONTEND_DIR, 'e2e', 'compute-supervisor.mjs'),
			CONTROL_FILE,
			computeExe,
			path.join(FRONTEND_DIR, '.e2e-logs', 'compute.log'),
			COMPUTE_ADDR,
		],
		{ cwd: FRONTEND_DIR, env: {}, log: 'supervisor' },
	);
	await waitForPort(COMPUTE_PORT, 30_000, 'compute');
	console.log(`[e2e] compute up on ${COMPUTE_ADDR} (supervisor pid ${supervisor.pid})`);

	// 5. Backend (NestJS) on 127.0.0.1:3101 against streams_test.
	buildBackend();
	const backend = spawnLogged(process.execPath, ['-r', 'tsconfig-paths/register', 'dist/main.js'], {
		cwd: BACKEND_DIR,
		env: {
			PORT: String(BACKEND_PORT),
			DATABASE_URL: TEST_DB_URL,
			COMPUTE_ADDR,
		},
		log: 'backend',
	});
	await waitForBackend(90_000);
	console.log(`[e2e] backend up on ${BACKEND_URL} (pid ${backend.pid})`);

	// 6. Remember the PIDs for global-teardown / crash recovery.
	fs.writeFileSync(
		STATE_FILE,
		JSON.stringify(
			{
				supervisorPid: supervisor.pid ?? null,
				backendPid: backend.pid ?? null,
				startedAt: new Date().toISOString(),
			},
			null,
			2,
		),
		'utf8',
	);
}
