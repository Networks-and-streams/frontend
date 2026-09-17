import { Navigate } from 'react-router-dom';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { useAccessState, type GuardProps } from './access';

/**
 * Authenticated route for users with an active subscription (`/graph`).
 * While the subscription state is still being fetched the guard shows a
 * loader instead of redirecting prematurely — a page refresh while on `/graph`
 * must not flash through `/subscribe` on the way back.
 */
export default function RequireSubscription({ children }: GuardProps) {
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message="Loading…" />;
	}

	if (!access.isAuthenticated) {
		return <Navigate to="/auth" replace />;
	}

	if (!access.subscriptionReady) {
		return <FullScreenLoader message="Verifying your subscription…" />;
	}

	if (!access.subscriptionActive) {
		return <Navigate to="/subscribe" replace />;
	}

	return children;
}