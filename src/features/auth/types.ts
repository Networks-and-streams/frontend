/**
 * DTO-aligned types for the auth API.
 *
 * Backend reference: `backend/src/auth/` — access token is returned in the
 * JSON body, the refresh token is an HttpOnly cookie set by the server.
 */

/** Body returned by POST /auth/register, /auth/login and /auth/refresh. */
export interface AuthResponse {
	accessToken: string;
}

/** Body returned by POST /auth/logout and POST /auth/logout-all-devices. */
export interface MessageResponse {
	message: string;
}

/** Body returned by GET /auth/status (authenticated). */
export interface AuthUser {
	id: string;
	email: string;
}