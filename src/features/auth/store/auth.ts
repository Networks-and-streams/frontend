import { create } from 'zustand';
import { authApi } from '@/features/auth/api/auth.api';
import {
	getAccessToken,
	refreshAccessToken,
	setAccessToken,
	setOnUnauthorized,
} from '@/shared/api/http';
import type { AuthUser } from '../types';

interface AuthState {
	/** Current authenticated user, populated from GET /auth/status. */
	user: AuthUser | null;
	isAuthenticated: boolean;
	/** True once the initial session restoration has finished. */
	isReady: boolean;

	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	logoutAll: () => Promise<void>;
	/** Restores the session (silent refresh using the HttpOnly refresh cookie). */
	bootstrap: () => Promise<boolean>;
	/** Clears all client-side auth state without calling the backend. */
	clear: () => void;
}

let hasBootstrapped = false;

const clearAuth = () => {
	setAccessToken(null);
	useAuthStore.setState({ user: null, isAuthenticated: false, isReady: true });
};

const loadUser = async () => {
	try {
		const status = await authApi.status();
		useAuthStore.setState({ user: { id: status.id, email: status.email } });
	} catch {
		// The access token is set but the user profile could not be fetched.
		// Keep the session; the next protected request will re-check.
	}
};

setOnUnauthorized(clearAuth);

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isAuthenticated: false,
	isReady: false,

	login: async (email, password) => {
		const data = await authApi.login(email, password);
		setAccessToken(data.accessToken);
		set({ isAuthenticated: true, isReady: true });
		await loadUser();
	},

	register: async (email, password) => {
		const data = await authApi.register(email, password);
		setAccessToken(data.accessToken);
		set({ isAuthenticated: true, isReady: true });
		await loadUser();
	},

	logout: async () => {
		try {
			await authApi.logout();
		} finally {
			clearAuth();
		}
	},

	logoutAll: async () => {
		try {
			await authApi.logoutAll();
		} finally {
			clearAuth();
		}
	},

	bootstrap: async () => {
		if (hasBootstrapped) {
			// Already restored; report current state.
			return getAccessToken() !== null;
		}
		hasBootstrapped = true;

		set({ isReady: false });
		const token = await refreshAccessToken();

		if (token) {
			set({ isAuthenticated: true, isReady: true });
			await loadUser();
			return true;
		}

		set({ user: null, isAuthenticated: false, isReady: true });
		return false;
	},

	clear: clearAuth,
}));