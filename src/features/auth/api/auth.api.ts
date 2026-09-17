import http from '@/shared/api/http';
import { authEndpoints as endpoints } from './endpoints';
import type { AuthResponse, AuthUser, MessageResponse } from '../types';

export const authApi = {
	register: async (email: string, password: string) =>
		http.post<AuthResponse>(endpoints.register, { email, password }, { skipAuth: true }),

	login: async (email: string, password: string) =>
		http.post<AuthResponse>(endpoints.login, { email, password }, { skipAuth: true }),

	refresh: async () => http.post<AuthResponse>(endpoints.refresh, undefined, { skipAuth: true }),

	logout: async () => http.post<MessageResponse>(endpoints.logout),

	logoutAll: async () => http.post<MessageResponse>(endpoints.logoutAll),

	status: async () => http.get<AuthUser>(endpoints.status),
};