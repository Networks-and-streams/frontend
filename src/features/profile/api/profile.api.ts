import http from '@/shared/api/http';
import type { Payment } from '@/features/subscription/types';
import type {
	ChangeEmailDto,
	ChangePasswordDto,
	DeleteAccountDto,
	DeviceSession,
	EmailConfirmation,
	Profile,
} from '../types';

export const profileApi = {
	/** GET /users/me — account details. */
	getProfile: async () => http.get<Profile>('/users/me'),

	/** PATCH /users/me/password — signs out every other device on success. */
	changePassword: async (dto: ChangePasswordDto) => http.patch<void>('/users/me/password', dto),

	/** GET /sessions — signed-in devices, `current` marks this one. */
	listDevices: async () => http.get<DeviceSession[]>('/sessions'),

	/** DELETE /sessions/:id — signs one other device out. */
	signOutDevice: async (id: string) => http.del<void>(`/sessions/${id}`),

	/** DELETE /sessions/except/current — signs out every device but this one. */
	signOutOtherDevices: async () => http.del<void>('/sessions/except/current'),

	/** POST /users/me/email/verification — (re)sends the verification link. */
	sendVerification: async () => http.post<void>('/users/me/email/verification'),

	/** PATCH /users/me/email — emails a confirmation link to the new address. */
	requestEmailChange: async (dto: ChangeEmailDto) => http.patch<void>('/users/me/email', dto),

	/** POST /users/email/confirm — applies a link token (works signed in or out). */
	confirmEmail: async (token: string) =>
		http.post<EmailConfirmation>('/users/email/confirm', { token }, { skipAuth: true }),

	/** GET /payments — payment history, newest first. */
	listPayments: async () => http.get<Payment[]>('/payments'),

	/** DELETE /users/me — permanently deletes the account. */
	deleteAccount: async (dto: DeleteAccountDto) => http.del<void>('/users/me', { data: dto }),
};
