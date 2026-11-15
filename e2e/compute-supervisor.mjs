/**
 * Compute supervisor (expansion plan §4.1).
 *
 * Owns the compute service for the whole E2E run. It is spawned by
 * `global-setup.ts` (main process — main-process children have proven to
 * survive test failures) and keeps the binary alive according to the desired
 * state in a control file:
 *
 *     { "running": true }   → compute is (re)started within ~300 ms
 *     { "running": false }  → compute is killed and stays down
 *
 * The specs never spawn/kill compute directly: they only flip the control
 * file (see `e2e/helpers.ts`), so an outage test cannot race with — or be
 * poisoned by — Playwright worker lifecycle events.
 *
 * argv: <controlFile> <computeExe> <logFile> <computeAddr>
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [controlFile, computeExe, logFile, computeAddr] = process.argv.slice(2);

if (!controlFile || !computeExe || !logFile || !computeAddr) {
	console.error('usage: compute-supervisor.mjs <controlFile> <computeExe> <logFile> <computeAddr>');
	process.exit(2);
}

// Fresh log per run; restarts of the binary append to it.
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.writeFileSync(logFile, '', 'utf8');

let child = null;
let desiredRunning = true;

function isRunning() {
	return child !== null && child.exitCode === null && child.signalCode === null;
}

function start() {
	if (isRunning()) return;
	const fd = fs.openSync(logFile, 'a');
	child = spawn(computeExe, [], {
		cwd: path.dirname(computeExe),
		env: { ...process.env, COMPUTE_ADDR: computeAddr },
		stdio: ['ignore', fd, fd],
		windowsHide: true,
	});
	child.on('exit', () => {
		child = null;
	});
}

function stop() {
	if (!isRunning()) return;
	const pid = child.pid;
	child = null;
	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 15_000 });
	} else {
		spawnSync('kill', ['-9', String(pid)], { stdio: 'ignore', timeout: 15_000 });
	}
}

function readDesired() {
	try {
		const state = JSON.parse(fs.readFileSync(controlFile, 'utf8'));
		desiredRunning = state.running !== false;
	} catch {
		// Missing/corrupt control file — keep the last known state.
	}
}

setInterval(() => {
	readDesired();
	if (desiredRunning) start();
	else stop();
}, 300);

console.log(`[compute-supervisor] watching ${controlFile} (compute: ${computeExe})`);
