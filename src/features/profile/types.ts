/**
 * Profile DTO types.
 *
 * Backend reference: `backend/src/users/` (GET /users/me, PATCH /users/me/password)
 * and `backend/src/sessions/` (GET /sessions, DELETE /sessions/:id, DELETE /sessions/except/current).
 */

export interface Profile {
	id: string;
	email: string;
	/** Proved ownership of the email; free daily runs require it. */
	emailVerified: boolean;
	createdAt: string;
	/** False for Google-only accounts that never set a password. */
	hasPassword: boolean;
	providers: Array<'GOOGLE'>;
}

export interface ChangePasswordDto {
	/** Required when the account already has a password. */
	currentPassword?: string;
	newPassword: string;
}

export interface ChangeEmailDto {
	newEmail: string;
	password: string;
}

/** Result of opening a link from an email. */
export interface EmailConfirmation {
	purpose: 'verify' | 'change';
	email: string;
}

/** Confirmation for DELETE /users/me: the password, or the email for Google-only accounts. */
export interface DeleteAccountDto {
	password?: string;
	confirmEmail?: string;
}

/** One signed-in device. */
export interface DeviceSession {
	id: string;
	ip?: string;
	userAgent?: string;
	createdAt: string;
	expiresAt: string;
	/** The device making the request. */
	current: boolean;
}

/** Password rules mirrored from the backend (`ChangePasswordDto`). */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;
/** Mirrors `MAX_ACTIVE_SESSIONS` in `backend/src/sessions/sessions.service.ts`. */
export const MAX_DEVICES = 3;
