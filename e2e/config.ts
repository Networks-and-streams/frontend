import path from 'node:path';

/**
 * Shared constants of the isolated E2E stack (expansion plan §4.1).
 *
 * Every path is resolved from `process.cwd()`, so the suite must be started
 * from `frontend/` (`npm run test:e2e` does exactly that).
 */
export const FRONTEND_DIR = process.cwd();

/** The app under test (vite dev server started by playwright.config.ts). */
export const APP_URL = 'http://127.0.0.1:5199';

/** The isolated backend spawned by global-setup.ts (dev backend uses 3000). */
export const BACKEND_PORT = 3101;
export const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

/** The isolated compute service (dev compute uses 50051). */
export const COMPUTE_PORT = 50052;
export const COMPUTE_ADDR = `127.0.0.1:${COMPUTE_PORT}`;

/** Test database — never the development `streams` database. */
export const TEST_DB_NAME = 'streams_test';
export const TEST_DB_URL = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public`;
/** Same database without Prisma's `?schema` param (for the raw `pg` client). */
export const TEST_DB_CONNECTION = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}`;

export const BACKEND_DIR = path.resolve(FRONTEND_DIR, '..', 'backend');
export const COMPUTE_DIR = path.resolve(FRONTEND_DIR, '..', 'compute');
/** Debug binary produced by `cargo build` (spawned by global-setup/helpers). */
export const COMPUTE_EXE = path.join(COMPUTE_DIR, 'target', 'debug', 'compute.exe');

/** PIDs of the spawned stack, written by global-setup.ts. */
export const STATE_FILE = path.join(FRONTEND_DIR, '.e2e-state.json');

/** Desired compute state (`{ "running": bool }`) — flipped by the specs. */
export const CONTROL_FILE = path.join(FRONTEND_DIR, '.e2e-compute.json');

/**
 * protoc is required by the compute build script. Kept in one place so both
 * global-setup and local `cargo build` invocations agree on it.
 */
export const PROTOC =
	process.env.PROTOC ??
	'C:\\Users\\User\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.Protobuf_Microsoft.Winget.Source_8wekyb3d8bbwe\\bin\\protoc.exe';

/** Default password of every E2E user (registration requires ≥ 6 chars). */
export const E2E_PASSWORD = 'secret123';
