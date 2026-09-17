import { Navigate } from 'react-router-dom';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { guardTo, useAccessState } from './access';

/**
 * `/` resolves the single correct destination for the current auth +
 * subscription state. Every post-auth navigation funnels through here so the
 * routing decision is kept in one place.
 */
export default function RootRedirect() {
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message="Loading…" />;
	}

	if (access.isAuthenticated && !access.subscriptionReady) {
		return <FullScreenLoader message="Checking your account…" />;
	}

	return <Navigate to={guardTo(access)} replace />;
}