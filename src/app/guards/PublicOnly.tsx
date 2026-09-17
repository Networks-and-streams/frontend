import { Navigate } from 'react-router-dom';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { guardTo, useAccessState, type GuardProps } from './access';

/**
 * Public-only route (auth pages). Renders nothing until the auth state is
 * known; authenticated users are routed to their correct destination.
 */
export default function PublicOnly({ children }: GuardProps) {
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message="Loading…" />;
	}

	if (access.isAuthenticated) {
		if (!access.subscriptionReady) {
			return <FullScreenLoader message="Checking your account…" />;
		}
		return <Navigate to={guardTo(access)} replace />;
	}

	return children;
}