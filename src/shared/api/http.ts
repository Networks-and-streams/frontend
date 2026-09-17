import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

/** Axios config extended with the auth opt-out flag used by public endpoints. */
export interface RequestConfig extends AxiosRequestConfig {
	skipAuth?: boolean;
}

/**
 * API base URL.
 *
 * Relative by default: requests go to `/api/...` on the page's own origin,
 * which the local Nginx (infra/nginx) routes to the backend. The Vite dev
 * server proxies `/api` to the backend too, so plain `npm run dev` works.
 *
 * Set VITE_API_URL to point the app at an already-deployed backend instead
 * (e.g. VITE_API_URL=https://api.example.com). Leave it unset for the
 * tunnel/Nginx workflow.
 */
export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Access token lives in memory only.
 *
 * The backend issues the refresh token as an HttpOnly cookie (SameSite=Lax in
 * development, SameSite=None + Secure in production) and the access token as a
 * JSON body field. We never persist the access token, so a browser refresh
 * restores the session through `POST /auth/refresh` using the cookie.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
	accessToken = token;
}

export function getAccessToken(): string | null {
	return accessToken;
}

/** Registers the callback invoked when the refresh token can no longer restore the session. */
export function setOnUnauthorized(callback: () => void) {
	onUnauthorized = callback;
}

/** Silent session refresh. Returns the new access token or null when the refresh token is missing/expired. */
export async function refreshAccessToken(): Promise<string | null> {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			const res = await axios.post<{ accessToken: string }>(`${BASE_URL}/auth/refresh`, undefined, {
				withCredentials: true,
			});
			accessToken = res.data.accessToken;
			return accessToken;
		} catch {
			return null;
		}
	})();

	try {
		return await refreshPromise;
	} finally {
		refreshPromise = null;
	}
}

const client: AxiosInstance = axios.create({
	baseURL: BASE_URL,
	withCredentials: true,
	headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
	if (accessToken && !(config as RequestConfig).skipAuth) {
		config.headers.Authorization = `Bearer ${accessToken}`;
	}
	return config;
});

client.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const original = error.config as AxiosRequestConfig & { _retry?: boolean; skipAuth?: boolean };

		// A 401 with a valid access token usually means it expired and the
		// refresh token can restore the session. Retry the request once.
		if (error.response?.status === 401 && accessToken && !original.skipAuth && !original._retry) {
			original._retry = true;

			const newToken = await refreshAccessToken();

			if (newToken && original.headers) {
				(original.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
				return client(original);
			}

			onUnauthorized?.();
			throw new ApiError(error, 'Your session has expired. Please sign in again.');
		}

		// Let requests that explicitly opted out of auth (register/login/refresh)
		// surface the backend error message directly.
		throw new ApiError(error);
	},
);

/**
 * Normalized API error carrying the HTTP status and the backend message when available.
 */
export class ApiError extends Error {
	readonly status: number | null;
	readonly causeRaw?: unknown;

	constructor(source: AxiosError, fallback?: string) {
		const data = source.response?.data as Record<string, unknown> | string | undefined;
		const message =
			typeof data === 'string'
				? data
				: (data?.message as string | undefined) ?? source.message ?? fallback;
		super(Array.isArray(message) ? message.join(', ') : message);
		this.name = 'ApiError';
		this.status = source.response?.status ?? null;
		this.causeRaw = source.response?.data;
	}
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
	if (error instanceof ApiError) return error.message || fallback;
	if (error instanceof Error) return error.message || fallback;
	return fallback;
}

export default {
	async get<T>(url: string, config?: RequestConfig): Promise<T> {
		const res = await client.get<T>(url, config);
		return res.data;
	},

	async post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
		const res = await client.post<T>(url, body, config);
		return res.data;
	},

	async put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
		const res = await client.put<T>(url, body, config);
		return res.data;
	},

	async patch<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
		const res = await client.patch<T>(url, body, config);
		return res.data;
	},

	async del<T>(url: string, config?: RequestConfig): Promise<T> {
		const res = await client.delete<T>(url, config);
		return res.data;
	},
};