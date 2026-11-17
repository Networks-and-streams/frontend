const BASE = '/auth';

export const authEndpoints = {
	register: `${BASE}/register`,
	login: `${BASE}/login`,
	refresh: `${BASE}/refresh`,
	logout: `${BASE}/logout`,
	// Must match the backend route: `@Post('logout-all')` in auth.controller.ts.
	logoutAll: `${BASE}/logout-all`,
	status: `${BASE}/status`,
};