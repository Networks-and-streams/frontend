import { useAuthStore } from '@/features/auth/store/auth';
import { useSubscriptionStore } from '@/features/subscription/store/subscriptionStore';
import { isActiveSubscription } from '@/features/subscription/types';
import type { ReactNode } from 'react';

/**
 * Combined, backend-authoritative access state used by every route guard.
 *
 * - `authReady`      — initial session restoration finished.
 * - `isAuthenticated`— an access token is present (session established).
 * - `subscriptionReady` — GET /subscriptions/me finished (fail-closed on error).
 * - `subscriptionActive` — backend subscription is ACTIVE and unexpired.
 */
export interface AccessState {
	authReady: boolean;
	isAuthenticated: boolean;
	subscriptionReady: boolean;
	subscriptionActive: boolean;
}

export function useAccessState(): AccessState {
	const authReady = useAuthStore((s) => s.isReady);
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const subscription = useSubscriptionStore((s) => s.subscription);
	const loadState = useSubscriptionStore((s) => s.loadState);

	return {
		authReady,
		isAuthenticated,
		subscriptionReady: loadState === 'ready' || loadState === 'error',
		subscriptionActive: isActiveSubscription(subscription),
	};
}

/** Keeps `subscriptionReady` from blocking anonymous users. */
export function isAuthDecided(access: AccessState): boolean {
	return access.authReady;
}

export interface GuardProps {
	children: ReactNode;
}

export function guardTo(access: AccessState): string {
	if (!access.isAuthenticated) return '/auth';
	return access.subscriptionActive ? '/graph' : '/subscribe';
}