const BASE = '/auth';

export const authEndpoints = {
	register: `${BASE}/register`,
	login: `${BASE}/login`,
	refresh: `${BASE}/refresh`,
	logout: `${BASE}/logout`,
	logoutAll: `${BASE}/logout-all-devices`,
	status: `${BASE}/status`,
};