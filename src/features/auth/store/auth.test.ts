import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/auth.api', () => ({
	authApi: { login: vi.fn(), register: vi.fn(), logout: vi.fn(), logoutAll: vi.fn(), status: vi.fn() },
}));

vi.mock('@/shared/api/http', () => ({
	getAccessToken: vi.fn(() => null),
	refreshAccessToken: vi.fn(),
	setAccessToken: vi.fn(),
	setOnUnauthorized: vi.fn(),
}));

import { authApi } from '../api/auth.api';
import { authEndpoints } from '../api/endpoints';
import { setAccessToken } from '@/shared/api/http';
import { useAuthStore } from './auth';

const loginMock = vi.mocked(authApi.login);
const registerMock = vi.mocked(authApi.register);
const logoutMock = vi.mocked(authApi.logout);
const logoutAllMock = vi.mocked(authApi.logoutAll);
const statusMock = vi.mocked(authApi.status);

describe('auth store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.setState({ user: null, isAuthenticated: false, isReady: false });
	});

	it('login stores the token, marks the session and loads the profile', async () => {
		loginMock.mockResolvedValue({ accessToken: 't1' } as Awaited<ReturnType<typeof authApi.login>>);
		statusMock.mockResolvedValue({ id: 'u1', email: 'a@b.c' } as Awaited<ReturnType<typeof authApi.status>>);

		await useAuthStore.getState().login('a@b.c', 'secret');

		expect(setAccessToken).toHaveBeenCalledWith('t1');
		const state = useAuthStore.getState();
		expect(state.isAuthenticated).toBe(true);
		expect(state.isReady).toBe(true);
		expect(state.user).toEqual({ id: 'u1', email: 'a@b.c' });
	});

	it('register behaves like login (token + profile)', async () => {
		registerMock.mockResolvedValue({ accessToken: 't2' } as Awaited<ReturnType<typeof authApi.register>>);
		statusMock.mockResolvedValue({ id: 'u2', email: 'x@y.z' } as Awaited<ReturnType<typeof authApi.status>>);

		await useAuthStore.getState().register('x@y.z', 'secret123');

		expect(setAccessToken).toHaveBeenCalledWith('t2');
		expect(useAuthStore.getState().isAuthenticated).toBe(true);
		expect(useAuthStore.getState().user?.id).toBe('u2');
	});

	it('logout clears the client state even when the backend call fails', async () => {
		loginMock.mockResolvedValue({ accessToken: 't3' } as Awaited<ReturnType<typeof authApi.login>>);
		statusMock.mockResolvedValue({ id: 'u3', email: 'a@b.c' } as Awaited<ReturnType<typeof authApi.status>>);
		await useAuthStore.getState().login('a@b.c', 'secret');
		expect(useAuthStore.getState().isAuthenticated).toBe(true);

		logoutMock.mockRejectedValue(new Error('network down'));
		// `logout` uses try/finally: the rejection still propagates, but the
		// client state is always cleared.
		await expect(useAuthStore.getState().logout()).rejects.toThrow('network down');

		const state = useAuthStore.getState();
		expect(state.isAuthenticated).toBe(false);
		expect(state.user).toBeNull();
		expect(state.isReady).toBe(true);
	});

	it('logoutAll revokes every session and clears the client state', async () => {
		loginMock.mockResolvedValue({ accessToken: 't4' } as Awaited<ReturnType<typeof authApi.login>>);
		statusMock.mockResolvedValue({ id: 'u4', email: 'a@b.c' } as Awaited<ReturnType<typeof authApi.status>>);
		await useAuthStore.getState().login('a@b.c', 'secret');
		expect(useAuthStore.getState().isAuthenticated).toBe(true);

		logoutAllMock.mockResolvedValue({ message: 'ok' });
		await useAuthStore.getState().logoutAll();

		expect(logoutAllMock).toHaveBeenCalledTimes(1);
		const state = useAuthStore.getState();
		expect(state.isAuthenticated).toBe(false);
		expect(state.user).toBeNull();
		expect(state.isReady).toBe(true);
	});

	it('logoutAll endpoint matches the backend route (@Post logout-all)', () => {
		expect(authEndpoints.logoutAll).toBe('/auth/logout-all');
	});

	it('clear() drops the session without a backend call', () => {
		useAuthStore.setState({ user: { id: 'u', email: 'a@b.c' }, isAuthenticated: true });

		useAuthStore.getState().clear();

		const state = useAuthStore.getState();
		expect(state.isAuthenticated).toBe(false);
		expect(state.user).toBeNull();
		expect(state.isReady).toBe(true);
	});
});
