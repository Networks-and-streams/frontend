import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { guardTo, useAccessState, type GuardProps } from './access';

/**
 * Public-only route (auth pages). Renders nothing until the auth state is
 * known; authenticated users are routed to their correct destination.
 */
export default function PublicOnly({ children }: GuardProps) {
	const { t } = useTranslation();
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message={t('common.loading')} />;
	}

	if (access.isAuthenticated) {
		if (!access.subscriptionReady) {
			return <FullScreenLoader message={t('common.checkingAccount')} />;
		}
		return <Navigate to={guardTo(access)} replace />;
	}

	return children;
}