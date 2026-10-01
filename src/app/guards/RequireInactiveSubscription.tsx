import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { useAccessState, type GuardProps } from './access';

/**
 * Authenticated route for users without an active subscription (`/subscribe`).
 * Users with an ACTIVE subscription are sent straight to the home page.
 */
export default function RequireInactiveSubscription({ children }: GuardProps) {
	const { t } = useTranslation();
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message={t('common.loading')} />;
	}

	if (!access.isAuthenticated) {
		return <Navigate to="/auth" replace />;
	}

	if (!access.subscriptionReady) {
		return <FullScreenLoader message={t('common.checkingSubscription')} />;
	}

	if (access.subscriptionActive) {
		return <Navigate to="/" replace />;
	}

	return children;
}