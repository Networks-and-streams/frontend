import { Navigate } from 'react-router-dom';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { useAccessState, type GuardProps } from './access';

/**
 * Authenticated route for users without an active subscription (`/subscribe`).
 * Users with an ACTIVE subscription are sent straight to the app.
 */
export default function RequireInactiveSubscription({ children }: GuardProps) {
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message="Loading…" />;
	}

	if (!access.isAuthenticated) {
		return <Navigate to="/auth" replace />;
	}

	if (!access.subscriptionReady) {
		return <FullScreenLoader message="Checking your subscription…" />;
	}

	if (access.subscriptionActive) {
		return <Navigate to="/graph" replace />;
	}

	return children;
}