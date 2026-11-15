import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { STATE_FILE } from './config';

/**
 * Playwright globalTeardown: stops the isolated stack spawned by
 * `global-setup.ts` (backend pid + compute pid from `.e2e-state.json`).
 *
 * Also reachable manually — `npm run e2e:stop` reuses this file.
 */

interface StackState {
	supervisorPid?: number | null;
	computePid?: number | null;
	backendPid?: number | null;
}

function killPid(pid: number): void {
	if (process.platform === 'win32') {
		// /T takes the whole tree down (node may have spawned children).
		spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 15_000 });
	} else {
		spawnSync('kill', ['-9', String(pid)], { stdio: 'ignore', timeout: 15_000 });
	}
}

export function stopStack(): void {
	if (!fs.existsSync(STATE_FILE)) return;

	let state: StackState = {};
	try {
		state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as StackState;
	} catch {
		// Corrupted state file — nothing reliable to kill.
	}

	// The supervisor owns compute as its child — /T takes the whole tree.
	for (const pid of [state.backendPid, state.supervisorPid, state.computePid]) {
		if (typeof pid === 'number' && pid > 0) killPid(pid);
	}

	fs.rmSync(STATE_FILE, { force: true });
}

export default async function globalTeardown(): Promise<void> {
	stopStack();
}
